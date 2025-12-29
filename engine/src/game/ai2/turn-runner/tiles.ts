import { AiVictoryGoal, GameState } from "../../../core/types.js";
import { assignWorkedTilesV2 } from "../tiles.js";

export function runTileAssignments(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    return assignWorkedTilesV2(state, playerId, goal);
}
