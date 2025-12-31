/**
 * strategic-plan.ts - Goal-Driven AI: Phases, Plans, and Evaluation
 * 
 * This module determines:
 * 1. Current game phase (Expand/Develop/Execute)
 * 2. Strategic plan based on goal and phase
 * 3. Capability gaps (what we need but don't have)
 * 4. Evaluation of progress
 */

import { AiVictoryGoal, GameState, TechId, UnitType } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";
import { hexDistance } from "../../core/hex.js";
import { UNIT_ROLES, TECH_CHAINS, getUnitsWithRole, UnitRole } from "./capabilities.js";
import { isCityOnlySiegeUnitType, isCombatUnitType, isSiegeRole } from "./schema.js";

// ... existing code ...

// =============================================================================
// GAME PHASES
// =============================================================================

export type GamePhase = "Expand" | "Develop" | "Execute";

export function getGamePhase(state: GameState): GamePhase {
    if (state.turn < 40) return "Expand";
    if (state.turn < 120) return "Develop";
    return "Execute";
}

// =============================================================================
// CAPABILITY ASSESSMENT
// =============================================================================

export type CapabilityReport = {
    siege: number;        // Count of siege units
    capture: number;      // Count of capture units
    defense: number;      // Count of defense units
    vision: number;       // Count of vision units
    garrison: number;     // Cities with military unit
    undefended: number;   // Cities without military unit
    totalMilitary: number;
};

export function assessCapabilities(state: GameState, playerId: string): CapabilityReport {
    const myUnits = state.units.filter(u => u.ownerId === playerId);
    const myCities = state.cities.filter(c => c.ownerId === playerId);

    let siege = 0, capture = 0, defense = 0, vision = 0, totalMilitary = 0;

    for (const unit of myUnits) {
        const role = UNIT_ROLES[unit.type];
        if (role === "civilian") continue;
        if (isCombatUnitType(unit.type)) totalMilitary++;
        if (isSiegeRole(role)) siege++;
        else if (role === "capture") capture++;
        else if (role === "defense") defense++;
        else if (role === "vision") vision++;
    }

    // Count garrisoned cities
    let garrison = 0;
    for (const city of myCities) {
        // v2.1: Relaxed garrison check - count as garrisoned if unit is ON or ADJACENT to city
        // This prevents expansion stalls when units are defending from the field (especially Lorekeepers)
        const hasDefender = myUnits.some(u =>
            isCombatUnitType(u.type) && hexDistance(u.coord, city.coord) <= 1
        );
        if (hasDefender) garrison++;
    }

    return {
        siege,
        capture,
        defense,
        vision,
        garrison,
        undefended: myCities.length - garrison,
        totalMilitary,
    };
}

// =============================================================================
// GOAL REQUIREMENTS
// =============================================================================

export type GoalRequirements = {
    minSiege: number;
    minCapture: number;
    minDefense: number;
    minVision: number;
    garrisonAll: boolean;
    techTarget: string;     // Key in TECH_CHAINS
    attackThreshold: number; // Power ratio needed to attack
};

// Phase multipliers - scale up military requirements as game progresses
// v2: Reduced Execute from 1.5x to 1.2x to prevent over-building stalls
const PHASE_MULTIPLIERS: Record<GamePhase, number> = {
    Expand: 0.5,
    Develop: 1.0,
    Execute: 1.2,
};

const PROGRESS_DEFENSE_BASE: Record<GamePhase, number> = {
    Expand: 3,
    Develop: 4,
    Execute: 5,
};

const CIV_TECH_OVERRIDES: Record<string, string> = {
    StarborneSeekers: "ProgressRush",
    ScholarKingdoms: "Defensive",
};

function resolveTechTarget(goal: AiVictoryGoal, civName: string): string {
    if (goal === "Conquest") {
        return civName === "AetherianVanguard" ? "Titan" : "Landship";
    }

    const civOverride = CIV_TECH_OVERRIDES[civName];
    if (goal === "Progress") {
        return civOverride ?? "Progress";
    }

    return civOverride ?? "Landship";
}

export function getGoalRequirements(goal: AiVictoryGoal, civName: string, phase: GamePhase, _numCities: number = 1): GoalRequirements {
    const phaseMultiplier = PHASE_MULTIPLIERS[phase];
    const techTarget = resolveTechTarget(goal, civName);

    switch (goal) {
        case "Conquest": {
            // Conquest: Offense-focused, scale with phase
            // v3: Increased base from 3 to 5 (adds 2 more units to attack forces)
            const baseSiege = Math.ceil(5 * phaseMultiplier);
            const baseCapture = Math.ceil(5 * phaseMultiplier);
            return {
                minSiege: baseSiege,
                minCapture: baseCapture,
                minDefense: 0,
                minVision: 1,
                garrisonAll: true,
                techTarget,
                attackThreshold: phase === "Execute" ? 1.1 : 1.3,
            };
        }
        case "Progress": {
            // Progress: Defense-focused but not excessive, need production for projects
            // v3: Reduced from 4/6/7 to 3/4/5 to free production capacity
            const defenseBase = PROGRESS_DEFENSE_BASE[phase];
            return {
                minSiege: 1,
                minCapture: 2,
                minDefense: defenseBase,
                minVision: 1,
                garrisonAll: true,
                techTarget,
                attackThreshold: 2.0,
            };
        }
        default: {
            // Balanced: Moderate scaling
            const baseMil = Math.ceil(2 * phaseMultiplier);
            return {
                minSiege: baseMil,
                minCapture: baseMil,
                minDefense: Math.ceil(1.5 * phaseMultiplier),
                minVision: 1,
                garrisonAll: true,
                techTarget,
                attackThreshold: 1.5,
            };
        }
    }
}

