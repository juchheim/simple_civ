import { AUSTERITY_PRODUCTION_MULTIPLIER, BUILDINGS, PROJECTS } from "../../../core/constants.js";
import { BuildingType, City, GameState, OverlayType, ProjectId, UnitType } from "../../../core/types.js";
import { isTileAdjacentToRiver } from "../../../map/rivers.js";
import { tryAction } from "../../ai/shared/actions.js";
import { buildLookupCache } from "../../helpers/lookup-cache.js";
import { getCityYields, getRushBuyGoldCost } from "../../rules.js";
import { assessCityThreatLevel } from "../defense-situation/scoring.js";
import { getAiMemoryV2, setAiMemoryV2 } from "../memory.js";
import { getAiProfileV2 } from "../rules.js";
import { isCombatUnitType } from "../schema.js";
import { computeEconomySnapshot, getEconomyBudgetBuckets, type EconomySnapshot } from "./budget.js";

const GOLD_BUILDINGS = new Set<BuildingType>([
    BuildingType.TradingPost,
    BuildingType.MarketHall,
    BuildingType.Bank,
    BuildingType.Exchange,
]);

const MAX_RUSH_BUYS_PER_TURN = 2;
const MAX_RUSH_BUYS_PER_CITY_PER_TURN = 1;
const ECONOMIC_RUSH_PAYBACK_MAX_TURNS = 10;

type RushBuyCategory = "economic" | "military";

type RushBuyCandidate = {
    cityId: string;
    goldCost: number;
    category: RushBuyCategory;
    score: number;
    reason: string;
};

type RushBuyDecision = {
    cityId: string;
    category: RushBuyCategory;
    goldCost: number;
    reason: string;
};

function isProgressProject(projectId: string): boolean {
    return projectId === ProjectId.Observatory || projectId === ProjectId.GrandAcademy || projectId === ProjectId.GrandExperiment;
}

function isUniqueCompletionBuild(type: "Unit" | "Building" | "Project", id: string): boolean {
    if (type === "Building") {
        return id === BuildingType.JadeGranary || id === BuildingType.Bulwark || id === BuildingType.TitansCore;
    }
    if (type === "Project") {
        const project = PROJECTS[id as ProjectId];
        return !!project?.oncePerCiv;
    }
    return false;
}

function goldBuildingConditionalBonus(state: GameState, city: City, building: BuildingType): number {
    if (building === BuildingType.TradingPost) {
        return isTileAdjacentToRiver(state.map, city.coord) ? 1 : 0;
    }
    if (building === BuildingType.MarketHall) {
        return city.pop >= 5 ? 1 : 0;
    }
    if (building === BuildingType.Bank) {
        const workedOre = city.workedTiles.some(coord => {
            const tile = state.map.tiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
            return !!tile?.overlays.includes(OverlayType.OreVein);
        });
        return workedOre ? 1 : 0;
    }
    return 0;
}

function getGoldBuildingPayback(state: GameState, city: City, building: BuildingType, cost: number): number {
    const data = BUILDINGS[building];
    const baseGold = data.yieldFlat?.G ?? 0;
    const conditional = goldBuildingConditionalBonus(state, city, building);
    const maintenance = data.maintenance ?? 0;
    const netGain = baseGold + conditional - maintenance;
    if (netGain <= 0) return Number.POSITIVE_INFINITY;
    return cost / netGain;
}

