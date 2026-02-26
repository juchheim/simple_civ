import { generateWorld } from "../map/map-generator.js";
import { runAiTurn } from "../game/ai.js";
import { BuildingType, DiplomacyState, MapSize, OverlayType, ProjectId, TechId, TerrainType, UnitType } from "../core/types.js";
import { UNITS } from "../core/constants.js";
import { clearWarVetoLog } from "../game/ai-decisions.js";
import { getCityYields } from "../game/rules.js";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { writeFileSync, statSync } from "fs";
import * as os from "os";
import { fileURLToPath } from "url";
import { setAiDebug } from "../game/ai/debug-logging.js";
import { hexDistance } from "../core/hex.js";
import { isTileAdjacentToRiver } from "../map/rivers.js";
import { performance } from "node:perf_hooks";
import {
    Event,
    TurnSnapshot,
    estimateMilitaryPower,
    civList,
    createTurnSnapshot
} from "./shared-analysis.js";

// Disable AI debug logging for simulation performance
setAiDebug(false);

const GOLD_BUILDINGS_FOR_TELEMETRY: BuildingType[] = [
    BuildingType.TradingPost,
    BuildingType.MarketHall,
    BuildingType.Bank,
    BuildingType.Exchange,
];

type EconomyPhase = "early" | "mid" | "late";

type EconomyPhaseAccumulator = {
    samples: number;
    grossGoldTotal: number;
    buildingUpkeepTotal: number;
    militaryUpkeepTotal: number;
    netGoldTotal: number;
    treasuryTotal: number;
    deficitTurns: number;
    austerityTurns: number;
};

type EconomyAccumulator = {
    civId: string;
    civName: string;
    samples: number;
    grossGoldTotal: number;
    buildingUpkeepTotal: number;
    militaryUpkeepTotal: number;
    netGoldTotal: number;
    treasuryTotal: number;
    treasuryMin: number;
    treasuryMax: number;
    usedSupplyTotal: number;
    freeSupplyTotal: number;
    cityCountTotal: number;
    goldEconomyCityCountTotal: number;
    multiGoldEconomyCityTurns: number;
    topCityGoldShareTotal: number;
    topCityGoldSamples: number;
    topCityGoldHubSamples: number;
    upkeepRatioTotal: number;
    deficitTurns: number;
    positiveNetTurns: number;
    deficitEntryCount: number;
    deficitRecoveryCount: number;
    maxConsecutiveDeficit: number;
    currentConsecutiveDeficit: number;
    austerityTurns: number;
    enteredAusterityCount: number;
    recoveredFromAusterityCount: number;
    maxConsecutiveAusterity: number;
    currentConsecutiveAusterity: number;
    supplyPressureTurns: number;
    zeroTreasuryDeficitTurns: number;
    atWarTurns: number;
    atWarNetGoldTotal: number;
    atWarDeficitTurns: number;
    atWarAusterityTurns: number;
    bankConditionalCitySamples: number;
    bankConditionalActiveSamples: number;
    militaryUnitsProduced: number;
    militaryUnitsProducedAtWar: number;
    militaryUnitsProducedInDeficit: number;
    militaryUnitsProducedInAusterity: number;
    militaryUnitsProducedEarly: number;
    militaryUnitsProducedMid: number;
    militaryUnitsProducedLate: number;
    rushBuyCount: number;
    rushBuyGoldSpent: number;
    rushBuyGoldSaved: number;
    lastRushBuyCount: number;
    lastRushBuyGoldSpent: number;
    lastRushBuyGoldSaved: number;
    exchangeUnlockTurn: number | null;
    exchangeFirstBuildTurn: number | null;
    exchangeUnlockToFirstBuildDelay: number | null;
    goldBuildingFirstCompletionTurn: Partial<Record<BuildingType, number>>;
    phase: Record<EconomyPhase, EconomyPhaseAccumulator>;
    lastAusterityActive: boolean;
    lastDeficitActive: boolean;
};

type EconomyPhaseSummary = {
    samples: number;
    grossGoldTotal: number;
    buildingUpkeepTotal: number;
    militaryUpkeepTotal: number;
    netGoldTotal: number;
    treasuryTotal: number;
    deficitTurns: number;
    austerityTurns: number;
    avgGrossGold: number;
    avgBuildingUpkeep: number;
    avgMilitaryUpkeep: number;
    avgNetGold: number;
    avgTreasury: number;
    deficitTurnRate: number;
    austerityTurnRate: number;
};

type EconomySummaryEntry = {
    civId: string;
    civName: string;
    samples: number;
    grossGoldTotal: number;
    buildingUpkeepTotal: number;
    militaryUpkeepTotal: number;
    netGoldTotal: number;
    treasuryTotal: number;
    avgGrossGold: number;
    avgBuildingUpkeep: number;
    avgMilitaryUpkeep: number;
    avgTotalUpkeep: number;
    avgNetGold: number;
    avgTreasury: number;
    treasuryMin: number;
    treasuryMax: number;
    avgUsedSupply: number;
    avgFreeSupply: number;
    avgCities: number;
    avgGoldEconomyCities: number;
    multiGoldEconomyCityTurnRate: number;
    avgTopCityGoldShare: number;
    topCityGoldHubRate: number;
    avgUpkeepRatio: number;
    deficitTurns: number;
    positiveNetTurns: number;
    deficitEntryCount: number;
    deficitRecoveryCount: number;
    deficitRecoveryRate: number;
    maxConsecutiveDeficit: number;
    deficitTurnRate: number;
    austerityTurns: number;
    austerityTurnRate: number;
    enteredAusterityCount: number;
    recoveredFromAusterityCount: number;
    maxConsecutiveAusterity: number;
    supplyPressureTurns: number;
    supplyPressureRate: number;
    zeroTreasuryDeficitTurns: number;
    atWarTurns: number;
    atWarTurnRate: number;
    avgAtWarNetGold: number;
    atWarDeficitTurnRate: number;
    atWarAusterityTurnRate: number;
    bankConditionalCitySamples: number;
    bankConditionalActiveSamples: number;
    bankConditionalUptimeRate: number;
    militaryUnitsProduced: number;
    militaryUnitsProducedAtWar: number;
    militaryUnitsProducedInDeficit: number;
    militaryUnitsProducedInAusterity: number;
    militaryUnitsProducedEarly: number;
    militaryUnitsProducedMid: number;
    militaryUnitsProducedLate: number;
    militaryUnitsProducedPer100Turns: number;
    militaryProducedUnderStressRate: number;
    rushBuyCount: number;
    rushBuyGoldSpent: number;
    rushBuyGoldSaved: number;
    rushBuyDiscountUtilizationRate: number;
    avgRushBuyGoldSaved: number;
    exchangeUnlockTurn: number | null;
    exchangeFirstBuildTurn: number | null;
    exchangeUnlockToFirstBuildDelay: number | null;
    goldBuildingFirstCompletionTurn: Partial<Record<BuildingType, number>>;
    phase: Record<EconomyPhase, EconomyPhaseSummary>;
};