// =============================================================================
// CAPABILITY GAPS
// =============================================================================

export type CapabilityGaps = {
    needSiege: number;
    needCapture: number;
    needDefense: number;
    needVision: number;
    needGarrison: number;
    priority: UnitRole | "garrison";  // Most urgent need
};

export function findCapabilityGaps(
    current: CapabilityReport,
    required: GoalRequirements
): CapabilityGaps {
    const needGarrison = required.garrisonAll ? current.undefended : 0;
    const needSiege = Math.max(0, required.minSiege - current.siege);
    const needCapture = Math.max(0, required.minCapture - current.capture);
    const needDefense = Math.max(0, required.minDefense - current.defense);
    const needVision = Math.max(0, required.minVision - current.vision);

    // Priority: Garrison first, then biggest gap
    let priority: UnitRole | "garrison" = "capture";
    if (needGarrison > 0) priority = "garrison";
    else if (needSiege >= needCapture && needSiege >= needDefense) priority = "siege";
    else if (needCapture >= needDefense) priority = "capture";
    else if (needDefense > 0) priority = "defense";
    else if (needVision > 0) priority = "vision";

    return { needSiege, needCapture, needDefense, needVision, needGarrison, priority };
}

// =============================================================================
// NEXT TECH IN CHAIN
// =============================================================================

export function getNextTechInChain(playerTechs: TechId[], target: string): TechId | null {
    const chain = TECH_CHAINS[target];
    if (!chain) return null;

    for (const tech of chain) {
        if (!playerTechs.includes(tech)) {
            return tech;
        }
    }
    return null; // Chain complete
}

// =============================================================================
// BEST UNIT FOR ROLE
// =============================================================================

export function getBestUnitForRole(
    role: UnitRole,
    unlockedUnits: UnitType[]
): UnitType | null {
    const candidates = getUnitsWithRole(role).filter(u => unlockedUnits.includes(u));
    if (candidates.length === 0) return null;

    // Prefer higher-tier units (Armies > Base, Landship > SpearGuard)
    // Simple heuristic: higher cost = better
    return candidates
        .sort((a, b) => {
            if (role === "siege") {
                const aIsCitySiege = isCityOnlySiegeUnitType(a);
                const bIsCitySiege = isCityOnlySiegeUnitType(b);
                if (aIsCitySiege !== bIsCitySiege) return aIsCitySiege ? 1 : -1;
            }
            return (UNITS[b]?.cost ?? 0) - (UNITS[a]?.cost ?? 0);
        })[0];
}

// =============================================================================
// EXECUTION READINESS
// =============================================================================

export type ExecutionReadiness = {
    ready: boolean;
    reason: string;
    citiesDefended: boolean;
    hasMinimumForce: boolean;
    powerAdvantage: boolean;
};

function getEffectiveAttackThreshold(
    baseThreshold: number,
    warDuration: number,
    turn: number
): number {
    let effectiveThreshold = baseThreshold;

    // After 20 turns in war OR turn 150+: reduce threshold by 30%
    // v4: Reverted to less aggressive escalation
    if (warDuration > 30 || turn > 180) {
        effectiveThreshold *= 0.8;
    }
    // After 50 turns in war OR turn 220+: attack when equal
    if (warDuration > 50 || turn > 220) {
        effectiveThreshold = 1.0;
    }
    // After 70 turns in war OR turn 260+: attack even when slightly weaker
    if (warDuration > 70 || turn > 260) {
        effectiveThreshold = 0.85;
    }

    return effectiveThreshold;
}

export function checkExecutionReadiness(
    state: GameState,
    playerId: string,
    targetId: string,
    requirements: GoalRequirements,
    warStartTurn?: number
): ExecutionReadiness {
    const caps = assessCapabilities(state, playerId);
    const citiesDefended = caps.undefended === 0;
    const hasMinimumForce = caps.siege >= requirements.minSiege && caps.capture >= requirements.minCapture;

    // Power calculation
    const myPower = caps.totalMilitary;
    const theirPower = state.units.filter(u =>
        u.ownerId === targetId &&
        isCombatUnitType(u.type)
    ).length;

    // War escalation timer - break deadlocks (v2: more aggressive)
    const warDuration = warStartTurn ? state.turn - warStartTurn : 0;
    const effectiveThreshold = getEffectiveAttackThreshold(
        requirements.attackThreshold,
        warDuration,
        state.turn
    );

    const powerAdvantage = theirPower === 0 || (myPower / theirPower) >= effectiveThreshold;

    const ready = citiesDefended && hasMinimumForce && powerAdvantage;
    let reason = ready ? "Ready to attack" : "";
    if (!citiesDefended) reason = "Cities undefended";
    else if (!hasMinimumForce) reason = "Need more units";
    else if (!powerAdvantage) reason = `Need power advantage (${(myPower / theirPower).toFixed(1)} < ${effectiveThreshold.toFixed(1)})`;

    return { ready, reason, citiesDefended, hasMinimumForce, powerAdvantage };
}
