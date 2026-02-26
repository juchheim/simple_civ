import {
    BuildingType,
    City,
    DiplomacyState,
    GameState,
    OverlayType,
    TerrainType,
    Tile,
    Yields,
    TechId,
    UnitType,
    UnitDomain,
    ProjectId,
} from "../core/types.js";
import {
    BASE_CITY_GOLD,
    BASE_CITY_SCIENCE,
    BASECOST_POP2,
    BUILDINGS,
    CITY_ADMIN_UPKEEP_PER_CITY,
    CITY_ADMIN_UPKEEP_WIDE_SURCHARGE,
    CITY_CENTER_MIN_GOLD,
    CITY_CENTER_MIN_FOOD,
    CITY_CENTER_MIN_PROD,
    ECONOMIC_BUILDING_SUPPLY_BONUS,
    FARMSTEAD_GROWTH_MULT,
    JADE_GRANARY_GROWTH_MULT,
    JADE_COVENANT_GROWTH_MULT,
    GROWTH_FACTORS,
    MILITARY_FREE_SUPPLY_BASE,
    MILITARY_FREE_SUPPLY_PER_CITY,
    MILITARY_UPKEEP_PER_EXCESS_SUPPLY,
    OVERLAY,
    TERRAIN,
    PROJECTS,
    SCHOLAR_KINGDOMS_FREE_SUPPLY_BONUS,
    UNITS,
} from "../core/constants.js";
import { hexEquals, hexDistance, hexToString } from "../core/hex.js";
import { isTileAdjacentToRiver, riverAdjacencyCount } from "../map/rivers.js";
import { LookupCache } from "./helpers/lookup-cache.js";
import { getCityStateYieldBonusesForPlayer } from "./city-states.js";

/**
 * Determines the minimum distance required between cities for a given player.
 * @param state - The current game state.
 * @param playerId - The ID of the player founding a city.
 * @returns The minimum hex distance between city centers.
 */
export function getMinimumCityDistance(state: GameState, playerId: string): number {
    void state;
    void playerId;
    return 3;
}

// --- Yields ---

/**
 * Calculates the base yields of a tile, including terrain and overlays.
 * @param tile - The tile to calculate yields for.
 * @returns The base yields (Food, Production, Science).
 */
export function getTileYields(tile: Tile): Yields {
    const base = { ...TERRAIN[tile.terrain].yields };

    // Apply overlays
    for (const ov of tile.overlays) {
        const bonus = OVERLAY[ov].yieldBonus;
        if (bonus) {
            if (bonus.F) base.F += bonus.F;
            if (bonus.P) base.P += bonus.P;
            if (bonus.S) base.S += bonus.S;
            if (bonus.G) base.G += bonus.G;
        }
    }
    return base;
}

/**
 * Calculates the yields for a city center tile.
 * Ensures minimum food and production values are met.
 * @param city - The city occupying the tile.
 * @param tile - The tile the city is on.
 * @returns The adjusted yields for the city center.
 */
export function getCityCenterYields(city: City, tile: Tile): Yields {
    const y = getTileYields(tile);

    // Minimums
    y.F = Math.max(y.F, CITY_CENTER_MIN_FOOD);
    y.P = Math.max(y.P, CITY_CENTER_MIN_PROD);
    y.G = Math.max(y.G, CITY_CENTER_MIN_GOLD);

    return y;
}

/**
 * Calculates the total yields per turn for a city.
 * Includes worked tiles, buildings, civ traits, and project bonuses.
 * @param city - The city to calculate yields for.
 * @param state - The current game state.
 * @returns The total yields (Food, Production, Science).
 */
