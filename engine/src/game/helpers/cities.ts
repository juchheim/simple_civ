import { City, GameState, HexCoord } from "../../core/types.js";
import { CAPTURED_CITY_HP_RESET, CITY_WORK_RADIUS_RINGS, TERRAIN, CITY_NAMES } from "../../core/constants.js";
import { TerrainType } from "../../core/types.js";
import { hexDistance, hexEquals, hexSpiral, hexToString } from "../../core/hex.js";
import { getTileYields } from "../rules.js";
import { isTileAdjacentToRiver } from "../../map/rivers.js";

export function maxClaimableRing(city: City): number {
    if (city.pop >= 3) return Math.min(2, CITY_WORK_RADIUS_RINGS);
    return 1;
}

export function getClaimedRing(city: City, state: GameState): number {
    const ownedTiles = state.map.tiles.filter(t => t.ownerCityId === city.id);
    if (ownedTiles.length === 0) return 0;
    return Math.min(
        CITY_WORK_RADIUS_RINGS,
        Math.max(...ownedTiles.map(t => hexDistance(t.coord, city.coord)))
    );
}

export function claimCityTerritory(city: City, state: GameState, ownerId: string, maxRing: number = CITY_WORK_RADIUS_RINGS) {
    const territory = hexSpiral(city.coord, Math.min(maxRing, CITY_WORK_RADIUS_RINGS));
    for (const coord of territory) {
        const tile = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (tile) {
            const ownedByOtherCity = tile.ownerCityId && tile.ownerCityId !== city.id;
            const ownedByOtherPlayer = tile.ownerId && tile.ownerId !== ownerId && tile.ownerCityId !== city.id;
            if (ownedByOtherCity || ownedByOtherPlayer) continue;
            tile.ownerId = ownerId;
            tile.ownerCityId = city.id;
            tile.hasCityCenter = hexEquals(coord, city.coord);
        }
    }
}

export function clearCityTerritory(city: City, state: GameState) {
    const territory = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS);
    for (const coord of territory) {
        const tile = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (tile) {
            tile.ownerId = undefined;
            tile.ownerCityId = undefined;
            if (tile.hasCityCenter) tile.hasCityCenter = false;
        }
    }
}

export function ensureWorkedTiles(city: City, state: GameState): HexCoord[] {
    const ownedCoords = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS)
        .filter(coord => {
            const t = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
            return t && t.ownerId === city.ownerId && TERRAIN[t.terrain].workable;
        });

    const allowed = new Set(ownedCoords.map(c => hexToString(c)));

    const currentValid = city.workedTiles
        .filter(c => allowed.has(hexToString(c)))
        .reduce<HexCoord[]>((acc, coord) => {
            const key = hexToString(coord);
            if (acc.some(c => hexToString(c) === key)) return acc;
            acc.push(coord);
            return acc;
        }, []);

    if (!currentValid.some(c => hexEquals(c, city.coord))) currentValid.unshift(city.coord);

    const worked = currentValid.slice(0, Math.max(1, city.pop));
    const needed = Math.max(1, city.pop) - worked.length;
    if (needed > 0) {
        const workedKeys = new Set(worked.map(c => hexToString(c)));
        const candidates = ownedCoords
            .filter(c => !workedKeys.has(hexToString(c)))
            .sort((a, b) => tileScore(b, state, city) - tileScore(a, state, city));
        for (let i = 0; i < needed && i < candidates.length; i++) {
            worked.push(candidates[i]);
        }
    }

    return worked;
}

export function tileScore(coord: HexCoord, state: GameState, city: City): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -999;
    const base = getTileYields(tile);
    const player = state.players.find(p => p.id === city.ownerId);
    const civ = player?.civName;

    let food = base.F;
    let production = base.P;
    const science = base.S;

    const adjRiver = isTileAdjacentToRiver(state.map, coord);
    if (civ === "RiverLeague" && adjRiver) {
        food += 1;
    }
    if (civ === "ForgeClans" && tile.terrain === TerrainType.Hills) {
        production += 1;
    }

    const total = food + production + science;

    // Prioritize overall yield; tie-breaker prefers Food, then Production, then Science.
    return total * 100 + food * 10 + production * 2 + science;
}

export function captureCity(state: GameState, city: City, newOwnerId: string) {
    city.ownerId = newOwnerId;
    city.hp = CAPTURED_CITY_HP_RESET;
    city.pop = Math.max(1, city.pop - 1);
    city.currentBuild = null;
    city.buildProgress = 0;
    const currentRing = getClaimedRing(city, state);
    const targetRing = Math.max(currentRing, maxClaimableRing(city));
    claimCityTerritory(city, state, newOwnerId, targetRing);
    city.workedTiles = ensureWorkedTiles(city, state);
    city.hasFiredThisTurn = false;
}

export function getCityName(state: GameState, civName: string, ownerId: string): string {
    const playerCities = state.cities.filter(c => c.ownerId === ownerId);
    const nameList = CITY_NAMES[civName] || [];

    // First city is always the Capital (first name in list)
    if (playerCities.length === 0) {
        return nameList[0] || "Capital";
    }

    // Filter out used names
    const usedNames = new Set(state.cities.map(c => c.name));
    const availableNames = nameList.slice(1).filter(name => !usedNames.has(name));

    if (availableNames.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableNames.length);
        return availableNames[randomIndex];
    }

    // Fallback if all names used
    return `New ${nameList[0] || "City"} ${playerCities.length + 1}`;
}