type EconomySummary = Record<string, EconomySummaryEntry>;
type SimState = ReturnType<typeof generateWorld>;

function createPhaseAccumulator(): EconomyPhaseAccumulator {
    return {
        samples: 0,
        grossGoldTotal: 0,
        buildingUpkeepTotal: 0,
        militaryUpkeepTotal: 0,
        netGoldTotal: 0,
        treasuryTotal: 0,
        deficitTurns: 0,
        austerityTurns: 0,
    };
}

function createEconomyAccumulator(civId: string, civName: string): EconomyAccumulator {
    return {
        civId,
        civName,
        samples: 0,
        grossGoldTotal: 0,
        buildingUpkeepTotal: 0,
        militaryUpkeepTotal: 0,
        netGoldTotal: 0,
        treasuryTotal: 0,
        treasuryMin: Number.POSITIVE_INFINITY,
        treasuryMax: Number.NEGATIVE_INFINITY,
        usedSupplyTotal: 0,
        freeSupplyTotal: 0,
        cityCountTotal: 0,
        goldEconomyCityCountTotal: 0,
        multiGoldEconomyCityTurns: 0,
        topCityGoldShareTotal: 0,
        topCityGoldSamples: 0,
        topCityGoldHubSamples: 0,
        upkeepRatioTotal: 0,
        deficitTurns: 0,
        positiveNetTurns: 0,
        deficitEntryCount: 0,
        deficitRecoveryCount: 0,
        maxConsecutiveDeficit: 0,
        currentConsecutiveDeficit: 0,
        austerityTurns: 0,
        enteredAusterityCount: 0,
        recoveredFromAusterityCount: 0,
        maxConsecutiveAusterity: 0,
        currentConsecutiveAusterity: 0,
        supplyPressureTurns: 0,
        zeroTreasuryDeficitTurns: 0,
        atWarTurns: 0,
        atWarNetGoldTotal: 0,
        atWarDeficitTurns: 0,
        atWarAusterityTurns: 0,
        bankConditionalCitySamples: 0,
        bankConditionalActiveSamples: 0,
        militaryUnitsProduced: 0,
        militaryUnitsProducedAtWar: 0,
        militaryUnitsProducedInDeficit: 0,
        militaryUnitsProducedInAusterity: 0,
        militaryUnitsProducedEarly: 0,
        militaryUnitsProducedMid: 0,
        militaryUnitsProducedLate: 0,
        rushBuyCount: 0,
        rushBuyGoldSpent: 0,
        rushBuyGoldSaved: 0,
        lastRushBuyCount: 0,
        lastRushBuyGoldSpent: 0,
        lastRushBuyGoldSaved: 0,
        exchangeUnlockTurn: null,
        exchangeFirstBuildTurn: null,
        exchangeUnlockToFirstBuildDelay: null,
        goldBuildingFirstCompletionTurn: {},
        phase: {
            early: createPhaseAccumulator(),
            mid: createPhaseAccumulator(),
            late: createPhaseAccumulator(),
        },
        lastAusterityActive: false,
        lastDeficitActive: false,
    };
}

function getEconomyPhase(turn: number): EconomyPhase {
    if (turn <= 100) return "early";
    if (turn <= 200) return "mid";
    return "late";
}

function isPlayerAtWar(state: SimState, playerId: string): boolean {
    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        if (state.diplomacy[playerId]?.[other.id] === DiplomacyState.War) {
            return true;
        }
    }
    return false;
}

function ratio(part: number, total: number): number {
    return total > 0 ? part / total : 0;
}

function cityHasWorkedOreVein(state: SimState, cityId: string): boolean {
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return false;
    for (const coord of city.workedTiles) {
        const tile = state.map.tiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
        if (tile?.overlays.includes(OverlayType.OreVein)) {
            return true;
        }
    }
    return false;
}

function cityHasOwnedOreVein(state: SimState, cityId: string): boolean {
    return state.map.tiles.some(tile =>
        tile.ownerCityId === cityId &&
        tile.overlays.includes(OverlayType.OreVein)
    );
}

function cityIsCoastal(state: SimState, cityCoord: { q: number; r: number }): boolean {
    return state.map.tiles.some(tile => {
        if (hexDistance(tile.coord, cityCoord) !== 1) return false;
        return tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea;
    });
}

function cityIsGoldHub(state: SimState, cityId: string): boolean {
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return false;
    const river = isTileAdjacentToRiver(state.map, city.coord);
    const coastal = cityIsCoastal(state, city.coord);
    const workedOre = cityHasWorkedOreVein(state, city.id);
    const ownedOre = cityHasOwnedOreVein(state, city.id);
    return river || coastal || workedOre || ownedOre;
}

function isMilitaryEconomyTrackedUnit(unitType: UnitType): boolean {
    if (unitType === UnitType.Settler) return false;
    return UNITS[unitType].domain !== "Civilian";
}

