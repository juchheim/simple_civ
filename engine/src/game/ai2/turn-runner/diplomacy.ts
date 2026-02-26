import { AiVictoryGoal, GameState } from "../../../core/types.js";
import { tryAction } from "../../ai/shared/actions.js";
import { decideDiplomacyActionsV2 } from "../diplomacy.js";
import { pickCityStateInvestmentTarget } from "../city-state-policy.js";

function maybeInvestInCityState(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.isEliminated) return state;

    const cityStates = state.cityStates ?? [];
    if (cityStates.length === 0) return state;

    const best = pickCityStateInvestmentTarget(state, playerId, goal);
    if (!best) return state;

    return tryAction(state, {
        type: "InvestCityStateInfluence",
        playerId,
        cityStateId: best.cityStateId,
    });
}

export function runDiplomacy(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const dip = decideDiplomacyActionsV2(next, playerId, goal);
    next = dip.state;
    for (const action of dip.actions) {
        next = tryAction(next, action);
    }
    next = maybeInvestInCityState(next, playerId, goal);
    return next;
}
