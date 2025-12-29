import { AiVictoryGoal, GameState } from "../../../core/types.js";
import { tryAction } from "../../ai/shared/actions.js";
import { decideDiplomacyActionsV2 } from "../diplomacy.js";

export function runDiplomacy(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const dip = decideDiplomacyActionsV2(next, playerId, goal);
    next = dip.state;
    for (const action of dip.actions) {
        next = tryAction(next, action);
    }
    return next;
}
