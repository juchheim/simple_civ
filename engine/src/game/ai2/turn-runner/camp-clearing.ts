import { GameState } from "../../../core/types.js";
import { manageCampClearing } from "../../ai/camp-clearing.js";
import { attackCampTargets, moveUnitsForCampClearing } from "../../ai/units/offense-camp-clearing.js";

export function runCampClearing(state: GameState, playerId: string): GameState {
    let next = manageCampClearing(state, playerId);
    next = moveUnitsForCampClearing(next, playerId);
    next = attackCampTargets(next, playerId);
    return next;
}
