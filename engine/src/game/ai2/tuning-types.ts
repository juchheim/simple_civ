
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
        humanTargetScore: number;
        // Offensive scoring parameters (Phase 1)
        momentumBonus: number;             // Bonus for attacking during attack phase
        attackPhaseRiskReduction: number;  // Risk penalty multiplier during attack phase (0.6 = 40% reduction)
        finishingBlowBonus: number;        // Bonus for kills that remove last defender near city
        flankingBonus2: number;            // Bonus for attacking with 2+ adjacent allies
        flankingBonus3: number;            // Bonus for attacking with 3+ adjacent allies
        isolatedTargetBonus: number;       // Bonus for attacking isolated targets (no allies within 2)
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
        maxDefenderDistance: number;
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
