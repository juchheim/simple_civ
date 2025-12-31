import { GameState } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";
import { TacticalTuning } from "./tuning-types.js";

// Re-export type
export type { TacticalTuning } from "./tuning-types.js";


export const DEFAULT_TUNING: TacticalTuning = {
    army: {
        rallyDist: 4,
        rallyScanLimit: 900,
        rallyRadius: 3,
        stagedRadius: 3,
        minForceConcentrationForEarlyAttack: 0.6,
        minUnitsForEarlyAttack: 3,
        titanNearTargetDist: 4,
        cityHpSiegeThreshold: 0.7,
        overwhelmingPowerRatio: 2.0,
        lowHpCityThreshold: 15,
        localSuperiorityRadius: 5,
        localSuperiorityRatio: 1.5,
        localSuperiorityMinPower: 5,
        opportunityKillScore: 200,
    },
    wait: {
        combatZoneRadius: 6,
        reinforcementBuffer: 3,
        reinforcementPowerRatio: 0.3,
        reinforcementBaseScoreMult: 0.5,
        localPowerRatioBad: 0.6,
        localPowerRatioPoor: 0.8,
        noKillBaseScore: 40,
        noKillAvgScoreThreshold: 20,
        noKillLowValueScore: 20,
        exposureThreatCount: 3,
        exposureHighThreatScore: 40,
        exposureMedThreatCount: 2,
        exposureMedThreatDamageRatio: 0.5,
        exposureMedThreatScore: 20,
        terrainScore: 15,
        waitThresholdRatio: 0.6,
        overrideWarDurationTurns: 30,
        overrideCityHpRatio: 0.3,
        overrideHighValueKillScore: 200,
        overrideAggressiveThreshold: 0.5,
    },
    defense: {
        garrisonBonus: 1.5,
        cityHpScoreMult: 0.5,
        threatPressureProbe: 0.55,
        threatPressureRaid: 1.25,
        enemiesProbeMax: 2,
        interceptMinRing: 1,
        focusFireMinFriendlies: 2,
        interceptRaidMinRing: 2,
        interceptRaidScoreRatio: 0.8,
        sortieScoreRatio: 1.2,
        sortieMinRing: 3,
        retreatScoreRatio: 0.3,
        retreatCityHp: 10,
        detectionRange: 5,
    },
    ring: {
        capitalRingSize: 4,
        perimeterRingSize: 3,
        defaultRingSize: 1,
        baseTileScore: 10,
        terrainBonus: 5,
        enemyDistanceCap: 10,
        earlyGameTurn: 50,
        ringRadius: 2,
    },
    moveAttack: {
        survivalHpMarginal: 2,
        powerOverride2xMult: 0.3,
        powerOverride1_5xMult: 0.6,
        powerOverride1_2xMult: 0.8,
        warDuration30Mult: 0.3,
        warDuration20Mult: 0.5,
        warDuration10Mult: 0.7,
        objectiveDist2Mult: 0.4,
        objectiveDist4Mult: 0.6,
        deathWithoutKillPenalty: 500,
        moveAttackScanMoves: 1,
    }
};

/**
 * Get the tactical tuning parameters for a specific player/state.
 * Currently returns defaults, but allows for future overrides (e.g. per-civ).
 */
export function getTacticalTuning(state: GameState, playerId: string): TacticalTuning {
    const profile = getAiProfileV2(state, playerId);
    if (!profile.tacticalTuning) return DEFAULT_TUNING;

    // Merge profile overrides on top of defaults
    return {
        army: { ...DEFAULT_TUNING.army, ...profile.tacticalTuning.army },
        wait: { ...DEFAULT_TUNING.wait, ...profile.tacticalTuning.wait },
        defense: { ...DEFAULT_TUNING.defense, ...profile.tacticalTuning.defense },
        ring: { ...DEFAULT_TUNING.ring, ...profile.tacticalTuning.ring },
        moveAttack: { ...DEFAULT_TUNING.moveAttack, ...profile.tacticalTuning.moveAttack },
    };
}