export function getCityYields(city: City, state: GameState, cache?: LookupCache): Yields {
    const total: Yields = { F: 0, P: 0, S: 0, G: 0 };
    const cityCoord = city.coord ?? { q: 0, r: 0 };
    const workedTiles = Array.isArray(city.workedTiles) ? city.workedTiles : [];

    // 1. Worked Tiles
    for (const coord of workedTiles) {
        const coordKey = hexToString(coord);
        const tile = cache ? cache.tileByKey.get(coordKey) : state.map.tiles.find(t => hexEquals(t.coord, coord));
        if (!tile) continue;

        let tileY: Yields;
        if (hexEquals(coord, cityCoord)) {
            tileY = getCityCenterYields(city, tile);
        } else {
            tileY = getTileYields(tile);
        }

        if (isTileAdjacentToRiver(state.map, coord)) {
            tileY.F += 1;
        }

        total.F += tileY.F;
        total.P += tileY.P;
        total.S += tileY.S;
        total.G += tileY.G;
    }

    // 2. Buildings
    const isRiverCity = isTileAdjacentToRiver(state.map, cityCoord);
    const isCoastalCity = state.map.tiles.some(tile => {
        if (hexDistance(tile.coord, cityCoord) !== 1) return false;
        return tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea;
    });

    let worksForest = false;
    let worksOreVein = false;
    for (const coord of workedTiles) {
        const tKey = hexToString(coord);
        const t = cache ? cache.tileByKey.get(tKey) : state.map.tiles.find(tile => hexEquals(tile.coord, coord));
        if (t && t.terrain === TerrainType.Forest) worksForest = true;
        if (t && t.overlays.includes(OverlayType.OreVein)) worksOreVein = true;
    }

    for (const b of city.buildings) {
        const data = BUILDINGS[b];
        if (data.yieldFlat) {
            if (data.yieldFlat.F) total.F += data.yieldFlat.F;
            if (data.yieldFlat.P) total.P += data.yieldFlat.P;
            if (data.yieldFlat.S) total.S += data.yieldFlat.S;
            if (data.yieldFlat.G) total.G += data.yieldFlat.G;
        }

        // Conditionals
        if (b === BuildingType.Reservoir && isRiverCity) total.F += 1;
        if (b === BuildingType.LumberMill && worksForest) total.P += 1;
        if (b === BuildingType.TradingPost && (isRiverCity || isCoastalCity)) total.G += 1;
        if (b === BuildingType.MarketHall && city.pop >= 5) total.G += 1;
        if (b === BuildingType.Bank && worksOreVein) total.G += 1;
    }

    // 3. Base yields per city
    total.S += BASE_CITY_SCIENCE;
    total.G += BASE_CITY_GOLD;

    // Project bonuses (Observatory grants +1 Science in that city)
    if (city.milestones?.includes(ProjectId.Observatory)) {
        total.S += 1;
    }

    // Civ traits
    const trait = getCivTrait(state, city.ownerId);
    if (trait === "ForgeClans") {
        // ForgeClans: +1 Production per worked Hill tile (Capital Only)
        if (city.isCapital) {
            for (const c of workedTiles) {
                const cKey = hexToString(c);
                const t = cache ? cache.tileByKey.get(cKey) : state.map.tiles.find(tt => hexEquals(tt.coord, c));
                if (t?.terrain === TerrainType.Hills) total.P += 1;
            }
        }
        // v2.3: "Industrial Network" - +1 Production for industrial buildings
        // v2.6: "Industrial Research" - +1 Science for industrial buildings (to fix tech lag)
        if (city.buildings.includes(BuildingType.StoneWorkshop)) { total.P += 1; total.S += 1; }
        if (city.buildings.includes(BuildingType.LumberMill)) total.P += 1;
        if (city.buildings.includes(BuildingType.Forgeworks)) { total.P += 1; total.S += 1; }
    } else if (trait === "ScholarKingdoms") {
        // ScholarKingdoms "Citadel Protocol"
        // v1.1.0: Removed +1 Science in Capital bonus for balance
        // +1 Science if this city has a CityWard (Citadel Protocol)
        if (city.buildings.includes(BuildingType.CityWard)) {
            total.S += 1;
        }
    } else if (trait === "RiverLeague") {
        // v2.3: River bonuses - multiple river tiles boost yields
        const riverCount = riverAdjacencyCount(state.map, workedTiles);
        total.F += riverCount; // +1 Food per river tile
        total.P += Math.floor(riverCount / 2); // v1.6: Buffed from /3 to /2 - +1 Prod per 2 river tiles
        // v1.6: Removed Science bonus - made them Progress-only
    } else if (trait === "StarborneSeekers") {
        // StarborneSeekers "Peaceful Meditation" - +1 Science in Capital when not at war
        const atWar = state.players.some(other =>
            other.id !== city.ownerId &&
            !other.isEliminated &&
            state.diplomacy?.[city.ownerId]?.[other.id] === DiplomacyState.War
        );
        if (!atWar && city.isCapital) {
            total.S += 1;
        }
    } else if (trait === "AetherianVanguard") {
        // AetherianVanguard "Vanguard Logistics" - +1 Production if city has a garrisoned unit
        const cityKey = hexToString(city.coord);
        const unitAtCity = cache ? cache.unitByCoordKey.get(cityKey) : state.units.find(u => hexEquals(u.coord, city.coord));

        const hasGarrison = unitAtCity
            ? (unitAtCity.ownerId === city.ownerId && unitAtCity.type !== UnitType.Settler)
            : state.units.some(u =>
                u.ownerId === city.ownerId &&
                hexEquals(u.coord, city.coord) &&
                u.type !== UnitType.Settler
            );
        if (hasGarrison) {
            total.P += 1;
        }
    } else if (trait === "JadeCovenant") {
        // v7.9: "Bountiful Harvest" - REMOVED (was +1 Food/city)
        // v8.0: Removed to balance extreme win rates.
    }

    // Jade Granary effect: +1 Food per city
    const player = state.players.find(p => p.id === city.ownerId);
    if (player?.completedProjects.includes(ProjectId.JadeGranaryComplete)) {
        total.F += 1;
    }



    // v1.0: ScholarKingdoms "Fortified Knowledge" - Science Bonus
    // (Logic moved or implemented elsewhere, or this is a placeholder for future expansion)
    return total;
}