function recordMilitaryProductionEvent(
    economyByCiv: Map<string, EconomyAccumulator>,
    state: SimState,
    ownerId: string,
    unitType: UnitType
): void {
    if (!isMilitaryEconomyTrackedUnit(unitType)) return;
    const acc = economyByCiv.get(ownerId);
    if (!acc) return;
    const owner = state.players.find(player => player.id === ownerId);
    if (!owner) return;

    acc.militaryUnitsProduced += 1;
    if (isPlayerAtWar(state, ownerId)) acc.militaryUnitsProducedAtWar += 1;
    if ((owner.netGold ?? 0) < 0) acc.militaryUnitsProducedInDeficit += 1;
    if (owner.austerityActive) acc.militaryUnitsProducedInAusterity += 1;

    const phase = getEconomyPhase(state.turn);
    if (phase === "early") acc.militaryUnitsProducedEarly += 1;
    else if (phase === "mid") acc.militaryUnitsProducedMid += 1;
    else acc.militaryUnitsProducedLate += 1;
}

function recordEconomySample(
    economyByCiv: Map<string, EconomyAccumulator>,
    state: SimState,
    playerId: string
): void {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const acc = economyByCiv.get(playerId);
    if (!acc) return;

    const grossGold = player.grossGold ?? 0;
    const buildingUpkeep = player.buildingUpkeep ?? 0;
    const militaryUpkeep = player.militaryUpkeep ?? 0;
    const netGold = player.netGold ?? 0;
    const treasury = player.treasury ?? 0;
    const usedSupply = player.usedSupply ?? 0;
    const freeSupply = player.freeSupply ?? 0;
    const austerityActive = player.austerityActive ?? false;
    const totalUpkeep = buildingUpkeep + militaryUpkeep;
    const upkeepRatio = grossGold > 0 ? totalUpkeep / grossGold : (totalUpkeep > 0 ? 1 : 0);
    const atWar = isPlayerAtWar(state, playerId);
    const deficitActive = netGold < 0;

    acc.samples += 1;
    acc.grossGoldTotal += grossGold;
    acc.buildingUpkeepTotal += buildingUpkeep;
    acc.militaryUpkeepTotal += militaryUpkeep;
    acc.netGoldTotal += netGold;
    acc.treasuryTotal += treasury;
    acc.treasuryMin = Math.min(acc.treasuryMin, treasury);
    acc.treasuryMax = Math.max(acc.treasuryMax, treasury);
    acc.usedSupplyTotal += usedSupply;
    acc.freeSupplyTotal += freeSupply;
    acc.upkeepRatioTotal += upkeepRatio;

    if (deficitActive) {
        acc.deficitTurns += 1;
        acc.currentConsecutiveDeficit += 1;
        acc.maxConsecutiveDeficit = Math.max(acc.maxConsecutiveDeficit, acc.currentConsecutiveDeficit);
    } else {
        acc.currentConsecutiveDeficit = 0;
    }
    if (netGold >= 0) acc.positiveNetTurns += 1;
    if (usedSupply > freeSupply) acc.supplyPressureTurns += 1;
    if (treasury === 0 && deficitActive) acc.zeroTreasuryDeficitTurns += 1;

    if (!acc.lastDeficitActive && deficitActive) {
        acc.deficitEntryCount += 1;
    } else if (acc.lastDeficitActive && !deficitActive) {
        acc.deficitRecoveryCount += 1;
    }
    acc.lastDeficitActive = deficitActive;

    if (austerityActive) {
        acc.austerityTurns += 1;
        acc.currentConsecutiveAusterity += 1;
        acc.maxConsecutiveAusterity = Math.max(acc.maxConsecutiveAusterity, acc.currentConsecutiveAusterity);
    } else {
        acc.currentConsecutiveAusterity = 0;
    }

    if (!acc.lastAusterityActive && austerityActive) {
        acc.enteredAusterityCount += 1;
    } else if (acc.lastAusterityActive && !austerityActive) {
        acc.recoveredFromAusterityCount += 1;
    }
    acc.lastAusterityActive = austerityActive;

    if (atWar) {
        acc.atWarTurns += 1;
        acc.atWarNetGoldTotal += netGold;
        if (netGold < 0) acc.atWarDeficitTurns += 1;
        if (austerityActive) acc.atWarAusterityTurns += 1;
    }

    const ownedCities = state.cities.filter(city => city.ownerId === playerId);
    acc.cityCountTotal += ownedCities.length;

    const goldEconomyCityCount = ownedCities.filter(city =>
        city.buildings.some(building => GOLD_BUILDINGS_FOR_TELEMETRY.includes(building))
    ).length;
    acc.goldEconomyCityCountTotal += goldEconomyCityCount;
    if (goldEconomyCityCount >= 2) {
        acc.multiGoldEconomyCityTurns += 1;
    }

    if (ownedCities.length > 0) {
        let totalCityGold = 0;
        let topCity = ownedCities[0];
        let topCityGold = Number.NEGATIVE_INFINITY;

        for (const city of ownedCities) {
            const cityGold = getCityYields(city, state).G;
            totalCityGold += cityGold;
            if (cityGold > topCityGold) {
                topCity = city;
                topCityGold = cityGold;
            }
        }

        if (totalCityGold > 0) {
            acc.topCityGoldShareTotal += topCityGold / totalCityGold;
            acc.topCityGoldSamples += 1;
            if (cityIsGoldHub(state, topCity.id)) {
                acc.topCityGoldHubSamples += 1;
            }
        }
    }

    const bankCities = ownedCities.filter(city => city.buildings.includes(BuildingType.Bank));
    if (bankCities.length > 0) {
        acc.bankConditionalCitySamples += bankCities.length;
        for (const bankCity of bankCities) {
            if (cityHasWorkedOreVein(state, bankCity.id)) {
                acc.bankConditionalActiveSamples += 1;
            }
        }
    }

    const cumulativeRushBuyCount = player.rushBuyCount ?? 0;
    const cumulativeRushBuySpent = player.rushBuyGoldSpent ?? 0;
    const cumulativeRushBuySaved = player.rushBuyGoldSaved ?? 0;
    const rushBuyCountDelta = Math.max(0, cumulativeRushBuyCount - acc.lastRushBuyCount);
    const rushBuySpentDelta = Math.max(0, cumulativeRushBuySpent - acc.lastRushBuyGoldSpent);
    const rushBuySavedDelta = Math.max(0, cumulativeRushBuySaved - acc.lastRushBuyGoldSaved);
    acc.rushBuyCount += rushBuyCountDelta;
    acc.rushBuyGoldSpent += rushBuySpentDelta;
    acc.rushBuyGoldSaved += rushBuySavedDelta;
    acc.lastRushBuyCount = cumulativeRushBuyCount;
    acc.lastRushBuyGoldSpent = cumulativeRushBuySpent;
    acc.lastRushBuyGoldSaved = cumulativeRushBuySaved;

    if (acc.exchangeUnlockTurn === null && player.techs.includes(TechId.SignalRelay)) {
        acc.exchangeUnlockTurn = state.turn;
    }
    if (acc.exchangeFirstBuildTurn === null && ownedCities.some(city => city.buildings.includes(BuildingType.Exchange))) {
        acc.exchangeFirstBuildTurn = state.turn;
    }
    if (acc.exchangeUnlockToFirstBuildDelay === null && acc.exchangeUnlockTurn !== null && acc.exchangeFirstBuildTurn !== null) {
        acc.exchangeUnlockToFirstBuildDelay = Math.max(0, acc.exchangeFirstBuildTurn - acc.exchangeUnlockTurn);
    }

    const phase = getEconomyPhase(state.turn);
    const phaseAcc = acc.phase[phase];
    phaseAcc.samples += 1;
    phaseAcc.grossGoldTotal += grossGold;
    phaseAcc.buildingUpkeepTotal += buildingUpkeep;
    phaseAcc.militaryUpkeepTotal += militaryUpkeep;
    phaseAcc.netGoldTotal += netGold;
    phaseAcc.treasuryTotal += treasury;
    if (netGold < 0) phaseAcc.deficitTurns += 1;
    if (austerityActive) phaseAcc.austerityTurns += 1;
}

