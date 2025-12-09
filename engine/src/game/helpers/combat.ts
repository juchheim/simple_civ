import { GameState, HexCoord, Player, Tile, Unit, UnitType, EraId, TerrainType, BuildingType, UnitState, UnitDomain } from "../../core/types.js";
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
    CIV6_DAMAGE_BASE,
    CIV6_DAMAGE_DIVISOR,
    CIV6_DAMAGE_RANDOM_MIN,
    CIV6_DAMAGE_RANDOM_MAX,
    CIV6_DAMAGE_MIN,
    CIV6_DAMAGE_MAX,
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
 * Civ 6-style damage formula: Damage = BASE × e^(StrengthDiff / DIVISOR) × RandomMult
 * Returns calculated damage and updated seed for RNG.
 */
export function calculateCiv6Damage(
    attackerAtk: number,
    defenderDef: number,
    seed: number
): { damage: number; newSeed: number } {
    const diff = attackerAtk - defenderDef;
    const baseDamage = CIV6_DAMAGE_BASE * Math.exp(diff / CIV6_DAMAGE_DIVISOR);

    // Deterministic random from seed (range 0.9 to 1.1)
    const randomMult = CIV6_DAMAGE_RANDOM_MIN +
        ((seed % 100) / 100) * (CIV6_DAMAGE_RANDOM_MAX - CIV6_DAMAGE_RANDOM_MIN);
    const newSeed = (seed * 9301 + 49297) % 233280;

    const rawDamage = Math.round(baseDamage * randomMult);
    const damage = Math.max(CIV6_DAMAGE_MIN, Math.min(CIV6_DAMAGE_MAX, rawDamage));

    return { damage, newSeed };
}

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
    return countErasResearched(player) * 2;
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
 * v1.9: StarborneSeekers "Starborne Resilience" - +1 Defense EVERYWHERE.
 * (Previously "Celestial Guidance" which only applied near capital)
 */
export function getStarborneCelestialBonus(state: GameState, player: Player, unit: Unit): number {
    if (player.civName !== "StarborneSeekers") return 0;
    // v1.9: Global defense bonus - applies everywhere, not just near capital
    return STARBORNE_CAPITAL_DEFENSE_BONUS; // Repurposed constant, now global
}

/**
 * v1.9: ScholarKingdoms "Citadel Protocol" - scaling city defense.
 * Total bonus pool: +6 Defense distributed across all cities.
 * 1 city = +6, 2 = +3, 3 = +2, 4+ = ~1.5 each
 * Rewards "tall" play (few highly developed cities).
 */
export function getScholarKingdomsDefenseBonus(state: GameState, player: Player, unit: Unit): number {
    if (player.civName !== "ScholarKingdoms") return 0;

    const cities = state.cities.filter(c => c.ownerId === player.id);
    if (cities.length === 0) return 0;

    // Check if unit is within radius of any city
    for (const city of cities) {
        const dist = hexDistance(unit.coord, city.coord);
        if (dist <= SCHOLAR_KINGDOMS_DEFENSE_RADIUS) {
            // v1.9: Scaling bonus - 6 total distributed across cities
            // Math.floor(6 / cityCount): 1 city = +6, 2 = +3, 3 = +2, 4 = +1, 5 = +1, 6 = +1
            // Using Math.max to ensure minimum of +1
            return Math.max(1, Math.floor(6 / cities.length));
        }
    }

    return 0;
}



import { isTileAdjacentToRiver } from "../../map/rivers.js";

// ... existing imports ...

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

    // v0.98 Update 5: ForgeClans "Forged Arms" - +1 Attack if built in city with 2+ Hills
    // We approximate this by checking if ANY city has 2+ hills (since we don't track origin city perfectly yet)
    // Only applies to military units
    if (player.civName === "ForgeClans" && UNITS[unit.type].domain !== "Civilian") {
        const forgeBonus = getForgeClansCombatBonus(state, player);
        boosted.atk += forgeBonus;

        // v0.98 Update 6: "Industrial Warfare" - +1 Attack per Engine tech
        const engineBonus = getForgeClansEngineBonus(player);
        boosted.atk += engineBonus;
    }

    // v0.98: JadeCovenant "Population Power" - +1 Atk/Def per 8 Pop
    if (player.civName === "JadeCovenant" && UNITS[unit.type].domain !== "Civilian") {
        const jadeBonus = getJadeCovenantCombatBonus(state, player);
        boosted.atk += jadeBonus;
        boosted.def += jadeBonus;
    }

    // v0.99 BUFF: "Ancestral Protection" - Settlers get +2 Defense
    if (player.civName === "JadeCovenant" && unit.type === UnitType.Settler) {
        boosted.def += 2;
    }

    // v1.3: River League "River Guardians" - +1 Atk/Def near rivers
    // v1.7: NERFED - Reduced from +1/+2 to +1/+1 to reduce Conquest dominance
    if (player.civName === "RiverLeague" && UNITS[unit.type].domain !== "Civilian") {
        if (isTileAdjacentToRiver(state.map, unit.coord)) {
            boosted.atk += 1;
            boosted.def += 1;
        }
    }

    // v0.98 Update 5: StarborneSeekers "Celestial Guidance" - +1 Defense near Capital
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

/**
 * Get the max movement for a unit, applying buffs.
 * v0.99: Aetherian Vanguard military units get +1 Movement if Titan's Core is built.
 */
export function getUnitMaxMoves(unit: Unit, state: GameState): number {
    const stats = UNITS[unit.type];
    let moves = stats.move;

    // Aetherian Vanguard: +1 Movement for military units if Titan's Core is built
    if (stats.domain !== UnitDomain.Civilian) {
        const player = state.players.find(p => p.id === unit.ownerId);
        if (player?.civName === "AetherianVanguard") {
            const hasTitansCore = state.cities.some(c => c.ownerId === unit.ownerId && c.buildings.includes(BuildingType.TitansCore));
            if (hasTitansCore) {
                moves += 1;
            }
        }
    }

    return moves;
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
