import { GameState } from "../../../core/types.js";
import { patrolAndExplore } from "../../ai/units/exploration.js";
import { considerRazing } from "../../ai/cities.js";

export function runPostCombat(state: GameState, playerId: string): GameState {
    let next = state;
    next = considerRazing(next, playerId);
    next = patrolAndExplore(next, playerId);
    return next;
}
