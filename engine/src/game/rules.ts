import {
    BuildingType,
    City,
    DiplomacyState,
    GameState,
    TerrainType,
    Tile,
    Yields,
    TechId,
    UnitType,
    UnitDomain,
    ProjectId,
} from "../core/types.js";
import {
    BASECOST_POP2,
    BUILDINGS,
    CITY_CENTER_MIN_FOOD,
    CITY_CENTER_MIN_PROD,
    FARMSTEAD_GROWTH_MULT,
    JADE_GRANARY_GROWTH_MULT,
    JADE_COVENANT_GROWTH_MULT,
    GROWTH_FACTORS,
    OVERLAY,
    TERRAIN,
    PROJECTS,
    UNITS,
    CITY_WORK_RADIUS_RINGS,
} from "../core/constants.js";
import { hexEquals, hexDistance, hexToString } from "../core/hex.js";
import { isTileAdjacentToRiver, riverAdjacencyCount } from "../map/rivers.js";
import { LookupCache } from "./helpers/lookup-cache.js";

/**
 * Determines the minimum distance required between cities for a given player.
 * @param state - The current game state.
 * @param playerId - The ID of the player founding a city.
 * @returns The minimum hex distance (usually 3, but 2 for JadeCovenant).
 */
export function getMinimumCityDistance(state: GameState, playerId: string): number {
    const player = state.players.find(p => p.id === playerId);
    return player?.civName === "JadeCovenant" ? 2 : 3;
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
    const total: Yields = { F: 0, P: 0, S: 0 };
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
    }

    // 2. Buildings
    const isRiverCity = isTileAdjacentToRiver(state.map, cityCoord);

    let worksForest = false;
    for (const coord of workedTiles) {
        const tKey = hexToString(coord);
        const t = cache ? cache.tileByKey.get(tKey) : state.map.tiles.find(tile => hexEquals(tile.coord, coord));
        if (t && t.terrain === TerrainType.Forest) worksForest = true;
    }

    for (const b of city.buildings) {
        const data = BUILDINGS[b];
        if (data.yieldFlat) {
            if (data.yieldFlat.F) total.F += data.yieldFlat.F;
            if (data.yieldFlat.P) total.P += data.yieldFlat.P;
            if (data.yieldFlat.S) total.S += data.yieldFlat.S;
        }

        // Conditionals
        if (b === BuildingType.Reservoir && isRiverCity) total.F += 1;
        if (b === BuildingType.LumberMill && worksForest) total.P += 1;
    }

    // 3. Base Science (1 per city)
    total.S += 1;

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
        // v1.9: "Citadel Protocol"
        // 1. +3 Science in Capital (Buffed v2.9)
        if (city.isCapital) {
            total.S += 1; // v2.9: Nerfed to +1 (was +3)
        }
        // 2. +3 Science per CityWard building (Buffed v2.9)
        const cityWardCount = state.cities.filter(c =>
            c.ownerId === city.ownerId && c.buildings.includes(BuildingType.CityWard)
        ).length;
        total.S += cityWardCount * 1; // v2.9: Nerfed to +1 (was +3)
    } else if (trait === "RiverLeague") {
        // v2.3: BUFF - +1 Prod per 1 river tile (was per 2) - doubled efficiency
        total.F += riverAdjacencyCount(state.map, workedTiles);
        total.P += Math.ceil(riverAdjacencyCount(state.map, workedTiles) / 2);
    } else if (trait === "StarborneSeekers") {
        // v1.9: "Peaceful Meditation" - +2 Science when not at war (Buffed from +1)
        // Fits their defensive identity - they avoid wars to pursue Progress
        const player = state.players.find(p => p.id === city.ownerId);
        const atWar = state.players.some(other =>
            other.id !== city.ownerId &&
            !other.isEliminated &&
            state.diplomacy?.[city.ownerId]?.[other.id] === DiplomacyState.War
        );
        if (!atWar) {
            total.S += 1; // v2.8: Nerfed to +1 (was +3)
        }
    } else if (trait === "AetherianVanguard") {
        // v1.9 BUFF: +1 Production in Capital (helps rush Titan)
        if (city.isCapital) {
            total.P += 1;
        }
        // v0.99 BUFF: "Vanguard Logistics" - +1 Production if city has a garrisoned unit
        // This bridges their weak early game to the Titan
        const cityKey = hexToString(city.coord);
        const unitAtCity = cache ? cache.unitByCoordKey.get(cityKey) : state.units.find(u => hexEquals(u.coord, city.coord));

        // v0.99 BUFF: "Vanguard Logistics" - +1 Production if city has a garrisoned unit
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

function getCivTrait(state: GameState, playerId: string): "ForgeClans" | "ScholarKingdoms" | "RiverLeague" | "StarborneSeekers" | "AetherianVanguard" | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;
    if (player.civName === "ForgeClans") return "ForgeClans";
    if (player.civName === "ScholarKingdoms") return "ScholarKingdoms";
    if (player.civName === "RiverLeague") return "RiverLeague";
    if (player.civName === "StarborneSeekers") return "StarborneSeekers";
    if (player.civName === "AetherianVanguard") return "AetherianVanguard";
    return null;
}

