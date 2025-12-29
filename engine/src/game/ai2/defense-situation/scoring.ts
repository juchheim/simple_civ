import { City, GameState, Unit } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import type { DefenseAction, ThreatLevel } from "../defense-situation.js";
import { estimateDefenseValue, estimateUnitThreat } from "./metrics.js";

export function computeThreatScore(
    state: GameState,
    city: City,
    nearbyEnemies: Unit[],
    detectionRange: number
): number {
    let threatScore = 0;
    for (const enemy of nearbyEnemies) {
        const dist = hexDistance(enemy.coord, city.coord);
        const proximity = Math.max(0.5, 1 - (dist / detectionRange));
        threatScore += estimateUnitThreat(enemy, state) * proximity;
    }
    return threatScore;
}

export function computeDefenseScore(
    state: GameState,
    city: City,
    garrison: Unit | null,
    ringUnits: Unit[]
): number {
    let defenseScore = 0;
    if (garrison) defenseScore += estimateDefenseValue(garrison, state) * 1.5; // Garrison bonus
    for (const friendly of ringUnits) {
        defenseScore += estimateDefenseValue(friendly, state);
    }
    // City HP matters
    defenseScore += city.hp * 0.5;
    return defenseScore;
}

export function determineThreatLevel(
    nearbyEnemies: Unit[],
    threatScore: number,
    defenseScore: number
): ThreatLevel {
    if (nearbyEnemies.length === 0) {
        return "none";
    }
    if (nearbyEnemies.length <= 2 && threatScore < defenseScore * 0.5) {
        return "probe";
    }
    if (threatScore < defenseScore * 1.2) {
        return "raid";
    }
    return "assault";
}

export function selectFocusTarget(
    city: City,
    nearbyEnemies: Unit[]
): Unit | null {
    let focusTarget: Unit | null = null;
    let lowestHp = Infinity;
    for (const enemy of nearbyEnemies) {
        if (hexDistance(enemy.coord, city.coord) <= 3 && enemy.hp < lowestHp) {
            lowestHp = enemy.hp;
            focusTarget = enemy;
        }
    }
    return focusTarget;
}

export function recommendDefenseAction(options: {
    threatLevel: ThreatLevel;
    focusTarget: Unit | null;
    ringUnits: Unit[];
    nearbyFriendlies: Unit[];
    defenseScore: number;
    threatScore: number;
    city: City;
}): DefenseAction {
    const {
        threatLevel,
        focusTarget,
        ringUnits,
        nearbyFriendlies,
        defenseScore,
        threatScore,
        city,
    } = options;

    if (threatLevel === "none") {
        return "hold";
    }

    if (threatLevel === "probe") {
        // Intercept probing enemies
        if (ringUnits.length >= 1) {
            return "intercept";
        }
        return "hold";
    }

    if (threatLevel === "raid") {
        // Focus fire on weakest enemy
        if (focusTarget && nearbyFriendlies.length >= 2) {
            return "focus-fire";
        }
        if (ringUnits.length >= 2 && defenseScore > threatScore * 0.8) {
            return "intercept";
        }
        return "hold";
    }

    // threatLevel === "assault"
    if (defenseScore > threatScore * 1.2 && ringUnits.length >= 3) {
        return "sortie"; // Counter-attack!
    }
    if (defenseScore < threatScore * 0.3 && city.hp < 10) {
        return "retreat"; // Save the units
    }
    if (focusTarget) {
        return "focus-fire"; // Try to thin their numbers
    }
    return "hold";
}
