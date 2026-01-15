import { aiInfo } from "./debug-logging.js";
import { hexDistance } from "../../core/hex.js";
import { AiVictoryGoal, BuildingType, GameState, ProjectId, UnitType } from "../../core/types.js";
import { getPersonalityForPlayer } from "./personality.js";
import { CITY_DEFENSE_BASE, CITY_WARD_DEFENSE_BONUS, UNITS } from "../../core/constants.js";
import { getProgressChainStatus, hasEnemyProgressThreat } from "./progress-helpers.js";
import { evaluateBestVictoryPath, shouldConsiderProgressPivot } from "./victory-evaluator.js";

export function setAiGoal(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    return {
        ...state,
        players: state.players.map(p => (p.id === playerId ? { ...p, aiGoal: goal } : p)),
    };
}

/**
 * v0.97: Check if player has a Titan unit
 */
function hasTitan(playerId: string, state: GameState): boolean {
    return state.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
}

/**
 * v0.98 Update 4: Estimate military power for a player
 */
export function estimateMilitaryPower(playerId: string, state: GameState): number {
    const units = state.units.filter(u => u.ownerId === playerId);
    const unitPower = units.reduce((sum, u) => {
        const stats = UNITS[u.type];
        const atk = stats.atk * 2;
        const def = stats.def * 1.5;
        const hp = stats.hp * 0.25;
        const formationBonus = u.type.startsWith("Army") ? 1.25 : 1;
        return sum + (atk + def + hp) * formationBonus;
    }, 0);

    const cities = state.cities.filter(c => c.ownerId === playerId);
    const cityPower = cities.reduce((sum, c) => {
        const ward = c.buildings?.includes(BuildingType.CityWard) ? CITY_WARD_DEFENSE_BONUS : 0;
        return sum + (CITY_DEFENSE_BASE + ward) * 2 + (c.hp ?? 0) * 0.3;
    }, 0);

    return unitPower + cityPower;
}

/**
 * Estimate OFFENSIVE power for a player - excludes units that won't participate in attacks.
 * Used for war declaration decisions to ensure AI has actual offensive capability.
 * 
 * Excludes:
 * - Home defenders (isHomeDefender === true)
 * - Units garrisoned in cities (on a friendly city tile)
 * - Civilian units (Settlers, Scouts)
 */
export function estimateOffensivePower(playerId: string, state: GameState): number {
    const cities = state.cities.filter(c => c.ownerId === playerId);
    const cityCoords = new Set(cities.map(c => `${c.coord.q},${c.coord.r}`));

    const offensiveUnits = state.units.filter(u => {
        if (u.ownerId !== playerId) return false;
        // Exclude home defenders - they stay in territory
        if (u.isHomeDefender) return false;
        // Exclude garrisons - units on friendly city tiles
        if (cityCoords.has(`${u.coord.q},${u.coord.r}`)) return false;
        // Exclude civilians
        const stats = UNITS[u.type];
        if (stats.domain === "Civilian") return false;
        // Exclude pure scouts (no offensive capability)
        if (u.type === UnitType.Scout || u.type === UnitType.ArmyScout) return false;
        return true;
    });

    const unitPower = offensiveUnits.reduce((sum, u) => {
        const stats = UNITS[u.type];
        const atk = stats.atk * 2;
        const def = stats.def * 1.5;
        const hp = stats.hp * 0.25;
        const formationBonus = u.type.startsWith("Army") ? 1.25 : 1;
        return sum + (atk + def + hp) * formationBonus;
    }, 0);

    // Note: No city power for offensive calculation - cities don't attack
    return unitPower;
}

/**
 * v0.98 Update 4: Check if player has overwhelming military dominance (2x power over all enemies)
 */
function hasOverwhelmingPower(playerId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const activePlayers = state.players.filter(p => !p.isEliminated && p.id !== playerId);

    if (activePlayers.length === 0) return false;

    // Check if we have 2x the power of every remaining civ
    return activePlayers.every(p => {
        const theirPower = estimateMilitaryPower(p.id, state);
        return myPower >= theirPower * 2;
    });
}

/**
 * v0.98 Update 4: Find weak enemies (1-2 cities) that should be finished off
 */
export function findFinishableEnemies(playerId: string, state: GameState): string[] {
    const activePlayers = state.players.filter(p => !p.isEliminated && p.id !== playerId);
    const myPower = estimateMilitaryPower(playerId, state);

    return activePlayers
        .filter(p => {
            const theirCities = state.cities.filter(c => c.ownerId === p.id);
            const theirPower = estimateMilitaryPower(p.id, state);
            // Finishable: 1-2 cities AND we have at least 1.5x their power
            return theirCities.length <= 2 && theirCities.length > 0 && myPower >= theirPower * 1.5;
        })
        .map(p => p.id);
}

