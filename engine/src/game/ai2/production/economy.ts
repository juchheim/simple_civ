import {
    BUILDINGS,
    ECONOMIC_BUILDING_SUPPLY_BONUS,
    MILITARY_UPKEEP_PER_EXCESS_SUPPLY,
} from "../../../core/constants.js";
import { BuildingType, City, GameState, OverlayType, TerrainType } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { isTileAdjacentToRiver } from "../../../map/rivers.js";
import { canBuild } from "../../rules.js";
import { aiInfo } from "../../ai/debug-logging.js";
import type { BuildOption } from "../production.js";
import type { EconomySnapshot } from "../economy/budget.js";

const GOLD_BUILDINGS: BuildingType[] = [
    BuildingType.TradingPost,
    BuildingType.MarketHall,
    BuildingType.Bank,
    BuildingType.Exchange,
];

function getGoldBuildingTierMultiplier(building: BuildingType): number {
    switch (building) {
        case BuildingType.MarketHall:
            return 1.2;
        case BuildingType.Bank:
            return 1.4;
        case BuildingType.Exchange:
            return 1.7;
        default:
            return 1.0;
    }
}

function cityHasWorkedOreVein(state: GameState, city: City): boolean {
    return city.workedTiles.some(coord => {
        const tile = state.map.tiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
        return !!tile?.overlays.includes(OverlayType.OreVein);
    });
}

function cityHasOwnedOreVein(state: GameState, city: City): boolean {
    return state.map.tiles.some(tile => tile.ownerCityId === city.id && tile.overlays.includes(OverlayType.OreVein));
}

function isCoastalCity(state: GameState, city: City): boolean {
    return state.map.tiles.some(tile => {
        if (hexDistance(tile.coord, city.coord) !== 1) return false;
        return tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea;
    });
}

export function getGoldBuildingConditionalBonus(state: GameState, city: City, building: BuildingType): number {
    if (building === BuildingType.TradingPost) {
        return isTileAdjacentToRiver(state.map, city.coord) ? 1 : 0;
    }
    if (building === BuildingType.MarketHall) {
        return city.pop >= 5 ? 1 : 0;
    }
    if (building === BuildingType.Bank) {
        if (cityHasWorkedOreVein(state, city)) return 1;
        return cityHasOwnedOreVein(state, city) ? 0.5 : 0;
    }
    return 0;
}

function estimateSupplyReliefValue(building: BuildingType, snapshot?: EconomySnapshot): number {
    if (!snapshot) return 0;
    const supplyBonus = ECONOMIC_BUILDING_SUPPLY_BONUS[building] ?? 0;
    if (supplyBonus <= 0) return 0;

    const supplyGap = snapshot.usedSupply - snapshot.freeSupply;
    if (supplyGap >= 1) {
        const immediateRelief = Math.min(supplyBonus, supplyGap);
        const anticipatoryRelief = Math.max(0, supplyBonus - immediateRelief);
        return (immediateRelief + (anticipatoryRelief * 0.35)) * MILITARY_UPKEEP_PER_EXCESS_SUPPLY;
    }

    if (snapshot.atWar && supplyGap >= 0) {
        return supplyBonus * MILITARY_UPKEEP_PER_EXCESS_SUPPLY * 0.45;
    }

    if (snapshot.usedSupply >= snapshot.freeSupply - 1) {
        return supplyBonus * MILITARY_UPKEEP_PER_EXCESS_SUPPLY * 0.3;
    }

    return 0;
}

export function estimateGoldBuildingNetGain(
    state: GameState,
    city: City,
    building: BuildingType,
    snapshot?: EconomySnapshot
): number {
    const data = BUILDINGS[building];
    const baseGold = data.yieldFlat?.G ?? 0;
    const conditional = getGoldBuildingConditionalBonus(state, city, building);
    const maintenance = data.maintenance ?? 0;
    const supplyRelief = estimateSupplyReliefValue(building, snapshot);
    return baseGold + conditional - maintenance + supplyRelief;
}

export function estimateGoldBuildingPaybackTurns(
    state: GameState,
    city: City,
    building: BuildingType,
    snapshot?: EconomySnapshot
): number {
    const data = BUILDINGS[building];
    const netGain = estimateGoldBuildingNetGain(state, city, building, snapshot);
    if (netGain <= 0) return Number.POSITIVE_INFINITY;
    return data.cost / netGain;
}

export function pickEconomyBuilding(
    state: GameState,
    _playerId: string,
    city: City,
    civName: string,
    snapshot?: EconomySnapshot,
    goldBuildBias: number = 1
): BuildOption | null {
    const economyState = snapshot?.economyState ?? "Guarded";
    const recoveryMultiplier = economyState === "Crisis" ? 1.8 : economyState === "Strained" ? 1.4 : 1.0;
    const supplyGap = snapshot ? snapshot.usedSupply - snapshot.freeSupply : Number.NEGATIVE_INFINITY;
    const supportPressureMultiplier = supplyGap >= 3
        ? 1.6
        : supplyGap >= 1
            ? 1.3
            : (snapshot?.atWar && supplyGap >= 0)
                ? 1.12
                : (snapshot && snapshot.usedSupply >= snapshot.freeSupply - 1)
                    ? 1.06
                    : 1.0;
    const riverOrCoastBias = civName === "RiverLeague" && (isTileAdjacentToRiver(state.map, city.coord) || isCoastalCity(state, city)) ? 1.5 : 1.0;

    let best: { building: BuildingType; score: number; payback: number; netGain: number; supplyRelief: number } | null = null;
    for (const building of GOLD_BUILDINGS) {
        if (city.buildings.includes(building)) continue;
        if (!canBuild(city, "Building", building, state)) continue;
        if (building === BuildingType.Bank && !cityHasOwnedOreVein(state, city)) continue;

        const payback = estimateGoldBuildingPaybackTurns(state, city, building, snapshot);
        const netGain = estimateGoldBuildingNetGain(state, city, building, snapshot);
        if (netGain <= 0 || !Number.isFinite(payback)) continue;
        const supplyRelief = estimateSupplyReliefValue(building, snapshot);
        const tierMultiplier = getGoldBuildingTierMultiplier(building);

        const score = (((netGain * 10) - payback)
            * recoveryMultiplier
            * goldBuildBias
            * riverOrCoastBias
            * tierMultiplier
            * supportPressureMultiplier);
        if (!best || score > best.score) {
            best = { building, score, payback, netGain, supplyRelief };
        }
    }

    if (!best) return null;

    aiInfo(
        `[AI Build] ${civName} ECONOMY: ${best.building} (net +${best.netGain.toFixed(1)} G, supply +${best.supplyRelief.toFixed(1)} G, payback ${best.payback.toFixed(1)}t)`
    );
    return { type: "Building", id: best.building };
}
