import { GameState, HexCoord, Player, Tile, Unit, UnitType, EraId, TerrainType, BuildingType, UnitState } from "../../core/types.js";
import {
    UNITS,
    TERRAIN,
    TECHS,
    JADE_COVENANT_POP_COMBAT_BONUS_PER,
    FORGE_CLANS_HILL_COMBAT_THRESHOLD,
    FORGE_CLANS_HILL_COMBAT_BONUS,
    FORGE_CLANS_ENGINE_ATTACK_BONUS,
    STARBORNE_CAPITAL_DEFENSE_RADIUS,
    STARBORNE_CAPITAL_DEFENSE_BONUS,
    SCHOLAR_KINGDOMS_DEFENSE_BONUS,
    SCHOLAR_KINGDOMS_DEFENSE_RADIUS,
    FORTIFY_DEFENSE_BONUS,
} from "../../core/constants.js";
import { TechId } from "../../core/types.js";
import { hexLine, hexToString, hexDistance, hexEquals } from "../../core/hex.js";

// Engine-era techs for ForgeClans bonus
const ENGINE_ERA_TECHS = [
    TechId.SteamForges,
    TechId.CityWards,
    TechId.UrbanPlans,
    TechId.SignalRelay,
    TechId.StarCharts,
];

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
 * Military units gain +1 attack and defense per 8 total population (nerfed from 5).
 */
export function getJadeCovenantCombatBonus(state: GameState, player: Player): number {
    if (player.civName !== "JadeCovenant") return 0;
    const totalPop = getTotalPopulation(state, player.id);
    return Math.floor(totalPop / JADE_COVENANT_POP_COMBAT_BONUS_PER);
}

/**
 * v0.98 Update 5: Get ForgeClans "Forged Arms" attack bonus.
 * Units built in cities with 2+ worked Hill tiles gain +1 Attack.
 * Note: This is tracked per-unit via metadata, applied at creation time.
 * For now, we check if ANY of the player's cities have enough hills.
 */
export function getForgeClansCombatBonus(state: GameState, player: Player): number {
    if (player.civName !== "ForgeClans") return 0;

    // Check if player has any city with enough worked hills
    const citiesWithHills = state.cities.filter(c => {
        if (c.ownerId !== player.id) return false;
        const workedHills = c.workedTiles?.filter(coord => {
            const tile = state.map.tiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
            return tile?.terrain === TerrainType.Hills;
        }).length ?? 0;
        return workedHills >= FORGE_CLANS_HILL_COMBAT_THRESHOLD;
    });

    // If they have at least one hill-heavy city, their units get the bonus
    return citiesWithHills.length > 0 ? FORGE_CLANS_HILL_COMBAT_BONUS : 0;
}

/**
 * v0.98 Update 6: Get ForgeClans "Industrial Warfare" attack bonus.
 * Military units gain +1 Attack per Engine-era tech researched (max +5).
 * This rewards their high tech completion rate with actual combat power.
 */
export function getForgeClansEngineBonus(player: Player): number {
    if (player.civName !== "ForgeClans") return 0;

    const engineTechCount = ENGINE_ERA_TECHS.filter(tech => player.techs.includes(tech)).length;
    return engineTechCount * FORGE_CLANS_ENGINE_ATTACK_BONUS;
}

/**
 * v0.98 Update 5: Get StarborneSeekers "Celestial Guidance" defense bonus.
 * Units within 3 tiles of their capital gain +1 Defense.
 */
export function getStarborneCelestialBonus(state: GameState, player: Player, unit: Unit): number {
    if (player.civName !== "StarborneSeekers") return 0;

    // Find player's capital
    const capital = state.cities.find(c => c.ownerId === player.id && c.isCapital);
    if (!capital) return 0;

    // Check if unit is within radius of capital
    const dist = hexDistance(unit.coord, capital.coord);
    return dist <= STARBORNE_CAPITAL_DEFENSE_RADIUS ? STARBORNE_CAPITAL_DEFENSE_BONUS : 0;
}

