import { CITY_STATE_CONTEST_MARGIN, CITY_STATE_INVEST_GAIN, UNITS } from "../../core/constants.js";
import { hexDistance } from "../../core/hex.js";
import {
    AiVictoryGoal,
    CityState,
    CityStateSuzerainChangeCause,
    CityStateYieldType,
    GameState,
} from "../../core/types.js";
import {
    getCityStateInvestCost,
    getCityStateInvestDecisionCost,
    isCityStateRecentPassiveOpening,
} from "../city-states.js";
import { computeEconomySnapshot } from "./economy/budget.js";
import { getWarEnemyIds, isMilitaryUnitType } from "./schema.js";

export type CityStateInvestmentOption = {
    cityStateId: string;
    score: number;
    cost: number;
};

export type CityStateInvestmentPickOptions = {
    preferTurnover?: boolean;
};

const YIELD_PRIORITY_BY_GOAL: Record<AiVictoryGoal, Record<CityStateYieldType, number>> = {
    Progress: {
        Science: 1.46,
        Production: 0.78,
        Food: 1.08,
        Gold: 1.26,
    },
    Conquest: {
        Science: 0.98,
        Production: 1.12,
        Food: 1.12,
        Gold: 1.3,
    },
    Balanced: {
        Science: 1.22,
        Production: 0.92,
        Food: 1.12,
        Gold: 1.22,
    },
};

const INVEST_COST_WEIGHT_BY_STATE: Record<"Healthy" | "Guarded" | "Strained" | "Crisis", number> = {
    Healthy: 0.1,
    Guarded: 0.13,
    Strained: 0.17,
    Crisis: 0.25,
};

const INVEST_RESERVE_MULT_BY_STATE: Record<"Healthy" | "Guarded" | "Strained" | "Crisis", number> = {
    Healthy: 0.5,
    Guarded: 0.64,
    Strained: 0.8,
    Crisis: 1,
};

const PASSIVE_OPENING_RESERVE_MULT_BY_STATE: Record<"Healthy" | "Guarded" | "Strained" | "Crisis", number> = {
    Healthy: 0.18,
    Guarded: 0.28,
    Strained: 0.42,
    Crisis: 0.65,
};

const OFFENSIVE_WAR_SCORE_THRESHOLD = 30;
const INVEST_PREFERRED_SCORE_FLOOR = 0.66;
const INCUMBENT_SAFE_LEAD_MULT = 0.85;
const INCUMBENT_NO_RIVAL_INFLUENCE_FLOOR = 0.45;
const INCUMBENT_MEANINGFUL_RIVAL_MULT = 0.15;
const INCUMBENT_WAR_PRESSURE_BONUS_PER_WAR = 6;
const INCUMBENT_WAR_PRESSURE_BONUS_MAX = 24;
const TURNOVER_CAMPAIGN_WINDOW_MULT = 3.25;
const TURNOVER_DEEP_BEHIND_MULT = 4;
const TURNOVER_FLIP_WINDOW_MULT = 1.5;
const TURNOVER_RACE_COST_RELIEF = 0.55;
const TURNOVER_LIVE_RACE_GAP_MULT = 3.25;
const CITY_STATE_SCORE_JITTER = 4;
const CITY_STATE_TURNOVER_SCORE_JITTER = 6;
const CITY_STATE_EXPLORATION_CHANCE = 0.24;
const CITY_STATE_EXPLORATION_POOL = 4;
const CITY_STATE_EXPLORATION_SCORE_BAND = 0.84;
const CITY_STATE_HOTSPOT_WINDOW = 16;
const CITY_STATE_HOTSPOT_THRESHOLD = 3;
const CITY_STATE_HOTSPOT_CHALLENGE_PENALTY = 14;
const CITY_STATE_HOTSPOT_INCUMBENT_PENALTY = 18;
const CITY_STATE_HOTSPOT_DEFENSIVE_PENALTY = 8;
const CITY_STATE_HOTSPOT_PENALTY_STEP = 4;
const CITY_STATE_HOTSPOT_PAIR_LOOP_THRESHOLD = 2;
const CITY_STATE_HOTSPOT_PAIR_LOOP_MAINTENANCE_MULT = 0.45;
const CITY_STATE_HOTSPOT_PAIR_LOOP_MAINTENANCE_PENALTY_BASE = 18;
const CITY_STATE_HOTSPOT_PAIR_LOOP_MAINTENANCE_PENALTY_STEP = 8;
const CITY_STATE_HOTSPOT_PAIR_LOOP_MAINTENANCE_PENALTY_MAX = 42;
const CITY_STATE_STABLE_TURNOVER_BONUS = 10;
const CITY_STATE_STABLE_CLOSE_RACE_BONUS = 14;
const CITY_STATE_FRESH_FLIP_WINDOW = 6;
const CITY_STATE_FRESH_RECONTEST_PENALTY = 16;
const CITY_STATE_FRESH_RECONTEST_STEP = 3;
const CITY_STATE_FRESH_HOLD_BONUS = 8;
const CITY_STATE_PAIR_LOOP_WINDOW = 18;
const CITY_STATE_PAIR_RECLAIM_PENALTY_BASE = 18;
const CITY_STATE_PAIR_RECLAIM_PENALTY_STEP = 8;
const CITY_STATE_PAIR_RECLAIM_PENALTY_MAX = 44;
const CITY_STATE_PASSIVE_OPENING_SCORE_BONUS = 12;
const CITY_STATE_PASSIVE_OPENING_FLIP_BONUS = 10;
const CITY_STATE_DEFENSIVE_MAINTENANCE_MULT = 0.85;
const CITY_STATE_HOTSPOT_DEFENSIVE_MAINTENANCE_MULT = 0.45;

