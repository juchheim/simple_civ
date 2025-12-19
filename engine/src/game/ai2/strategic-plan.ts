/**
 * strategic-plan.ts - Goal-Driven AI: Phases, Plans, and Evaluation
 * 
 * This module determines:
 * 1. Current game phase (Expand/Develop/Execute)
 * 2. Strategic plan based on goal and phase
 * 3. Capability gaps (what we need but don't have)
 * 4. Evaluation of progress
 */

import { AiVictoryGoal, GameState, TechId, UnitType, ProjectId } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";
import { hexDistance } from "../../core/hex.js";
import { UNIT_ROLES, TECH_CHAINS, getUnitsWithRole, UnitRole } from "./capabilities.js";

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
        totalMilitary++;
        if (role === "siege") siege++;
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
            UNIT_ROLES[u.type] !== "civilian" && hexDistance(u.coord, city.coord) <= 1
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

export function getGoalRequirements(goal: AiVictoryGoal, civName: string, phase: GamePhase, numCities: number = 1): GoalRequirements {
    // Phase multipliers - scale up military requirements as game progresses
    // v2: Reduced Execute from 1.5x to 1.2x to prevent over-building stalls
    const phaseMultiplier = phase === "Expand" ? 0.5 : phase === "Develop" ? 1.0 : 1.2;

    if (goal === "Conquest") {
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
            techTarget: civName === "AetherianVanguard" ? "Titan" : "Landship",
            attackThreshold: phase === "Execute" ? 1.1 : 1.3,
        };
    } else if (goal === "Progress") {
        // Progress: Defense-focused but not excessive, need production for projects
        // v3: Reduced from 4/6/7 to 3/4/5 to free production capacity
        const defenseBase = phase === "Expand" ? 3 : phase === "Develop" ? 4 : 5;

        // v4: Use Defensive chain for Scholar/Starborne to prioritize ShieldGenerator
        let techTarget = "Progress";
        if (civName === "StarborneSeekers") {
            techTarget = "SpiritObservatory";
        } else if (civName === "ScholarKingdoms") {
            techTarget = "Defensive"; // Will rush PlasmaShields → ShieldGenerator
        }

        return {
            minSiege: 1,
            minCapture: 2,
            minDefense: defenseBase,
            minVision: 1,
            garrisonAll: true,
            techTarget,
            attackThreshold: 2.0,
        };
    } else {
        // Balanced: Moderate scaling
        const baseMil = Math.ceil(2 * phaseMultiplier);

        // v5: Even with Balanced goal, defensive civs should use Defensive chain
        // This ensures they research PlasmaShields for ShieldGenerator
        let techTarget = "Landship";
        if (civName === "StarborneSeekers") {
            techTarget = "SpiritObservatory";
        } else if (civName === "ScholarKingdoms") {
            techTarget = "Defensive";
        }

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
    return candidates.sort((a, b) => (UNITS[b]?.cost ?? 0) - (UNITS[a]?.cost ?? 0))[0];
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
        UNIT_ROLES[u.type] !== "civilian"
    ).length;

    // War escalation timer - break deadlocks (v2: more aggressive)
    let effectiveThreshold = requirements.attackThreshold;
    const warDuration = warStartTurn ? state.turn - warStartTurn : 0;

    // After 20 turns in war OR turn 150+: reduce threshold by 30%
    // v4: Reverted to less aggressive escalation
    if (warDuration > 30 || state.turn > 180) {
        effectiveThreshold *= 0.8;
    }
    // After 50 turns in war OR turn 220+: attack when equal
    if (warDuration > 50 || state.turn > 220) {
        effectiveThreshold = 1.0;
    }
    // After 70 turns in war OR turn 260+: attack even when slightly weaker
    if (warDuration > 70 || state.turn > 260) {
        effectiveThreshold = 0.85;
    }

    const powerAdvantage = theirPower === 0 || (myPower / theirPower) >= effectiveThreshold;

    const ready = citiesDefended && hasMinimumForce && powerAdvantage;
    let reason = ready ? "Ready to attack" : "";
    if (!citiesDefended) reason = "Cities undefended";
    else if (!hasMinimumForce) reason = "Need more units";
    else if (!powerAdvantage) reason = `Need power advantage (${(myPower / theirPower).toFixed(1)} < ${effectiveThreshold.toFixed(1)})`;

    return { ready, reason, citiesDefended, hasMinimumForce, powerAdvantage };
}
