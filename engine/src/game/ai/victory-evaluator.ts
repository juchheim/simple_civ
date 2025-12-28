/**
 * victory-evaluator.ts - Dynamic Victory Path Evaluation
 * 
 * Replaces time-based Progress victory triggers with strategic evaluation
 * that considers actual game state: science output, tech progress, military power.
 */

import { TECHS, PROJECTS, UNITS } from "../../core/constants.js";
import { GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { aiInfo } from "./debug-logging.js";
import { getCityYields } from "../rules.js";

export interface VictoryEstimate {
    path: "Progress" | "Conquest";
    turnsToProgress: number;
    turnsToConquest: number;
    progressFaster: boolean;
    confidence: "high" | "medium" | "low";
    reason: string;
}

// =============================================================================
// TECH PATH CALCULATION
// =============================================================================

/**
 * Get the full tech path required to research a target tech.
 * Walks the prereq chain backwards and returns all unresearched techs in order.
 */
export function getTechPathTo(playerTechs: TechId[], targetTech: TechId): TechId[] {
    if (playerTechs.includes(targetTech)) return [];

    const path: TechId[] = [];
    const visited = new Set<TechId>();

    function collectPrereqs(tech: TechId): void {
        if (visited.has(tech)) return;
        visited.add(tech);

        const data = TECHS[tech];
        for (const prereq of data.prereqTechs) {
            if (!playerTechs.includes(prereq)) {
                collectPrereqs(prereq);
            }
        }

        if (!playerTechs.includes(tech)) {
            path.push(tech);
        }
    }

    collectPrereqs(targetTech);
    return path;
}

/**
 * Calculate total science cost for a tech path.
 */
export function calculateTechPathCost(path: TechId[]): number {
    return path.reduce((sum, tech) => sum + TECHS[tech].cost, 0);
}

// =============================================================================
// PROGRESS VICTORY ESTIMATION
// =============================================================================

/**
 * Estimate turns to complete Progress victory from current state.
 */
export function estimateTurnsToProgress(state: GameState, playerId: string): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return Infinity;

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    if (myCities.length === 0) return Infinity;

    // Calculate current science per turn
    let sciencePerTurn = 0;
    for (const city of myCities) {
        const yields = getCityYields(city, state);
        sciencePerTurn += yields.S;
    }
    sciencePerTurn = Math.max(1, sciencePerTurn);

    // Calculate remaining tech cost to StarCharts
    const techPath = getTechPathTo(player.techs, TechId.StarCharts);
    const techCost = calculateTechPathCost(techPath);
    const turnsForTech = techCost > 0 ? Math.ceil(techCost / sciencePerTurn) : 0;

    // Calculate production for Victory projects
    // Find best production city
    let bestProd = 0;
    for (const city of myCities) {
        const yields = getCityYields(city, state);
        if (yields.P > bestProd) bestProd = yields.P;
    }
    bestProd = Math.max(1, bestProd);

    // Project costs: Observatory, GrandAcademy, GrandExperiment
    let productionNeeded = 0;
    if (!player.completedProjects.includes(ProjectId.Observatory)) {
        productionNeeded += PROJECTS[ProjectId.Observatory].cost;
    }
    if (!player.completedProjects.includes(ProjectId.GrandAcademy)) {
        productionNeeded += PROJECTS[ProjectId.GrandAcademy].cost;
    }
    if (!player.completedProjects.includes(ProjectId.GrandExperiment)) {
        productionNeeded += PROJECTS[ProjectId.GrandExperiment].cost;
    }

    const turnsForProjects = Math.ceil(productionNeeded / bestProd);

    // Total: tech research + project production (sequential, not parallel)
    return turnsForTech + turnsForProjects;
}

// =============================================================================
// CONQUEST VICTORY ESTIMATION
// =============================================================================

/**
 * Estimate turns to capture all remaining enemy capitals.
 * 
 * v1.0.6: Made more realistic to balance with Progress estimates:
 * - Increased siege time (battles take longer than expected)
 * - Added attrition factor (units die, need rebuilding)
 * - Added uncertainty buffer (things go wrong)
 * - More realistic march time
 */
