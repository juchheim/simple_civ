import { GameState } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { buildPerception } from "./perception.js";
import { getAiMemoryV2, setAiMemoryV2, type AiPlayerMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { getTacticalTuning } from "./tuning.js";
import { isMilitary } from "./unit-roles.js";
import type { TacticalContext } from "./tactical-context.js";

export const SIEGE_WAVE_RADIUS = 4;
export const SIEGE_NO_PROGRESS_TURNS = 5;
const SIEGE_MAX_FAILURE_COUNT = 4;
const SIEGE_REINFORCE_STEP = 1;
const SIEGE_ARMY_PERCENT_BONUS = 0.08;
const SIEGE_ARMY_PERCENT_CAP = 0.85;

export function getSiegeFailureCount(memory: AiPlayerMemoryV2, focusCityId?: string): number {
    if (!focusCityId) return 0;
    return memory.siegeFailureCount?.[focusCityId] ?? 0;
}

export function getReinforcedRequiredNear(baseRequired: number, failureCount: number): number {
    if (failureCount <= 0) return baseRequired;
    const bonus = Math.min(SIEGE_MAX_FAILURE_COUNT, Math.max(0, failureCount)) * SIEGE_REINFORCE_STEP;
    return baseRequired + bonus;
}

export function getReinforcedArmyPercent(basePercent: number, failureCount: number): number {
    if (failureCount <= 0) return basePercent;
    const bonus = Math.min(SIEGE_MAX_FAILURE_COUNT, Math.max(0, failureCount)) * SIEGE_ARMY_PERCENT_BONUS;
    return Math.min(SIEGE_ARMY_PERCENT_CAP, basePercent + bonus);
}

export function updateSiegeWaveMemory(state: GameState, playerId: string, ctx?: TacticalContext): GameState {
    const memory = getAiMemoryV2(state, playerId);
    const focusCityId = memory.focusCityId;
    if (!focusCityId) return state;

    const focusCity = state.cities.find(c => c.id === focusCityId);
    if (!focusCity || focusCity.ownerId === playerId) return state;

    const enemyIds = ctx?.enemyIds ?? new Set(
        state.players
            .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War")
            .map(p => p.id)
    );
    if (!enemyIds.has(focusCity.ownerId)) return state;

    const perception = buildPerception(state, playerId);
    if (perception.visibilityKnown && !perception.isCoordVisible(focusCity.coord)) {
        return state;
    }
    if (focusCity.hp <= 0) {
        return state;
    }

    const profile = ctx?.profile ?? getAiProfileV2(state, playerId);
    const tuning = getTacticalTuning(state, playerId);
    const baseRequired = Math.max(tuning.army.minUnitsForEarlyAttack, Math.ceil(profile.tactics.forceConcentration * 4));
    const failureCount = getSiegeFailureCount(memory, focusCityId);
    const waveStartMin = getReinforcedRequiredNear(baseRequired, failureCount);
    const waveEndMin = Math.max(2, waveStartMin - 1);

    const nearCount = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, focusCity.coord) <= SIEGE_WAVE_RADIUS
    ).length;

    const now = state.turn;
    const updates: Partial<AiPlayerMemoryV2> = {};

    const waveActive = !!memory.siegeWaveActive;
    const waveStartTurn = memory.siegeWaveStartTurn ?? now;
    const lastProgressTurn = memory.siegeLastProgressTurn;
    const minHpThisWave = memory.siegeMinHpThisWave;

    if (!waveActive) {
        if (nearCount >= waveStartMin) {
            updates.siegeWaveActive = true;
            updates.siegeWaveStartTurn = now;
            updates.siegeLastProgressTurn = undefined;
            updates.siegeMinHpThisWave = focusCity.hp;
        }
    } else {
        if (minHpThisWave === undefined || focusCity.hp < minHpThisWave) {
            updates.siegeMinHpThisWave = focusCity.hp;
            updates.siegeLastProgressTurn = now;
        }

        const progressTurn = updates.siegeLastProgressTurn ?? lastProgressTurn;
        const turnsSinceProgress = progressTurn !== undefined ? (now - progressTurn) : (now - waveStartTurn);
        const stalled = turnsSinceProgress >= SIEGE_NO_PROGRESS_TURNS;
        const waveCollapsed = nearCount < waveEndMin;

        if (stalled || waveCollapsed) {
            const hadProgress = progressTurn !== undefined;
            const failureTriggered = waveCollapsed || !hadProgress || stalled;
            const failureCountNext = failureTriggered ? Math.min(SIEGE_MAX_FAILURE_COUNT, failureCount + 1) : failureCount;
            updates.siegeFailureCount = failureCountNext !== failureCount
                ? { ...(memory.siegeFailureCount ?? {}), [focusCityId]: failureCountNext }
                : memory.siegeFailureCount;
            updates.siegeWaveActive = false;
            updates.siegeWaveStartTurn = undefined;
            updates.siegeLastProgressTurn = undefined;
            updates.siegeMinHpThisWave = undefined;

            if (failureTriggered) {
                updates.armyPhase = "rallying";
                updates.armyReadyTurn = undefined;
                updates.armyPhaseStartTurn = now;
            }
        }
    }

    if (Object.keys(updates).length === 0) return state;
    return setAiMemoryV2(state, playerId, { ...memory, ...updates });
}
