import { GameState } from "../../core/types.js";
import { runAiTurnSequenceV2 } from "../ai2/turn-runner.js";
import { TraceEntry, wrapAiRunner } from "./trace.js";

export function runAiTurnSequence(initialState: GameState, playerId: string): GameState {
    const result = runAiTurnSequenceV2(initialState, playerId);
    result.aiSystem = "UtilityV2";
    return result;
}

export function runAiTurnSequenceWithTrace(initialState: GameState, playerId: string, trace: TraceEntry[], _options?: { skipDiplomacy?: boolean }): GameState {
    const runWithTrace = wrapAiRunner(runAiTurnSequence, trace);
    return runWithTrace(initialState, playerId);
}
