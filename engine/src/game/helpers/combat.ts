import { GameState, HexCoord, Player, Tile, Unit, UnitType, EraId } from "../../core/types.js";
import { UNITS, TERRAIN, TECHS, JADE_COVENANT_POP_COMBAT_BONUS_PER } from "../../core/constants.js";
import { TechId } from "../../core/types.js";
import { hexLine, hexToString } from "../../core/hex.js";

const MELEE_TYPES = new Set<UnitType>([
    UnitType.SpearGuard,
    UnitType.ArmySpearGuard,
    UnitType.Riders,
    UnitType.ArmyRiders,
]);

const RANGED_TYPES = new Set<UnitType>([
    UnitType.BowGuard,
    UnitType.ArmyBowGuard,
]);

/**
 * Count the number of eras the player has researched at least one tech in.
 * Returns 0-3 (Hearth=1, Banner=2, Engine=3)
 */
export function countErasResearched(player: Player): number {
    let count = 0;
    const hasHearth = player.techs.some(t => TECHS[t]?.era === EraId.Hearth);
    const hasBanner = player.techs.some(t => TECHS[t]?.era === EraId.Banner);
    const hasEngine = player.techs.some(t => TECHS[t]?.era === EraId.Engine);
    if (hasHearth) count++;
    if (hasBanner) count++;
    if (hasEngine) count++;
    return count;
}

/**
 * Get the HP bonus for AetherianVanguard's "Battle Hardened" passive.
 * Military units gain +1 HP per era researched (max +3).
 */
export function getAetherianHpBonus(player: Player, unitType: UnitType): number {
    if (player.civName !== "AetherianVanguard") return 0;
    // Only military units get the bonus
    if (UNITS[unitType].domain === "Civilian") return 0;
    return countErasResearched(player);
}

/**
 * Get total population across all cities for a player.
 */
export function getTotalPopulation(state: GameState, playerId: string): number {
    return state.cities
        .filter(c => c.ownerId === playerId)
        .reduce((sum, c) => sum + c.pop, 0);
}

/**
 * v0.98: Get JadeCovenant's "Population Power" combat bonus.
 * Military units gain +1 attack and defense per 5 total population.
 */
export function getJadeCovenantCombatBonus(state: GameState, player: Player): number {
    if (player.civName !== "JadeCovenant") return 0;
    const totalPop = getTotalPopulation(state, player.id);
    return Math.floor(totalPop / JADE_COVENANT_POP_COMBAT_BONUS_PER);
}

export function getEffectiveUnitStats(unit: Unit, state: GameState) {
    const base = UNITS[unit.type];
    const player = state.players.find(p => p.id === unit.ownerId);
    if (!player) return base;
    const boosted = { ...base };

    if (player.techs.includes(TechId.FormationTraining) && MELEE_TYPES.has(unit.type)) {
        boosted.def += 1;
    }
    if (player.techs.includes(TechId.DrilledRanks) && (MELEE_TYPES.has(unit.type) || RANGED_TYPES.has(unit.type))) {
        boosted.atk += 1;
    }

    // v0.98: JadeCovenant "Population Power" - combat bonus based on total population
    // Only applies to military units (not civilians)
    if (player.civName === "JadeCovenant" && UNITS[unit.type].domain !== "Civilian") {
        const popBonus = getJadeCovenantCombatBonus(state, player);
        boosted.atk += popBonus;
        boosted.def += popBonus;
    }

    return boosted;
}

export function buildTileLookup(state: GameState): Map<string, Tile> {
    return new Map(state.map.tiles.map(t => [hexToString(t.coord), t]));
}

export function hasClearLineOfSight(state: GameState, from: HexCoord, target: HexCoord, lookup?: Map<string, Tile>): boolean {
    const tileByKey = lookup ?? buildTileLookup(state);
    const line = hexLine(from, target);
    for (let i = 1; i < line.length - 1; i++) {
        const key = hexToString(line[i]);
        const tile = tileByKey.get(key);
        if (!tile) return false;
        if (TERRAIN[tile.terrain].blocksLoS) return false;
    }
    return true;
}

