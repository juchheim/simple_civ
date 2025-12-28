import type { GameState } from "../../core/types.js";
import type { TacticalContext } from "./tactical-context.js";
import { followTitan, runPreTitanRally, runTitanAgent } from "./titan-agent.js";

/**
 * Titan orchestration wrapper so tactics.ts only delegates to a single entry point
 * for Titan-specific behavior.
 */
export function runTitanPreMovement(state: GameState, playerId: string): GameState {
    let next = runPreTitanRally(state, playerId);
    next = followTitan(next, playerId);
    return next;
}

export function runTitanPhase(state: GameState, playerId: string, ctx?: TacticalContext): GameState {
    return runTitanAgent(state, playerId, ctx);
}
