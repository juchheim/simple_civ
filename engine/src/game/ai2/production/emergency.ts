import { GameState } from "../../../core/types.js";
import { UNIT_ROLES } from "../capabilities.js";

export function countMilitary(state: GameState, playerId: string): number {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        UNIT_ROLES[u.type] !== "civilian" &&
        UNIT_ROLES[u.type] !== "vision"
    ).length;
}

/**
 * Checks whether we are in a universal wartime emergency that should skip
 * victory projects and focus on rebuilding the army first.
 */
export function isWarEmergency(state: GameState, playerId: string, atWar: boolean, threshold = 5): boolean {
    if (!atWar) return false;
    return countMilitary(state, playerId) < threshold;
}
