import { applyAction } from "../../turn-loop.js";
import { Action, GameState } from "../../../core/types.js";
import { TraceEntry, tracedApply } from "../trace.js";

let traceContext: { trace?: TraceEntry[]; playerId?: string } = {};

export function setTraceContext(trace: TraceEntry[] | undefined, playerId: string | undefined) {
    traceContext = { trace, playerId };
}

export function clearTraceContext() {
    traceContext = {};
}

export function tryAction(state: GameState, action: Action): GameState {
    try {
        if (traceContext.trace && traceContext.playerId) {
            return tracedApply(state, action, traceContext.trace, traceContext.playerId);
        }
        return applyAction(state, action);
    } catch {
        return state;
    }
}
