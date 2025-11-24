import { GameState } from "../core/types.js";
import { tryAction } from "./ai/shared/actions.js";
import { runAiTurnSequence } from "./ai/turn-runner.js";

export function runAiTurn(initialState: GameState, playerId: string): GameState {
    const prepared = runAiTurnSequence(initialState, playerId);
    return tryAction(prepared, { type: "EndTurn", playerId });
}
