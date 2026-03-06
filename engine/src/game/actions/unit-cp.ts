import { Action, GameState } from "../../core/types.js";
import { assertOwnership, getUnitOrThrow } from "../helpers/action-helpers.js";

export function handleGrantCommandPoint(
    state: GameState,
    action: Extract<Action, { type: "GrantCommandPoint" }>
): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error("Player not found");
    if ((player.commandPoints ?? 0) <= 0) throw new Error("No Command Points available");

    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);

    if (unit.hasUsedCP || unit.cpGranted) {
        throw new Error("Unit has already used or received a Command Point this turn");
    }

    // Restore one action's worth of capability
    unit.movesLeft = Math.max(unit.movesLeft, 1);
    unit.hasAttacked = false;
    unit.cpGranted = true;

    player.commandPoints = (player.commandPoints ?? 0) - 1;
    player.lifetimeCommandPointsSpent = (player.lifetimeCommandPointsSpent ?? 0) + 1;
    return state;
}
