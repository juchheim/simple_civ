import { DiplomacyState, GameState, ProjectId } from "../../../core/types.js";
import { buildLookupCache } from "../../helpers/lookup-cache.js";
import { getPlayerGoldLedger, type GoldLedger } from "../../rules.js";
import { isCombatUnitType } from "../schema.js";
import { type AiEconomyProfileV2, getAiProfileV2 } from "../rules.js";

export type EconomyState = "Healthy" | "Guarded" | "Strained" | "Crisis";

export type EconomySnapshot = {
    grossGold: number;
    buildingUpkeep: number;
    militaryUpkeep: number;
    netGold: number;
    treasury: number;
    reserveFloor: number;
    deficitRiskTurns: number;
    economyState: EconomyState;
    spendableTreasury: number;
    usedSupply: number;
    freeSupply: number;
    upkeepRatio: number;
    atWar: boolean;
};

export type EconomyBudgetBuckets = {
    economyRecovery: number;
    militaryDefense: number;
    opportunisticRushBuy: number;
};

const ECONOMY_BUCKETS: Record<EconomyState, EconomyBudgetBuckets> = {
    Healthy: { economyRecovery: 0.34, militaryDefense: 0.4, opportunisticRushBuy: 0.26 },
    Guarded: { economyRecovery: 0.44, militaryDefense: 0.42, opportunisticRushBuy: 0.14 },
    Strained: { economyRecovery: 0.7, militaryDefense: 0.3, opportunisticRushBuy: 0.0 },
    Crisis: { economyRecovery: 0.84, militaryDefense: 0.16, opportunisticRushBuy: 0.0 },
};

const DEFAULT_ECONOMY_PROFILE: AiEconomyProfileV2 = {
    reserveMultiplier: 0.95,
    deficitToleranceTurns: 3,
    goldBuildBias: 1.65,
    rushBuyAggression: 1.2,
    upkeepRatioLimit: 0.4,
};

const RESERVE_BASE = 30;
const RESERVE_PER_CITY = 9;
const RESERVE_PER_COMBAT_UNIT = 2;
const RESERVE_WAR_BONUS = 22;
const HEALTHY_TREASURY_BUFFER = 40;
const STRAINED_DEFICIT_RISK_TURNS = 6;
const CRISIS_DEFICIT_RISK_TURNS = 2;

function hasActiveWar(state: GameState, playerId: string): boolean {
    return state.players.some(other =>
        other.id !== playerId &&
        !other.isEliminated &&
        state.diplomacy?.[playerId]?.[other.id] === DiplomacyState.War
    );
}

function resolveReserveMultiplier(state: GameState, playerId: string, profile: AiEconomyProfileV2): number {
    if (profile.reserveMultiplierPostTitan === undefined) {
        return profile.reserveMultiplier;
    }
    const player = state.players.find(p => p.id === playerId);
    const hasTitanCore = !!player?.completedProjects?.includes(ProjectId.TitansCoreComplete);
    return hasTitanCore ? profile.reserveMultiplierPostTitan : profile.reserveMultiplier;
}

export function computeReserveFloor(state: GameState, playerId: string, profile: AiEconomyProfileV2): number {
    const cityCount = state.cities.filter(city => city.ownerId === playerId).length;
    const combatUnitCount = state.units.filter(unit => unit.ownerId === playerId && isCombatUnitType(unit.type)).length;
    const atWar = hasActiveWar(state, playerId);
    const reserveMultiplier = resolveReserveMultiplier(state, playerId, profile);
    const baseReserve = RESERVE_BASE
        + (RESERVE_PER_CITY * cityCount)
        + (RESERVE_PER_COMBAT_UNIT * combatUnitCount)
        + (atWar ? RESERVE_WAR_BONUS : 0);
    return Math.ceil(baseReserve * reserveMultiplier);
}

export function classifyEconomyState(snapshot: Pick<EconomySnapshot, "treasury" | "reserveFloor" | "netGold" | "deficitRiskTurns">, austerityActive: boolean): EconomyState {
    if (austerityActive || snapshot.deficitRiskTurns <= CRISIS_DEFICIT_RISK_TURNS) {
        return "Crisis";
    }
    if (snapshot.treasury < snapshot.reserveFloor || snapshot.deficitRiskTurns <= STRAINED_DEFICIT_RISK_TURNS) {
        return "Strained";
    }
    if (snapshot.treasury >= snapshot.reserveFloor + HEALTHY_TREASURY_BUFFER && snapshot.netGold >= 0) {
        return "Healthy";
    }
    return "Guarded";
}

export function getEconomyBudgetBuckets(state: EconomyState): EconomyBudgetBuckets {
    return ECONOMY_BUCKETS[state];
}

export function computeEconomySnapshot(state: GameState, playerId: string): EconomySnapshot {
    const player = state.players.find(p => p.id === playerId);
    const profile = getAiProfileV2(state, playerId);
    const economyProfile = profile?.economy ?? DEFAULT_ECONOMY_PROFILE;
    const hasMapTiles = Array.isArray(state.map?.tiles);
    const fallbackLedger: GoldLedger = {
        grossGold: player?.grossGold ?? 0,
        buildingUpkeep: player?.buildingUpkeep ?? 0,
        militaryUpkeep: player?.militaryUpkeep ?? 0,
        usedSupply: player?.usedSupply ?? 0,
        freeSupply: player?.freeSupply ?? 0,
        netGold: player?.netGold ?? 0,
    };
    const ledger = hasMapTiles
        ? getPlayerGoldLedger(state, playerId, buildLookupCache(state))
        : fallbackLedger;
    const reserveFloor = computeReserveFloor(state, playerId, economyProfile);
    const treasury = player?.treasury ?? 0;
    const deficitRiskTurns = ledger.netGold < 0 ? Math.ceil(treasury / Math.abs(ledger.netGold)) : Number.POSITIVE_INFINITY;
    const austerityActive = player?.austerityActive ?? false;
    const economyState = classifyEconomyState({
        treasury,
        reserveFloor,
        netGold: ledger.netGold,
        deficitRiskTurns,
    }, austerityActive);
    const spendableTreasury = Math.max(0, treasury - reserveFloor);
    const upkeepTotal = ledger.buildingUpkeep + ledger.militaryUpkeep;
    const upkeepRatio = ledger.grossGold > 0
        ? upkeepTotal / ledger.grossGold
        : (upkeepTotal > 0 ? Number.POSITIVE_INFINITY : 0);

    return {
        grossGold: ledger.grossGold,
        buildingUpkeep: ledger.buildingUpkeep,
        militaryUpkeep: ledger.militaryUpkeep,
        netGold: ledger.netGold,
        treasury,
        reserveFloor,
        deficitRiskTurns,
        economyState,
        spendableTreasury,
        usedSupply: ledger.usedSupply,
        freeSupply: ledger.freeSupply,
        upkeepRatio,
        atWar: hasActiveWar(state, playerId),
    };
}
