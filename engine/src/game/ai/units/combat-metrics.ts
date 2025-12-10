import { hexDistance, hexEquals } from "../../../core/hex.js";
import { GameState, TerrainType, UnitState, UnitType, BuildingType } from "../../../core/types.js";
import {
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    DAMAGE_BASE,
    DAMAGE_MAX,
    DAMAGE_MIN,
    TERRAIN,
    UNITS
} from "../../../core/constants.js";
import { getEffectiveUnitStats } from "../../helpers/combat.js";

export function tileDefenseScore(state: GameState, coord: { q: number; r: number }): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -99;
    return TERRAIN[tile.terrain].defenseMod ?? 0;
}

export function expectedDamageToUnit(attacker: any, defender: any, state: GameState): number {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    const defenseStats = getEffectiveUnitStats(defender, state);
    const defensePower = calculateDefensePower(state, defender, defenseStats.def);
    const attackPower = attackerStats.atk;
    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    return Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));
}

export function expectedDamageToCity(attacker: any, city: any, state: GameState): number {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    let defensePower = CITY_DEFENSE_BASE + Math.floor(city.pop / 2);
    if (city.buildings?.includes(BuildingType.CityWard)) {
        defensePower += CITY_WARD_DEFENSE_BONUS;
    }
    const attackPower = attackerStats.atk;
    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    return Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));
}

export function expectedDamageFrom(defender: any, attacker: any, state: GameState): number {
    return expectedDamageToUnit(defender, attacker, state);
}

export function friendlyAdjacencyCount(state: GameState, playerId: string, coord: { q: number; r: number }): number {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        hexDistance(u.coord, coord) === 1
    ).length;
}

export function enemiesWithin(state: GameState, playerId: string, coord: { q: number; r: number }, radius: number): number {
    return state.units.filter(u =>
        u.ownerId !== playerId &&
        hexDistance(u.coord, coord) <= radius
    ).length;
}

const calculateDefensePower = (state: GameState, defender: any, baseDefense: number) => {
    let defensePower = baseDefense;
    const tile = state.map.tiles.find(t => hexEquals(t.coord, defender.coord));
    if (tile) {
        defensePower += TERRAIN[tile.terrain].defenseMod;
    }
    if (defender.state === UnitState.Fortified) defensePower += 1;
    return defensePower;
};
