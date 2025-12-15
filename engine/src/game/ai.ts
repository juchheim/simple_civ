import { AiSystem, GameState } from "../core/types.js";
import { tryAction } from "./ai/shared/actions.js";
import { runAiTurnSequence } from "./ai/turn-runner.js";
import { runAiTurnSequenceV2 } from "./ai2/turn-runner.js";

export function runAiTurn(initialState: GameState, playerId: string): GameState {
    const system: AiSystem = initialState.aiSystem ?? "Legacy";
    const prepared = system === "UtilityV2"
        ? runAiTurnSequenceV2(initialState, playerId)
        : runAiTurnSequence(initialState, playerId);
    return tryAction(prepared, { type: "EndTurn", playerId });
}