/**
 * v0.98 Update 8: Get ScholarKingdoms "Scholarly Retreat" defense bonus.
 * Units within 2 tiles of any city with a Scriptorium or Academy gain +2 Defense.
 * This helps them survive long enough to use their science advantage.
 */
export function getScholarKingdomsDefenseBonus(state: GameState, player: Player, unit: Unit): number {
    if (player.civName !== "ScholarKingdoms") return 0;

    // Find any of player's cities with Scriptorium or Academy
    const scholarCities = state.cities.filter(c =>
        c.ownerId === player.id &&
        (c.buildings.includes(BuildingType.Scriptorium) || c.buildings.includes(BuildingType.Academy))
    );

    if (scholarCities.length === 0) return 0;

    // Check if unit is within radius of any scholar city
    for (const city of scholarCities) {
        const dist = hexDistance(unit.coord, city.coord);
        if (dist <= SCHOLAR_KINGDOMS_DEFENSE_RADIUS) {
            return SCHOLAR_KINGDOMS_DEFENSE_BONUS;
        }
    }

    return 0;
}

export function getEffectiveUnitStats(unit: Unit, state: GameState) {
    const base = UNITS[unit.type];
    const player = state.players.find(p => p.id === unit.ownerId);
    if (!player) return base;
    const boosted = { ...base };

    if (player.techs.includes(TechId.FormationTraining) && (MELEE_TYPES.has(unit.type) || RANGED_TYPES.has(unit.type))) {
        boosted.atk += 1;
        boosted.def += 1;
    }

    if (player.techs.includes(TechId.ArmyDoctrine) && unit.type.startsWith("Army")) {
        boosted.atk += 1;
        boosted.def += 1;
    }

    // v0.98: JadeCovenant "Population Power" - combat bonus based on total population
    // Only applies to military units (not civilians)
    if (player.civName === "JadeCovenant" && UNITS[unit.type].domain !== "Civilian") {
        const popBonus = getJadeCovenantCombatBonus(state, player);
        boosted.atk += popBonus;
        boosted.def += popBonus;
    }

    // v0.98 Update 5: ForgeClans "Forged Arms" - attack bonus from hill production
    // Only applies to military units
    if (player.civName === "ForgeClans" && UNITS[unit.type].domain !== "Civilian") {
        const hillBonus = getForgeClansCombatBonus(state, player);
        boosted.atk += hillBonus;

        // v0.98 Update 6: ForgeClans "Industrial Warfare" - attack bonus per Engine tech
        const engineBonus = getForgeClansEngineBonus(player);
        boosted.atk += engineBonus;
    }

    // v0.98 Update 5: StarborneSeekers "Celestial Guidance" - defense near capital
    // Only applies to military units
    if (player.civName === "StarborneSeekers" && UNITS[unit.type].domain !== "Civilian") {
        const celestialBonus = getStarborneCelestialBonus(state, player, unit);
        boosted.def += celestialBonus;
    }

    // v0.98 Update 8: ScholarKingdoms "Scholarly Retreat" - defense near Scriptorium/Academy cities
    // Only applies to military units
    if (player.civName === "ScholarKingdoms" && UNITS[unit.type].domain !== "Civilian") {
        const scholarBonus = getScholarKingdomsDefenseBonus(state, player, unit);
        boosted.def += scholarBonus;
    }

    return boosted;
}

export function getUnitCombatStats(unit: Unit, state: GameState) {
    const stats = getEffectiveUnitStats(unit, state);

    // Apply terrain defense bonus
    const tile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
    if (tile) {
        stats.def += TERRAIN[tile.terrain].defenseMod;
    }

    // Apply fortification bonus
    if (unit.state === UnitState.Fortified) {
        stats.def += FORTIFY_DEFENSE_BONUS;
    }

    return stats;
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

