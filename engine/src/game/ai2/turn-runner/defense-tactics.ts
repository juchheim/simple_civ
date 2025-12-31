import { GameState } from "../../../core/types.js";
import { runTacticalPlanner } from "../tactical-planner.js";

export function runDefenseAndTactics(state: GameState, playerId: string): GameState {
    return runTacticalPlanner(state, playerId);
}
