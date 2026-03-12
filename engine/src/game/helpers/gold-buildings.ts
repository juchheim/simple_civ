import { BUILDINGS } from "../../core/constants.js";
import { BuildingType, City, GameState, OverlayType } from "../../core/types.js";
import { hexEquals, hexToString } from "../../core/hex.js";
import { LookupCache } from "./lookup-cache.js";

export const GOLD_BUILDING_CHAIN: BuildingType[] = [
    BuildingType.TradingPost,
    BuildingType.MarketHall,
    BuildingType.Bank,
    BuildingType.Exchange,
];

const POPULATION_GOLD_SCALING = 3;
const GOLD_BUILDING_SLOT_MULTIPLIERS = [1, 0.45, 0.2, 0.1];

type GoldBuildingProjection = {
    cityId: string;
    building: BuildingType;
};

export function isGoldBuilding(building: BuildingType): boolean {
    return GOLD_BUILDING_CHAIN.includes(building);
}

export function getGoldBuildingTier(building: BuildingType): number {
    return GOLD_BUILDING_CHAIN.indexOf(building);
}

export function getPopulationScaledGoldBonus(city: City): number {
    return Math.floor(city.pop / POPULATION_GOLD_SCALING);
}

function getOrderedGoldBuildings(
    city: City,
    projection?: GoldBuildingProjection,
    includeCurrentBuild: boolean = false
): BuildingType[] {
    const buildings = city.buildings.filter(building => isGoldBuilding(building));
    if (includeCurrentBuild && city.currentBuild?.type === "Building") {
        const currentBuild = city.currentBuild.id as BuildingType;
        if (isGoldBuilding(currentBuild) && !buildings.includes(currentBuild)) {
            buildings.push(currentBuild);
        }
    }
    if (projection?.cityId === city.id && !buildings.includes(projection.building)) {
        buildings.push(projection.building);
    }
    return buildings.sort((left, right) => getGoldBuildingTier(left) - getGoldBuildingTier(right));
}

export function getGoldBuildingCount(city: City, includeCurrentBuild: boolean = false): number {
    const builtCount = city.buildings.filter(building => isGoldBuilding(building)).length;
    if (!includeCurrentBuild || city.currentBuild?.type !== "Building") {
        return builtCount;
    }
    return isGoldBuilding(city.currentBuild.id as BuildingType)
        ? builtCount + 1
        : builtCount;
}

export function hasPopulationScaledGoldBuilding(city: City): boolean {
    return getOrderedGoldBuildings(city, undefined, true).some(building =>
        building === BuildingType.TradingPost || building === BuildingType.MarketHall
    );
}

export function wantsPopulationGoldGrowthPush(city: City): boolean {
    return hasPopulationScaledGoldBuilding(city) && city.pop % POPULATION_GOLD_SCALING !== 0;
}

export function cityWorksOreVein(state: GameState, city: City, cache?: LookupCache): boolean {
    return city.workedTiles.some(coord => {
        const tileKey = hexToString(coord);
        const tile = cache
            ? cache.tileByKey.get(tileKey)
            : state.map.tiles.find(candidate => hexEquals(candidate.coord, coord));
        return !!tile?.overlays.includes(OverlayType.OreVein);
    });
}

export function getGoldBuildingConditionalBonus(
    state: GameState,
    city: City,
    building: BuildingType,
    cache?: LookupCache
): number {
    if (building === BuildingType.Bank) {
        return cityWorksOreVein(state, city, cache) ? 1 : 0;
    }
    return 0;
}

function getGoldBuildingRawYield(
    building: BuildingType
): number {
    return BUILDINGS[building]?.yieldFlat?.G ?? 0;
}

function getGoldBuildingSlotMultiplier(slotIndex: number): number {
    return GOLD_BUILDING_SLOT_MULTIPLIERS[slotIndex]
        ?? GOLD_BUILDING_SLOT_MULTIPLIERS[GOLD_BUILDING_SLOT_MULTIPLIERS.length - 1];
}

function getCommercialPopulationBonus(orderedBuildings: BuildingType[], city: City): number {
    const hasCommercialAnchor = orderedBuildings.some(building =>
        building === BuildingType.TradingPost || building === BuildingType.MarketHall
    );
    return hasCommercialAnchor ? getPopulationScaledGoldBonus(city) : 0;
}

export function getCompletedGoldTier(city: City): number {
    const buildings = getOrderedGoldBuildings(city);
    if (buildings.length === 0) {
        return -1;
    }
    return getGoldBuildingTier(buildings[buildings.length - 1]);
}

export function getEffectiveGoldTier(city: City): number {
    const buildings = getOrderedGoldBuildings(city, undefined, true);
    if (buildings.length === 0) {
        return -1;
    }
    return getGoldBuildingTier(buildings[buildings.length - 1]);
}

export function getCityGoldBuildingYield(
    state: GameState,
    city: City,
    cache?: LookupCache,
    projection?: GoldBuildingProjection
): number {
    const ordered = getOrderedGoldBuildings(city, projection);
    const commercialPopulationBonus = getCommercialPopulationBonus(ordered, city);

    return ordered.reduce((sum, building, slotIndex) => {
        const baseGold = getGoldBuildingRawYield(building);
        const scaledBaseGold = baseGold > 0
            ? Math.max(1, Math.round(baseGold * getGoldBuildingSlotMultiplier(slotIndex)))
            : 0;
        const conditionalBonus = getGoldBuildingConditionalBonus(state, city, building, cache);
        const populationBonus = slotIndex === 0 ? commercialPopulationBonus : 0;
        const totalYield = scaledBaseGold + conditionalBonus + populationBonus;
        if (totalYield <= 0) {
            return sum;
        }
        return sum + totalYield;
    }, 0);
}

export function getProjectedGoldBuildingYieldGain(
    state: GameState,
    city: City,
    building: BuildingType,
    cache?: LookupCache
): number {
    if (!isGoldBuilding(building) || city.buildings.includes(building)) {
        return 0;
    }

    const projection = { cityId: city.id, building };
    const currentYield = getCityGoldBuildingYield(state, city, cache);
    const projectedYield = getCityGoldBuildingYield(state, city, cache, projection);
    return projectedYield - currentYield;
}

export function getCityGoldTier(city: City): number {
    return getEffectiveGoldTier(city);
}
