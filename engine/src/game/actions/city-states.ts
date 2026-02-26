import { GameState } from "../../core/types.js";
import { investInCityState } from "../city-states.js";

export function handleInvestCityStateInfluence(
    state: GameState,
    action: { type: "InvestCityStateInfluence"; playerId: string; cityStateId: string },
): GameState {
    investInCityState(state, action.playerId, action.cityStateId);
    return state;
}