function evaluateRushBuyCandidate(
    state: GameState,
    playerId: string,
    city: City,
    snapshot: EconomySnapshot,
    cache: ReturnType<typeof buildLookupCache>
): RushBuyCandidate | null {
    if (!city.currentBuild) return null;
    const { type, id, cost } = city.currentBuild;

    if (type === "Project" && isProgressProject(id)) return null;
    if (isUniqueCompletionBuild(type, id)) return null;

    const remainingProduction = Math.max(0, cost - city.buildProgress);
    if (remainingProduction <= 0) return null;
    const rushGoldCost = getRushBuyGoldCost(city, remainingProduction);
    if (rushGoldCost <= 0) return null;

    const player = state.players.find(p => p.id === playerId);
    const productionMult = player?.austerityActive ? AUSTERITY_PRODUCTION_MULTIPLIER : 1;
    const productionPerTurn = Math.max(0, Math.floor(getCityYields(city, state, cache).P * productionMult));
    const turnsRemaining = productionPerTurn > 0 ? Math.ceil(remainingProduction / productionPerTurn) : Number.POSITIVE_INFINITY;
    const turnsSaved = Number.isFinite(turnsRemaining) ? Math.max(0, turnsRemaining - 1) : 0;
    const threatLevel = assessCityThreatLevel(state, city, playerId, 5, 2);

    if (type === "Unit" && isCombatUnitType(id as UnitType)) {
        if (threatLevel === "raid" || threatLevel === "assault") {
            const threatScore = threatLevel === "assault" ? 20 : 10;
            return {
                cityId: city.id,
                category: "military",
                goldCost: rushGoldCost,
                score: 85 + threatScore + turnsSaved,
                reason: `threat-${threatLevel}`,
            };
        }
        if (threatLevel !== "none" && turnsSaved >= 3) {
            return {
                cityId: city.id,
                category: "military",
                goldCost: rushGoldCost,
                score: 70 + turnsSaved,
                reason: "defender-turn-save",
            };
        }
        return null;
    }

    if (type === "Building" && GOLD_BUILDINGS.has(id as BuildingType)) {
        const payback = getGoldBuildingPayback(state, city, id as BuildingType, rushGoldCost);
        if (payback <= ECONOMIC_RUSH_PAYBACK_MAX_TURNS) {
            return {
                cityId: city.id,
                category: "economic",
                goldCost: rushGoldCost,
                score: 55 + Math.max(0, ECONOMIC_RUSH_PAYBACK_MAX_TURNS - payback),
                reason: `gold-payback-${payback.toFixed(1)}`,
            };
        }
    }

    return null;
}

export function selectRushBuyDecisions(state: GameState, playerId: string, snapshot: EconomySnapshot): RushBuyDecision[] {
    if (snapshot.economyState !== "Healthy" && snapshot.economyState !== "Guarded") {
        return [];
    }

    const profile = getAiProfileV2(state, playerId);
    const memory = getAiMemoryV2(state, playerId);
    const buckets = getEconomyBudgetBuckets(snapshot.economyState);
    const cache = buildLookupCache(state);
    let rushBudget = snapshot.spendableTreasury * buckets.opportunisticRushBuy * profile.economy.rushBuyAggression;
    if (rushBudget <= 0) return [];

    const economicConsecutiveLimit = memory.lastEconomicRushBuyTurn === state.turn - 1 ? 1 : Number.POSITIVE_INFINITY;
    const candidates = state.cities
        .filter(city => city.ownerId === playerId && !!city.currentBuild)
        .map(city => evaluateRushBuyCandidate(state, playerId, city, snapshot, cache))
        .filter((candidate): candidate is RushBuyCandidate => candidate !== null)
        .sort((a, b) => b.score - a.score || a.goldCost - b.goldCost);

    let treasuryAfterSpends = snapshot.treasury;
    let economicCount = 0;
    const perCityCount = new Map<string, number>();
    const decisions: RushBuyDecision[] = [];

    for (const candidate of candidates) {
        if (decisions.length >= MAX_RUSH_BUYS_PER_TURN) break;

        const cityCount = perCityCount.get(candidate.cityId) ?? 0;
        if (cityCount >= MAX_RUSH_BUYS_PER_CITY_PER_TURN) continue;

        if (candidate.category === "economic" && economicCount >= economicConsecutiveLimit) continue;
        if (candidate.goldCost > rushBudget) continue;
        if ((treasuryAfterSpends - candidate.goldCost) < snapshot.reserveFloor) continue;

        decisions.push({
            cityId: candidate.cityId,
            category: candidate.category,
            goldCost: candidate.goldCost,
            reason: candidate.reason,
        });
        perCityCount.set(candidate.cityId, cityCount + 1);
        treasuryAfterSpends -= candidate.goldCost;
        rushBudget -= candidate.goldCost;
        if (candidate.category === "economic") economicCount += 1;
    }

    return decisions;
}

export function runAiRushBuySpending(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.austerityActive) return state;

    const snapshot = computeEconomySnapshot(state, playerId);
    const decisions = selectRushBuyDecisions(state, playerId, snapshot);
    if (decisions.length === 0) return state;

    let next = state;
    let boughtEconomic = false;

    for (const decision of decisions) {
        const before = next;
        next = tryAction(next, {
            type: "RushBuyProduction",
            playerId,
            cityId: decision.cityId,
        });
        if (next !== before && decision.category === "economic") {
            boughtEconomic = true;
        }
    }

    if (boughtEconomic) {
        const memory = getAiMemoryV2(next, playerId);
        next = setAiMemoryV2(next, playerId, {
            ...memory,
            lastEconomicRushBuyTurn: next.turn,
        });
    }

    return next;
}
