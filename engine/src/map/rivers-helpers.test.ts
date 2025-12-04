import { describe, it, expect } from "vitest";
import { buildElevationMap, buildWaterDistance, makeRiverEdgeKey } from "./generation/rivers-helpers.js";
import { HexCoord, TerrainType, Tile } from "../core/types.js";
import { hexToString } from "../core/hex.js";

function makeTiles(tiles: Array<{ coord: HexCoord; terrain: TerrainType }>): Tile[] {
    return tiles.map(t => ({
        coord: t.coord,
        terrain: t.terrain,
        overlays: [],
    }));
}

function makeGetTile(tiles: Tile[]) {
    const byKey = new Map<string, Tile>();
    for (const tile of tiles) {
        byKey.set(hexToString(tile.coord), tile);
    }
    return (coord: HexCoord) => byKey.get(hexToString(coord));
}

describe("rivers helpers", () => {
    it("buildElevationMap maps terrain to numeric elevation", () => {
        const tiles = makeTiles([
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Mountain },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Hills },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains },
            { coord: { q: -1, r: 0 }, terrain: TerrainType.Desert },
            { coord: { q: 0, r: -1 }, terrain: TerrainType.Marsh },
            { coord: { q: 1, r: -1 }, terrain: TerrainType.Coast },
            { coord: { q: -1, r: 1 }, terrain: TerrainType.DeepSea },
            { coord: { q: 2, r: 0 }, terrain: TerrainType.Forest },
        ]);

        const elevation = buildElevationMap(tiles);
        expect(elevation.get(hexToString({ q: 0, r: 0 }))).toBe(5);
        expect(elevation.get(hexToString({ q: 1, r: 0 }))).toBe(4);
        expect(elevation.get(hexToString({ q: 0, r: 1 }))).toBe(2);
        expect(elevation.get(hexToString({ q: -1, r: 0 }))).toBe(2);
        expect(elevation.get(hexToString({ q: 0, r: -1 }))).toBe(1);
        expect(elevation.get(hexToString({ q: 1, r: -1 }))).toBe(0);
        expect(elevation.get(hexToString({ q: -1, r: 1 }))).toBe(-1);
        expect(elevation.get(hexToString({ q: 2, r: 0 }))).toBe(3);
    });

    it("buildWaterDistance seeds water at 0 and floods outward", () => {
        const tiles = makeTiles([
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Coast },     // water seed
            { coord: { q: 1, r: 0 }, terrain: TerrainType.DeepSea },   // water seed
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains },    // distance 1
            { coord: { q: -1, r: 1 }, terrain: TerrainType.Hills },    // distance 2
            { coord: { q: -1, r: 0 }, terrain: TerrainType.Mountain }, // distance 2 (via 0,1)
            { coord: { q: 0, r: -1 }, terrain: TerrainType.Forest },   // distance 1
            { coord: { q: 1, r: -1 }, terrain: TerrainType.Plains },   // distance 1 (adjacent to water seed)
            { coord: { q: 2, r: -1 }, terrain: TerrainType.Plains },   // distance 2 (via 1,-1)
        ]);
        const getTile = makeGetTile(tiles);

        const distance = buildWaterDistance(tiles, getTile);

        expect(distance.get(hexToString({ q: 0, r: 0 }))).toBe(0);
        expect(distance.get(hexToString({ q: 1, r: 0 }))).toBe(0);
        expect(distance.get(hexToString({ q: 0, r: 1 }))).toBe(1);
        expect(distance.get(hexToString({ q: 0, r: -1 }))).toBe(1);
        expect(distance.get(hexToString({ q: 1, r: -1 }))).toBe(1);
        expect(distance.get(hexToString({ q: -1, r: 1 }))).toBe(1);
        expect(distance.get(hexToString({ q: -1, r: 0 }))).toBe(1);
        expect(distance.get(hexToString({ q: 2, r: -1 }))).toBe(1);
    });

    it("makeRiverEdgeKey canonicalizes edge ordering", () => {
        const a = { q: 0, r: 1 };
        const b = { q: 2, r: -1 };
        expect(makeRiverEdgeKey(a, b)).toBe(makeRiverEdgeKey(b, a));
        expect(makeRiverEdgeKey(a, b)).toBe("0,1|2,-1");
    });
});
