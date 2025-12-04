import { describe, it, expect } from "vitest";
import { generateRivers } from "./generation/rivers.js";
import { WorldRng } from "./generation/seeding.js";
import { MapSize, TerrainType, Tile } from "../core/types.js";
import { hexToString } from "../core/hex.js";

function makeGrid(width: number, height: number): Tile[] {
    const tiles: Tile[] = [];
    for (let r = 0; r < height; r++) {
        const rOffset = Math.floor(r / 2);
        for (let q = -rOffset; q < width - rOffset; q++) {
            tiles.push({
                coord: { q, r },
                terrain: TerrainType.Plains,
                overlays: [],
                features: undefined,
            });
        }
    }
    return tiles;
}

function decorateTerrain(tiles: Tile[], width: number, height: number): void {
    // Two-layer water ring (deep sea outer, coast inner) to ensure valid mouths and inland distance.
    for (const tile of tiles) {
        const { q, r } = tile.coord;
        const rOffset = Math.floor(r / 2);
        const minQ = -rOffset;
        const maxQ = (width - rOffset) - 1;
        const isOuterRing = r === 0 || r === height - 1 || q === minQ || q === maxQ;
        const isCoastRing = r === 1 || r === height - 2 || q === minQ + 1 || q === maxQ - 1;

        if (isOuterRing) {
            tile.terrain = TerrainType.DeepSea;
            continue;
        }
        if (isCoastRing) {
            tile.terrain = TerrainType.Coast;
            continue;
        }
        if ((q + r) % 3 === 0) {
            tile.terrain = TerrainType.Hills;
        } else if ((q + r) % 3 === 1) {
            tile.terrain = TerrainType.Forest;
        } else {
            tile.terrain = TerrainType.Plains;
        }
    }
}

function cloneTiles(tiles: Tile[]): Tile[] {
    return tiles.map(t => ({
        coord: { ...t.coord },
        terrain: t.terrain,
        overlays: [...t.overlays],
        features: t.features ? [...(t.features as any)] : undefined,
    }));
}

describe("river pathfinding parity", () => {
    it("module and legacy pathfinders produce matching metrics on a fixed map/seed", () => {
        const width = 18;
        const height = 14;
        const baseTiles = makeGrid(width, height);
        decorateTerrain(baseTiles, width, height);
        const getTile = (tileList: Tile[]) => (coord: { q: number; r: number }) =>
            tileList.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
        const isLand = (t: Tile | undefined) =>
            !!t && t.terrain !== TerrainType.Mountain && t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast;

        const seed = 4242;
        const run = (useModule: boolean) => {
            const tiles = cloneTiles(baseTiles);
            const rng = new WorldRng(seed);
            return generateRivers({
                tiles,
                mapSize: "Tiny" as MapSize,
                rng,
                getTile: getTile(tiles),
                isLand,
                options: { usePathfinderModule: useModule, collectMetrics: true },
            });
        };

        const legacy = run(false);
        const modular = run(true);

        expect(legacy.metrics?.requestedRiverCount).toBe(2);
        expect(legacy.metrics?.startsSelected).toBe(2);
        expect(legacy.metrics?.pathsCompleted).toBe(2);
        expect(legacy.metrics?.riverLengths).toEqual([6, 6]);

        expect(modular.metrics).toEqual(legacy.metrics);

        // Ensure overlay wiring still marks rivers on tiles
        const legacyRiverTiles = new Set(legacy.riverEdges.flatMap(e => [hexToString(e.a), hexToString(e.b)]));
        const modularRiverTiles = new Set(modular.riverEdges.flatMap(e => [hexToString(e.a), hexToString(e.b)]));
        expect(modularRiverTiles).toEqual(legacyRiverTiles);
    });
});
