import { GameState } from "../../../core/types.js";
import { manageSettlerEscorts, moveSettlersAndFound } from "../../ai/units/settlers.js";

export function runExpansion(state: GameState, playerId: string): GameState {
    let next = state;
    next = manageSettlerEscorts(next, playerId);
    next = moveSettlersAndFound(next, playerId);
    return next;
}
