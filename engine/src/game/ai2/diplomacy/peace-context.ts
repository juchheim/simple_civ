import type { GameState } from "../../../core/types.js";
import type { InfluenceMaps } from "../influence-map.js";
import type { AiPlayerMemoryV2 } from "../memory.js";
import { getSiegeFailureCount } from "../siege-wave.js";
import { getInfluenceRatio } from "../diplomacy-helpers.js";
import { clamp01 } from "../util.js";
import { hasCapturableCity, isProgressThreat, stanceDurationOk } from "./utils.js";

export type PeaceDecisionContext = {
    progressThreatNow: boolean;
    lastStanceTurn: number;
    warAge: number;
    lostCities: number;
    turnsSinceCapture: number;
    incomingPeace: boolean;
    warMomentum: number;
    siegeFailureCount: number;
    thirdPartyThreat: boolean;
    aggressive: boolean;
};

export type PeaceDecisionContextInput = {
    state: GameState;
    playersForThreatCheck: GameState["players"];
    playerId: string;
    targetId: string;
    ratio: number;
    myAnchorCoord?: { q: number; r: number };
    targetAnchorCoord?: { q: number; r: number };
    memory: AiPlayerMemoryV2;
    influence?: InfluenceMaps;
    minStanceTurns: number;
    canInitiateWars: boolean;
    warPowerRatio: number;
};

export function buildPeaceDecisionContext(input: PeaceDecisionContextInput): PeaceDecisionContext | null {
    const {
        state,
        playersForThreatCheck,
        playerId,
        targetId,
        ratio,
        myAnchorCoord,
        targetAnchorCoord,
        memory,
        influence,
        minStanceTurns,
        canInitiateWars,
        warPowerRatio,
    } = input;

    if (hasCapturableCity(state, targetId)) {
        return null;
    }

    const enemyCitiesNow = state.cities.filter(c => c.ownerId === targetId).length;
    const shouldFinishEnemy = enemyCitiesNow <= 1 && ratio >= 1.2;
    if (shouldFinishEnemy) {
        return null;
    }

    if (!stanceDurationOk(state, playerId, targetId, minStanceTurns, memory)) {
        return null;
    }

    const progressThreatNow =
        isProgressThreat(state, targetId) &&
        canInitiateWars &&
        warPowerRatio <= 1.35;

    const lastStanceTurn = memory.lastStanceTurn?.[targetId] ?? state.turn;
    const warAge = state.turn - lastStanceTurn;

    const myCurrentCityCount = state.cities.filter(c => c.ownerId === playerId).length;
    const myStartingCityCount = memory.warCityCount?.[targetId] ?? myCurrentCityCount;
    const lostCities = myStartingCityCount - myCurrentCityCount;
    const turnsSinceCapture = state.turn - (memory.lastCityCaptureTurn?.[targetId] ?? lastStanceTurn);
    const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId) ?? false;

    const pressureWarRatio = Math.max(
        getInfluenceRatio(influence?.pressure, myAnchorCoord),
        getInfluenceRatio(influence?.pressure, targetAnchorCoord)
    );
    const frontWarRatio = Math.max(
        getInfluenceRatio(influence?.front, myAnchorCoord),
        getInfluenceRatio(influence?.front, targetAnchorCoord)
    );
    const warMomentum = clamp01(pressureWarRatio * 0.6 + frontWarRatio * 0.4);

    const focusCity = memory.focusCityId ? state.cities.find(c => c.id === memory.focusCityId) : undefined;
    const siegeFailureCount = (focusCity && focusCity.ownerId === targetId)
        ? getSiegeFailureCount(memory, focusCity.id)
        : 0;

    const thirdPartyThreat = playersForThreatCheck.some(p =>
        p.id !== playerId &&
        p.id !== targetId &&
        !p.isEliminated &&
        isProgressThreat(state, p.id)
    );

    const aggressive = canInitiateWars && warPowerRatio <= 1.35;

    return {
        progressThreatNow,
        lastStanceTurn,
        warAge,
        lostCities,
        turnsSinceCapture,
        incomingPeace,
        warMomentum,
        siegeFailureCount,
        thirdPartyThreat,
        aggressive,
    };
}
