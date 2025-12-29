import { DiplomacyState, GameState, ProjectId } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import type { AiPlayerMemoryV2 } from "../memory.js";

// ============================================================================
// WAR ESCALATION & POWER COMPARISON (from Legacy AI)
// ============================================================================

/**
 * War escalation factor - civs become MORE aggressive as game progresses
 * Adjusted: 100/150/200 turns instead of Legacy's 100-180
 */
export function getWarEscalationFactor(turn: number): number {
    if (turn < 100) return 1.0;  // No escalation before turn 100
    if (turn < 150) {
        // Turn 100-150: 1.0 -> 0.8 (20% more aggressive)
        const progress = (turn - 100) / 50;
        return 1.0 - (progress * 0.2);
    }
    if (turn < 200) {
        // Turn 150-200: 0.8 -> 0.6 (40% more aggressive total)
        const progress = (turn - 150) / 50;
        return 0.8 - (progress * 0.2);
    }
    // Turn 200+: 0.6 (40% more aggressive - "death war" mode)
    return 0.6;
}

/**
 * Check if we have DOMINATING power (5x+) over target
 * Dominant civs should ALWAYS be at war until enemy eliminated
 */
export function hasDominatingPower(state: GameState, playerId: string, targetId: string): boolean {
    const myUnits = state.units.filter(u => u.ownerId === playerId && u.type !== "Settler" && u.type !== "Scout");
    const theirUnits = state.units.filter(u => u.ownerId === targetId && u.type !== "Settler" && u.type !== "Scout");

    const myPower = myUnits.length;
    const theirPower = Math.max(1, theirUnits.length);

    // 5x power AND at least 10 units (not just 5 vs 1)
    return myPower >= theirPower * 5 && myPower >= 10;
}

/**
 * Check if target has a capturable city (HP <= 0)
 * NEVER accept peace when we can capture a city this turn!
 */
export function hasCapturableCity(state: GameState, targetId: string): boolean {
    return state.cities.some(c => c.ownerId === targetId && c.hp <= 0);
}

export function hasUnitType(state: GameState, playerId: string, unitType: string): boolean {
    return state.units.some(u => u.ownerId === playerId && u.type === unitType);
}

export function countNearbyByPredicate(
    state: GameState,
    playerId: string,
    center: { q: number; r: number },
    distMax: number,
    pred: (u: any) => boolean
): number {
    return state.units.filter(u => u.ownerId === playerId && pred(u) && hexDistance(u.coord, center) <= distMax).length;
}

export function stanceDurationOk(
    state: GameState,
    playerId: string,
    targetId: string,
    minTurns: number,
    memory: AiPlayerMemoryV2
): boolean {
    const last = memory.lastStanceTurn?.[targetId] ?? 0;
    return last === 0 || (state.turn - last) >= minTurns;
}

export function isProgressThreat(state: GameState, targetPlayerId: string): boolean {
    const p = state.players.find(x => x.id === targetPlayerId);
    if (!p) return false;
    const completedObs = p.completedProjects?.includes(ProjectId.Observatory);
    const completedAcad = p.completedProjects?.includes(ProjectId.GrandAcademy);
    const completedExp = p.completedProjects?.includes(ProjectId.GrandExperiment);
    if (completedExp) return true;

    // If they are currently building any progress-chain project, treat as a threat that scales with turn.
    const buildingProgress = state.cities.some(c =>
        c.ownerId === targetPlayerId &&
        c.currentBuild?.type === "Project" &&
        (c.currentBuild.id === ProjectId.Observatory || c.currentBuild.id === ProjectId.GrandAcademy || c.currentBuild.id === ProjectId.GrandExperiment)
    );

    // Early chain is only a "soft" threat; once Observatory is done or they are building Academy/Experiment, it's urgent.
    if (completedAcad || buildingProgress) return true;
    if (completedObs && state.turn >= 110) return true;
    return false;
}

export function currentWarCount(state: GameState, playerId: string): number {
    return state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        (state.diplomacy?.[playerId]?.[p.id] ?? DiplomacyState.Peace) === DiplomacyState.War
    ).length;
}
