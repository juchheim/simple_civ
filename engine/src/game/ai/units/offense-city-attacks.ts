// City-targeting attack routines for offensive AI.
import { GameState, Unit, UnitType } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { aiInfo } from "../debug-logging.js";
import { tryAction } from "../shared/actions.js";
import { captureIfPossible } from "./siege-routing.js";
import { expectedDamageToCity, getWarTargets } from "./unit-helpers.js";

export function tryCityAttacks(
    state: GameState,
    playerId: string,
    unit: Unit,
    warCities: GameState["cities"],
    primaryCity: GameState["cities"][number] | null
): { state: GameState; acted: boolean } {
    let next = state;
    const stats = UNITS[unit.type as UnitType];
    const cityTargets = warCities
        .filter(c => hexDistance(c.coord, unit.coord) <= stats.rng && c.hp > 0)
        .map(c => ({ city: c, dmg: expectedDamageToCity(unit, c, next) }))
        .sort((a, b) => {
            const aKill = a.dmg >= a.city.hp ? 0 : 1;
            const bKill = b.dmg >= b.city.hp ? 0 : 1;
            if (aKill !== bKill) return aKill - bKill;
            if (primaryCity) {
                const aPrimary = a.city.id === primaryCity.id ? -1 : 0;
                const bPrimary = b.city.id === primaryCity.id ? -1 : 0;
                if (aPrimary !== bPrimary) return aPrimary - bPrimary;
            }
            return a.city.hp - b.city.hp;
        });

    for (const { city, dmg } of cityTargets) {
        const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: city.id, targetType: "City" });
        if (attacked !== next) {
            aiInfo(`[AI ATTACK CITY] ${playerId} attacks ${city.name} (${city.ownerId}) with ${unit.type}, dealing ${dmg} damage (HP: ${city.hp}→${city.hp - dmg})`);
            next = attacked;
            next = captureIfPossible(next, playerId, unit.id);
            return { state: next, acted: true };
        }
    }

    return { state: next, acted: false };
}

/**
 * v1.0.4: Trebuchet-first attack coordination
 * All Trebuchets attack the primary siege city before other units.
 * This ensures siege weapons soften targets for melee to capture.
 */
export function trebuchetSiegeAttacks(state: GameState, playerId: string): GameState {
    let next = state;

    const trebuchets = next.units.filter(u =>
        u.ownerId === playerId &&
        u.type === UnitType.Trebuchet &&
        !u.hasAttacked &&
        u.movesLeft > 0
    );

    if (trebuchets.length === 0) return next;

    const warTargets = getWarTargets(next, playerId);
    const warCities = next.cities.filter(c =>
        warTargets.some(t => t.id === c.ownerId) && c.hp > 0
    );

    if (warCities.length === 0) return next;

    // Focus fire: all Trebuchets attack lowest HP city in range
    for (const treb of trebuchets) {
        const trebStats = UNITS[UnitType.Trebuchet];
        const inRange = warCities.filter(c =>
            hexDistance(c.coord, treb.coord) <= trebStats.rng
        );

        if (inRange.length === 0) continue;

        // Pick lowest HP city (prioritize finishing kills)
        const target = inRange.sort((a, b) => a.hp - b.hp)[0];

        const result = tryAction(next, {
            type: "Attack",
            playerId,
            attackerId: treb.id,
            targetId: target.id,
            targetType: "City"
        });

        if (result !== next) {
            const dmg = expectedDamageToCity(treb, target, next);
            aiInfo(`[AI TREBUCHET VOLLEY] ${playerId} Trebuchet attacks ${target.name} (HP: ${target.hp}, expected dmg: ${dmg})`);
            next = result;
        }
    }

    return next;
}