export type PlayerSupplyUsage = {
    usedSupply: number;
    freeSupply: number;
    militaryUpkeep: number;
};

export type GoldLedger = {
    grossGold: number;
    buildingUpkeep: number;
    militaryUpkeep: number;
    usedSupply: number;
    freeSupply: number;
    netGold: number;
};

export function getBuildingMaintenance(building: BuildingType): number {
    return BUILDINGS[building]?.maintenance ?? 0;
}

export function getCityBuildingUpkeep(city: City): number {
    return city.buildings.reduce((sum, building) => sum + getBuildingMaintenance(building), 0);
}

export function getPlayerBuildingUpkeep(state: GameState, playerId: string): number {
    const ownedCities = state.cities.filter(city => city.ownerId === playerId);
    const buildingUpkeep = ownedCities.reduce((sum, city) => sum + getCityBuildingUpkeep(city), 0);
    const cityCount = ownedCities.length;
    const administrationUpkeep = Math.max(0, cityCount - 1) * CITY_ADMIN_UPKEEP_PER_CITY
        + Math.max(0, cityCount - 4) * CITY_ADMIN_UPKEEP_WIDE_SURCHARGE;
    return buildingUpkeep + administrationUpkeep;
}

export function getPlayerSupplyUsage(state: GameState, playerId: string): PlayerSupplyUsage {
    const usedSupply = state.units.filter(unit =>
        unit.ownerId === playerId &&
        !unit.isCityStateLevy &&
        unit.type !== UnitType.Settler &&
        UNITS[unit.type].domain !== UnitDomain.Civilian
    ).length;
    const ownedCities = state.cities.filter(city => city.ownerId === playerId);
    const cityCount = ownedCities.length;
    const economySupplyBonus = ownedCities.reduce((sum, city) => {
        const cityBonus = city.buildings.reduce((citySum, building) => {
            return citySum + (ECONOMIC_BUILDING_SUPPLY_BONUS[building] ?? 0);
        }, 0);
        return sum + cityBonus;
    }, 0);
    const civSupplyBonus = getCivTrait(state, playerId) === "ScholarKingdoms"
        ? SCHOLAR_KINGDOMS_FREE_SUPPLY_BONUS
        : 0;
    const freeSupply = MILITARY_FREE_SUPPLY_BASE
        + (cityCount * MILITARY_FREE_SUPPLY_PER_CITY)
        + economySupplyBonus
        + civSupplyBonus;
    const excessSupply = Math.max(0, usedSupply - freeSupply);
    const militaryUpkeep = excessSupply * MILITARY_UPKEEP_PER_EXCESS_SUPPLY;
    return { usedSupply, freeSupply, militaryUpkeep };
}

export function getPlayerGoldLedger(state: GameState, playerId: string, cache?: LookupCache): GoldLedger {
    const cities = state.cities.filter(city => city.ownerId === playerId);
    const cityGold = cities.reduce((sum, city) => sum + getCityYields(city, state, cache).G, 0);
    const cityStateGold = Math.floor(getCityStateYieldBonusesForPlayer(state, playerId).Gold);
    const grossGold = cityGold + cityStateGold;
    const buildingUpkeep = getPlayerBuildingUpkeep(state, playerId);
    const supply = getPlayerSupplyUsage(state, playerId);
    const netGold = grossGold - buildingUpkeep - supply.militaryUpkeep;

    return {
        grossGold,
        buildingUpkeep,
        militaryUpkeep: supply.militaryUpkeep,
        usedSupply: supply.usedSupply,
        freeSupply: supply.freeSupply,
        netGold,
    };
}

export function getCityRushBuyDiscount(city: City): number {
    return city.buildings.reduce((maxDiscount, building) => {
        return Math.max(maxDiscount, BUILDINGS[building]?.rushBuyDiscountPct ?? 0);
    }, 0);
}

