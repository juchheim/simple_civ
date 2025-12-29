import { AiVictoryGoal, GameState } from "../../../core/types.js";
import { tryAction } from "../../ai/shared/actions.js";
import { chooseCityBuildV2 } from "../production.js";

export function runCityBuilds(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    for (const city of myCities) {
        if (city.currentBuild) continue;
        const opt = chooseCityBuildV2(next, playerId, city, goal);
        if (!opt) continue;
        next = tryAction(next, {
            type: "SetCityBuild",
            playerId,
            cityId: city.id,
            buildType: opt.type,
            buildId: opt.id,
            markAsHomeDefender: opt.markAsHomeDefender
        });
    }
    return next;
}