// --- Growth ---

/**
 * Calculates the food cost required for a city to grow to the next population level.
 * @param pop - The current population of the city.
 * @param hasFarmstead - Whether the city has a Farmstead (10% discount).
 * @param hasJadeGranary - Whether the player has the Jade Granary project (15% discount).
 * @param civName - The name of the civilization (JadeCovenant gets 10% discount).
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
    // v0.97 balance: JadeCovenant passive "Verdant Growth" - 10% faster growth globally
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
export function canBuild(city: City, type: "Unit" | "Building" | "Project", id: string, state: GameState, cache?: LookupCache): boolean {
    const player = state.players.find(p => p.id === city.ownerId);
    if (!player) return false;

    if (type === "Building") {
        const bId = id as BuildingType;
        if (city.buildings.includes(bId)) return false; // Already built
        const data = BUILDINGS[bId];
        if (!data) return false;

        // Tech check
        if (!player.techs.includes(data.techReq)) return false;

        // Civ-specific unique wonders (consumed on completion, once per civ)
        if (bId === BuildingType.TitansCore && player.civName !== "AetherianVanguard") return false;
        if (bId === BuildingType.SpiritObservatory && player.civName !== "StarborneSeekers") return false;
        if (bId === BuildingType.JadeGranary && player.civName !== "JadeCovenant") return false;

        // Bulwark: Scholar/Starborne Only
        if (bId === BuildingType.Bulwark) {
            if (player.civName !== "ScholarKingdoms" && player.civName !== "StarborneSeekers") return false;
        }

        // Titans Core: once per civ (tracked via TitansCoreComplete marker)
        if (bId === BuildingType.TitansCore) {
            if (player.completedProjects.includes(ProjectId.TitansCoreComplete)) return false;
            const isBuilding = state.cities.some(c => c.ownerId === player.id && c.currentBuild?.id === bId);
            if (isBuilding) return false;
        }

        // Spirit Observatory: once per civ, replaces Observatory in Progress chain
        // Check if already completed (tracked via Observatory milestone)
        if (bId === BuildingType.SpiritObservatory) {
            if (player.completedProjects.includes(ProjectId.Observatory)) return false;
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

        // Unit requirements?
        // Some units need techs?
        // "Trail Maps -> River Boat"
        if (uId === UnitType.Skiff && !player.techs.includes(TechId.TrailMaps)) return false;



        // v5.6: Bulwark Building Protocol
        // A city with a Bulwark Building commits to a "Fortress" role and cannot produce offensive armies.
        // It can only build Civilian units (Settler) and Recon units (Scout).


        // Armies?
        // "After Army Doctrine, a city may build Form Army..."
        // Those are Projects, not Units directly.
        if (uId.startsWith("Army")) return false; // Cannot build Army units directly

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

        // v5.6: Bulwark Building Protocol
        // A city with a Bulwark Building commits to a "Fortress" role and cannot produce offensive armies.
        // It can only build Civilian units (Settler) and Recon units (Scout).


        return true;
    }

    if (type === "Project") {
        const pId = id as ProjectId;
        const data = PROJECTS[pId];
        if (!data) return false;

        // Tech req
        if (data.prereqTechs && !data.prereqTechs.every(t => player.techs.includes(t))) return false;

        // Milestone req
        if (data.prereqMilestone && !player.completedProjects.includes(data.prereqMilestone)) return false;

        // Building req
        if (data.prereqBuilding && !city.buildings.includes(data.prereqBuilding)) return false;

        // Once per civ
        if (data.oncePerCiv && player.completedProjects.includes(pId)) return false;

        // One city at a time
        if (data.oneCityAtATime) {
            // Check if any other city is building it
            const isBuilding = state.cities.some(c => c.ownerId === player.id && c.currentBuild?.id === pId);
            if (isBuilding) return false;
        }

        if (pId.startsWith("FormArmy")) {
            // v5.12: Bulwark cities cannot form armies (they focus on defense/basic units)
            if (city.buildings.includes(BuildingType.Bulwark)) return false;

            if (!player.techs.includes(TechId.DrilledRanks)) return false;

            const requiredUnitType = data.onComplete.payload.baseUnit as UnitType;
            const hasUnit = state.units.some(u =>
                u.ownerId === player.id &&
                u.type === requiredUnitType &&
                u.hp === u.maxHp &&
                state.map && hexDistance(u.coord, city.coord) <= CITY_WORK_RADIUS_RINGS
            );
            if (!hasUnit) return false;
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
        // Scale cost by turn number: Base * (1 + floor(Turn / 25))
        const multiplier = 1 + Math.floor(turn / 25);
        return data.cost * multiplier;
    }

    return data.cost;
}
