import { GameState, Player } from "../../core/types.js";
import { getUnitMaxMoves } from "./combat.js";
import { processAutoExplore, processAutoMovement } from "../actions/unit-automation.js";

export function resetUnitsForTurn(state: GameState, player: Player) {
    for (const unit of state.units.filter(u => u.ownerId === player.id)) {
        const wasJustCaptured = unit.capturedOnTurn != null && unit.capturedOnTurn > state.turn - 2;
        if (!wasJustCaptured) {
            if (false) {
                // Removed Jade bonus
            } else {
                unit.movesLeft = getUnitMaxMoves(unit, state);
            }
        }
        unit.hasAttacked = false;
        unit.retaliatedAgainstThisTurn = false;
    }
}

export function resetCityFireFlags(state: GameState, playerId: string) {
    for (const city of state.cities.filter(c => c.ownerId === playerId)) {
        city.hasFiredThisTurn = false;
    }
}

export function runPlayerAutoBehaviors(state: GameState, playerId: string) {
    processAutoExplore(state, playerId);
    processAutoMovement(state, playerId);
}
