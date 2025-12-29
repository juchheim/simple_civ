import { GameState, Unit, City, UnitType, UnitState, BuildingType } from "../../core/types.js";
import {
    UNITS,
    TERRAIN,
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    CITY_ATTACK_BASE,
    CITY_WARD_ATTACK_BONUS,
    FORTIFY_DEFENSE_BONUS,
    CIV6_DAMAGE_BASE,
    CIV6_DAMAGE_DIVISOR,
    CIV6_DAMAGE_RANDOM_MIN,
    CIV6_DAMAGE_RANDOM_MAX,
    CIV6_DAMAGE_MIN,
    CIV6_DAMAGE_MAX,
    BUILDINGS,
    TREBUCHET_CITY_ATTACK_BONUS,
    TREBUCHET_CITY_RETALIATION_REDUCTION,
} from "../../core/constants.js";
import { hexEquals } from "../../core/hex.js";
import { getEffectiveUnitStats } from "./combat.js";

export interface CombatModifier {
    label: string;
    value: number;
}

export interface CombatPreviewUnit {
    name: string;
    atk: number;
    def: number;
    hp: number;
    maxHp: number;
    modifiers: CombatModifier[];
}

export interface CombatPreview {
    attacker: CombatPreviewUnit;
    defender: CombatPreviewUnit & { isCity: boolean };
    estimatedDamage: { min: number; max: number; avg: number };
    returnDamage: { min: number; max: number; avg: number } | null;
}

/**
 * Calculate damage range using Civ 6 formula
 */
function calculateDamageRange(atk: number, def: number): { min: number; max: number; avg: number } {
    const diff = atk - def;
    const baseDamage = CIV6_DAMAGE_BASE * Math.exp(diff / CIV6_DAMAGE_DIVISOR);

    const minRaw = Math.round(baseDamage * CIV6_DAMAGE_RANDOM_MIN);
    const maxRaw = Math.round(baseDamage * CIV6_DAMAGE_RANDOM_MAX);
    const avgRaw = Math.round(baseDamage);

    return {
        min: Math.max(CIV6_DAMAGE_MIN, Math.min(CIV6_DAMAGE_MAX, minRaw)),
        max: Math.max(CIV6_DAMAGE_MIN, Math.min(CIV6_DAMAGE_MAX, maxRaw)),
        avg: Math.max(CIV6_DAMAGE_MIN, Math.min(CIV6_DAMAGE_MAX, avgRaw)),
    };
}

/**
 * Get display name for unit type
 */
function getUnitDisplayName(type: UnitType): string {
    const names: Record<string, string> = {
        SpearGuard: "Spear Guard",
        BowGuard: "Bow Guard",
        ArmySpearGuard: "Spear Guard Army",
        ArmyBowGuard: "Bow Guard Army",
        ArmyRiders: "Riders Army",
        ArmyScout: "Scout Army",
        Skiff: "Skiff",
    };
    return names[type] || type;
}

/**
 * Get combat preview for unit vs unit attack
 */