export function estimateTurnsToConquest(state: GameState, playerId: string): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return Infinity;

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myUnits = state.units.filter(u => u.ownerId === playerId);

    // Find remaining enemy capitals
    const enemyCapitals = state.cities.filter(c =>
        c.ownerId !== playerId &&
        c.isCapital &&
        !state.players.find(p => p.id === c.ownerId)?.isEliminated
    );

    if (enemyCapitals.length === 0) return 0; // Already won

    // Calculate military strength
    const myMilitaryPower = myUnits
        .filter(u => UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Scout)
        .reduce((sum, u) => {
            const stats = UNITS[u.type];
            return sum + stats.atk * 2 + stats.def + stats.hp * 0.3;
        }, 0);

    // Estimate enemy total power
    let enemyTotalPower = 0;
    for (const capital of enemyCapitals) {
        const enemyUnits = state.units.filter(u =>
            u.ownerId === capital.ownerId &&
            UNITS[u.type].domain !== "Civilian"
        );
        enemyTotalPower += enemyUnits.reduce((sum, u) => {
            const stats = UNITS[u.type];
            return sum + stats.atk * 2 + stats.def + stats.hp * 0.3;
        }, 0);
        // Add city defense value (includes garrison, walls, etc.)
        enemyTotalPower += (capital.hp ?? 10) * 3;
    }

    // Calculate average distance to capitals from our nearest city
    let totalDistance = 0;
    for (const capital of enemyCapitals) {
        let minDist = Infinity;
        for (const city of myCities) {
            const dist = hexDistance(city.coord, capital.coord);
            if (dist < minDist) minDist = dist;
        }
        totalDistance += minDist;
    }
    const avgDistance = enemyCapitals.length > 0 ? totalDistance / enemyCapitals.length : 10;

    // ===============================================
    // REALISTIC ESTIMATION FACTORS
    // ===============================================

    const powerRatio = enemyTotalPower > 0 ? myMilitaryPower / enemyTotalPower : 2;

    // BUILDUP: If weaker, need time to build more military
    let buildupTurns = 0;
    if (powerRatio < 1.2) {  // Need 20% advantage to attack confidently
        buildupTurns = Math.ceil((1.2 - powerRatio) * 60);
    }

    // MARCH TIME: More realistic - 1 turn per 1.5 hexes (terrain, enemies)
    const marchTurns = Math.ceil(avgDistance / 1.5);

    // SIEGE TIME: 12 turns per capital (weaken defenses, kill garrison, capture)
    const siegeTurns = enemyCapitals.length * 12;

    // ATTRITION: Expect to lose 40% of army per capital captured, need rebuilding
    // This is 8 turns of production per capital to rebuild
    const attritionTurns = enemyCapitals.length * 8;

    // UNCERTAINTY: Base buffer for things going wrong
    const uncertaintyBuffer = 10;

    return buildupTurns + marchTurns + siegeTurns + attritionTurns + uncertaintyBuffer;
}

// =============================================================================
// MAIN EVALUATION
// =============================================================================

/**
 * Evaluate which victory path is faster and return recommendation.
 * Used by goal selection and production to decide whether to pivot to Progress.
 */
export function evaluateBestVictoryPath(state: GameState, playerId: string): VictoryEstimate {
    const turnsToProgress = estimateTurnsToProgress(state, playerId);
    const turnsToConquest = estimateTurnsToConquest(state, playerId);

    // Determine if Progress is faster
    // v1.0.5: Removed 10% threshold - now recommend Progress if equal or faster
    // This encourages conquest civs to pivot when Progress is viable
    const progressFaster = turnsToProgress <= turnsToConquest;

    // Confidence based on estimate reliability
    let confidence: "high" | "medium" | "low" = "medium";
    const turnDiff = Math.abs(turnsToProgress - turnsToConquest);

    if (turnDiff > 20) {
        confidence = "high";  // Clear winner
    } else if (turnDiff < 5) {
        confidence = "low";   // Too close to call
    }

    // Generate reason
    let reason = "";
    if (progressFaster) {
        reason = `Progress ~${turnsToProgress} turns vs Conquest ~${turnsToConquest} turns`;
    } else {
        reason = `Conquest ~${turnsToConquest} turns vs Progress ~${turnsToProgress} turns`;
    }

    const result: VictoryEstimate = {
        path: progressFaster ? "Progress" : "Conquest",
        turnsToProgress,
        turnsToConquest,
        progressFaster,
        confidence,
        reason,
    };

    aiInfo(`[Victory Eval] ${playerId}: ${result.path} recommended (${result.reason})`);

    return result;
}

/**
 * Check if player should consider pivoting to Progress based on game state.
 * Returns true if the player has sufficient science production and Progress
 * is estimated to be faster than Conquest.
 * 
 * Trigger conditions (v1.0.5: made more aggressive):
 * - Has at least 2 cities (minimum infrastructure)
 * - Science per turn >= 3 (lowered from 5)
 * - OR has 8+ techs researched (lowered from 12)
 * - OR has already started Progress chain (committed)
 */
export function shouldConsiderProgressPivot(state: GameState, playerId: string): boolean {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return false;

    const myCities = state.cities.filter(c => c.ownerId === playerId);

    // Already invested in Progress chain = continue it
    const hasProgressInvestment =
        player.completedProjects.includes(ProjectId.Observatory) ||
        player.completedProjects.includes(ProjectId.GrandAcademy);

    if (hasProgressInvestment) return true;

    // Late game with techs = should consider Progress even without high science
    // v1.0.5: Lowered from 12 to 8 techs to catch more conquest civs
    if (player.techs.length >= 8) return true;

    // Need minimum infrastructure
    if (myCities.length < 2) return false;

    // Calculate science per turn
    let sciencePerTurn = 0;
    for (const city of myCities) {
        const yields = getCityYields(city, state);
        sciencePerTurn += yields.S;
    }

    // v1.0.5: Lowered from 5 to 3 to catch conquest civs with basic cities
    if (sciencePerTurn < 3) return false;

    return true;
}
