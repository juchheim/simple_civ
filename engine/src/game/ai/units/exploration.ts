import { hexDistance, hexEquals, hexToString } from "../../../core/hex.js";
import { GameState, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { findPath } from "../../helpers/pathfinding.js";
import { tryAction } from "../shared/actions.js";
import { nearestByDistance } from "../shared/metrics.js";
import { isAtWar, isScoutType, stepToward } from "./unit-helpers.js";

export function patrolAndExplore(state: GameState, playerId: string): GameState {
    if (isAtWar(state, playerId)) return state;

    let next = state;
    const playerCities = next.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return next;

    const revealed = new Set(next.revealed[playerId] ?? []);
    const unseenTiles = next.map.tiles.filter(t => !revealed.has(hexToString(t.coord)));

    const scouts = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        isScoutType(u.type)
    );

    for (const scout of scouts) {
        const live = next.units.find(u => u.id === scout.id);
        if (!live || live.movesLeft <= 0) continue;

        const targetTile = unseenTiles.length
            ? nearestByDistance(live.coord, unseenTiles, t => t.coord)
            : null;
        if (!targetTile) continue;

        const path = findPath(live.coord, targetTile.coord, live, next);
        const step = path[0];
        if (step) {
            const provocative = next.cities.some(c =>
                c.ownerId !== playerId && hexDistance(c.coord, step) <= 1
            );
            if (provocative) continue;

            const moved = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: live.id,
                to: step
            });
            if (moved !== next) {
                next = moved;
            }
        }
    }

    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);

    const defenders = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian"
    );

    for (const unit of defenders) {
        const live = next.units.find(u => u.id === unit.id);
        if (!live || live.movesLeft <= 0) continue;

        const onCity = next.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, live.coord));
        if (onCity) continue;

        const nearSettler = settlers.some(s => hexDistance(s.coord, live.coord) <= 2);
        if (nearSettler) continue;

        const nearestCity = nearestByDistance(live.coord, playerCities, c => c.coord);
        if (!nearestCity) continue;

        if (hexDistance(live.coord, nearestCity.coord) > 2) {
            next = stepToward(next, playerId, live.id, nearestCity.coord);
        }
    }

    return next;
}
