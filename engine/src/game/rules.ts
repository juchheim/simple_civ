import {
    BuildingType,
    City,
    GameState,
    OverlayType,
    TerrainType,
    Tile,
    Yields,
    TechId,
    UnitType,
    ProjectId,
} from "../core/types.js";
import { getUnitCost } from "./units.js";
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
import { hexEquals, hexDistance } from "../core/hex.js";
import { isTileAdjacentToRiver, riverAdjacencyCount } from "../map/rivers.js";

export function getMinimumCityDistance(state: GameState, playerId: string): number {
    const player = state.players.find(p => p.id === playerId);
    return player?.civName === "JadeCovenant" ? 2 : 3;
}

// --- Yields ---

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

export function getCityCenterYields(city: City, tile: Tile): Yields {
    const y = getTileYields(tile);

    // Minimums
    y.F = Math.max(y.F, CITY_CENTER_MIN_FOOD);
    y.P = Math.max(y.P, CITY_CENTER_MIN_PROD);

    return y;
}

export function getCityYields(city: City, state: GameState): Yields {
    const total: Yields = { F: 0, P: 0, S: 0 };

    // 1. Worked Tiles
    for (const coord of city.workedTiles) {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
        if (!tile) continue;

        let tileY: Yields;
        if (hexEquals(coord, city.coord)) {
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
    const isRiverCity = isTileAdjacentToRiver(state.map, city.coord);

    let worksForest = false;
    for (const coord of city.workedTiles) {
        const t = state.map.tiles.find(tile => hexEquals(tile.coord, coord));
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
            for (const c of city.workedTiles) {
                const t = state.map.tiles.find(tt => hexEquals(tt.coord, c));
                if (t?.terrain === TerrainType.Hills) total.P += 1;
            }
        }
    } else if (trait === "ScholarKingdoms") {
        // v0.98 Update 8: BUFFED - Restored +1 Science in Capital (was completely removed)
        // ScholarKingdoms was weakest civ with lowest tech completion (47.6%)
        // They need a head start to actually benefit from their science identity
        if (city.isCapital) {
            total.S += 1; // "Great Library" - Capital generates extra science
            total.P += 1; // v0.99 BUFF: Capital generates extra production to help early game
        }
        // Also keep the +1 per Scriptorium/Academy for scaling
        const scholarBuildings = city.buildings.filter(b =>
            b === BuildingType.Scriptorium || b === BuildingType.Academy
        ).length;
        total.S += scholarBuildings;
    } else if (trait === "RiverLeague") {
        // v0.98 BUFF: Added +1 Science in river cities (in addition to Food and Production)
        // River cities now give triple bonus: +1F, +1P, +1S
        const isRiverCity = isTileAdjacentToRiver(state.map, city.coord);
        total.F += riverAdjacencyCount(state.map, city.workedTiles);
        if (isRiverCity) {
            total.P += 1;  // River Commerce bonus
            total.S += 1;  // v0.98: River Knowledge bonus
        }
        // v0.99 BUFF: +1 Production per 2 river tiles (nerf from 1 per 1)
        total.P += Math.floor(riverAdjacencyCount(state.map, city.workedTiles) / 2);
    } else if (trait === "StarborneSeekers") {
        // v0.98 Update 6: NERFED - Removed Capital science bonus (was too strong for Progress rush)
        // "Stargazers" now only gives +1 Science per Sacred Site worked
        // Bonus science from Sacred Sites (they're spiritually attuned)
        for (const coord of city.workedTiles) {
            const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
            if (tile?.overlays.includes(OverlayType.SacredSite)) {
                total.S += 1;  // Extra +1 on top of the base Sacred Site bonus
            }
        }
    } else if (trait === "AetherianVanguard") {
        // v0.99 BUFF: "Vanguard Logistics" - +1 Production if city has a garrisoned unit
        // This bridges their weak early game to the Titan
        const hasGarrison = state.units.some(u =>
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

export function canBuild(city: City, type: "Unit" | "Building" | "Project", id: string, state: GameState): boolean {
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
        if (uId === UnitType.RiverBoat && !player.techs.includes(TechId.TrailMaps)) return false;

        // Armies?
        // "After Army Doctrine, a city may build Form Army..."
        // Those are Projects, not Units directly.
        if (uId.startsWith("Army")) return false; // Cannot build Army units directly

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

        // Once per civ
        if (data.oncePerCiv && player.completedProjects.includes(pId)) return false;

        // One city at a time
        if (data.oneCityAtATime) {
            // Check if any other city is building it
            const isBuilding = state.cities.some(c => c.ownerId === player.id && c.currentBuild?.id === pId);
            if (isBuilding) return false;
        }

        if (pId.startsWith("FormArmy")) {
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
