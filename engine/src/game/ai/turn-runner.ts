import { GameState } from "../../core/types.js";
import { aiVictoryBias, setAiGoal } from "./goals.js";
import { pickTech } from "./tech.js";
import { assignWorkedTiles, pickCityBuilds } from "./cities.js";
import { moveSettlersAndFound, manageSettlerEscorts, attackTargets, moveMilitaryTowardTargets } from "./units.js";
import { handleDiplomacy } from "./diplomacy.js";

export function runAiTurnSequence(initialState: GameState, playerId: string): GameState {
    let state = initialState;
    const goal = aiVictoryBias(playerId, state);
    state = setAiGoal(state, playerId, goal);

    state = pickTech(state, playerId, goal);
    state = pickCityBuilds(state, playerId, goal);
    state = assignWorkedTiles(state, playerId, goal);
    state = moveSettlersAndFound(state, playerId);
    state = manageSettlerEscorts(state, playerId);
    state = handleDiplomacy(state, playerId);
    state = attackTargets(state, playerId);
    state = moveMilitaryTowardTargets(state, playerId);

    return state;
}