/**
 * v0.99 Update: Jade Covenant "Awakened Giant" Logic
 * Once they reach critical mass (25+ pop), they should pivot to a victory condition
 */
function getJadeCovenantGoal(playerId: string, state: GameState): AiVictoryGoal | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const totalPop = myCities.reduce((sum, c) => sum + c.pop, 0);

    // Trigger at 15 population OR 4 cities (critical mass)
    // v0.99 Tuning: Reduced from 20/6 to let them pivot earlier
    if (totalPop < 15 && myCities.length < 4) return null;

    const myPower = estimateMilitaryPower(playerId, state);

    // Calculate average enemy power
    const enemies = state.players.filter(p => p.id !== playerId && !p.isEliminated);
    if (enemies.length === 0) return "Conquest"; // Winner!

    const totalEnemyPower = enemies.reduce((sum, p) => sum + estimateMilitaryPower(p.id, state), 0);
    const avgEnemyPower = totalEnemyPower / enemies.length;

    // If we are stronger than average enemy (1.2x), go CRUSH them
    if (myPower > avgEnemyPower * 1.2) {
        aiInfo(`[AI Goal] JadeCovenant "Awakened Giant" - High Power (${myPower.toFixed(0)} vs avg ${avgEnemyPower.toFixed(0)}) -> CONQUEST`);
        return "Conquest";
    }

    // If we are safe (not weak), go PROGRESS to use our economy
    // Safe = at least 80% of average enemy power
    if (myPower > avgEnemyPower * 0.8) {
        aiInfo(`[AI Goal] JadeCovenant "Awakened Giant" - Safe Economy -> PROGRESS`);
        return "Progress";
    }

    // Otherwise stay Balanced/Defensive to survive
    return null;
}

