
export interface TacticalTuning {
    army: {
        rallyDist: number;
        rallyScanLimit: number;
        rallyRadius: number;
        stagedRadius: number;
        minForceConcentrationForEarlyAttack: number;
        minUnitsForEarlyAttack: number;
        titanNearTargetDist: number;
        cityHpSiegeThreshold: number;
        overwhelmingPowerRatio: number;
        lowHpCityThreshold: number;
        localSuperiorityRadius: number;
        localSuperiorityRatio: number;
        localSuperiorityMinPower: number;
        opportunityKillScore: number;
    };
    wait: {
        combatZoneRadius: number;
        reinforcementBuffer: number;
        reinforcementPowerRatio: number;
        reinforcementBaseScoreMult: number;
        localPowerRatioBad: number;
        localPowerRatioPoor: number;
        noKillBaseScore: number;
        noKillAvgScoreThreshold: number;
        noKillLowValueScore: number;
        exposureThreatCount: number;
        exposureHighThreatScore: number;
        exposureMedThreatCount: number;
        exposureMedThreatDamageRatio: number;
        exposureMedThreatScore: number;
        terrainScore: number;
        waitThresholdRatio: number;
        overrideWarDurationTurns: number;
        overrideCityHpRatio: number;
        overrideHighValueKillScore: number;
        overrideAggressiveThreshold: number;
    };
    defense: {
        garrisonBonus: number;
        cityHpScoreMult: number;
        threatPressureProbe: number;
        threatPressureRaid: number;
        enemiesProbeMax: number;
        interceptMinRing: number;
        focusFireMinFriendlies: number;
        interceptRaidMinRing: number;
        interceptRaidScoreRatio: number;
        sortieScoreRatio: number;
        sortieMinRing: number;
        retreatScoreRatio: number;
        retreatCityHp: number;
        // New keys
        detectionRange: number;
    };
    ring: {
        capitalRingSize: number;
        perimeterRingSize: number;
        defaultRingSize: number;
        baseTileScore: number;
        terrainBonus: number;
        enemyDistanceCap: number;
        earlyGameTurn: number;
        // New keys
        ringRadius: number;
    };
    moveAttack: {
        survivalHpMarginal: number;
        powerOverride2xMult: number;
        powerOverride1_5xMult: number;
        powerOverride1_2xMult: number;
        warDuration30Mult: number;
        warDuration20Mult: number;
        warDuration10Mult: number;
        objectiveDist2Mult: number;
        objectiveDist4Mult: number;
        deathWithoutKillPenalty: number;
        moveAttackScanMoves: number;
    };
}
