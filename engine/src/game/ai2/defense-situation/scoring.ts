import { City, GameState, Unit } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import type { DefenseAction, ThreatLevel } from "../defense-situation.js";
import { estimateDefenseValue, estimateUnitThreat } from "./metrics.js";
import { buildDefenseSnapshot } from "./assessment.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { scoreDefenseAttackOption } from "../attack-order/scoring.js";
import { canPlanAttack, isGarrisoned } from "../attack-order/shared.js";
import { getTacticalTuning, DEFAULT_TUNING } from "../tuning.js";

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
    ringUnits: Unit[],
    tuning: any // Pass tuning or use default if we can't change signature of computeDefenseScore easily without breaking callers
): number {
    let defenseScore = 0;
    if (garrison) defenseScore += estimateDefenseValue(garrison, state) * tuning.defense.garrisonBonus;
    for (const friendly of ringUnits) {
        defenseScore += estimateDefenseValue(friendly, state);
    }
    // City HP matters
    defenseScore += city.hp * tuning.defense.cityHpScoreMult;
    return defenseScore;
}

export function determineThreatLevel(
    nearbyEnemies: Unit[],
    threatScore: number,
    defenseScore: number,
    tuning: any
): ThreatLevel {
    if (nearbyEnemies.length === 0) {
        return "none";
    }
    const ratio = threatScore / Math.max(defenseScore, 1);
    const countFactor = 1 + Math.min(0.4, Math.max(0, nearbyEnemies.length - 1) * 0.1);
    const pressure = ratio * countFactor;

    if (nearbyEnemies.length <= tuning.defense.enemiesProbeMax && pressure < tuning.defense.threatPressureProbe) {
        return "probe";
    }
    if (pressure < tuning.defense.threatPressureRaid) {
        return "raid";
    }
    return "assault";
}

export function assessCityThreatLevel(
    state: GameState,
    city: City,
    playerId: string,
    detectionRange: number = 5,
    ringRange: number = 2
): ThreatLevel {
    const tuning = getTacticalTuning(state, playerId);
    const snapshot = buildDefenseSnapshot(state, city, playerId, detectionRange, ringRange);
    const threatScore = computeThreatScore(state, city, snapshot.nearbyEnemies, detectionRange);
    // Updated call signature to include tuning
    const defenseScore = computeDefenseScore(state, city, snapshot.garrison, snapshot.ringUnits, tuning);
    return determineThreatLevel(snapshot.nearbyEnemies, threatScore, defenseScore, tuning);
}

export function selectFocusTarget(
    state: GameState,
    playerId: string,
    city: City,
    nearbyEnemies: Unit[],
    nearbyFriendlies: Unit[]
): Unit | null {
    const defenders = nearbyFriendlies.filter(u => !isGarrisoned(u, state, playerId));

    let bestTarget: Unit | null = null;
    let bestScore = -Infinity;

    for (const enemy of nearbyEnemies) {
        let enemyBest = -Infinity;
        for (const defender of defenders) {
            if (!canPlanAttack(state, defender, "Unit", enemy.id)) continue;

            const preview = getCombatPreviewUnitVsUnit(state, defender, enemy);
            const scored = scoreDefenseAttackOption({
                state,
                playerId,
                attacker: defender,
                targetType: "Unit",
                target: enemy,
                damage: preview.estimatedDamage.avg,
                returnDamage: preview.returnDamage?.avg ?? 0,
                cityCoord: city.coord
            });
            const score = scored.score;

            if (score > enemyBest) enemyBest = score;
        }

        if (enemyBest > bestScore) {
            bestScore = enemyBest;
            bestTarget = enemy;
        }
    }

    if (bestTarget) return bestTarget;

    let fallbackTarget: Unit | null = null;
    let lowestHp = Infinity;
    for (const enemy of nearbyEnemies) {
        if (hexDistance(enemy.coord, city.coord) <= 3 && enemy.hp < lowestHp) {
            lowestHp = enemy.hp;
            fallbackTarget = enemy;
        }
    }
    return fallbackTarget;
}

export function recommendDefenseAction(options: {
    threatLevel: ThreatLevel;
    focusTarget: Unit | null;
    ringUnits: Unit[];
    nearbyFriendlies: Unit[];
    defenseScore: number;
    threatScore: number;
    city: City;
    tuning: ReturnType<typeof getTacticalTuning>;
}): DefenseAction {
    const {
        threatLevel,
        focusTarget,
        ringUnits,
        nearbyFriendlies,
        defenseScore,
        threatScore,
        city,
        tuning,
    } = options;



    const settings = tuning.defense;

    if (threatLevel === "none") {
        return "hold";
    }

    if (threatLevel === "probe") {
        // Intercept probing enemies
        if (ringUnits.length >= settings.interceptMinRing) {
            return "intercept";
        }
        return "hold";
    }

    if (threatLevel === "raid") {
        // Focus fire on weakest enemy
        if (focusTarget && nearbyFriendlies.length >= settings.focusFireMinFriendlies) {
            return "focus-fire";
        }
        if (ringUnits.length >= settings.interceptRaidMinRing && defenseScore > threatScore * settings.interceptRaidScoreRatio) {
            return "intercept";
        }
        return "hold";
    }

    // threatLevel === "assault"
    if (defenseScore > threatScore * settings.sortieScoreRatio && ringUnits.length >= settings.sortieMinRing) {
        return "sortie"; // Counter-attack!
    }
    if (defenseScore < threatScore * settings.retreatScoreRatio && city.hp < settings.retreatCityHp) {
        return "retreat"; // Save the units
    }
    if (focusTarget) {
        return "focus-fire"; // Try to thin their numbers
    }
    return "hold";
}
