import { GameState, HexCoord, Unit, UnitType } from "../../core/types.js";
import { hexEquals } from "../../core/hex.js";
import {
    UNITS,
    GARRISON_MELEE_ATTACK_BONUS,
    GARRISON_MELEE_DEFENSE_BONUS,
    GARRISON_MELEE_RETALIATION_RANGE,
    GARRISON_RANGED_ATTACK_BONUS,
    GARRISON_RANGED_DEFENSE_BONUS,
    GARRISON_RANGED_RETALIATION_RANGE,
} from "../../core/constants.js";

export interface GarrisonBonus {
    attackBonus: number;
    defenseBonus: number;
    retaliationRange: number;
}

/**
 * Get the unit garrisoned at a city location (not settlers).
 */
export function getGarrisonUnit(state: GameState, cityCoord: HexCoord, cityOwnerId: string): Unit | undefined {
    const unitsAtLocation = state.units.filter(u =>
        hexEquals(u.coord, cityCoord) &&
        u.ownerId === cityOwnerId
    );

    // Exclude settlers from being garrisons
    const militaryUnits = unitsAtLocation.filter(u => u.type !== UnitType.Settler);

    // Return first military unit (should only be one per current rules)
    return militaryUnits[0];
}

/**
 * Calculate garrison bonuses based on unit type.
 * Returns zero bonuses if garrison is a settler or doesn't exist.
 */
export function getGarrisonBonus(garrison: Unit | undefined): GarrisonBonus {
    if (!garrison) {
        return { attackBonus: 0, defenseBonus: 0, retaliationRange: 0 };
    }

    // Settlers provide no garrison bonus
    if (garrison.type === UnitType.Settler) {
        return { attackBonus: 0, defenseBonus: 0, retaliationRange: 0 };
    }

    const unitStats = UNITS[garrison.type];

    // Ranged units: range 2+
    if (unitStats.rng >= 2) {
        return {
            attackBonus: GARRISON_RANGED_ATTACK_BONUS,
            defenseBonus: GARRISON_RANGED_DEFENSE_BONUS,
            retaliationRange: GARRISON_RANGED_RETALIATION_RANGE,
        };
    }

    // Melee units: range 1
    return {
        attackBonus: GARRISON_MELEE_ATTACK_BONUS,
        defenseBonus: GARRISON_MELEE_DEFENSE_BONUS,
        retaliationRange: GARRISON_MELEE_RETALIATION_RANGE,
    };
}
