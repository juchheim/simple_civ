import { City, GameState, HexCoord, TerrainType, UnitType } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";
import { hexEquals, hexSpiral } from "../../core/hex.js";

export function advanceSeed(state: GameState): number {
    const rand = Math.floor(state.seed * 10000);
    state.seed = (state.seed * 9301 + 49297) % 233280;
    return rand;
}

export function generateUnitId(state: GameState, ownerId: string, label?: string, now: number = Date.now()): string {
    const rand = advanceSeed(state);
    if (label && label.length > 0) {
        return `u_${ownerId}_${label}_${now}_${rand}`;
    }
    return `u_${ownerId}_${now}_${rand}`;
}

export function findSpawnCoord(state: GameState, city: City, unitType: UnitType, maxRing = 2): HexCoord {
    let spawnCoord = city.coord; // Fallback if no valid tile is found
    const area = hexSpiral(city.coord, maxRing);
    const stats = UNITS[unitType];

    for (const coord of area) {
        // Skip the city center tile - units should spawn adjacent to the city
        if (hexEquals(coord, city.coord)) continue;

        const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
        if (!tile) continue;

        if (stats.domain === "Land" && (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea || tile.terrain === TerrainType.Mountain)) continue;
        if (stats.domain === "Naval" && (tile.terrain !== TerrainType.Coast && tile.terrain !== TerrainType.DeepSea)) continue;

        const occupied = state.units.some(u => hexEquals(u.coord, coord));
        if (!occupied) {
            spawnCoord = coord;
            break;
        }
    }

    return spawnCoord;
}