export function getRushBuyGoldCost(city: City, remainingProduction: number): number {
    const remaining = Math.max(0, Math.floor(remainingProduction));
    if (remaining <= 0) return 0;

    const discountPct = getCityRushBuyDiscount(city);
    if (discountPct <= 0) return remaining;

    const discountedCost = remaining * (1 - discountPct / 100);
    return Math.max(0, Math.ceil(discountedCost));
}

function getCivTrait(state: GameState, playerId: string): "ForgeClans" | "ScholarKingdoms" | "RiverLeague" | "StarborneSeekers" | "AetherianVanguard" | "JadeCovenant" | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;
    if (player.civName === "ForgeClans") return "ForgeClans";
    if (player.civName === "ScholarKingdoms") return "ScholarKingdoms";
    if (player.civName === "RiverLeague") return "RiverLeague";
    if (player.civName === "StarborneSeekers") return "StarborneSeekers";
    if (player.civName === "AetherianVanguard") return "AetherianVanguard";
    if (player.civName === "JadeCovenant") return "JadeCovenant";
    return null;
}

// --- Growth ---

/**
 * Calculates the food cost required for a city to grow to the next population level.
 * @param pop - The current population of the city.
 * @param hasFarmstead - Whether the city has a Farmstead (10% discount).
 * @param hasJadeGranary - Whether the player has the Jade Granary project (15% discount).
 * @param civName - The name of the civilization (used for civ-specific growth modifiers).
 * @returns The food cost for the next growth step.
 */
export function getGrowthCost(pop: number, hasFarmstead: boolean, hasJadeGranary: boolean = false, civName?: string): number {
    if (pop < 1) return 0; // Should not happen

    let cost = BASECOST_POP2; // Cost for 1 -> 2

    // Step through each current population level up to `pop`,
    // applying the growth factor to get the cost for the next pop.
    for (let current = 2; current <= pop; current++) {
        const f = GROWTH_FACTORS.find(g => current >= g.min && current <= g.max)?.f || 1.42;
        cost = Math.ceil(cost * f);
    }

    // Apply building/wonder modifiers (multiplicative)
    let mult = 1.0;
    if (hasFarmstead) mult *= FARMSTEAD_GROWTH_MULT;
    if (hasJadeGranary) mult *= JADE_GRANARY_GROWTH_MULT;
    // JadeCovenant passive global growth modifier (currently neutral at 1.0).
    if (civName === "JadeCovenant") mult *= JADE_COVENANT_GROWTH_MULT;

    if (mult < 1.0) {
        return Math.ceil(cost * mult);
    }

    return cost;
}

// --- Tech & Production Helpers ---

/**
 * Checks if a city can build a specific unit, building, or project.
 * Verifies tech requirements, resource costs, and unique constraints.
 * @param city - The city attempting to build.
 * @param type - The type of item ("Unit", "Building", "Project").
 * @param id - The ID of the item.
 * @param state - The current game state.
 * @param cache - Optional lookup cache for O(1) unit lookups.
 * @returns True if the item can be built.
 */
