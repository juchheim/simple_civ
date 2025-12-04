import { HexCoord, TerrainType, Tile } from "../../core/types.js";
import { hexToString, getNeighbors } from "../../core/hex.js";

const TERRAIN_ELEVATION: Record<TerrainType, number> = {
    [TerrainType.Mountain]: 5,
    [TerrainType.Hills]: 4,
    [TerrainType.Forest]: 3,
    [TerrainType.Plains]: 2,
    [TerrainType.Desert]: 2,
    [TerrainType.Marsh]: 1,
    [TerrainType.Coast]: 0,
    [TerrainType.DeepSea]: -1,
};

export type RiverEdgeKey = string;

export function buildElevationMap(tiles: Tile[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const tile of tiles) {
        map.set(hexToString(tile.coord), TERRAIN_ELEVATION[tile.terrain] ?? 1);
    }
    return map;
}

export function buildWaterDistance(
    tiles: Tile[],
    getTile: (coord: HexCoord) => Tile | undefined,
): Map<string, number> {
    const distance = new Map<string, number>();
    const queue: Tile[] = [];

    for (const tile of tiles) {
        const key = hexToString(tile.coord);
        if (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) {
            distance.set(key, 0);
            queue.push(tile);
        }
    }

    let index = 0;
    while (index < queue.length) {
        const current = queue[index++];
        const currentKey = hexToString(current.coord);
        const base = distance.get(currentKey) ?? 0;

        for (const neighborCoord of getNeighbors(current.coord)) {
            const neighbor = getTile(neighborCoord);
            if (!neighbor) continue;
            const neighborKey = hexToString(neighbor.coord);
            if (distance.has(neighborKey)) continue;
            distance.set(neighborKey, base + 1);
            queue.push(neighbor);
        }
    }

    return distance;
}

export function makeRiverEdgeKey(a: HexCoord, b: HexCoord): RiverEdgeKey {
    const keyA = hexToString(a);
    const keyB = hexToString(b);
    return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
}