export function getCombatPreviewUnitVsUnit(
    state: GameState,
    attacker: Unit,
    defender: Unit
): CombatPreview {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    const defenderStats = getEffectiveUnitStats(defender, state, attacker);

    // Attacker modifiers
    const attackerMods: CombatModifier[] = [];
    const baseAtk = UNITS[attacker.type].atk;
    if (attackerStats.atk !== baseAtk) {
        attackerMods.push({ label: "Bonuses", value: attackerStats.atk - baseAtk });
    }

    // Defender modifiers
    const defenderMods: CombatModifier[] = [];
    const baseDef = UNITS[defender.type].def;
    if (defenderStats.def !== baseDef) {
        defenderMods.push({ label: "Bonuses", value: defenderStats.def - baseDef });
    }

    // Terrain defense
    const defenderTile = state.map.tiles.find(t => hexEquals(t.coord, defender.coord));
    let defenderDefense = defenderStats.def;
    if (defenderTile) {
        const terrainMod = TERRAIN[defenderTile.terrain].defenseMod;
        if (terrainMod !== 0) {
            defenderMods.push({ label: defenderTile.terrain, value: terrainMod });
            defenderDefense += terrainMod;
        }
    }

    // Fortify bonus
    if (defender.state === UnitState.Fortified) {
        defenderMods.push({ label: "Fortified", value: FORTIFY_DEFENSE_BONUS });
        defenderDefense += FORTIFY_DEFENSE_BONUS;
    }

    // Calculate damage
    const estimatedDamage = calculateDamageRange(attackerStats.atk, defenderDefense);

    // Return damage (only for melee)
    let returnDamage: { min: number; max: number; avg: number } | null = null;
    if (attackerStats.rng === 1) {
        // Attacker defense for return damage
        const attackerTile = state.map.tiles.find(t => hexEquals(t.coord, attacker.coord));
        let attackerDefense = attackerStats.def;
        if (attackerTile) {
            const terrainMod = TERRAIN[attackerTile.terrain].defenseMod;
            if (terrainMod !== 0) {
                attackerMods.push({ label: attackerTile.terrain, value: terrainMod });
                attackerDefense += terrainMod;
            }
        }
        returnDamage = calculateDamageRange(defenderStats.atk, attackerDefense);
    }

    return {
        attacker: {
            name: getUnitDisplayName(attacker.type),
            atk: attackerStats.atk,
            def: attackerStats.def,
            hp: attacker.hp,
            maxHp: attacker.maxHp ?? UNITS[attacker.type].hp,
            modifiers: attackerMods,
        },
        defender: {
            name: getUnitDisplayName(defender.type),
            atk: defenderStats.atk,
            def: defenderDefense,
            hp: defender.hp,
            maxHp: defender.maxHp ?? UNITS[defender.type].hp,
            modifiers: defenderMods,
            isCity: false,
        },
        estimatedDamage,
        returnDamage,
    };
}

/**
 * Get combat preview for unit vs city attack
 */
