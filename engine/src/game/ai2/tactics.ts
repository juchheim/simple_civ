import { GameState } from "../../core/types.js";
import { runTacticalPlanner } from "./tactical-planner.js";

export function runTacticsV2(state: GameState, playerId: string): GameState {
    return runTacticalPlanner(state, playerId, "offense-only");
}
