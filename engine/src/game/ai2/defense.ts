import { GameState, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { tryAction } from "../ai/shared/actions.js";
// Graduated threat assessment from Legacy
import { getThreatLevel } from "../ai/units/unit-helpers.js";

export function defendCitiesV2(state: GameState, playerId: string): GameState {
    let next = state;
    const cities = next.cities.filter(c => c.ownerId === playerId);
    if (cities.length === 0) return next;

    const capital = cities.find(c => c.isCapital) ?? cities[0];

    // Build threat assessment for ALL cities (not just capital)
    const cityThreats = cities.map(city => ({
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

    // 1) Ensure each city has a garrison if possible - prioritize threatened cities
    for (const { city, threat } of cityThreats) {
        const hasGarrison = next.units.some(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            hexEquals(u.coord, city.coord)
        );
        if (hasGarrison) continue;

        // Only pull garrisons for none/low threat if we have excess units
        const urgency = threat === "critical" || threat === "high";
        const searchRadius = urgency ? 6 : 2; // Look further for critical cities

        const candidates = next.units
            .filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                UNITS[u.type].domain !== "Civilian" &&
                u.type !== UnitType.Titan &&
                !u.hasAttacked &&
                hexDistance(u.coord, city.coord) <= searchRadius
            )
            .sort((a, b) => hexDistance(a.coord, city.coord) - hexDistance(b.coord, city.coord));

        const cand = candidates[0];
        if (!cand) continue;

        // Move into city if adjacent; otherwise step toward.
        if (hexDistance(cand.coord, city.coord) === 1) {
            next = tryAction(next, { type: "MoveUnit", playerId, unitId: cand.id, to: city.coord });
        }
    }

    // 2) Reinforce threatened cities based on threat level
    for (const { city, threat } of cityThreats) {
        if (threat === "none") continue;

        // Determine desired defenders based on threat level
        const desired = threat === "critical" ? 3 : threat === "high" ? 2 : 1;
        const defendersNear = next.units.filter(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            u.type !== UnitType.Titan &&
            hexDistance(u.coord, city.coord) <= 2
        ).length;

        if (defendersNear >= desired) continue;

        // Pull reinforcements from farther away for more threatened cities
        const pullRadius = threat === "critical" ? 8 : threat === "high" ? 5 : 3;
        const reinforcements = next.units
            .filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                UNITS[u.type].domain !== "Civilian" &&
                u.type !== UnitType.Titan &&
                hexDistance(u.coord, city.coord) >= 3 &&
                hexDistance(u.coord, city.coord) <= pullRadius
            )
            .sort((a, b) => hexDistance(a.coord, city.coord) - hexDistance(b.coord, city.coord));

        for (const unit of reinforcements.slice(0, desired - defendersNear)) {
            const neighbors = next.map.tiles
                .filter(t => hexDistance(t.coord, unit.coord) === 1)
                .map(t => t.coord)
                .sort((a, b) => hexDistance(a, city.coord) - hexDistance(b, city.coord));
            for (const step of neighbors) {
                const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: step });
                if (moved !== next) {
                    next = moved;
                    break;
                }
            }
        }
    }

    return next;
}