function summarizePhase(acc: EconomyPhaseAccumulator): EconomyPhaseSummary {
    return {
        samples: acc.samples,
        grossGoldTotal: acc.grossGoldTotal,
        buildingUpkeepTotal: acc.buildingUpkeepTotal,
        militaryUpkeepTotal: acc.militaryUpkeepTotal,
        netGoldTotal: acc.netGoldTotal,
        treasuryTotal: acc.treasuryTotal,
        deficitTurns: acc.deficitTurns,
        austerityTurns: acc.austerityTurns,
        avgGrossGold: ratio(acc.grossGoldTotal, acc.samples),
        avgBuildingUpkeep: ratio(acc.buildingUpkeepTotal, acc.samples),
        avgMilitaryUpkeep: ratio(acc.militaryUpkeepTotal, acc.samples),
        avgNetGold: ratio(acc.netGoldTotal, acc.samples),
        avgTreasury: ratio(acc.treasuryTotal, acc.samples),
        deficitTurnRate: ratio(acc.deficitTurns, acc.samples),
        austerityTurnRate: ratio(acc.austerityTurns, acc.samples),
    };
}

function finalizeEconomySummary(economyByCiv: Map<string, EconomyAccumulator>): EconomySummary {
    const summary: EconomySummary = {};
    economyByCiv.forEach(acc => {
        const samples = acc.samples;
        const rushBuyVolume = acc.rushBuyGoldSpent + acc.rushBuyGoldSaved;
        summary[acc.civId] = {
            civId: acc.civId,
            civName: acc.civName,
            samples,
            grossGoldTotal: acc.grossGoldTotal,
            buildingUpkeepTotal: acc.buildingUpkeepTotal,
            militaryUpkeepTotal: acc.militaryUpkeepTotal,
            netGoldTotal: acc.netGoldTotal,
            treasuryTotal: acc.treasuryTotal,
            avgGrossGold: ratio(acc.grossGoldTotal, samples),
            avgBuildingUpkeep: ratio(acc.buildingUpkeepTotal, samples),
            avgMilitaryUpkeep: ratio(acc.militaryUpkeepTotal, samples),
            avgTotalUpkeep: ratio(acc.buildingUpkeepTotal + acc.militaryUpkeepTotal, samples),
            avgNetGold: ratio(acc.netGoldTotal, samples),
            avgTreasury: ratio(acc.treasuryTotal, samples),
            treasuryMin: Number.isFinite(acc.treasuryMin) ? acc.treasuryMin : 0,
            treasuryMax: Number.isFinite(acc.treasuryMax) ? acc.treasuryMax : 0,
            avgUsedSupply: ratio(acc.usedSupplyTotal, samples),
            avgFreeSupply: ratio(acc.freeSupplyTotal, samples),
            avgCities: ratio(acc.cityCountTotal, samples),
            avgGoldEconomyCities: ratio(acc.goldEconomyCityCountTotal, samples),
            multiGoldEconomyCityTurnRate: ratio(acc.multiGoldEconomyCityTurns, samples),
            avgTopCityGoldShare: ratio(acc.topCityGoldShareTotal, acc.topCityGoldSamples),
            topCityGoldHubRate: ratio(acc.topCityGoldHubSamples, acc.topCityGoldSamples),
            avgUpkeepRatio: ratio(acc.upkeepRatioTotal, samples),
            deficitTurns: acc.deficitTurns,
            positiveNetTurns: acc.positiveNetTurns,
            deficitEntryCount: acc.deficitEntryCount,
            deficitRecoveryCount: acc.deficitRecoveryCount,
            deficitRecoveryRate: ratio(acc.deficitRecoveryCount, acc.deficitEntryCount),
            maxConsecutiveDeficit: acc.maxConsecutiveDeficit,
            deficitTurnRate: ratio(acc.deficitTurns, samples),
            austerityTurns: acc.austerityTurns,
            austerityTurnRate: ratio(acc.austerityTurns, samples),
            enteredAusterityCount: acc.enteredAusterityCount,
            recoveredFromAusterityCount: acc.recoveredFromAusterityCount,
            maxConsecutiveAusterity: acc.maxConsecutiveAusterity,
            supplyPressureTurns: acc.supplyPressureTurns,
            supplyPressureRate: ratio(acc.supplyPressureTurns, samples),
            zeroTreasuryDeficitTurns: acc.zeroTreasuryDeficitTurns,
            atWarTurns: acc.atWarTurns,
            atWarTurnRate: ratio(acc.atWarTurns, samples),
            avgAtWarNetGold: ratio(acc.atWarNetGoldTotal, acc.atWarTurns),
            atWarDeficitTurnRate: ratio(acc.atWarDeficitTurns, acc.atWarTurns),
            atWarAusterityTurnRate: ratio(acc.atWarAusterityTurns, acc.atWarTurns),
            bankConditionalCitySamples: acc.bankConditionalCitySamples,
            bankConditionalActiveSamples: acc.bankConditionalActiveSamples,
            bankConditionalUptimeRate: ratio(acc.bankConditionalActiveSamples, acc.bankConditionalCitySamples),
            militaryUnitsProduced: acc.militaryUnitsProduced,
            militaryUnitsProducedAtWar: acc.militaryUnitsProducedAtWar,
            militaryUnitsProducedInDeficit: acc.militaryUnitsProducedInDeficit,
            militaryUnitsProducedInAusterity: acc.militaryUnitsProducedInAusterity,
            militaryUnitsProducedEarly: acc.militaryUnitsProducedEarly,
            militaryUnitsProducedMid: acc.militaryUnitsProducedMid,
            militaryUnitsProducedLate: acc.militaryUnitsProducedLate,
            militaryUnitsProducedPer100Turns: ratio(acc.militaryUnitsProduced * 100, samples),
            militaryProducedUnderStressRate: ratio(
                acc.militaryUnitsProducedInDeficit + acc.militaryUnitsProducedInAusterity,
                acc.militaryUnitsProduced
            ),
            rushBuyCount: acc.rushBuyCount,
            rushBuyGoldSpent: acc.rushBuyGoldSpent,
            rushBuyGoldSaved: acc.rushBuyGoldSaved,
            rushBuyDiscountUtilizationRate: ratio(acc.rushBuyGoldSaved, rushBuyVolume),
            avgRushBuyGoldSaved: ratio(acc.rushBuyGoldSaved, acc.rushBuyCount),
            exchangeUnlockTurn: acc.exchangeUnlockTurn,
            exchangeFirstBuildTurn: acc.exchangeFirstBuildTurn,
            exchangeUnlockToFirstBuildDelay: acc.exchangeUnlockToFirstBuildDelay,
            goldBuildingFirstCompletionTurn: acc.goldBuildingFirstCompletionTurn,
            phase: {
                early: summarizePhase(acc.phase.early),
                mid: summarizePhase(acc.phase.mid),
                late: summarizePhase(acc.phase.late),
            },
        };
    });
    return summary;
}