export function aiVictoryBias(playerId: string, state: GameState): AiVictoryGoal {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return "Balanced";

    const personality = getPersonalityForPlayer(state, playerId);
    const progress = getProgressChainStatus(state, playerId);
    const capitals = state.cities.filter(c => c.ownerId === playerId && c.isCapital);

    // Determine fallback based on personality
    const prefersProgress = personality.projectRush?.type === "Project"
        ? personality.projectRush.id === ProjectId.Observatory
        : false;
    const aggressionForward = personality.aggression.warPowerThreshold < 1;
    const fallback = player.aiGoal ?? (prefersProgress ? "Progress" : aggressionForward ? "Conquest" : "Balanced");

    // ===========================================
    // PRIORITY 1: Titan Rampage (AetherianVanguard)
    // ===========================================
    if (player.civName === "AetherianVanguard" && hasTitan(playerId, state)) {
        aiInfo(`[AI Goal] ${playerId} Titan unleashed - CONQUEST`);
        return "Conquest";
    }

    // ===========================================
    // PRIORITY 1.5: Aetherian Post-Titan Fallback
    // ===========================================
    // On large/huge maps, after Titan dies and captured cities, pivot to Progress
    // This uses the captured cities' science output to win via Progress
    if (player.civName === "AetherianVanguard") {
        const hasTitansCore = state.cities.some(c =>
            c.ownerId === playerId && c.buildings?.includes(BuildingType.TitansCore)
        );
        const titanIsDead = hasTitansCore && !hasTitan(playerId, state);
        const myCities = state.cities.filter(c => c.ownerId === playerId);
        const mapSize = state.map.width * state.map.height;
        const isLargeOrHugeMap = mapSize > 300; // Standard ~391, Large ~475, Huge ~850

        if (titanIsDead && isLargeOrHugeMap) {
            aiInfo(`[AI Goal] ${playerId} Titan dead on large map - switching to PROGRESS with ${myCities.length} cities`);
            return "Progress";
        }
    }

    // ===========================================
    // PRIORITY 2: Near Progress Victory - PROTECT IT
    // ===========================================
    if (progress.isNearVictory) {
        aiInfo(`[AI Goal] ${playerId} near Progress victory - staying committed`);
        return "Progress";
    }

    // ===========================================
    // PRIORITY 3: Capital Safety Check for Progress
    // ===========================================
    const capitalsReasonablySafe = capitals.every(c => {
        const maxHp = c.maxHp ?? 15;
        const hpOk = c.hp >= maxHp * 0.4;
        const nearbyEnemies = state.units.filter(u =>
            u.ownerId !== playerId && hexDistance(u.coord, c.coord) <= 2
        );
        const hasStrongThreat = nearbyEnemies.some(u => {
            const stats = UNITS[u.type];
            return stats.atk >= 3 || stats.hp >= 10;
        });
        return hpOk && !hasStrongThreat;
    });

    // Early Progress commitment for progress-oriented civs
    if (progress.hasStarCharts && prefersProgress && capitalsReasonablySafe) {
        aiInfo(`[AI Goal] ${playerId} early Progress commitment`);
        return "Progress";
    }

    // Observatory commitment - reasonably safe
    if (progress.hasObservatory && capitalsReasonablySafe) {
        aiInfo(`[AI Goal] ${playerId} Observatory complete - Progress commitment`);
        return "Progress";
    }

    // ===========================================
    // PRIORITY 4: Conquest Opportunities
    // ===========================================

    // Overwhelming power -> finish them
    if (hasOverwhelmingPower(playerId, state)) {
        aiInfo(`[AI Goal] ${playerId} overwhelming power - CONQUEST`);
        return "Conquest";
    }

    // Progress race detection - if enemy is close, compete
    if (hasEnemyProgressThreat(state, playerId) && progress.hasObservatory) {
        aiInfo(`[AI Goal] ${playerId} Progress race detected - competing`);
        return "Progress";
    }

    // Finishable weak enemies
    const finishableEnemies = findFinishableEnemies(playerId, state);
    if (finishableEnemies.length > 0 && !progress.isNearVictory) {
        aiInfo(`[AI Goal] ${playerId} finishable enemies - CONQUEST`);
        return "Conquest";
    }

    // Enemy capital in strike range with armies
    const hasArmies = state.units.some(u => u.ownerId === playerId && u.type.startsWith("Army"));
    const enemyCapitalInRange = state.cities.some(c =>
        c.ownerId !== playerId && c.isCapital &&
        state.units.some(u => u.ownerId === playerId && hexDistance(u.coord, c.coord) <= 4)
    );
    if (hasArmies && enemyCapitalInRange && !progress.isNearVictory) {
        return "Conquest";
    }

    // ===========================================
    // PRIORITY 5: Dynamic Victory Path Evaluation
    // ===========================================
    // Replaces time-based triggers with strategic evaluation
    if (shouldConsiderProgressPivot(state, playerId)) {
        const victoryEval = evaluateBestVictoryPath(state, playerId);

        // v1.0.5: Removed confidence check - act on all Progress recommendations
        if (victoryEval.progressFaster) {
            aiInfo(`[AI Goal] ${playerId} Victory eval: Progress faster (${victoryEval.reason})`);
            return "Progress";
        }

        // If already invested in Progress, continue it
        if (progress.hasObservatory || progress.isBuildingProgressProject) {
            aiInfo(`[AI Goal] ${playerId} Continuing Progress chain investment`);
            return "Progress";
        }
    }

    // ===========================================
    // PRIORITY 5.5: Anti-Stall Fallback (Turn 250+)
    // ===========================================
    // Keep a safety valve to prevent infinite games
    if (state.turn >= 250 && !progress.hasObservatory && !progress.isBuildingProgressProject) {
        aiInfo(`[AI Goal] ${playerId} Turn 250+ with no Progress - anti-stall Conquest`);
        return "Conquest";
    }

    // ===========================================
    // CIV-SPECIFIC: Jade Covenant
    // ===========================================
    if (player.civName === "JadeCovenant") {
        const jadeGoal = getJadeCovenantGoal(playerId, state);
        if (jadeGoal) return jadeGoal;
    }

    // ===========================================
    // PRIORITY 6: Large Map Hybrid (6+ cities → concurrent Conquest + Progress)
    // ===========================================
    // On large/huge maps, conquest becomes harder due to travel distances and more civs.
    // Civs with 6+ cities should pursue Progress as a CONCURRENT victory condition.
    // We DON'T switch goal - they stay Conquest for military focus, but:
    // 1. Tech boost in tech.ts pushes them toward StarCharts path
    // 2. Build logic in cities.ts already includes Progress projects as fallback
    // 3. Once they have StarCharts, cities.ts prioritizes Progress chain automatically
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const mapSize = state.map.width * state.map.height;
    const isLargeMap = mapSize > 300; // Standard ~391, Large ~475, Huge ~850

    if (myCities.length >= 6 && isLargeMap && fallback === "Conquest") {
        // Log hybrid mode - goal stays Conquest but Progress is pursued concurrently
        aiInfo(`[AI Goal] ${playerId} Large map hybrid mode: ${myCities.length} cities, pursuing Conquest + Progress concurrently`);
        // Don't switch goal - stay Conquest to maintain military production focus
    }

    return fallback;
}
