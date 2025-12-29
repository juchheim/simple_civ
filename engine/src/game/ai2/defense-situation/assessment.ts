import { City, GameState, Unit } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { isMilitary } from "./metrics.js";

export type DefenseSnapshot = {
    nearbyEnemies: Unit[];
    nearbyFriendlies: Unit[];
    garrison: Unit | null;
    ringUnits: Unit[];
};

export function buildDefenseSnapshot(
    state: GameState,
    city: City,
    playerId: string,
    detectionRange: number,
    ringRange: number
): DefenseSnapshot {
    const nearbyEnemies = state.units.filter(u =>
        u.ownerId !== playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, city.coord) <= detectionRange
    );

    const nearbyFriendlies = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, city.coord) <= ringRange
    );

    const garrison = state.units.find(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.coord.q === city.coord.q &&
        u.coord.r === city.coord.r
    ) || null;

    const ringUnits = nearbyFriendlies.filter(u =>
        u.coord.q !== city.coord.q || u.coord.r !== city.coord.r
    );

    return {
        nearbyEnemies,
        nearbyFriendlies,
        garrison,
        ringUnits,
    };
}
