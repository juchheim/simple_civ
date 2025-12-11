import { describe, it, expect } from "vitest";
import { MapSize } from "../core/types.js";
import { WorldRng } from "./generation/seeding.js";
import { generateRivers } from "./generation/rivers.js";
import { MAP_DIMS } from "../core/constants.js";
import { hexToString } from "../core/hex.js";

type SnapshotCase = {
    mapSize: MapSize;
    seed: number;
    expected: {
        riverCount: number;
        starts: number;
        paths: number;
        lengths: number[];
    };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildTilesForSize(mapSize: MapSize) {
    const dims = MAP_DIMS[mapSize];
    const width = dims.width;
    const height = dims.height;
    const tiles: any[] = [];
    const tileMap = new Map<string, any>();
    for (let r = 0; r < height; r++) {
        const rOffset = Math.floor(r / 2);
        for (let q = -rOffset; q < width - rOffset; q++) {
            const coord = { q, r };
            const tile = { coord, terrain: "DeepSea", overlays: [] };
            tiles.push(tile);
            tileMap.set(hexToString(coord), tile);
        }
    }
    const getTile = (coord: { q: number; r: number }) => tileMap.get(hexToString(coord));
    const isLand = (t: any) => !!t && t.terrain !== "Mountain" && t.terrain !== "DeepSea" && t.terrain !== "Coast";
    return { tiles, tileMap, getTile, isLand };
}

describe("river metrics snapshots", () => {
    const cases: SnapshotCase[] = [
        {
            mapSize: "Small",
            seed: 12345,
            expected: { riverCount: 5, starts: 5, paths: 4, lengths: [7, 7, 6, 6] },
        },
        {
            mapSize: "Standard",
            seed: 98765,
            expected: { riverCount: 8, starts: 8, paths: 8, lengths: [8, 8, 7, 6, 6, 6, 6, 6] },
        },
    ];

    it("matches metrics for fixed seeds and sizes using modular pathfinder", () => {
        for (const testCase of cases) {
            const rng = new WorldRng(testCase.seed);
            const { tiles, getTile, isLand } = buildSyntheticMap(testCase.mapSize);

            const result = generateRivers({
                tiles,
                mapSize: testCase.mapSize,
                rng,
                getTile: getTile as any,
                isLand,
                options: { usePathfinderModule: true, collectMetrics: true },
            });

            expect(result.metrics?.requestedRiverCount).toBe(testCase.expected.riverCount);
            expect(result.metrics?.startsSelected).toBe(testCase.expected.starts);
            expect(result.metrics?.pathsCompleted).toBe(testCase.expected.paths);
            expect(result.metrics?.riverLengths).toEqual(testCase.expected.lengths);
        }
    });
});

function buildSyntheticMap(mapSize: MapSize) {
    const dims = MAP_DIMS[mapSize];
    const width = dims.width;
    const height = dims.height;
    const tiles: any[] = [];
    const tileMap = new Map<string, any>();
    for (let r = 0; r < height; r++) {
        const rOffset = Math.floor(r / 2);
        for (let q = -rOffset; q < width - rOffset; q++) {
            const coord = { q, r };
            const tile: any = { coord, terrain: "Plains", overlays: [] };
            const minQ = -rOffset;
            const maxQ = width - rOffset - 1;
            const isOuter = r === 0 || r === height - 1 || q === minQ || q === maxQ;
            const isCoast = r === 1 || r === height - 2 || q === minQ + 1 || q === maxQ - 1;
            if (isOuter) tile.terrain = "DeepSea";
            else if (isCoast) tile.terrain = "Coast";
            else if ((q + r) % 4 === 0) tile.terrain = "Hills";
            else if ((q + r) % 4 === 1) tile.terrain = "Forest";
            tiles.push(tile);
            tileMap.set(hexToString(coord), tile);
        }
    }
    const getTile = (coord: { q: number; r: number }) => tileMap.get(hexToString(coord));
    const isLand = (t: any) => !!t && t.terrain !== "Mountain" && t.terrain !== "DeepSea" && t.terrain !== "Coast";
    return { tiles, getTile, isLand };
}
