// Perimeter city detection helpers for AI defense.
import { GameState } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { isMilitary } from "./unit-roles.js";

/**
 * v7.2: Determine if a city is on the perimeter (border) of the empire.
 * A perimeter city is closer to enemy cities/units than other cities.
 * Interior cities are protected by perimeter cities.
 */
export function isPerimeterCity(
    state: GameState,
    city: { coord: { q: number; r: number }, isCapital?: boolean },
    playerId: string
): boolean {
    // Find enemy cities and units
    const enemyPlayers = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated
    );
    const enemyIds = new Set(enemyPlayers.map(p => p.id));

    const enemyCities = state.cities.filter(c => enemyIds.has(c.ownerId));
    const enemyUnits = state.units.filter(u =>
        enemyIds.has(u.ownerId) &&
        isMilitary(u)
    );

    if (enemyCities.length === 0 && enemyUnits.length === 0) {
        // No enemies yet - this is an interior city (safe)
        return false;
    }

    // Find closest enemy threat
    let minEnemyDist = Infinity;
    for (const ec of enemyCities) {
        const dist = hexDistance(city.coord, ec.coord);
        if (dist < minEnemyDist) minEnemyDist = dist;
    }
    for (const eu of enemyUnits) {
        const dist = hexDistance(city.coord, eu.coord);
        if (dist < minEnemyDist) minEnemyDist = dist;
    }

    // Compare to other friendly cities - if this is one of the closest, it's perimeter
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    if (myCities.length <= 2) {
        // With 1-2 cities, all are perimeter
        return true;
    }

    // Calculate distances from all cities to enemies
    const cityDistances = myCities.map(c => {
        let minDist = Infinity;
        for (const ec of enemyCities) {
            const dist = hexDistance(c.coord, ec.coord);
            if (dist < minDist) minDist = dist;
        }
        for (const eu of enemyUnits) {
            const dist = hexDistance(c.coord, eu.coord);
            if (dist < minDist) minDist = dist;
        }
        return { city: c, dist: minDist };
    }).sort((a, b) => a.dist - b.dist);

    // Top 50% of cities by distance to enemy are perimeter
    const perimeterCount = Math.max(1, Math.ceil(myCities.length / 2));
    const perimeterCities = cityDistances.slice(0, perimeterCount);

    return perimeterCities.some(pc =>
        pc.city.coord.q === city.coord.q && pc.city.coord.r === city.coord.r
    );
}
