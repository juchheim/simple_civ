import { CITY_STATE_INVEST_GAIN, UNITS } from "../../core/constants.js";
import { hexDistance } from "../../core/hex.js";
import { AiVictoryGoal, CityState, CityStateYieldType, GameState } from "../../core/types.js";
import { getCityStateInvestCost } from "../city-states.js";
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
        Science: 1.4,
        Production: 0.95,
        Food: 1.0,
        Gold: 1.15,
    },
    Conquest: {
        Science: 0.85,
        Production: 1.45,
        Food: 1.05,
        Gold: 1.2,
    },
    Balanced: {
        Science: 1.15,
        Production: 1.1,
        Food: 1.05,
        Gold: 1.15,
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

const OFFENSIVE_WAR_SCORE_THRESHOLD = 30;
const INVEST_PREFERRED_SCORE_FLOOR = 0.66;
const INCUMBENT_SAFE_LEAD_MULT = 0.85;
const INCUMBENT_NO_RIVAL_INFLUENCE_FLOOR = 0.45;
const INCUMBENT_WAR_PRESSURE_BONUS_PER_WAR = 6;
const INCUMBENT_WAR_PRESSURE_BONUS_MAX = 24;
const TURNOVER_CAMPAIGN_WINDOW_MULT = 3;
const TURNOVER_DEEP_BEHIND_MULT = 4;
const TURNOVER_FLIP_WINDOW_MULT = 1.35;
const TURNOVER_RACE_COST_RELIEF = 0.55;
const TURNOVER_LIVE_RACE_GAP_MULT = 3;

function getInfluenceGapToSuzerain(cityState: CityState, playerId: string): number {
    const suzerainId = cityState.suzerainId;
    if (!suzerainId || suzerainId === playerId) return Number.POSITIVE_INFINITY;
    const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
    const suzerainInfluence = cityState.influenceByPlayer[suzerainId] ?? 0;
    return suzerainInfluence - myInfluence;
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
        if (yieldType === "Production") priority += 0.1;
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
    const cost = getCityStateInvestCost(cityState, playerId);
    if (treasury < cost) return undefined;

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
    const rivalChallengerCount = state.players
        .filter(p => p.id !== playerId && !p.isEliminated)
        .filter(p => p.id !== incumbentId)
        .filter(p => !cityState.warByPlayer[p.id])
        .filter(p => (cityState.influenceByPlayer[p.id] ?? 0) > 0)
        .length;
    const nearestDist = nearestCityDistance(state, playerId, cityState.coord);

    const reserveFloor = Math.ceil(economy.reserveFloor * INVEST_RESERVE_MULT_BY_STATE[economy.economyState]);
    const reserveSafeAfterSpend = (treasury - cost) >= reserveFloor;
    const defensiveMaintenance = isSuzerain && topRivalInfluence > 0 && contestWindow <= Math.ceil(gain * 0.85);
    const incumbentReserveFloor = Math.ceil(
        economy.reserveFloor * Math.max(0.75, INVEST_RESERVE_MULT_BY_STATE[economy.economyState] + 0.15)
    );
    const incumbentReserveSafeAfterSpend = (treasury - cost) >= incumbentReserveFloor;
    if (!reserveSafeAfterSpend && !defensiveMaintenance) return undefined;
    if (isSuzerain && !defensiveMaintenance && !incumbentReserveSafeAfterSpend) return undefined;
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
        suzerainRaceScore = topRivalInfluence > 0 && contestWindow <= gain
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
        ? (gapToTop <= (gain * 2) ? 14 : 6)
        : 0;
    const incumbentWarCount = incumbentId
        ? getMajorWarCount(state, incumbentId)
        : 0;
    const incumbentWarPressureBonus = challengingIncumbent && incumbentWarCount > 0
        ? Math.min(INCUMBENT_WAR_PRESSURE_BONUS_MAX, incumbentWarCount * INCUMBENT_WAR_PRESSURE_BONUS_PER_WAR)
        : 0;
    const turnoverMomentumBonus = challengingIncumbent
        ? (gapToTop <= turnoverCampaignWindow
            ? (8 + (Math.max(0, turnoverCampaignWindow - gapToTop) * 1.05))
            : 0)
        : 0;
    const challengerCoalitionBonus = challengingIncumbent
        ? ((rivalChallengerCount > 0 ? 8 : 0) + (rivalChallengerCount * 4))
        : 0;
    const firstMoverChallengeBonus = challengingIncumbent && rivalChallengerCount === 0 && gapToIncumbent <= (gain * 2)
        ? 8
        : 0;
    const turnoverFlipBonus = inFlipWindow
        ? 28
        : inLiveTurnoverWindow
            ? 16
            : 0;
    const entrenchedIncumbentPenalty = deeplyBehindIncumbent
        ? Math.min(26, 10 + ((gapToIncumbent - turnoverDeepBehindWindow) * 0.45))
        : 0;
    const incumbencyComplacencyPenalty = isSuzerain && !defensiveMaintenance && leadOverTopRival > (gain * 0.35)
        ? Math.min(34, 10 + ((leadOverTopRival - (gain * 0.35)) * 0.7))
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
    const costPenalty = cost
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
        + enemySuzerainPressure
        - warPenalty
        - crisisPenalty
        - costPenalty
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

    if (preferredCityStateId && candidatePool.length > 0) {
        const preferred = candidatePool.find(candidate => candidate.cityStateId === preferredCityStateId);
        if (preferred) {
            const bestScore = candidatePool[0].score;
            if (preferred.score >= (bestScore * INVEST_PREFERRED_SCORE_FLOOR)) {
                return preferred;
            }
        }
    }

    return candidatePool[0];
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
