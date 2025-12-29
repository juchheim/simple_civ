// Orchestrates city defense and re-exports specialized defense helpers.
import { GameState } from "../../core/types.js";
import { getThreatLevel } from "../ai/units/unit-helpers.js";
import { defendCapitalRing } from "./defense-capital.js";
import { ensureCityGarrisons, reinforceThreatenedCities, type CityThreat } from "./defense-garrison.js";

export {
    runHomeDefenderCombat,
    coordinateDefensiveFocusFire,
    runDefensiveRingCombat,
    runLastStandAttacks,
    runTacticalDefense
} from "./defense-combat.js";
export { positionDefensiveRing } from "./defense-ring.js";
export { sendMutualDefenseReinforcements } from "./defense-mutual-defense.js";
export { isPerimeterCity } from "./defense-perimeter.js";

export function defendCitiesV2(state: GameState, playerId: string): GameState {
    let next = state;
    const cities = next.cities.filter(c => c.ownerId === playerId);
    if (cities.length === 0) return next;

    const capital = cities.find(c => c.isCapital) ?? cities[0];

    // Build threat assessment for ALL cities (not just capital)
    const cityThreats: CityThreat[] = cities.map(city => ({
        city,
        threat: getThreatLevel(next, city, playerId),
        isCapital: city.isCapital ?? false
    }));

    // Sort cities by threat level (critical > high > low > none), capitals first within same level
    const threatOrder = { critical: 0, high: 1, low: 2, none: 3 };
    cityThreats.sort((a, b) => {
        const threatDiff = threatOrder[a.threat] - threatOrder[b.threat];
        if (threatDiff !== 0) return threatDiff;
        return (b.isCapital ? 1 : 0) - (a.isCapital ? 1 : 0);
    });

    // v1.1: Build set of city coordinates for garrison protection
    const cityCoords = new Set(
        cities.map(c => `${c.coord.q},${c.coord.r}`)
    );

    next = ensureCityGarrisons(next, playerId, cityThreats, cityCoords);
    next = defendCapitalRing(next, playerId, capital ?? null, cityCoords);
    next = reinforceThreatenedCities(next, playerId, cityThreats, cityCoords);

    return next;
}
