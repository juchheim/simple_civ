import { runAiTurn as engineRunAiTurn } from "@simple-civ/engine";
import { GameState } from "./engine-types";

// Thin wrapper so the client uses the engine AI executor (single source of truth).
export function runAiTurn(initialState: GameState, playerId: string): GameState {
    return engineRunAiTurn(initialState as any, playerId) as GameState;
}
