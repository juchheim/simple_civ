import { applyAction } from "../../turn-loop.js";
import { Action, GameState } from "../../../core/types.js";

export function tryAction(state: GameState, action: Action): GameState {
    try {
        return applyAction(state, action);
    } catch {
        return state;
    }
}

