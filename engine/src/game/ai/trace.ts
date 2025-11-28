import { GameState, Action } from "../../core/types.js";
import { applyAction } from "../turn-loop.js";

export function safeClone<T>(value: T): T {
    try {
        // structuredClone available in modern runtimes
        return structuredClone(value);
    } catch {
        return JSON.parse(JSON.stringify(value));
    }
}

export type TraceEntry = {
    playerId: string;
    action: Action | { type: "StartTurn" } | { type: "EndTurn" };
    before: GameState;
    after: GameState;
};

export function tracedApply(state: GameState, action: Action, trace: TraceEntry[], playerId: string): GameState {
    const before = safeClone(state);
    const after = applyAction(state, action);
    trace.push({ playerId, action, before, after: safeClone(after) });
    return after;
}

export function wrapAiRunner(
    run: (state: GameState, playerId: string) => GameState,
    trace: TraceEntry[]
): (state: GameState, playerId: string) => GameState {
    return (state: GameState, playerId: string) => {
        trace.push({ playerId, action: { type: "StartTurn" }, before: safeClone(state), after: safeClone(state) });
        const after = run(state, playerId);
        trace.push({ playerId, action: { type: "EndTurn" }, before: safeClone(state), after: safeClone(after) });
        return after;
    };
}
