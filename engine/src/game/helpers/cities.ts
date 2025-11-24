import { City, GameState, HexCoord } from "../../core/types.js";
import { CAPTURED_CITY_HP_RESET, CITY_WORK_RADIUS_RINGS, TERRAIN, UNITS } from "../../core/constants.js";
import { hexEquals, hexSpiral, hexToString } from "../../core/hex.js";
import { getTileYields } from "../rules.js";
import { isTileAdjacentToRiver } from "../../map/rivers.js";

export function claimCityTerritory(city: City, state: GameState, ownerId: string) {
    const territory = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS);
    for (const coord of territory) {
        const tile = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (tile) {
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

    let worked = currentValid.slice(0, Math.max(1, city.pop));
    const needed = Math.max(1, city.pop) - worked.length;
    if (needed > 0) {
        const workedKeys = new Set(worked.map(c => hexToString(c)));
        const candidates = ownedCoords
            .filter(c => !workedKeys.has(hexToString(c)))
            .sort((a, b) => tileScore(b, state) - tileScore(a, state));
        for (let i = 0; i < needed && i < candidates.length; i++) {
            worked.push(candidates[i]);
        }
    }

    return worked;
}

export function tileScore(coord: HexCoord, state: GameState): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -999;
    const base = getTileYields(tile);
    const adjRiver = isTileAdjacentToRiver(state.map, coord);
    const food = base.F + (adjRiver ? 1 : 0);
    return food + base.P + base.S;
}

export function captureCity(state: GameState, city: City, newOwnerId: string) {
    claimCityTerritory(city, state, newOwnerId);
    city.ownerId = newOwnerId;
    city.hp = CAPTURED_CITY_HP_RESET;
    city.pop = Math.max(1, city.pop - 1);
    city.currentBuild = null;
    city.buildProgress = 0;
    city.workedTiles = ensureWorkedTiles(city, state);
    city.hasFiredThisTurn = false;
}

