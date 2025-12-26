/**
 * v8.0: Defense Situation Assessment System
 * 
 * Evaluates the tactical situation around each city and recommends
 * coordinated defensive responses.
 */

import { GameState, Unit, City, UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { getEffectiveUnitStats } from "../helpers/combat.js";

// Threat levels
export type ThreatLevel = "none" | "probe" | "raid" | "assault";

// Recommended defensive actions
export type DefenseAction = "hold" | "intercept" | "focus-fire" | "sortie" | "retreat";

export interface DefenseSituation {
    city: City;
    threatLevel: ThreatLevel;
    recommendedAction: DefenseAction;
    nearbyEnemies: Unit[];
    nearbyFriendlies: Unit[];
    garrison: Unit | null;
    ringUnits: Unit[];
    focusTarget: Unit | null;  // Best target for focus fire
    threatScore: number;       // Numeric threat assessment
    defenseScore: number;      // Our defensive strength
}

// Helper to check if unit is military
function isMilitary(u: Unit): boolean {
    const domain = UNITS[u.type]?.domain;
    return domain !== "Civilian";
}

// Helper to check if unit is ranged
function isRanged(u: Unit): boolean {
    return UNITS[u.type]?.rng > 1;
}

// Estimate unit threat based on stats
function estimateUnitThreat(unit: Unit, state: GameState): number {
    const stats = getEffectiveUnitStats(unit, state);
    // Ranged units are more threatening to cities
    const rangeMult = isRanged(unit) ? 1.5 : 1.0;
    // Army units are more threatening
    const armyMult = unit.type.startsWith("Army") ? 1.5 : 1.0;
    // Titan is extremely threatening
    const titanMult = unit.type === UnitType.Titan ? 3.0 : 1.0;

    return (stats.atk + stats.def * 0.5) * rangeMult * armyMult * titanMult * (unit.hp / UNITS[unit.type].hp);
}

// Estimate unit defensive value
function estimateDefenseValue(unit: Unit, state: GameState): number {
    const stats = getEffectiveUnitStats(unit, state);
    const hpFrac = unit.hp / UNITS[unit.type].hp;
    return (stats.def + stats.atk * 0.3) * hpFrac;
}

/**
 * Assess the defensive situation around a city.
 */
export function assessCitySituation(
    state: GameState,
    city: City,
    playerId: string
): DefenseSituation {
    const DETECTION_RANGE = 5;  // How far to look for enemies
    const RING_RANGE = 2;       // Units forming defensive ring

    // Find nearby enemies
    const nearbyEnemies = state.units.filter(u =>
        u.ownerId !== playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, city.coord) <= DETECTION_RANGE
    );

    // Find nearby friendly units
    const nearbyFriendlies = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, city.coord) <= RING_RANGE
    );

    // Find garrison (unit on city tile)
    const garrison = state.units.find(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.coord.q === city.coord.q &&
        u.coord.r === city.coord.r
    ) || null;

    // Ring units (nearby but not on city)
    const ringUnits = nearbyFriendlies.filter(u =>
        u.coord.q !== city.coord.q || u.coord.r !== city.coord.r
    );

    // Calculate threat score
    let threatScore = 0;
    for (const enemy of nearbyEnemies) {
        const dist = hexDistance(enemy.coord, city.coord);
        const proximity = Math.max(0.5, 1 - (dist / DETECTION_RANGE));
        threatScore += estimateUnitThreat(enemy, state) * proximity;
    }

    // Calculate defense score
    let defenseScore = 0;
    if (garrison) defenseScore += estimateDefenseValue(garrison, state) * 1.5; // Garrison bonus
    for (const friendly of ringUnits) {
        defenseScore += estimateDefenseValue(friendly, state);
    }
    // City HP matters
    defenseScore += city.hp * 0.5;

    // Determine threat level
    let threatLevel: ThreatLevel = "none";
    if (nearbyEnemies.length === 0) {
        threatLevel = "none";
    } else if (nearbyEnemies.length <= 2 && threatScore < defenseScore * 0.5) {
        threatLevel = "probe";
    } else if (threatScore < defenseScore * 1.2) {
        threatLevel = "raid";
    } else {
        threatLevel = "assault";
    }

    // Find best focus target (weakest nearby enemy that can be eliminated)
    let focusTarget: Unit | null = null;
    let lowestHp = Infinity;
    for (const enemy of nearbyEnemies) {
        if (hexDistance(enemy.coord, city.coord) <= 3 && enemy.hp < lowestHp) {
            lowestHp = enemy.hp;
            focusTarget = enemy;
        }
    }

    // Determine recommended action
    let recommendedAction: DefenseAction = "hold";

    if (threatLevel === "none") {
        recommendedAction = "hold";
    } else if (threatLevel === "probe") {
        // Intercept probing enemies
        if (ringUnits.length >= 1) {
            recommendedAction = "intercept";
        } else {
            recommendedAction = "hold";
        }
    } else if (threatLevel === "raid") {
        // Focus fire on weakest enemy
        if (focusTarget && nearbyFriendlies.length >= 2) {
            recommendedAction = "focus-fire";
        } else if (ringUnits.length >= 2 && defenseScore > threatScore * 0.8) {
            recommendedAction = "intercept";
        } else {
            recommendedAction = "hold";
        }
    } else if (threatLevel === "assault") {
        // Under heavy attack
        if (defenseScore > threatScore * 1.2 && ringUnits.length >= 3) {
            recommendedAction = "sortie"; // Counter-attack!
        } else if (defenseScore < threatScore * 0.3 && city.hp < 10) {
            recommendedAction = "retreat"; // Save the units
        } else if (focusTarget) {
            recommendedAction = "focus-fire"; // Try to thin their numbers
        } else {
            recommendedAction = "hold";
        }
    }

    return {
        city,
        threatLevel,
        recommendedAction,
        nearbyEnemies,
        nearbyFriendlies,
        garrison,
        ringUnits,
        focusTarget,
        threatScore,
        defenseScore,
    };
}

/**
 * Assess defense situation for all cities belonging to a player.
 */
export function assessDefenseSituation(
    state: GameState,
    playerId: string
): DefenseSituation[] {
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    return myCities.map(city => assessCitySituation(state, city, playerId));
}
