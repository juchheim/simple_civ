import { GameState } from "../../../core/types.js";
import { manageCampClearing } from "../../ai/camp-clearing.js";

export function runCampClearing(state: GameState, playerId: string): GameState {
    return manageCampClearing(state, playerId);
}
