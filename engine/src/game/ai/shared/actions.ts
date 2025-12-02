import { applyAction } from "../../turn-loop.js";
import { Action, GameState } from "../../../core/types.js";
import { TraceEntry, tracedApply } from "../trace.js";
import {
    canAttemptMove,
    canAttemptAttack,
    markActionFailed,
    hasActionFailed,
    updateOccupancyAfterMove
} from "./validation.js";
import { hexEquals } from "../../../core/hex.js";

let traceContext: { trace?: TraceEntry[]; playerId?: string } = {};

export function setTraceContext(trace: TraceEntry[] | undefined, playerId: string | undefined) {
    traceContext = { trace, playerId };
}

export function clearTraceContext() {
    traceContext = {};
}

/**
 * Pre-validates an action using lightweight O(1) checks before attempting the expensive applyAction.
 * Returns false if the action will definitely fail, true if it might succeed.
 */
function canAttemptAction(state: GameState, action: Action): boolean {
    // Check if this exact action already failed this turn
    if (hasActionFailed(action)) return false;

    if (action.type === "MoveUnit") {
        let unit: any;
        for (const u of state.units) {
            if (u.id === action.unitId) {
                unit = u;
                break;
            }
        }
        if (!unit) return false;
        return canAttemptMove(state, action.playerId, unit, action.to);
    }

    if (action.type === "Attack") {
        let attacker: any;
        for (const u of state.units) {
            if (u.id === action.attackerId) {
                attacker = u;
                break;
            }
        }
        if (!attacker) return false;
        return canAttemptAttack(state, action.playerId, attacker, action.targetId, action.targetType);
    }

    // Other action types: allow attempt (no pre-validation yet)
    return true;
}

export function tryAction(state: GameState, action: Action): GameState {
    // Pre-validation: skip expensive applyAction if action will definitely fail
    if (!canAttemptAction(state, action)) {
        return state;
    }

    try {
        let result: GameState;
        if (traceContext.trace && traceContext.playerId) {
            result = tracedApply(state, action, traceContext.trace, traceContext.playerId);
        } else {
            result = applyAction(state, action);
        }

        // Action succeeded - update tracking
        if (action.type === "MoveUnit" && result !== state) {
            const unit = result.units.find(u => u.id === action.unitId);
            if (unit) {
                // Find the original position from the old state
                const oldUnit = state.units.find(u => u.id === action.unitId);
                if (oldUnit && !hexEquals(oldUnit.coord, unit.coord)) {
                    updateOccupancyAfterMove(unit, oldUnit.coord, unit.coord);
                }
            }
        }

        return result;
    } catch (e) {
        // Action failed - mark it so we don't retry
        markActionFailed(action);

        // Only log unexpected failures (not routine ones)
        const msg = (e as Error).message;
        if (msg !== "No moves left" && msg !== "Unit not found") {
            console.error(`[AI ACTION FAILED] ${action.type}: ${msg}`);
        }
        return state;
    }
}
