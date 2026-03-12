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
const GOLD_BUILDING_SLOT_MULTIPLIERS = [1, 0.4, 0.25, 0.1];
const GOLD_NETWORK_BONUSES: Array<{ provider: BuildingType; recipientTier: number; gold: number }> = [
    { provider: BuildingType.MarketHall, recipientTier: 0, gold: 1 },
    { provider: BuildingType.Bank, recipientTier: 1, gold: 1 },
    { provider: BuildingType.Exchange, recipientTier: 2, gold: 1 },
];

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

function getCityGoldBuildings(city: City, projection?: GoldBuildingProjection): BuildingType[] {
    const buildings = city.buildings.filter(building => isGoldBuilding(building));
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
    if (city.buildings.includes(BuildingType.TradingPost) || city.buildings.includes(BuildingType.MarketHall)) {
        return true;
    }
    return city.currentBuild?.type === "Building" && (
        city.currentBuild.id === BuildingType.TradingPost ||
        city.currentBuild.id === BuildingType.MarketHall
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
    if (building === BuildingType.TradingPost || building === BuildingType.MarketHall) {
        return getPopulationScaledGoldBonus(city);
    }
    if (building === BuildingType.Bank) {
        return cityWorksOreVein(state, city, cache) ? 1 : 0;
    }
    return 0;
}

function getGoldBuildingRawYield(
    state: GameState,
    city: City,
    building: BuildingType,
    cache?: LookupCache
): number {
    const baseGold = BUILDINGS[building]?.yieldFlat?.G ?? 0;
    return baseGold + getGoldBuildingConditionalBonus(state, city, building, cache);
}

function getGoldBuildingSlotMultiplier(slotIndex: number): number {
    return GOLD_BUILDING_SLOT_MULTIPLIERS[slotIndex]
        ?? GOLD_BUILDING_SLOT_MULTIPLIERS[GOLD_BUILDING_SLOT_MULTIPLIERS.length - 1];
}

function getCompletedCityGoldTier(city: City, projection?: GoldBuildingProjection): number {
    const buildings = getCityGoldBuildings(city, projection);
    if (buildings.length === 0) {
        return -1;
    }
    return getGoldBuildingTier(buildings[buildings.length - 1]);
}

function getCityGoldNetworkBonus(
    state: GameState,
    city: City,
    projection?: GoldBuildingProjection
): number {
    const recipientTier = getCompletedCityGoldTier(city, projection);
    if (recipientTier < 0) {
        return 0;
    }

    return state.cities.reduce((sum, otherCity) => {
        if (otherCity.ownerId !== city.ownerId || otherCity.id === city.id) {
            return sum;
        }

        return sum + GOLD_NETWORK_BONUSES.reduce((networkSum, bonus) => {
            if (recipientTier < bonus.recipientTier) {
                return networkSum;
            }
            const providesBonus = getCityGoldBuildings(otherCity, projection).includes(bonus.provider);
            return providesBonus ? networkSum + bonus.gold : networkSum;
        }, 0);
    }, 0);
}

export function getCityGoldBuildingYield(
    state: GameState,
    city: City,
    cache?: LookupCache,
    projection?: GoldBuildingProjection
): number {
    const ordered = getCityGoldBuildings(city, projection);
    const directYield = ordered.reduce((sum, building, slotIndex) => {
        const rawYield = getGoldBuildingRawYield(state, city, building, cache);
        if (rawYield <= 0) {
            return sum;
        }
        const scaledYield = Math.round(rawYield * getGoldBuildingSlotMultiplier(slotIndex));
        return sum + Math.max(1, scaledYield);
    }, 0);
    return directYield + getCityGoldNetworkBonus(state, city, projection);
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

    const ownedCities = state.cities.filter(candidate => candidate.ownerId === city.ownerId);
    const currentYield = ownedCities.reduce((sum, ownedCity) => {
        return sum + getCityGoldBuildingYield(state, ownedCity, cache);
    }, 0);
    const projection = { cityId: city.id, building };
    const projectedYield = ownedCities.reduce((sum, ownedCity) => {
        return sum + getCityGoldBuildingYield(state, ownedCity, cache, projection);
    }, 0);
    return projectedYield - currentYield;
}

export function getCityGoldTier(city: City): number {
    let tier = -1;
    for (const building of city.buildings) {
        const buildingTier = getGoldBuildingTier(building);
        if (buildingTier > tier) {
            tier = buildingTier;
        }
    }
    if (city.currentBuild?.type === "Building") {
        const buildTier = getGoldBuildingTier(city.currentBuild.id as BuildingType);
        if (buildTier > tier) {
            tier = buildTier;
        }
    }
    return tier;
}
