import { GameState } from "../../core/types.js";
import { estimateMilitaryPower } from "../ai/goals.js";
import type { InfluenceMaps } from "./influence-map.js";
import { clamp01 } from "./util.js";
import { getInfluenceRatio } from "./diplomacy-helpers.js";
import {
    BORDER_VIOLATION_TRIGGER_SCORE,
    EARLY_RUSH_MAX_TURN,
    EARLY_RUSH_SEED_MOD,
    FORCED_WAR_TRIGGER,
    TRIGGER_INFLUENCE_WEIGHTS
} from "./diplomacy/constants.js";

export type WarTriggerCandidate = {
    targetId: string;
    score: number;
    reason: string;
    focusCityId?: string;
    stageIfNotReady: boolean;
};

type CityAnchor = { coord: { q: number; r: number } } | undefined;

export function computeEarlyRushActive(
    earlyRushChance: number | undefined,
    turn: number,
    playerId: string,
    seed: number | undefined,
): boolean {
    if (!earlyRushChance || turn > EARLY_RUSH_MAX_TURN) return false;
    const rushSeed = (playerId.charCodeAt(0) + (seed ?? 0)) % EARLY_RUSH_SEED_MOD;
    return rushSeed < earlyRushChance * EARLY_RUSH_SEED_MOD;
}

export function computeTriggerInfluenceBoost(
    influence: InfluenceMaps | undefined,
    myAnchor: CityAnchor,
    cities: GameState["cities"],
    targetId: string | undefined,
): { boost: number; front: number; pressure: number } {
    if (!targetId) return { boost: 0, front: 0, pressure: 0 };
    if (!influence) return { boost: 0, front: 0, pressure: 0 };

    const theirCities = cities.filter(city => city.ownerId === targetId);
    const theirAnchor = theirCities.find(city => city.isCapital) ?? theirCities[0];
    const front = Math.max(
        getInfluenceRatio(influence.front, myAnchor?.coord),
        getInfluenceRatio(influence.front, theirAnchor?.coord)
    );
    const pressure = Math.max(
        getInfluenceRatio(influence.pressure, myAnchor?.coord),
        getInfluenceRatio(influence.pressure, theirAnchor?.coord)
    );
    const boost = (front * TRIGGER_INFLUENCE_WEIGHTS.front) + (pressure * TRIGGER_INFLUENCE_WEIGHTS.pressure);
    return { boost, front, pressure };
}

export function computeBorderViolationTriggerScore(
    violationCount: number,
    minDistToCity: number,
    influenceBoost: number,
): number {
    return clamp01(
        BORDER_VIOLATION_TRIGGER_SCORE.base
        + (violationCount * BORDER_VIOLATION_TRIGGER_SCORE.violationWeight)
        - (minDistToCity * BORDER_VIOLATION_TRIGGER_SCORE.distanceWeight)
        + influenceBoost
    );
}

export function getForcedWarTriggerTurn(playerId: string, seed: number | undefined): number {
    const forcedWarTurnOffset = (playerId.charCodeAt(0) + (seed ?? 0)) % FORCED_WAR_TRIGGER.turnOffsetRange;
    return FORCED_WAR_TRIGGER.baseTurn + forcedWarTurnOffset;
}

export function selectForcedWarTarget(
    state: GameState,
    playerId: string,
): { targetId: string; weakestPower: number } | null {
    let weakestId: string | null = null;
    let weakestPower = Infinity;

    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        const theirCities = state.cities.filter(city => city.ownerId === other.id);
        if (theirCities.length === 0) continue;

        const theirPower = estimateMilitaryPower(other.id, state);
        const effectivePowerForComparison = other.isAI ? theirPower : theirPower * FORCED_WAR_TRIGGER.humanPowerDiscount;
        if (effectivePowerForComparison < weakestPower) {
            weakestPower = effectivePowerForComparison;
            weakestId = other.id;
        }
    }

    if (!weakestId) return null;
    return { targetId: weakestId, weakestPower };
}

export function computeForcedWarTriggerScore(
    myPower: number,
    weakestPower: number,
    influenceBoost: number,
): number {
    const ratio = weakestPower > 0 ? myPower / weakestPower : FORCED_WAR_TRIGGER.fallbackPowerRatio;
    return clamp01(
        FORCED_WAR_TRIGGER.scoreBase
        + (ratio - FORCED_WAR_TRIGGER.minimumPowerRatio) * FORCED_WAR_TRIGGER.scoreSlope
        + influenceBoost
    );
}
