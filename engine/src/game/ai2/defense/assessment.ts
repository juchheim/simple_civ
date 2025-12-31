import { City, GameState } from "../../../core/types.js";
import { assessCityThreatLevel } from "../defense-situation/scoring.js";
import { type CityThreat } from "../defense-garrison.js";

export type DefenseAssessment = {
    cities: City[];
    capital: City | null;
    cityThreats: CityThreat[];
    cityCoords: Set<string>;
};

export function buildDefenseAssessment(state: GameState, playerId: string): DefenseAssessment | null {
    const cities = state.cities.filter(c => c.ownerId === playerId);
    if (cities.length === 0) return null;

    const capital = cities.find(c => c.isCapital) ?? cities[0] ?? null;

    const cityThreats: CityThreat[] = cities.map(city => ({
        city,
        threat: assessCityThreatLevel(state, city, playerId),
        isCapital: city.isCapital ?? false
    }));

    const threatOrder = { assault: 0, raid: 1, probe: 2, none: 3 };
    cityThreats.sort((a, b) => {
        const threatDiff = threatOrder[a.threat] - threatOrder[b.threat];
        if (threatDiff !== 0) return threatDiff;
        return (b.isCapital ? 1 : 0) - (a.isCapital ? 1 : 0);
    });

    const cityCoords = new Set(
        cities.map(c => `${c.coord.q},${c.coord.r}`)
    );

    return {
        cities,
        capital,
        cityThreats,
        cityCoords
    };
}