export function getCombatPreviewUnitVsCity(
    state: GameState,
    attacker: Unit,
    city: City
): CombatPreview {
    const attackerStats = getEffectiveUnitStats(attacker, state);

    // Attacker modifiers
    const attackerMods: CombatModifier[] = [];
    const baseAtk = UNITS[attacker.type].atk;
    if (attackerStats.atk !== baseAtk) {
        attackerMods.push({ label: "Bonuses", value: attackerStats.atk - baseAtk });
    }

    // City defense calculation
    const defenderMods: CombatModifier[] = [];
    let cityDefense = CITY_DEFENSE_BASE;
    defenderMods.push({ label: "Base Defense", value: CITY_DEFENSE_BASE });

    const popBonus = Math.floor(city.pop / 2);
    if (popBonus > 0) {
        defenderMods.push({ label: `Pop ${city.pop}`, value: popBonus });
        cityDefense += popBonus;
    }

    if (city.buildings.includes(BuildingType.CityWard)) {
        defenderMods.push({ label: "City Ward", value: CITY_WARD_DEFENSE_BONUS });
        cityDefense += CITY_WARD_DEFENSE_BONUS;
    }

    if (city.buildings.includes(BuildingType.Bulwark)) {
        const bonus = BUILDINGS[BuildingType.Bulwark].defenseBonus || 0;
        defenderMods.push({ label: "Bulwark", value: bonus });
        cityDefense += bonus;
    }

    // v6.7: Find the garrison with the highest range (for best retaliation) when multiple units on city tile
    // v7.10: Exclude Scouts from garrison - they don't provide defense/attack bonuses
    const garrisonCandidates = state.units.filter(u =>
        hexEquals(u.coord, city.coord) && u.ownerId === city.ownerId && u.type !== UnitType.Settler && u.type !== UnitType.Scout
    );
    const garrison = garrisonCandidates.length > 0
        ? garrisonCandidates.reduce((best, u) => UNITS[u.type].rng > UNITS[best.type].rng ? u : best)
        : undefined;
    if (garrison) {
        const garrisonStats = UNITS[garrison.type];
        const garrisonDefBonus = garrisonStats.rng >= 2 ? 1 : 2;
        defenderMods.push({ label: "Garrison", value: garrisonDefBonus });
        cityDefense += garrisonDefBonus;
    }

    // v1.0.10: Trebuchet Siege Bonus - +8 Attack vs cities (must be included in preview)
    let effectiveAtk = attackerStats.atk;
    if (attacker.type === UnitType.Trebuchet) {
        attackerMods.push({ label: "Siege Bonus", value: TREBUCHET_CITY_ATTACK_BONUS });
        effectiveAtk += TREBUCHET_CITY_ATTACK_BONUS;
    }

    const estimatedDamage = calculateDamageRange(effectiveAtk, cityDefense);

    // Return damage from city retaliation
    let returnDamage: { min: number; max: number; avg: number } | null = null;
    // v5.11: DISABLED per user request
    const hasBulwark = false; // city.buildings.includes(BuildingType.Bulwark);

    if (garrison || hasBulwark) {
        let garrisonAtkBonus = 0;
        let garrisonRange = 0;

        if (garrison) {
            const garrisonStats = UNITS[garrison.type];
            garrisonAtkBonus = garrisonStats.rng >= 2 ? 3 : 1;
            garrisonRange = garrisonStats.rng >= 2 ? 2 : 1;
        }

        if (hasBulwark) {
            const bulwarkStats = BUILDINGS[BuildingType.Bulwark];
            garrisonAtkBonus += (bulwarkStats.cityAttackBonus || 0);
            garrisonRange = Math.max(garrisonRange, 2);
        }

        // City attack power
        let cityAtk = CITY_ATTACK_BASE + garrisonAtkBonus;
        if (city.buildings.includes(BuildingType.CityWard)) {
            cityAtk += CITY_WARD_ATTACK_BONUS;
        }

        if (city.buildings.includes(BuildingType.Bulwark)) {
            cityAtk += (BUILDINGS[BuildingType.Bulwark].cityAttackBonus || 0);
        }

        // Only show return damage if attacker is in range
        const dist = Math.max(
            Math.abs(attacker.coord.q - city.coord.q),
            Math.abs(attacker.coord.r - city.coord.r),
            Math.abs((-attacker.coord.q - attacker.coord.r) - (-city.coord.q - city.coord.r))
        );
        if (dist <= garrisonRange) {
            // Attacker defense
            const attackerTile = state.map.tiles.find(t => hexEquals(t.coord, attacker.coord));
            let attackerDefense = attackerStats.def;
            if (attackerTile) {
                const terrainMod = TERRAIN[attackerTile.terrain].defenseMod;
                if (terrainMod !== 0) {
                    attackerMods.push({ label: attackerTile.terrain, value: terrainMod });
                    attackerDefense += terrainMod;
                }
            }
            if (attacker.state === UnitState.Fortified) {
                attackerMods.push({ label: "Fortified", value: FORTIFY_DEFENSE_BONUS });
                attackerDefense += FORTIFY_DEFENSE_BONUS;
            }

            returnDamage = calculateDamageRange(cityAtk, attackerDefense);

            // v1.0.10: Trebuchet takes 50% less damage from city retaliation
            if (attacker.type === UnitType.Trebuchet && returnDamage) {
                returnDamage = {
                    min: Math.floor(returnDamage.min * TREBUCHET_CITY_RETALIATION_REDUCTION),
                    max: Math.floor(returnDamage.max * TREBUCHET_CITY_RETALIATION_REDUCTION),
                    avg: Math.floor(returnDamage.avg * TREBUCHET_CITY_RETALIATION_REDUCTION),
                };
            }
        }
    }

    return {
        attacker: {
            name: getUnitDisplayName(attacker.type),
            atk: effectiveAtk,
            def: attackerStats.def,
            hp: attacker.hp,
            maxHp: attacker.maxHp ?? UNITS[attacker.type].hp,
            modifiers: attackerMods,
        },
        defender: {
            name: city.name,
            atk: 0,
            def: cityDefense,
            hp: city.hp,
            maxHp: city.maxHp,
            modifiers: defenderMods,
            isCity: true,
        },
        estimatedDamage,
        returnDamage,
    };
}