function runComprehensiveSimulation(seed = 42, mapSize: MapSize = "Huge", turnLimit = 200, playerCount?: number) {
    // Pass seed to civList for randomized civ selection
    let state = generateWorld({ mapSize, players: civList(playerCount, seed), seed, aiSystem: "UtilityV2" });
    clearWarVetoLog();

    // Force initial contact
    for (const a of state.players) {
        for (const b of state.players) {
            if (a.id === b.id) continue;
            state.contacts[a.id] ??= {} as any;
            state.contacts[b.id] ??= {} as any;
            state.contacts[a.id][b.id] = true;
            state.contacts[b.id][a.id] = true;
            (state.contacts[a.id] as any)[`metTurn_${b.id}`] = state.turn;
            (state.contacts[b.id] as any)[`metTurn_${a.id}`] = state.turn;
        }
    }

    const events: Event[] = [];
    const turnSnapshots: TurnSnapshot[] = [];
    const keyTurns = new Set([25, 50, 75, 100, 125, 150, 175, 200]);

    // Track wars/peace already logged this turn to avoid duplicates
    const warsLoggedThisTurn = new Set<string>();
    const peaceLoggedThisTurn = new Set<string>();
    const eliminationsLogged = new Set<string>();
    const economyByCiv = new Map<string, EconomyAccumulator>();
    state.players.forEach(player => {
        economyByCiv.set(player.id, createEconomyAccumulator(player.id, player.civName));
    });

    let winTurn: number | null = null;

    while (!state.winnerId && state.turn <= turnLimit) {
        const actingPlayerId = state.currentPlayerId;

        // Capture snapshot BEFORE turn
        const beforeUnits = new Map(state.units.map(u => [u.id, { type: u.type, ownerId: u.ownerId }]));
        if (state.currentPlayerId === state.players[0].id && process.env.SIM_QUIET !== "true") {
            console.log(`--- TURN ${state.turn} ---`);
        }
        const beforeCities = new Map(state.cities.map(c => [c.id, { ownerId: c.ownerId, buildings: [...c.buildings] }]));
        const beforeDiplomacy = new Map<string, Map<string, DiplomacyState>>();
        const beforeTechs = new Map(state.players.map(p => [p.id, new Set(p.techs)]));
        const beforeProjects = new Map(state.players.map(p => {
            const counts = new Map<ProjectId, number>();
            p.completedProjects.forEach(proj => counts.set(proj, (counts.get(proj) || 0) + 1));
            return [p.id, counts];
        }));
        const beforeContacts = new Map(state.players.map(p => [p.id, new Set(Object.keys(state.contacts[p.id] || {}))]));

        state.players.forEach(p1 => {
            if (!beforeDiplomacy.has(p1.id)) beforeDiplomacy.set(p1.id, new Map());
            state.players.forEach(p2 => {
                if (p1.id === p2.id) return;
                const dipState = state.diplomacy[p1.id]?.[p2.id] || DiplomacyState.Peace;
                beforeDiplomacy.get(p1.id)!.set(p2.id, dipState);
            });
        });

        state = runAiTurn(state, actingPlayerId);
        const currentUnitIds = new Set(state.units.map(u => u.id));
        const firstCityIdByOwner = new Map<string, string>();
        for (const city of state.cities) {
            if (!firstCityIdByOwner.has(city.ownerId)) {
                firstCityIdByOwner.set(city.ownerId, city.id);
            }
        }
        recordEconomySample(economyByCiv, state, actingPlayerId);

        // Detect changes and log events

        // First, detect city foundings (need this before unit deaths to exclude settlers that founded)
        const newCityOwners = new Set<string>();
        state.cities.forEach(c => {
            if (!beforeCities.has(c.id)) {
                events.push({
                    type: "CityFound",
                    turn: state.turn,
                    cityId: c.id,
                    owner: c.ownerId,
                });
                newCityOwners.add(c.ownerId);
            }
        });

        // Unit deaths - but exclude settlers that founded cities this turn
        beforeUnits.forEach((prevUnit, unitId) => {
            if (!currentUnitIds.has(unitId)) {
                // Check if this is a settler that founded a city (not a real death)
                const isSettlerWhoFounded = prevUnit.type === "Settler" && newCityOwners.has(prevUnit.ownerId);

                if (!isSettlerWhoFounded) {
                    // Unit actually died in combat or was disbanded
                    events.push({
                        type: "UnitDeath",
                        turn: state.turn,
                        unitId,
                        unitType: prevUnit.type,
                        owner: prevUnit.ownerId,
                    });
                }
            }
        });

        // Unit production (new units)
        state.units.forEach(u => {
            if (!beforeUnits.has(u.id)) {
                // New unit - find which city produced it (simplified - check cities of same owner)
                const cityId = firstCityIdByOwner.get(u.ownerId);
                if (cityId) {
                    events.push({
                        type: "UnitProduction",
                        turn: state.turn,
                        cityId,
                        owner: u.ownerId,
                        unitType: u.type,
                        unitId: u.id,
                    });
                    recordMilitaryProductionEvent(economyByCiv, state, u.ownerId, u.type);
                }
            } else {
                // Check for upgrades (e.g. FormArmy modifies unit in-place)
                const prevUnit = beforeUnits.get(u.id)!;
                if (prevUnit.type !== u.type) {
                    const cityId = firstCityIdByOwner.get(u.ownerId);
                    if (cityId) {
                        events.push({
                            type: "UnitProduction",
                            turn: state.turn,
                            cityId,
                            owner: u.ownerId,
                            unitType: u.type,
                            unitId: u.id,
                        });
                        recordMilitaryProductionEvent(economyByCiv, state, u.ownerId, u.type);
                    }
                }
            }
        });

        // City captures and razing
        beforeCities.forEach((prevCity, cityId) => {
            const currentCity = state.cities.find(c => c.id === cityId);
            if (!currentCity) {
                // City was razed
                events.push({
                    type: "CityRaze",
                    turn: state.turn,
                    cityId,
                    owner: prevCity.ownerId,
                });
            } else if (currentCity.ownerId !== prevCity.ownerId) {
                // City was captured
                events.push({
                    type: "CityCapture",
                    turn: state.turn,
                    cityId,
                    from: prevCity.ownerId,
                    to: currentCity.ownerId,
                });
            }
        });

        // Tech completions
        beforeTechs.forEach((prevTechsSet, civId) => {
            const player = state.players.find(p => p.id === civId);
            if (player) {
                player.techs.forEach(tech => {
                    if (!prevTechsSet.has(tech)) {
                        events.push({
                            type: "TechComplete",
                            turn: state.turn,
                            civ: civId,
                            tech,
                        });
                    }
                });
            }
        });

        // Project completions
        beforeProjects.forEach((prevProjectsCount, civId) => {
            const player = state.players.find(p => p.id === civId);
            if (player) {
                // Count current projects
                const currentCounts = new Map<ProjectId, number>();
                player.completedProjects.forEach(p => {
                    currentCounts.set(p, (currentCounts.get(p) || 0) + 1);
                });

                // Compare with previous counts
                currentCounts.forEach((count, projectId) => {
                    const prevCount = prevProjectsCount.get(projectId) || 0;
                    if (count > prevCount) {
                        // Log one event for each new completion
                        for (let i = 0; i < count - prevCount; i++) {
                            events.push({
                                type: "ProjectComplete",
                                turn: state.turn,
                                civ: civId,
                                project: projectId,
                            });
                        }
                    }
                });
            }
        });

        // Building completions
        beforeCities.forEach((prevCity, cityId) => {
            const currentCity = state.cities.find(c => c.id === cityId);
            if (currentCity) {
                currentCity.buildings.forEach(building => {
                    if (!prevCity.buildings.includes(building)) {
                        events.push({
                            type: "BuildingComplete",
                            turn: state.turn,
                            cityId,
                            owner: currentCity.ownerId,
                            building,
                        });
                        if (GOLD_BUILDINGS_FOR_TELEMETRY.includes(building)) {
                            const economyAcc = economyByCiv.get(currentCity.ownerId);
                            if (economyAcc && economyAcc.goldBuildingFirstCompletionTurn[building] === undefined) {
                                economyAcc.goldBuildingFirstCompletionTurn[building] = state.turn;
                            }
                        }
                    }
                });
            }
        });

        // Diplomacy changes (war/peace) - reset tracking at start of new global turn
        if (state.currentPlayerId === state.players[0].id) {
            warsLoggedThisTurn.clear();
            peaceLoggedThisTurn.clear();
        }

        beforeDiplomacy.forEach((prevDipMap, civ1) => {
            prevDipMap.forEach((prevState, civ2) => {
                const currentState = state.diplomacy[civ1]?.[civ2] || DiplomacyState.Peace;
                if (currentState !== prevState) {
                    if (currentState === DiplomacyState.War) {
                        // Only log once per civ pair per turn
                        const warKey = [civ1, civ2].sort().join("-") + "-" + state.turn;
                        if (!warsLoggedThisTurn.has(warKey)) {
                            warsLoggedThisTurn.add(warKey);
                            // Attribute initiator to the acting player when possible; symmetric diplomacy updates
                            // otherwise cause random initiator assignment depending on iteration order.
                            const initiator = (actingPlayerId === civ1 || actingPlayerId === civ2) ? actingPlayerId : civ1;
                            const target = initiator === civ1 ? civ2 : civ1;
                            const initiatorPower = estimateMilitaryPower(initiator, state);
                            const targetPower = estimateMilitaryPower(target, state);
                            events.push({
                                type: "WarDeclaration",
                                turn: state.turn,
                                initiator,
                                target,
                                initiatorPower,
                                targetPower,
                            });
                        }
                    } else if (currentState === DiplomacyState.Peace && prevState === DiplomacyState.War) {
                        // Only log once per civ pair per turn
                        const peaceKey = [civ1, civ2].sort().join("-") + "-" + state.turn;
                        if (!peaceLoggedThisTurn.has(peaceKey)) {
                            peaceLoggedThisTurn.add(peaceKey);
                            events.push({
                                type: "PeaceTreaty",
                                turn: state.turn,
                                civ1,
                                civ2,
                            });
                        }
                    }
                }
            });
        });

        // Contact events
        beforeContacts.forEach((prevContactsSet, civId) => {
            const currentContacts = new Set(Object.keys(state.contacts[civId] || {}));
            currentContacts.forEach(contactId => {
                if (!prevContactsSet.has(contactId)) {
                    events.push({
                        type: "Contact",
                        turn: state.turn,
                        civ1: civId,
                        civ2: contactId,
                    });
                }
            });
        });

        // Eliminations (only log once per eliminated player, ever)
        state.players.forEach(p => {
            if (p.isEliminated && !eliminationsLogged.has(p.id)) {
                eliminationsLogged.add(p.id);
                // Find who captured their last city
                const lastCapture = events
                    .filter(e => e.type === "CityCapture" && (e as any).from === p.id)
                    .sort((a, b) => b.turn - a.turn)[0] as any;
                events.push({
                    type: "Elimination",
                    turn: state.turn,
                    eliminated: p.id,
                    by: lastCapture?.to,
                });
            }
        });

        // --- TITAN LOGGING ---
        // Per-turn TitanStep events are expensive (event volume + JSON size). Keep them off by default.
        // Enable detailed Titan step logging with SIM_LOG_TITAN_STEPS=true (or DEBUG_AI_LOGS=true).
        if (process.env.DEBUG_AI_LOGS === "true" || process.env.SIM_LOG_TITAN_STEPS === "true") {
            state.units.forEach(u => {
                if (u.type === UnitType.Titan) {
                    const supportCount = state.units.filter(other =>
                        other.ownerId === u.ownerId &&
                        other.id !== u.id &&
                        UNITS[other.type].domain !== "Civilian" &&
                        (Math.abs(other.coord.q - u.coord.q) + Math.abs(other.coord.q + other.coord.r - u.coord.q - u.coord.r) + Math.abs(other.coord.r - u.coord.r)) / 2 <= 3
                    ).length;

                    events.push({
                        type: "TitanStep",
                        turn: state.turn,
                        owner: u.ownerId,
                        supportCount
                    });

                    if (!beforeUnits.has(u.id)) {
                        events.push({
                            type: "TitanSpawn",
                            turn: state.turn,
                            owner: u.ownerId,
                            unitId: u.id,
                            unitCount: state.units.filter(unit => unit.ownerId === u.ownerId).length
                        });
                    }
                }
            });
        } else {
            // Still log spawns (rare) so reports can track Titan timing.
            state.units.forEach(u => {
                if (u.type === UnitType.Titan && !beforeUnits.has(u.id)) {
                    events.push({
                        type: "TitanSpawn",
                        turn: state.turn,
                        owner: u.ownerId,
                        unitId: u.id,
                        unitCount: state.units.filter(unit => unit.ownerId === u.ownerId).length
                    });
                }
            });
        }

        // Titan Deaths & Kills
        beforeUnits.forEach((prevUnit, unitId) => {
            if (!currentUnitIds.has(unitId)) {
                // Unit died
                if (prevUnit.type === UnitType.Titan) {
                    events.push({
                        type: "TitanDeath",
                        turn: state.turn,
                        owner: prevUnit.ownerId
                    });
                }
            } else {
                // Unit survived. Did it kill anything?
                // We don't strictly track "who killed who" in the state, but we can infer if a Titan is on a tile where an enemy was.
                // This is hard to track perfectly without combat logs.
                // Alternative: Just track Titan survival and support for now.
                // Actually, we can check if Titan moved to a tile that was occupied by an enemy unit or city.
            }
        });

        // Capture snapshot at key turns
        if (keyTurns.has(state.turn)) {
            turnSnapshots.push(createTurnSnapshot(state));
        }

        if (state.winnerId) {
            winTurn = state.turn;
            turnSnapshots.push(createTurnSnapshot(state));
            break;
        }
    }

    const winner = state.players.find(p => p.id === state.winnerId);

    // Capture participating civs explicitly
    const participatingCivs = state.players.map(p => ({
        id: p.id,
        civName: p.civName,
        isEliminated: p.isEliminated || false,
    }));
    const economySummary = finalizeEconomySummary(economyByCiv);

    return {
        seed,
        mapSize,
        turnReached: state.turn,
        winTurn,
        winner: winner ? { id: winner.id, civ: winner.civName } : null,
        victoryType: winner?.completedProjects.includes(ProjectId.GrandExperiment) ? "Progress" : (state.winnerId ? "Conquest" : "None"),
        events,
        turnSnapshots,
        finalState: createTurnSnapshot(state),
        participatingCivs,
        economySummary,
    };
}

