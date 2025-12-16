import { GameState } from "../core/types.js";
import { tryAction } from "./ai/shared/actions.js";
import { runAiTurnSequenceV2 } from "./ai2/turn-runner.js";

export function runAiTurn(initialState: GameState, playerId: string): GameState {
    const prepared = runAiTurnSequenceV2(initialState, playerId);
    prepared.aiSystem = "UtilityV2";
    return tryAction(prepared, { type: "EndTurn", playerId });
}
