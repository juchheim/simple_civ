import {
    BuildingType,
    City,
    GameState,
    HexCoord,
    OverlayType,
    Player,
    TerrainType,
    Tile,
    Yields,
    TechId,
    UnitType,
    ProjectId,
} from "../core/types.js";
import {
    BASECOST_POP2,
    BUILDINGS,
    CITY_CENTER_MIN_FOOD,
    CITY_CENTER_MIN_PROD,
    FARMSTEAD_GROWTH_MULT,
    GROWTH_FACTORS,
    OVERLAY,
    TERRAIN,
    TECHS,
    PROJECTS,
    UNITS,
    CITY_WORK_RADIUS_RINGS,
} from "../core/constants.js";
import { getNeighbors, hexEquals, hexToString, hexDistance } from "../core/hex.js";

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

        // River Adjacency: +1 Food if adjacent to RiverEdge
        // Note: The rule says "Adjacent tiles get +1 Food when worked".
        // This means if the worked tile ITSELF is adjacent to a river edge?
        // Or if the worked tile HAS a river edge?
        // Rulebook 3.1.2: "River (edge) - Adjacent tiles get +1 Food when worked."
        // Usually in Civ this means if a tile is *next* to a river.
        // But here RiverEdge is an overlay ON a tile.
        // Let's assume if the tile ITSELF has RiverEdge, it's a river tile?
        // Or does it mean if a neighbor has RiverEdge?
        // "River (edge) ... Adjacent tiles get +1 Food" implies the river is between tiles.
        // But we model it as an overlay.
        // Let's interpret: If a tile has `RiverEdge` overlay, it IS a river tile.
        // Wait, "Adjacent tiles get +1 Food".
        // If I work tile A, and tile B (neighbor) has RiverEdge...
        // Actually, usually "River Edge" means the edge of the hex.
        // But we have `OverlayType.RiverEdge`.
        // Let's assume for v0.9 simplicity: If a tile has `RiverEdge` overlay, it provides +1 Food to ITSELF when worked?
        // Or maybe it means "If you work a tile that is adjacent to a RiverEdge".
        // Let's look at the dev spec:
        // "RiverEdge: {riverEdge:true} // adjacency effect handled in city yield calc"
        // "For each worked tile adjacent to a RiverEdge -> +1 Food"
        // So we check neighbors of the worked tile.

        const neighbors = getNeighbors(coord);
        let adjacentToRiver = false;
        for (const n of neighbors) {
            const nTile = state.map.tiles.find(t => hexEquals(t.coord, n));
            if (nTile && nTile.overlays.includes(OverlayType.RiverEdge)) {
                adjacentToRiver = true;
                break;
            }
        }
        // Also check if the tile itself has RiverEdge (maybe it represents a river flowing through?)
        // The spec says "River (edge)".
        // Let's stick to: check neighbors.
        if (adjacentToRiver) {
            tileY.F += 1;
        }

        total.F += tileY.F;
        total.P += tileY.P;
        total.S += tileY.S;
    }

    // 2. Buildings
    let isRiverCity = false;
    // Check if city center is adjacent to river
    const centerNeighbors = getNeighbors(city.coord);
    for (const n of centerNeighbors) {
        const nTile = state.map.tiles.find(t => hexEquals(t.coord, n));
        if (nTile && nTile.overlays.includes(OverlayType.RiverEdge)) {
            isRiverCity = true;
            break;
        }
    }

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
        const worksHills = city.workedTiles.some(c => {
            const t = state.map.tiles.find(tt => hexEquals(tt.coord, c));
            return t?.terrain === TerrainType.Hills;
        });
        if (worksHills) total.P += 1;
    } else if (trait === "ScholarKingdoms") {
        if (city.pop >= 3) total.S += 1;
    } else if (trait === "RiverLeague") {
        const riverBonus = city.workedTiles.reduce((sum, coord) => {
            const neighbors = getNeighbors(coord);
            const adjRiver = neighbors.some(n => {
                const t = state.map.tiles.find(tt => hexEquals(tt.coord, n));
                return t?.overlays.includes(OverlayType.RiverEdge);
            });
            return sum + (adjRiver ? 1 : 0);
        }, 0);
        total.F += riverBonus;
    }

    return total;
}

function getCivTrait(state: GameState, playerId: string): "ForgeClans" | "ScholarKingdoms" | "RiverLeague" | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;
    if (player.civName === "ForgeClans") return "ForgeClans";
    if (player.civName === "ScholarKingdoms") return "ScholarKingdoms";
    if (player.civName === "RiverLeague") return "RiverLeague";
    return null;
}

// --- Growth ---

export function getGrowthCost(pop: number, hasFarmstead: boolean): number {
    if (pop < 1) return 0; // Should not happen

    let cost = BASECOST_POP2; // Cost for 1 -> 2

    // Step through each current population level up to `pop`,
    // applying the growth factor to get the cost for the next pop.
    for (let current = 2; current <= pop; current++) {
        const f = GROWTH_FACTORS.find(g => current >= g.min && current <= g.max)?.f || 1.42;
        cost = Math.ceil(cost * f);
    }

    if (hasFarmstead) {
        return Math.ceil(cost * FARMSTEAD_GROWTH_MULT);
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
        // Need to check if player has the tech.
        // But wait, Hearth techs are available?
        // "Hearth Age (early) ... Each tech ... Unlocks ... A building"
        // So you need the tech.
        // Exception: Are there starting buildings? No.
        if (!player.techs.includes(data.techReq)) return false;

        // Era/Gate checks are implicit in tech tree, but building itself just needs tech.
        return true;
    }

    if (type === "Unit") {
        const uId = id as UnitType;
        const data = UNITS[uId];
        if (!data) return false;

        // Unit requirements?
        // Some units need techs?
        // "Trail Maps -> River Boat"
        // "Formation Training -> Passive"
        // "Fieldcraft -> Farmstead"
        // Basic units (Warrior/Settler) might be available from start?
        // Rulebook 3.2.2:
        // Scout, SpearGuard, BowGuard, Riders, RiverBoat.
        // Tech tree:
        // Trail Maps -> River Boat.
        // Others?
        // "Units are upgraded globally via techs".
        // "Hearth Age ... Unlocks ... A unit availability/upgrade rule".
        // It seems basic units (Scout, Spear, Bow, Riders) are available from start?
        // Wait, let's check Tech Tree 3.4.
        // Trail Maps -> River Boat.
        // Others unlock buildings or passives.
        // So Scout, Spear, Bow, Riders are default?
        // Rulebook 2.2.4: "Unlocks exactly one thing... Or a unit availability/upgrade rule."
        // If it's not unlocked by a tech, is it available?
        // "Each player starts with 1 Settler, 1 Scout".
        // Usually basic units are available.
        // Let's assume Scout, Spear, Bow, Riders are available by default unless restricted.
        // RiverBoat is restricted by TrailMaps.

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

        // Form Army checks
        if (pId.startsWith("FormArmy")) {
            if (!player.techs.includes(TechId.ArmyDoctrine)) return false;

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