// ==========================================
// PARALLEL EXECUTION LOGIC
// ==========================================

if (isMainThread) {
    const allConfigs: { size: MapSize; maxCivs: number }[] = [
        { size: "Tiny", maxCivs: 2 },
        { size: "Small", maxCivs: 3 },
        { size: "Standard", maxCivs: 4 },
        { size: "Large", maxCivs: 6 },
        { size: "Huge", maxCivs: 6 },
    ];

    const allowedSizes = process.env.SIM_MAP_SIZES
        ? process.env.SIM_MAP_SIZES.split(",").map(s => s.trim())
        : [];

    const MAP_CONFIGS = allowedSizes.length > 0
        ? allConfigs.filter(c => allowedSizes.includes(c.size))
        : allConfigs;

    if (MAP_CONFIGS.length === 0) {
        console.error(`Error: No valid map sizes found in SIM_MAP_SIZES: ${process.env.SIM_MAP_SIZES}`);
        process.exit(1);
    }

    const seedsCount = process.env.SIM_SEEDS_COUNT ? parseInt(process.env.SIM_SEEDS_COUNT) : 10;
    const seedOverride = process.env.SIM_SEED_OVERRIDE ? parseInt(process.env.SIM_SEED_OVERRIDE) : null;

    const seeds: number[] = [];
    for (let i = 0; i < seedsCount; i++) {
        seeds.push((i + 1) * 1001);
    }

    // Create task queue
    const tasks: { seed: number; config: typeof MAP_CONFIGS[0]; mapIndex: number; debug: boolean }[] = [];
    const debug = process.env.DEBUG_AI_LOGS === "true";
    const quiet = process.env.SIM_QUIET === "true";

    if (seedOverride) {
        // Find which map config corresponds to this seed (assuming standard generation)
        // seed = base + (mapIndex * 100000)
        // mapIndex = floor((seed - base) / 100000)
        // But base is variable.
        // Instead, just try to find a matching map config or default to Standard
        // Actually, for debugging, we usually know the map size.
        // Let's just run it as a single task with "Standard" or infer from seed if possible.
        // For 101001: 101001 % 100000 = 1001. 101001 / 100000 = 1. Map Index 1 = Small.
        const mapIndex = Math.floor(seedOverride / 100000);
        const config = MAP_CONFIGS[mapIndex] || MAP_CONFIGS[2]; // Default to Standard if out of bounds
        if (!quiet) {
            console.log(`Overriding simulation to run ONLY Seed ${seedOverride} on ${config.size} map`);
        }
        tasks.push({ seed: seedOverride, config, mapIndex, debug });
    } else {
        for (const config of MAP_CONFIGS) {
            const mapIndex = MAP_CONFIGS.indexOf(config);
            for (let i = 0; i < seeds.length; i++) {
                const seed = seeds[i] + (mapIndex * 100000);
                tasks.push({ seed, config, mapIndex, debug });
            }
        }
    }

    const totalTasks = tasks.length;
    let completedTasks = 0;
    const allResults: any[] = [];
    const startTime = performance.now();

    // Determine worker count (use 90% of cores for better utilization with some headroom)
    const numCPUs = os.cpus().length;
    // v2.0: Changed from numCPUs - 1 (~70%) to 90% of cores for faster simulation
    const workerCount = Math.max(1, Math.floor(numCPUs * 0.9));
    if (!quiet) {
        console.log(`Starting parallel simulation with ${workerCount} workers (90% of ${numCPUs} CPUs) for ${totalTasks} tasks...`);
        if (debug) console.log("DEBUG LOGGING ENABLED - Output logs may be large.");
    }

    let activeWorkers = 0;

    const startWorker = () => {
        if (tasks.length === 0) return;

        const task = tasks.shift()!;
        activeWorkers++;

        const worker = new Worker(fileURLToPath(import.meta.url), {
            workerData: task
        });

        worker.on('message', (result) => {
            allResults.push(result);
            completedTasks++;
            const elapsed = (performance.now() - startTime) / 1000;
            const avgTime = elapsed / completedTasks;
            const remaining = (totalTasks - completedTasks) * avgTime;

            // NOTE: monitor-flexible.sh relies on the "Completed" token for progress tracking (grep -c "Completed").
            console.log(
                `[${completedTasks}/${totalTasks}] Completed ${result.mapSize} (Seed ${result.seed}) in ${(result.duration / 1000).toFixed(1)}s ` +
                `| Winner: ${result.winner?.civ || "None"} | ${Math.round(completedTasks / totalTasks * 100)}% | ETA ${remaining.toFixed(0)}s`
            );
        });

        worker.on('error', (err) => {
            console.error(`Worker error for task ${JSON.stringify(task)}:`, err);
        });

        worker.on('exit', (code) => {
            activeWorkers--;
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
            }
            // Start next task
            if (tasks.length > 0) {
                startWorker();
            } else if (activeWorkers === 0) {
                finish();
            }
        });
    };

    // Start initial batch of workers
    for (let i = 0; i < workerCount; i++) {
        startWorker();
    }

    const finish = () => {
        const totalTimeSeconds = (performance.now() - startTime) / 1000;
        if (!quiet) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`ALL SIMULATIONS COMPLETE!`);
            console.log(`${"=".repeat(60)}`);
            console.log(`Total simulations: ${allResults.length}`);
            console.log(`Total time: ${totalTimeSeconds.toFixed(0)}s (${(totalTimeSeconds / allResults.length).toFixed(1)}s per simulation)`);
        } else {
            console.log(`ALL SIMULATIONS COMPLETE`);
        }

        // Writing minified JSON is materially faster and smaller for large runs (e.g. 120 sims).
        writeFileSync("/tmp/comprehensive-simulation-results.json", JSON.stringify(allResults));

        if (!quiet) {
            console.log(`✓ Results written to /tmp/comprehensive-simulation-results.json`);
            console.log(`File size: ${(statSync("/tmp/comprehensive-simulation-results.json").size / 1024 / 1024).toFixed(1)} MB`);
        }
        process.exit(0);
    };

} else {
    // Worker thread logic
    const { seed, config, debug } = workerData;

    // Enable debug logging if requested
    if (debug) {
        setAiDebug(true);
    }

    const start = performance.now();

    try {
        const result = runComprehensiveSimulation(seed, config.size, 400, config.maxCivs); // v9.12: 300→400 turns
        const duration = performance.now() - start;
        parentPort?.postMessage({ ...result, duration });
    } catch (err) {
        console.error(`Error in worker (Seed ${seed}):`, err);
        process.exit(1);
    }
}
