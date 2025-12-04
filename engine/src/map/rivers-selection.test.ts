import { describe, it, expect } from "vitest";
import { buildElevationMap, buildWaterDistance } from "./generation/rivers-helpers.js";
import { buildCoastEntries, selectRiverStarts } from "./generation/rivers-selection.js";
import { TerrainType, Tile } from "../core/types.js";
import { hexToString } from "../core/hex.js";

function makeTile(coord: { q: number; r: number }, terrain: TerrainType): Tile {
    return { coord, terrain, overlays: [] };
}

function makeGetTile(tiles: Tile[]) {
    const byKey = new Map<string, Tile>();
    for (const tile of tiles) {
        byKey.set(hexToString(tile.coord), tile);
    }
    return (coord: { q: number; r: number }) => byKey.get(hexToString(coord));
}

describe("river start selection", () => {
    it("prefers high elevation away from coast and respects spacing", () => {
        const tiles = [
            makeTile({ q: 0, r: 0 }, TerrainType.Mountain), // high, far
            makeTile({ q: 3, r: 0 }, TerrainType.Hills),    // high, near coast later
            makeTile({ q: 0, r: 2 }, TerrainType.Plains),   // lower
            makeTile({ q: 5, r: 0 }, TerrainType.Mountain), // high but close to coast
            makeTile({ q: 0, r: 5 }, TerrainType.Hills),    // high, far
            makeTile({ q: 0, r: 6 }, TerrainType.Hills),    // adjacent to previous (spacing block)
            makeTile({ q: 0, r: 9 }, TerrainType.Plains),   // fallback
            makeTile({ q: 1, r: 9 }, TerrainType.Coast),    // water seed
            makeTile({ q: 2, r: 9 }, TerrainType.DeepSea),  // water seed
        ];
        const getTile = makeGetTile(tiles);
        const elevation = buildElevationMap(tiles);
        const waterDistance = buildWaterDistance(tiles, getTile);

        const starts = selectRiverStarts({
            riverCount: 3,
            elevationThreshold: 3,
            minStartSpacing: 2,
            minStartCoastDistance: 2,
            landTiles: tiles.filter(t => t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast),
            elevationByKey: elevation,
            waterDistance,
        });

        const keys = starts.map(t => hexToString(t.coord));
        expect(keys).toContain("0,0"); // top mountain, far from coast
        expect(keys).toContain("5,0"); // next-highest mountain
        expect(keys).not.toContain("0,6"); // blocked by spacing
        expect(keys).toContain("3,0"); // next best high once spacing allows
        expect(starts.length).toBe(3);
    });

    it("falls back to shallow and then general when interior options are insufficient", () => {
        const tiles = [
            makeTile({ q: 0, r: 0 }, TerrainType.Plains),   // low, near coast
            makeTile({ q: 1, r: 0 }, TerrainType.Plains),   // low, near coast
            makeTile({ q: 2, r: 0 }, TerrainType.Plains),   // low, near coast
            makeTile({ q: 0, r: 1 }, TerrainType.Coast),    // water seed
            makeTile({ q: 1, r: 1 }, TerrainType.DeepSea),  // water seed
            makeTile({ q: 2, r: 1 }, TerrainType.Coast),    // water seed
            makeTile({ q: 4, r: 4 }, TerrainType.Hills),    // only high inland candidate
            makeTile({ q: 8, r: 8 }, TerrainType.Plains),   // fallback far
        ];
        const getTile = makeGetTile(tiles);
        const elevation = buildElevationMap(tiles);
        const waterDistance = buildWaterDistance(tiles, getTile);

        const starts = selectRiverStarts({
            riverCount: 3,
            elevationThreshold: 3,
            minStartSpacing: 2,
            minStartCoastDistance: 2,
            landTiles: tiles.filter(t => t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast),
            elevationByKey: elevation,
            waterDistance,
        });

        const keys = starts.map(t => hexToString(t.coord));
        expect(keys).toContain("4,4"); // only high inland
        expect(keys).toContain("8,8"); // fallback land after shallow are exhausted
        // Should still pick one of the near-coast plains to satisfy count
        expect(starts.length).toBe(3);
    });
});

describe("coast entry builder", () => {
    it("only returns coasts adjacent to land", () => {
        const tiles = [
            makeTile({ q: 5, r: 0 }, TerrainType.Coast),    // isolated (only water neighbors defined)
            makeTile({ q: 5, r: 1 }, TerrainType.DeepSea),
            makeTile({ q: 6, r: 0 }, TerrainType.DeepSea),
            makeTile({ q: 4, r: 1 }, TerrainType.DeepSea),
            makeTile({ q: 0, r: 1 }, TerrainType.Plains),   // land touching 0,2
            makeTile({ q: 0, r: 2 }, TerrainType.Coast),    // valid entry
        ];
        const getTile = makeGetTile(tiles);
        const entries = buildCoastEntries(
            tiles,
            getTile,
            (tile) => !!tile && tile.terrain !== TerrainType.DeepSea && tile.terrain !== TerrainType.Coast,
        );
        const keys = entries.map(e => e.key);
        expect(keys).toContain("0,2");
        expect(keys).not.toContain("0,0");
        expect(keys.length).toBe(1);
    });
});
