// Targeting helpers for offensive unit selection and prioritization.
import { DiplomacyState, GameState, Unit, UnitState, UnitType } from "../../../core/types.js";
import { hexDistance, hexEquals } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { expectedDamageFrom, expectedDamageToUnit, isScoutType } from "./unit-helpers.js";

export function getAttackingUnits(state: GameState, playerId: string) {
    return state.units.filter(u => {
        if (u.ownerId !== playerId || u.type === UnitType.Settler || isScoutType(u.type) || u.state === UnitState.Garrisoned) return false;
        // v2.2: Titan has its own attack logic in titanRampage - exclude from generic attacks
        if (u.type === UnitType.Titan) return false;
        const city = state.cities.find(c => hexEquals(c.coord, u.coord));
        if (city && city.ownerId === playerId) return false;
        return true;
    });
}

export function getWarEnemyIds(state: GameState, playerId: string): string[] {
    return state.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);
}

export function getEnemyTargets(next: GameState, unit: Unit, warEnemyIds: string[]) {
    const stats = UNITS[unit.type as UnitType];
    return next.units
        .filter(u => warEnemyIds.includes(u.ownerId))
        .map(u => ({
            u,
            d: hexDistance(u.coord, unit.coord),
            dmg: expectedDamageToUnit(unit, u, next),
            counter: expectedDamageFrom(u, unit, next),
            isSettler: u.type === UnitType.Settler
        }))
        .filter(({ d, isSettler }) => {
            if (isSettler) return d === 1;
            return d <= stats.rng;
        })
        .sort((a, b) => {
            const aKill = a.dmg >= a.u.hp ? 0 : 1;
            const bKill = b.dmg >= b.u.hp ? 0 : 1;
            if (aKill !== bKill) return aKill - bKill;

            if (a.dmg !== b.dmg) return b.dmg - a.dmg;

            if (a.isSettler !== b.isSettler) return a.isSettler ? 1 : -1;
            if (a.d !== b.d) return a.d - b.d;
            return a.u.hp - b.u.hp;
        });
}
