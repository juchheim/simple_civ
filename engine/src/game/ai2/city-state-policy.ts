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
    Healthy: 0.17,
    Guarded: 0.2,
    Strained: 0.27,
    Crisis: 0.36,
};

const INVEST_RESERVE_MULT_BY_STATE: Record<"Healthy" | "Guarded" | "Strained" | "Crisis", number> = {
    Healthy: 0.9,
    Guarded: 1.0,
    Strained: 1.15,
    Crisis: 1.35,
};

const OFFENSIVE_WAR_SCORE_THRESHOLD = 34;

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
    const topInfluence = Math.max(...Object.values(cityState.influenceByPlayer));
    const isSuzerain = cityState.suzerainId === playerId;
    const gain = CITY_STATE_INVEST_GAIN;
    const gapToTop = topInfluence - myInfluence;
    const overtakesTop = isSuzerain ? (myInfluence + gain >= topInfluence) : (myInfluence + gain > topInfluence);
    const nearestDist = nearestCityDistance(state, playerId, cityState.coord);

    const reserveFloor = Math.ceil(economy.reserveFloor * INVEST_RESERVE_MULT_BY_STATE[economy.economyState]);
    const reserveSafeAfterSpend = (treasury - cost) >= reserveFloor;
    const defensiveMaintenance = isSuzerain && gapToTop >= 0 && gapToTop <= gain && topInfluence > 0;
    if (!reserveSafeAfterSpend && !defensiveMaintenance) return undefined;

    const sameTypeCount = getControlledSameTypeCount(state, playerId, cityState.yieldType);
    const marginal = getSameTypeMarginalMultiplier(sameTypeCount);
    const yieldPriority = getYieldPriority(goal, cityState.yieldType, economy.economyState);
    const yieldScore = (26 * yieldPriority * marginal) + (sameTypeCount === 0 ? 10 : 0);

    let suzerainRaceScore = 0;
    if (isSuzerain) {
        suzerainRaceScore = gapToTop > 0
            ? (16 + (gapToTop * 0.85))
            : 4;
    } else if (overtakesTop) {
        suzerainRaceScore = 44 + Math.max(0, 8 - gapToTop);
    } else {
        suzerainRaceScore = Math.max(0, 20 - (gapToTop * 0.95));
    }

    const proximityScore = Math.max(0, 10 - nearestDist) * 1.9;
    const enemySuzerainPressure = cityState.suzerainId && state.diplomacy?.[playerId]?.[cityState.suzerainId] === "War"
        ? 8
        : 0;
    const warPenalty = economy.atWar && !isSuzerain && !overtakesTop
        ? 9
        : 0;
    const crisisPenalty = economy.economyState === "Crisis" && cityState.yieldType !== "Gold"
        ? 6
        : 0;
    const costPenalty = cost * INVEST_COST_WEIGHT_BY_STATE[economy.economyState];

    const score = yieldScore
        + suzerainRaceScore
        + proximityScore
        + enemySuzerainPressure
        - warPenalty
        - crisisPenalty
        - costPenalty;

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

    return candidates[0];
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