function hashString32(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function seededRandom01(state: GameState, playerId: string, salt: string): number {
    const seed = Number.isFinite(state.seed) ? Math.floor(state.seed) : 1;
    const hash = hashString32(`${seed}|${state.turn}|${playerId}|${salt}`);
    return hash / 4294967296;
}

function computeScoreJitter(
    state: GameState,
    playerId: string,
    cityStateId: string,
    turnoverCandidate: boolean,
): number {
    const span = turnoverCandidate ? CITY_STATE_TURNOVER_SCORE_JITTER : CITY_STATE_SCORE_JITTER;
    const roll = seededRandom01(state, playerId, `city-state-jitter:${cityStateId}`);
    return ((roll * 2) - 1) * span;
}

function getInfluenceGapToSuzerain(cityState: CityState, playerId: string): number {
    const suzerainId = cityState.suzerainId;
    if (!suzerainId || suzerainId === playerId) return Number.POSITIVE_INFINITY;
    const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
    const suzerainInfluence = cityState.influenceByPlayer[suzerainId] ?? 0;
    return suzerainInfluence - myInfluence;
}

function getTurnsSinceSuzerainChange(state: GameState, cityState: CityState): number | undefined {
    const turn = cityState.lastSuzerainChangeTurn;
    if (turn === undefined) return undefined;
    return state.turn - turn;
}

function isCompetitiveSuzerainChangeCause(
    cause: CityStateSuzerainChangeCause | undefined,
): boolean {
    return cause === "Investment"
        || cause === "PassiveContestation"
        || cause === "WartimeRelease";
}

function isCityStateHotspot(state: GameState, cityState: CityState): boolean {
    const turnsSinceChange = getTurnsSinceSuzerainChange(state, cityState);
    if (turnsSinceChange === undefined) return false;
    if (turnsSinceChange > CITY_STATE_HOTSPOT_WINDOW) return false;
    return (cityState.recentSuzerainChangeCount ?? 0) >= CITY_STATE_HOTSPOT_THRESHOLD;
}

function getRecentPairRecaptureCount(
    state: GameState,
    cityState: CityState,
    playerId: string,
): number {
    const incumbentId = cityState.suzerainId;
    if (!incumbentId || incumbentId === playerId) return 0;
    if (cityState.lastSuzerainHolderId !== playerId) return 0;
    const pairTurn = cityState.recentSuzerainPairTurn;
    if (pairTurn === undefined) return 0;
    if ((state.turn - pairTurn) > CITY_STATE_PAIR_LOOP_WINDOW) return 0;
    const expectedPairKey = [playerId, incumbentId].sort().join("|");
    if (cityState.recentSuzerainPairKey !== expectedPairKey) return 0;
    return cityState.recentSuzerainPairChangeCount ?? 0;
}

export function getHotspotIncumbentPairLoopCount(
    state: GameState,
    cityState: CityState,
    playerId: string,
): number {
    if (cityState.suzerainId !== playerId) return 0;
    if (!isCityStateHotspot(state, cityState)) return 0;
    const lastHolderId = cityState.lastSuzerainHolderId;
    if (!lastHolderId || lastHolderId === playerId) return 0;
    const pairTurn = cityState.recentSuzerainPairTurn;
    if (pairTurn === undefined) return 0;
    if ((state.turn - pairTurn) > CITY_STATE_PAIR_LOOP_WINDOW) return 0;
    const expectedPairKey = [playerId, lastHolderId].sort().join("|");
    if (cityState.recentSuzerainPairKey !== expectedPairKey) return 0;
    const pairCount = cityState.recentSuzerainPairChangeCount ?? 0;
    return pairCount >= CITY_STATE_HOTSPOT_PAIR_LOOP_THRESHOLD ? pairCount : 0;
}

export function isCityStateTurnoverCandidate(
    cityState: CityState,
    playerId: string,
    gapWindowMult = TURNOVER_LIVE_RACE_GAP_MULT,
): boolean {
    if (!cityState.suzerainId || cityState.suzerainId === playerId) return false;
    if (!cityState.discoveredByPlayer[playerId]) return false;
    if (cityState.warByPlayer[playerId]) return false;
    const gapToIncumbent = getInfluenceGapToSuzerain(cityState, playerId);
    return gapToIncumbent <= Math.ceil(CITY_STATE_INVEST_GAIN * gapWindowMult);
}

function nearestCityDistance(state: GameState, playerId: string, coord: { q: number; r: number }): number {
    const cities = state.cities.filter(c => c.ownerId === playerId);
    if (cities.length === 0) return Number.POSITIVE_INFINITY;
    let best = Number.POSITIVE_INFINITY;
    for (const city of cities) {
        best = Math.min(best, hexDistance(city.coord, coord));
    }
    return best;
}

function getSameTypeMarginalMultiplier(existingCount: number): number {
    if (existingCount <= 0) return 1;
    if (existingCount === 1) return 0.7;
    return 0.5;
}

function getControlledSameTypeCount(state: GameState, playerId: string, yieldType: CityStateYieldType): number {
    return (state.cityStates ?? []).filter(cs => cs.suzerainId === playerId && cs.yieldType === yieldType).length;
}

function getYieldPriority(
    goal: AiVictoryGoal,
    yieldType: CityStateYieldType,
    economyState: "Healthy" | "Guarded" | "Strained" | "Crisis",
): number {
    let priority = YIELD_PRIORITY_BY_GOAL[goal][yieldType] ?? 1;

    if (economyState === "Strained" || economyState === "Crisis") {
        if (yieldType === "Gold") priority += 0.35;
        if (yieldType === "Food") priority += 0.08;
    }

    return priority;
}

function estimateUnitPower(unitType: keyof typeof UNITS): number {
    const stats = UNITS[unitType];
    return (stats.atk * 1.8) + (stats.def * 1.15) + (stats.hp * 0.12) + (stats.rng * 1.4);
}

function estimateLocalPower(
    state: GameState,
    ownerId: string,
    center: { q: number; r: number },
    radius: number,
    requireReady: boolean,
): number {
    let power = 0;
    for (const unit of state.units) {
        if (unit.ownerId !== ownerId) continue;
        if (!isMilitaryUnitType(unit.type)) continue;
        if (hexDistance(unit.coord, center) > radius) continue;
        if (requireReady && (unit.hasAttacked || unit.movesLeft <= 0)) continue;
        power += estimateUnitPower(unit.type);
    }
    return power;
}

function getMajorWarCount(state: GameState, playerId: string): number {
    let wars = 0;
    for (const player of state.players) {
        if (player.id === playerId || player.isEliminated) continue;
        if (state.diplomacy?.[playerId]?.[player.id] === "War") wars++;
    }
    return wars;
}

function getTopRivalInfluence(state: GameState, cityState: CityState, playerId: string): number {
    let top = 0;
    for (const player of state.players) {
        if (player.id === playerId || player.isEliminated) continue;
        if (cityState.warByPlayer[player.id]) continue;
        const influence = cityState.influenceByPlayer[player.id] ?? 0;
        if (influence > top) top = influence;
    }
    return top;
}

function scoreCityStateInvestmentOption(
    state: GameState,
    playerId: string,
    goal: AiVictoryGoal,
    cityState: CityState,
    economy: ReturnType<typeof computeEconomySnapshot>,
): CityStateInvestmentOption | undefined {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return undefined;

    const treasury = player.treasury ?? 0;
    const cost = getCityStateInvestCost(cityState, playerId, state);
    if (treasury < cost) return undefined;
    const uncappedDecisionCost = getCityStateInvestDecisionCost(cityState, playerId, state);
    const decisionCost = cost + ((uncappedDecisionCost - cost) * 0.5);

    const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
    const topRivalInfluence = getTopRivalInfluence(state, cityState, playerId);
    const topInfluence = Math.max(...Object.values(cityState.influenceByPlayer));
    const incumbentId = cityState.suzerainId;
    const incumbentInfluence = incumbentId ? (cityState.influenceByPlayer[incumbentId] ?? 0) : 0;
    const isSuzerain = cityState.suzerainId === playerId;
    const challengingIncumbent = !!incumbentId && incumbentId !== playerId;
    const gain = CITY_STATE_INVEST_GAIN;
    const gapToTop = topInfluence - myInfluence;
    const gapToIncumbent = challengingIncumbent ? Math.max(0, incumbentInfluence - myInfluence) : Number.POSITIVE_INFINITY;
    const leadOverTopRival = myInfluence - topRivalInfluence;
    const contestWindow = Math.abs(leadOverTopRival);
    const overtakesTop = isSuzerain ? (myInfluence + gain >= topInfluence) : (myInfluence + gain > topInfluence);
    const turnoverCampaignWindow = Math.ceil(gain * TURNOVER_CAMPAIGN_WINDOW_MULT);
    const turnoverDeepBehindWindow = Math.ceil(gain * TURNOVER_DEEP_BEHIND_MULT);
    const turnoverFlipWindow = Math.ceil(gain * TURNOVER_FLIP_WINDOW_MULT);
    const inLiveTurnoverWindow = challengingIncumbent && gapToIncumbent <= turnoverCampaignWindow;
    const inFlipWindow = challengingIncumbent && gapToIncumbent <= turnoverFlipWindow;
    const deeplyBehindIncumbent = challengingIncumbent && gapToIncumbent > turnoverDeepBehindWindow;
    const recentPassiveOpening = challengingIncumbent && isCityStateRecentPassiveOpening(state, cityState);
    const passiveOpeningStrikeOpportunity = recentPassiveOpening && (overtakesTop || inFlipWindow || gapToIncumbent <= gain);
    const rivalChallengerCount = state.players
        .filter(p => p.id !== playerId && !p.isEliminated)
        .filter(p => p.id !== incumbentId)
        .filter(p => !cityState.warByPlayer[p.id])
        .filter(p => (cityState.influenceByPlayer[p.id] ?? 0) > 0)
        .length;
    const nearestDist = nearestCityDistance(state, playerId, cityState.coord);

    const reserveFloor = Math.ceil(economy.reserveFloor * INVEST_RESERVE_MULT_BY_STATE[economy.economyState]);
    const reserveSafeAfterSpend = (treasury - cost) >= reserveFloor;
    const passiveOpeningReserveFloor = Math.ceil(
        economy.reserveFloor * PASSIVE_OPENING_RESERVE_MULT_BY_STATE[economy.economyState]
    );
    const passiveOpeningReserveSafeAfterSpend = (treasury - cost) >= passiveOpeningReserveFloor;
    const hotspotIncumbentPairLoopCount = isSuzerain
        ? getHotspotIncumbentPairLoopCount(state, cityState, playerId)
        : 0;
    const meaningfulDefensiveRivalInfluence = Math.ceil(gain * INCUMBENT_MEANINGFUL_RIVAL_MULT);
    const defensiveMaintenanceLeadLimit = Math.ceil(
        gain * (hotspotIncumbentPairLoopCount > 0 ? CITY_STATE_HOTSPOT_DEFENSIVE_MAINTENANCE_MULT : CITY_STATE_DEFENSIVE_MAINTENANCE_MULT)
    );
    const defensiveMaintenance = isSuzerain
        && topRivalInfluence >= meaningfulDefensiveRivalInfluence
        && contestWindow <= defensiveMaintenanceLeadLimit;
    const incumbentReserveFloor = Math.ceil(
        economy.reserveFloor * Math.max(0.75, INVEST_RESERVE_MULT_BY_STATE[economy.economyState] + 0.15)
    );
    const incumbentReserveSafeAfterSpend = (treasury - cost) >= incumbentReserveFloor;
    const canFlexReserveForOpening = passiveOpeningStrikeOpportunity
        && economy.economyState !== "Crisis"
        && passiveOpeningReserveSafeAfterSpend;
    if (!reserveSafeAfterSpend && !defensiveMaintenance && !canFlexReserveForOpening) return undefined;
    if (isSuzerain && !defensiveMaintenance && !incumbentReserveSafeAfterSpend) return undefined;
    if (
        hotspotIncumbentPairLoopCount > 0 &&
        topRivalInfluence > 0 &&
        leadOverTopRival > defensiveMaintenanceLeadLimit
    ) {
        return undefined;
    }
    if (
        isSuzerain &&
        topRivalInfluence <= 0 &&
        myInfluence >= Math.ceil(gain * INCUMBENT_NO_RIVAL_INFLUENCE_FLOOR)
    ) {
        return undefined;
    }
    if (
        isSuzerain &&
        !defensiveMaintenance &&
        topRivalInfluence > 0 &&
        leadOverTopRival >= Math.ceil(gain * INCUMBENT_SAFE_LEAD_MULT)
    ) {
        return undefined;
    }

    const sameTypeCount = getControlledSameTypeCount(state, playerId, cityState.yieldType);
    const marginal = getSameTypeMarginalMultiplier(sameTypeCount);
    const yieldPriority = getYieldPriority(goal, cityState.yieldType, economy.economyState);
    const yieldScoreBase = (31 * yieldPriority * marginal) + (sameTypeCount === 0 ? 14 : 0);
    const yieldScore = isSuzerain ? (yieldScoreBase * 0.72) : yieldScoreBase;

    let suzerainRaceScore = 0;
    if (isSuzerain) {
        suzerainRaceScore = topRivalInfluence >= meaningfulDefensiveRivalInfluence && contestWindow <= gain
            ? (24 + ((gain - contestWindow) * 1.25))
            : 0;
    } else if (overtakesTop) {
        suzerainRaceScore = 78 + Math.max(0, (gain * 1.8) - gapToTop);
    } else {
        const nearOvertakeWindow = Math.max(0, (gain * 3) - gapToTop);
        suzerainRaceScore = nearOvertakeWindow > 0
            ? (36 + (nearOvertakeWindow * 1.45))
            : Math.max(0, 12 - (gapToTop * 0.45));
    }

    const proximityScore = Math.max(0, 10 - nearestDist) * 1.9;
    const antiIncumbentBonus = challengingIncumbent
        ? (gapToTop <= (gain * 2) ? 16 : 7)
        : 0;
    const incumbentWarCount = incumbentId
        ? getMajorWarCount(state, incumbentId)
        : 0;
    const incumbentWarPressureBonus = challengingIncumbent && incumbentWarCount > 0
        ? Math.min(INCUMBENT_WAR_PRESSURE_BONUS_MAX, incumbentWarCount * INCUMBENT_WAR_PRESSURE_BONUS_PER_WAR)
        : 0;
    const turnoverMomentumBonus = challengingIncumbent
        ? (gapToTop <= turnoverCampaignWindow
            ? (10 + (Math.max(0, turnoverCampaignWindow - gapToTop) * 1.15))
            : 0)
        : 0;
    const challengerCoalitionBonus = challengingIncumbent
        ? ((rivalChallengerCount > 0 ? 10 : 0) + (rivalChallengerCount * 5))
        : 0;
    const firstMoverChallengeBonus = challengingIncumbent && rivalChallengerCount === 0 && gapToIncumbent <= (gain * 2)
        ? 8
        : 0;
    const turnoverFlipBonus = inFlipWindow
        ? 34
        : inLiveTurnoverWindow
            ? 20
            : 0;
    const passiveOpeningBonus = recentPassiveOpening
        ? (CITY_STATE_PASSIVE_OPENING_SCORE_BONUS + (passiveOpeningStrikeOpportunity ? CITY_STATE_PASSIVE_OPENING_FLIP_BONUS : 0))
        : 0;
    const entrenchedIncumbentPenalty = deeplyBehindIncumbent
        ? Math.min(26, 10 + ((gapToIncumbent - turnoverDeepBehindWindow) * 0.45))
        : 0;
    const incumbencyComplacencyPenalty = isSuzerain && !defensiveMaintenance && leadOverTopRival > (gain * 0.3)
        ? Math.min(40, 12 + ((leadOverTopRival - (gain * 0.3)) * 0.8))
        : 0;
    const enemySuzerainPressure = incumbentId && state.diplomacy?.[playerId]?.[incumbentId] === "War"
        ? 18
        : 0;
    const warPenalty = economy.atWar && !isSuzerain && !overtakesTop && !inLiveTurnoverWindow
        ? 6
        : 0;
    const crisisPenalty = economy.economyState === "Crisis" && cityState.yieldType !== "Gold"
        ? 4
        : 0;
    const turnsSinceSuzerainChange = getTurnsSinceSuzerainChange(state, cityState);
    const hotspotState = isCityStateHotspot(state, cityState);
    const hotspotDepth = hotspotState
        ? Math.max(1, (cityState.recentSuzerainChangeCount ?? CITY_STATE_HOTSPOT_THRESHOLD) - CITY_STATE_HOTSPOT_THRESHOLD + 1)
        : 0;
    const freshCompetitiveFlip = turnsSinceSuzerainChange !== undefined
        && turnsSinceSuzerainChange <= CITY_STATE_FRESH_FLIP_WINDOW
        && isCompetitiveSuzerainChangeCause(cityState.lastSuzerainChangeCause);
    const pairRecaptureCount = challengingIncumbent
        ? getRecentPairRecaptureCount(state, cityState, playerId)
        : 0;
    const hotspotPenalty = hotspotState
        ? isSuzerain
            ? ((defensiveMaintenance ? CITY_STATE_HOTSPOT_DEFENSIVE_PENALTY : CITY_STATE_HOTSPOT_INCUMBENT_PENALTY) + (hotspotDepth * CITY_STATE_HOTSPOT_PENALTY_STEP))
            : (CITY_STATE_HOTSPOT_CHALLENGE_PENALTY + (hotspotDepth * CITY_STATE_HOTSPOT_PENALTY_STEP))
        : 0;
    const hotspotIncumbentLoopPenalty = hotspotIncumbentPairLoopCount > 0
        ? Math.min(
            CITY_STATE_HOTSPOT_PAIR_LOOP_MAINTENANCE_PENALTY_MAX,
            CITY_STATE_HOTSPOT_PAIR_LOOP_MAINTENANCE_PENALTY_BASE
                + ((hotspotIncumbentPairLoopCount - CITY_STATE_HOTSPOT_PAIR_LOOP_THRESHOLD) * CITY_STATE_HOTSPOT_PAIR_LOOP_MAINTENANCE_PENALTY_STEP),
        )
        : 0;
    const stableTurnoverBonus = challengingIncumbent && inLiveTurnoverWindow && !hotspotState
        ? CITY_STATE_STABLE_TURNOVER_BONUS
        : 0;
    const stableCloseRaceBonus = challengingIncumbent
        && !hotspotState
        && !freshCompetitiveFlip
        && gapToIncumbent <= CITY_STATE_CONTEST_MARGIN
        ? CITY_STATE_STABLE_CLOSE_RACE_BONUS + Math.max(0, CITY_STATE_CONTEST_MARGIN - gapToIncumbent)
        : 0;
    const freshRecontestPenalty = challengingIncumbent && freshCompetitiveFlip
        ? CITY_STATE_FRESH_RECONTEST_PENALTY
            + ((CITY_STATE_FRESH_FLIP_WINDOW - (turnsSinceSuzerainChange ?? CITY_STATE_FRESH_FLIP_WINDOW)) * CITY_STATE_FRESH_RECONTEST_STEP)
        : 0;
    const pairRecapturePenalty = pairRecaptureCount > 0
        ? Math.min(
            CITY_STATE_PAIR_RECLAIM_PENALTY_MAX,
            CITY_STATE_PAIR_RECLAIM_PENALTY_BASE + ((pairRecaptureCount - 1) * CITY_STATE_PAIR_RECLAIM_PENALTY_STEP),
        )
        : 0;
    const freshHoldBonus = isSuzerain && defensiveMaintenance && freshCompetitiveFlip
        ? CITY_STATE_FRESH_HOLD_BONUS
        : 0;
    const costPenalty = decisionCost
        * INVEST_COST_WEIGHT_BY_STATE[economy.economyState]
        * (inLiveTurnoverWindow ? TURNOVER_RACE_COST_RELIEF : 1);

    const score = yieldScore
        + suzerainRaceScore
        + proximityScore
        + antiIncumbentBonus
        + incumbentWarPressureBonus
        + turnoverMomentumBonus
        + challengerCoalitionBonus
        + firstMoverChallengeBonus
        + turnoverFlipBonus
        + passiveOpeningBonus
        + stableTurnoverBonus
        + stableCloseRaceBonus
        + freshHoldBonus
        + enemySuzerainPressure
        - warPenalty
        - crisisPenalty
        - costPenalty
        - hotspotPenalty
        - hotspotIncumbentLoopPenalty
        - pairRecapturePenalty
        - freshRecontestPenalty
        - incumbencyComplacencyPenalty
        - entrenchedIncumbentPenalty;

    if (score <= 0) return undefined;
    return {
        cityStateId: cityState.id,
        score,
        cost,
    };
}

export function pickCityStateInvestmentTarget(
    state: GameState,
    playerId: string,
    goal: AiVictoryGoal,
    preferredCityStateId?: string,
    options?: CityStateInvestmentPickOptions,
): CityStateInvestmentOption | undefined {
    const cityStates = state.cityStates ?? [];
    if (cityStates.length === 0) return undefined;
    const economy = computeEconomySnapshot(state, playerId);

    const candidates = cityStates
        .filter(cs => cs.discoveredByPlayer[playerId])
        .filter(cs => !cs.warByPlayer[playerId])
        .filter(cs => (cs.lastInvestTurnByPlayer[playerId] ?? -1) !== state.turn)
        .map(cs => scoreCityStateInvestmentOption(state, playerId, goal, cs, economy))
        .filter((option): option is CityStateInvestmentOption => !!option)
        .sort((a, b) => b.score - a.score || a.cost - b.cost);
    if (candidates.length === 0) return undefined;

    const cityStateById = new Map(cityStates.map(cs => [cs.id, cs]));
    const turnoverCandidates = options?.preferTurnover
        ? candidates.filter(candidate => {
            const cityState = cityStateById.get(candidate.cityStateId);
            if (!cityState) return false;
            return isCityStateTurnoverCandidate(cityState, playerId);
        })
        : candidates;
    const candidatePool = turnoverCandidates.length > 0 ? turnoverCandidates : candidates;

    const jitteredPool = candidatePool
        .map(candidate => {
            const cityState = cityStateById.get(candidate.cityStateId);
            const turnoverCandidate = cityState ? isCityStateTurnoverCandidate(cityState, playerId) : false;
            const jitter = computeScoreJitter(state, playerId, candidate.cityStateId, turnoverCandidate);
            return {
                ...candidate,
                adjustedScore: candidate.score + jitter,
            };
        })
        .sort((a, b) => b.adjustedScore - a.adjustedScore || a.cost - b.cost);

    if (preferredCityStateId && jitteredPool.length > 0) {
        const preferred = jitteredPool.find(candidate => candidate.cityStateId === preferredCityStateId);
        if (preferred) {
            const bestScore = jitteredPool[0].adjustedScore;
            if (preferred.adjustedScore >= (bestScore * INVEST_PREFERRED_SCORE_FLOOR)) {
                return preferred;
            }
        }
    }

    let selected = jitteredPool[0];
    if (jitteredPool.length > 1) {
        const bestScore = jitteredPool[0].adjustedScore;
        const explorationPool = jitteredPool
            .filter(candidate => candidate.adjustedScore >= (bestScore * CITY_STATE_EXPLORATION_SCORE_BAND))
            .slice(0, CITY_STATE_EXPLORATION_POOL);
        if (explorationPool.length > 1) {
            const exploreRoll = seededRandom01(state, playerId, `city-state-explore-roll:${goal}`);
            if (exploreRoll < CITY_STATE_EXPLORATION_CHANCE) {
                const indexRoll = seededRandom01(state, playerId, `city-state-explore-index:${goal}`);
                const pickIndex = Math.min(
                    explorationPool.length - 1,
                    Math.floor(indexRoll * explorationPool.length),
                );
                selected = explorationPool[pickIndex];
            }
        }
    }

    return selected;
}

export function getOffensiveCityStateOwnerIds(
    state: GameState,
    playerId: string,
    goal: AiVictoryGoal,
): Set<string> {
    const economy = computeEconomySnapshot(state, playerId);
    const majorWars = getMajorWarCount(state, playerId);
    const cityStates = state.cityStates ?? [];
    const scored: Array<{ ownerId: string; score: number }> = [];

    for (const cityState of cityStates) {
        if (!cityState.discoveredByPlayer[playerId]) continue;
        if (cityState.warByPlayer[playerId]) continue;
        if (cityState.suzerainId === playerId) continue;

        const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
        const myInvestments = cityState.investmentCountByPlayer[playerId] ?? 0;
        if (myInfluence >= 30 || myInvestments >= 2) continue;

        const nearestDist = nearestCityDistance(state, playerId, cityState.coord);
        if (nearestDist > 10 && goal !== "Conquest") continue;

        const nearbyAttackPower = estimateLocalPower(state, playerId, cityState.coord, 5, true);
        const localDefenderPower = estimateLocalPower(state, cityState.ownerId, cityState.coord, 4, false);
        const city = state.cities.find(c => c.id === cityState.cityId);
        const cityPower = (city?.hp ?? 0) * 0.75;
        const defenderPower = localDefenderPower + cityPower;
        const powerRatio = nearbyAttackPower / Math.max(1, defenderPower);
        if (powerRatio < 1.2) continue;

        let score = 0;
        score += Math.max(0, 9 - nearestDist) * 5;
        score += Math.max(0, powerRatio - 1) * 22;
        score += cityState.suzerainId ? 0 : 11;

        if (cityState.suzerainId && state.diplomacy?.[playerId]?.[cityState.suzerainId] === "War") {
            score += 18;
        }

        if (goal === "Conquest") score += 14;
        if (goal === "Progress") score -= 10;

        if (majorWars > 0) {
            score -= goal === "Conquest" ? majorWars * 6 : majorWars * 16;
        }

        if (economy.economyState === "Strained") score -= 10;
        if (economy.economyState === "Crisis") score -= 18;
        if (cityState.yieldType === "Gold" && economy.economyState !== "Healthy") score -= 7;

        score -= myInfluence * 0.35;
        if (score >= OFFENSIVE_WAR_SCORE_THRESHOLD) {
            scored.push({ ownerId: cityState.ownerId, score });
        }
    }

    const maxTargets = goal === "Conquest" ? 2 : 1;
    return new Set(
        scored
            .sort((a, b) => b.score - a.score || a.ownerId.localeCompare(b.ownerId))
            .slice(0, maxTargets)
            .map(entry => entry.ownerId)
    );
}

export function getOffensiveEnemyIds(
    state: GameState,
    playerId: string,
    goal: AiVictoryGoal,
): Set<string> {
    const enemies = getWarEnemyIds(state, playerId);
    const offensiveCityStateOwners = getOffensiveCityStateOwnerIds(state, playerId, goal);
    for (const ownerId of offensiveCityStateOwners) {
        enemies.add(ownerId);
    }
    return enemies;
}