export function canBuild(city: City, type: "Unit" | "Building" | "Project", id: string, state: GameState, _cache?: LookupCache): boolean {
    const player = state.players.find(p => p.id === city.ownerId);
    if (!player) return false;

    if (type === "Building") {
        const bId = id as BuildingType;
        if (city.buildings.includes(bId)) return false; // Already built
        const data = BUILDINGS[bId];
        if (!data) return false;

        // Tech check
        if (!player.techs.includes(data.techReq)) return false;
        if (data.requiresBuilding && !city.buildings.includes(data.requiresBuilding)) return false;

        // Civ-specific unique wonders (consumed on completion, once per civ)
        if (bId === BuildingType.TitansCore && player.civName !== "AetherianVanguard") return false;

        if (bId === BuildingType.JadeGranary && player.civName !== "JadeCovenant") return false;

        // Bulwark: Scholar/Starborne Only, ONCE PER CIV (v8.14: converted to wonder)
        if (bId === BuildingType.Bulwark) {
            if (player.civName !== "ScholarKingdoms" && player.civName !== "StarborneSeekers") return false;
            if (player.completedProjects.includes(ProjectId.BulwarkComplete)) return false;
            const isBuilding = state.cities.some(c => c.ownerId === player.id && c.currentBuild?.id === bId);
            if (isBuilding) return false;
        }

        // Titans Core: once per civ (tracked via TitansCoreComplete marker)
        if (bId === BuildingType.TitansCore) {
            if (player.completedProjects.includes(ProjectId.TitansCoreComplete)) return false;
            const isBuilding = state.cities.some(c => c.ownerId === player.id && c.currentBuild?.id === bId);
            if (isBuilding) return false;
        }



        // Jade Granary: once per civ (tracked via JadeGranaryComplete marker)
        if (bId === BuildingType.JadeGranary) {
            if (player.completedProjects.includes(ProjectId.JadeGranaryComplete)) return false;
            const isBuilding = state.cities.some(c => c.ownerId === player.id && c.currentBuild?.id === bId);
            if (isBuilding) return false;
        }

        return true;
    }

    if (type === "Unit") {
        const uId = id as UnitType;
        const data = UNITS[uId];
        if (!data) return false;

        // Settlers require pop >= 2 (they consume a population when produced)
        if (uId === UnitType.Settler && city.pop < 2) return false;

        // Unit requirements?
        // Some units need techs?
        // "Trail Maps -> River Boat"
        if (uId === UnitType.Skiff && !player.techs.includes(TechId.TrailMaps)) return false;



        // v5.6: Bulwark Building Protocol
        // A city with a Bulwark Building commits to a "Fortress" role and cannot produce offensive armies.
        // It can only build Civilian units (Settler) and Recon units (Scout).


        // Army units require DrilledRanks tech and cannot be built in Bulwark cities
        if (uId.startsWith("Army")) {
            if (!player.techs.includes(TechId.DrilledRanks)) return false;
            if (city.buildings.includes(BuildingType.Bulwark)) return false;
        }

        // v7.0: Lorekeeper - Defensive unit exclusive to Scholar/Starborne civs
        if (uId === UnitType.Lorekeeper) {
            if (!player.techs.includes(TechId.CityWards)) return false;
            if (player.civName !== "ScholarKingdoms" && player.civName !== "StarborneSeekers") return false;
        }

        // v1.0.3: Trebuchet - Siege unit, requires Formation Training (matches TECHS definition)
        if (uId === UnitType.Trebuchet) {
            if (!player.techs.includes(TechId.FormationTraining)) return false;
        }

        // v6.0: Aether Era units require their respective techs
        if (uId === UnitType.Landship && !player.techs.includes(TechId.CompositeArmor)) return false;
        if (uId === UnitType.Airship && !player.techs.includes(TechId.Aerodynamics)) return false;

        // Naval units require city to be adjacent to water (Coast or DeepSea)
        if (data.domain === UnitDomain.Naval) {
            const neighbors = state.map.tiles.filter(t => hexDistance(t.coord, city.coord) === 1);

            // Skiff is restricted to Coast only (no DeepSea)
            if (uId === UnitType.Skiff) {
                const hasCoastAccess = neighbors.some(t => t.terrain === TerrainType.Coast);
                if (!hasCoastAccess) return false;
            } else {
                const hasWaterAccess = neighbors.some(t =>
                    t.terrain === TerrainType.Coast ||
                    t.terrain === TerrainType.DeepSea
                );
                if (!hasWaterAccess) return false;
            }
        }

        return true;
    }

    if (type === "Project") {
        const pId = id as ProjectId;
        const data = PROJECTS[pId];
        if (!data) return false;

        // Tech req
        if (data.prereqTechs && !data.prereqTechs.every(t => player.techs.includes(t))) {
            return false;
        }

        // Milestone req
        if (data.prereqMilestone && !player.completedProjects.includes(data.prereqMilestone)) {
            return false;
        }

        // Building req
        if (data.prereqBuilding && !city.buildings.includes(data.prereqBuilding)) {
            return false;
        }

        // Once per civ
        if (data.oncePerCiv && player.completedProjects.includes(pId)) {
            return false;
        }

        // One city at a time
        if (data.oneCityAtATime) {
            // Check if any other city is building it
            const isBuilding = state.cities.some(c => c.ownerId === player.id && c.currentBuild?.id === pId);
            if (isBuilding) {
                return false;
            }
        }

        return true;
    }

    return false;
}

/**
 * Calculates the production cost of a project, potentially scaling with the game turn.
 * @param projectId - The ID of the project.
 * @param turn - The current game turn.
 * @returns The production cost.
 */
export function getProjectCost(projectId: ProjectId, turn: number): number {
    const data = PROJECTS[projectId];
    if (!data) return 9999;

    if (data.scalesWithTurn) {
        // Scale cost by turn number: Base * (1 + floor(Turn / 40)), capped at 5x
        // v1.0.2: Reduced scaling from /25 to /40 for less dramatic late-game inflation
        // v1.0.2: Capped at 5x to prevent runaway costs in long games (avg victory ~turn 192)
        const multiplier = Math.min(5, 1 + Math.floor(turn / 40));
        return data.cost * multiplier;
    }

    return data.cost;
}
