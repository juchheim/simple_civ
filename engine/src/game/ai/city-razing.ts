import { aiInfo } from "./debug-logging.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { BuildingType, City, DiplomacyState, GameState } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";
import { getTileYields } from "../rules.js";
import { tryAction } from "./shared/actions.js";

function isAtWar(state: GameState, playerId: string): boolean {
    return state.players.some(
        p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

function calculateIsolation(city: City, playerId: string, state: GameState): number {
    const friendlyCities = state.cities.filter(c => c.ownerId === playerId && c.id !== city.id);
    if (friendlyCities.length === 0) return Infinity;
    return Math.min(...friendlyCities.map(c => hexDistance(city.coord, c.coord)));
}

function calculateThreatLevel(city: City, playerId: string, state: GameState): number {
    const enemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );

    if (enemies.length === 0) return 0;

    const enemyMilitary = state.units.filter(u =>
        enemies.some(e => e.id === u.ownerId) &&
        UNITS[u.type].domain !== "Civilian" &&
        hexDistance(city.coord, u.coord) <= 5
    );

    const ourMilitary = state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        hexDistance(city.coord, u.coord) <= 5
    );

    const enemyPower = enemyMilitary.reduce((sum, u) => sum + UNITS[u.type].atk + UNITS[u.type].def, 0);
    const ourPower = ourMilitary.reduce((sum, u) => sum + UNITS[u.type].atk + UNITS[u.type].def, 0);

    return ourPower > 0 ? enemyPower / ourPower : (enemyPower > 0 ? 10 : 0);
}

function calculateEconomicValue(city: City, state: GameState): number {
    // Sum F+P of workable tiles
    let total = 0;
    for (const coord of city.workedTiles) {
        const t = state.map.tiles.find(tile => hexEquals(tile.coord, coord));
        if (t) {
            const yields = getTileYields(t);
            total += yields.F + yields.P;
        }
    }
    return total;
}

function calculateDefensibility(city: City, playerId: string, state: GameState): number {
    let score = 0;

    // Has garrison?
    const hasGarrison = state.units.some(u =>
        u.ownerId === playerId &&
        hexEquals(u.coord, city.coord)
    );
    if (hasGarrison) score += 0.5;

    // Has City Ward?
    if (city.buildings.includes(BuildingType.CityWard)) score += 0.3;

    // City HP (higher HP = more defensible)
    const maxHp = city.maxHp || 20;
    score += (city.hp / maxHp) * 0.2;

    return score;
}

function evaluateCityForRazing(city: City, playerId: string, state: GameState): boolean {
    // Calculate strategic value factors
    const isolation = calculateIsolation(city, playerId, state);
    const threatLevel = calculateThreatLevel(city, playerId, state);
    const economicValue = calculateEconomicValue(city, state);
    const defensibility = calculateDefensibility(city, playerId, state);

    // Raze if:
    // - Very isolated (> 8 tiles from nearest friendly city)
    // - High threat (enemy military power > 1.5x our local military)
    // - Low economic value (< 3 F+P from workable tiles)
    // - Poor defensibility (< 0.5 score)
    const razeScore =
        (isolation > 8 ? 2 : 0) +
        (threatLevel > 1.5 ? 2 : 0) +
        (economicValue < 3 ? 1 : 0) +
        (defensibility < 0.5 ? 1 : 0);

    // Raze if score >= 3 (multiple bad factors)
    const shouldRaze = razeScore >= 3;

    if (shouldRaze) {
        aiInfo(`[AI Raze] ${playerId} considering razing ${city.name}: isolation=${isolation}, threat=${threatLevel.toFixed(2)}, econ=${economicValue}, def=${defensibility.toFixed(2)}, score=${razeScore}`);
    }

    return shouldRaze;
}

/**
 * Consider razing poorly situated cities to consolidate forces.
 * Called after combat, before end turn.
 */
export function considerRazing(state: GameState, playerId: string): GameState {
    let next = state;

    const playerCities = next.cities.filter(c => c.ownerId === playerId);

    // Never raze if we have <= 2 cities
    if (playerCities.length <= 2) return next;

    // Only consider razing during wartime
    if (!isAtWar(next, playerId)) return next;

    for (const city of playerCities) {
        // Never raze capitals
        if (city.isCapital) continue;

        // Never raze high-pop cities (too valuable)
        if (city.pop >= 4) continue;

        // Must have a garrison to raze
        const hasGarrison = next.units.some(u =>
            u.ownerId === playerId &&
            hexEquals(u.coord, city.coord)
        );
        if (!hasGarrison) continue;

        const shouldRaze = evaluateCityForRazing(city, playerId, next);

        if (shouldRaze) {
            aiInfo(`[AI Raze] ${playerId} razing ${city.name}`);
            next = tryAction(next, {
                type: "RazeCity",
                playerId,
                cityId: city.id,
            });
        }
    }

    return next;
}
