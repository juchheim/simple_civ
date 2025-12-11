import { describe, it, expect } from "vitest";
import {
    generateLandmass,
    ensureConnectivity,
    detectCoastline,
    isSafeForMountain,
    LANDMASS_PARAMS
} from "./landmass.js";
import { TerrainType, Tile, HexCoord } from "../../core/types.js";
import { hexToString } from "../../core/hex.js";

// Helper to create a test grid
function createTestGrid(width: number, height: number): {
    tiles: Tile[];
    getTile: (coord: HexCoord) => Tile | undefined;
    tileMap: Map<string, Tile>;
} {
    const tiles: Tile[] = [];
    const tileMap = new Map<string, Tile>();

    for (let r = 0; r < height; r++) {
        const rOffset = Math.floor(r / 2);
        for (let q = -rOffset; q < width - rOffset; q++) {
            const coord: HexCoord = { q, r };
            const tile: Tile = {
                coord,
                terrain: TerrainType.DeepSea,
                overlays: [],
            };
            tiles.push(tile);
            tileMap.set(hexToString(coord), tile);
        }
    }

    const getTile = (coord: HexCoord) => tileMap.get(hexToString(coord));
    return { tiles, getTile, tileMap };
}

// Simple RNG for testing
const testRng = {
    next: () => Math.random(),
    choice: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
};

describe("landmass generation", () => {
    describe("generateLandmass", () => {
        it("produces deterministic output for same seed", () => {
            const grid1 = createTestGrid(15, 11);
            const grid2 = createTestGrid(15, 11);
            const params = LANDMASS_PARAMS.Tiny;

            generateLandmass(
                { tiles: grid1.tiles, width: 15, height: 11, rng: testRng, getTile: grid1.getTile },
                params, "Tiny", 12345
            );
            generateLandmass(
                { tiles: grid2.tiles, width: 15, height: 11, rng: testRng, getTile: grid2.getTile },
                params, "Tiny", 12345
            );

            // Same seed should produce identical terrain
            for (let i = 0; i < grid1.tiles.length; i++) {
                expect(grid1.tiles[i].terrain).toBe(grid2.tiles[i].terrain);
            }
        });

        it("produces different output for different seeds", () => {
            const grid1 = createTestGrid(15, 11);
            const grid2 = createTestGrid(15, 11);
            const params = LANDMASS_PARAMS.Tiny;

            generateLandmass(
                { tiles: grid1.tiles, width: 15, height: 11, rng: testRng, getTile: grid1.getTile },
                params, "Tiny", 11111
            );
            generateLandmass(
                { tiles: grid2.tiles, width: 15, height: 11, rng: testRng, getTile: grid2.getTile },
                params, "Tiny", 99999
            );

            // Different seeds should produce different terrain (count differences)
            let differences = 0;
            for (let i = 0; i < grid1.tiles.length; i++) {
                if (grid1.tiles[i].terrain !== grid2.tiles[i].terrain) {
                    differences++;
                }
            }
            expect(differences).toBeGreaterThan(0);
        });

        it("guarantees ocean at map edges", () => {
            const grid = createTestGrid(15, 11);
            const params = LANDMASS_PARAMS.Tiny;

            generateLandmass(
                { tiles: grid.tiles, width: 15, height: 11, rng: testRng, getTile: grid.getTile },
                params, "Tiny", 42
            );

            // Check all tiles - edge tiles should be DeepSea
            for (const tile of grid.tiles) {
                const col = tile.coord.q + Math.floor(tile.coord.r / 2);
                const row = tile.coord.r;
                const isEdge = col === 0 || col === 14 || row === 0 || row === 10;

                if (isEdge) {
                    expect(tile.terrain).toBe(TerrainType.DeepSea);
                }
            }
        });

        it("generates some land tiles", () => {
            const grid = createTestGrid(19, 15);
            const params = LANDMASS_PARAMS.Small;

            generateLandmass(
                { tiles: grid.tiles, width: 19, height: 15, rng: testRng, getTile: grid.getTile },
                params, "Small", 777
            );

            const landCount = grid.tiles.filter(t => t.terrain === TerrainType.Plains).length;
            expect(landCount).toBeGreaterThan(0);
        });
    });

    describe("ensureConnectivity", () => {
        it("removes isolated land tiles", () => {
            const grid = createTestGrid(10, 10);

            // Use tiles directly from the grid array
            // Main landmass tiles (should be connected neighbors)
            const tile1 = grid.tiles[22]; // Pick a tile near center
            const tile2 = grid.tiles[23]; // Adjacent tile
            const tile3 = grid.tiles[32]; // Adjacent tile (next row)

            // Mark them as land
            tile1.terrain = TerrainType.Plains;
            tile2.terrain = TerrainType.Plains;
            tile3.terrain = TerrainType.Plains;

            // Create isolated island far away
            const isolatedTile = grid.tiles[75];
            isolatedTile.terrain = TerrainType.Plains;

            ensureConnectivity({
                tiles: grid.tiles,
                width: 10,
                height: 10,
                rng: testRng,
                getTile: grid.getTile
            });

            // Main landmass should remain (larger)
            expect(tile1.terrain).toBe(TerrainType.Plains);
            expect(tile2.terrain).toBe(TerrainType.Plains);
            expect(tile3.terrain).toBe(TerrainType.Plains);

            // Isolated island should be converted to water
            expect(isolatedTile.terrain).toBe(TerrainType.DeepSea);
        });

        it("keeps largest connected region", () => {
            const grid = createTestGrid(10, 10);

            // Smaller region (2 tiles near start)
            const small1 = grid.tiles[11];
            const small2 = grid.tiles[12];
            small1.terrain = TerrainType.Plains;
            small2.terrain = TerrainType.Plains;

            // Larger region (4 tiles in middle)
            const large1 = grid.tiles[44];
            const large2 = grid.tiles[45];
            const large3 = grid.tiles[54];
            const large4 = grid.tiles[55];
            large1.terrain = TerrainType.Plains;
            large2.terrain = TerrainType.Plains;
            large3.terrain = TerrainType.Plains;
            large4.terrain = TerrainType.Plains;

            ensureConnectivity({
                tiles: grid.tiles,
                width: 10,
                height: 10,
                rng: testRng,
                getTile: grid.getTile
            });

            // Larger region should remain
            expect(large1.terrain).toBe(TerrainType.Plains);
            expect(large2.terrain).toBe(TerrainType.Plains);

            // Smaller region should be removed
            expect(small1.terrain).toBe(TerrainType.DeepSea);
            expect(small2.terrain).toBe(TerrainType.DeepSea);
        });
    });

    describe("detectCoastline", () => {
        it("marks water tiles adjacent to land as coast", () => {
            const grid = createTestGrid(5, 5);

            // Create a land tile
            grid.tileMap.get("2,2")!.terrain = TerrainType.Plains;

            detectCoastline({
                tiles: grid.tiles,
                width: 5,
                height: 5,
                rng: testRng,
                getTile: grid.getTile
            });

            // The land tile should still be Plains
            expect(grid.tileMap.get("2,2")!.terrain).toBe(TerrainType.Plains);

            // Adjacent water tiles should be Coast
            const neighbors = ["3,2", "1,2", "2,3", "2,1", "3,1", "1,3"];
            for (const key of neighbors) {
                const tile = grid.tileMap.get(key);
                if (tile) {
                    expect(tile.terrain).toBe(TerrainType.Coast);
                }
            }
        });

        it("does not mark water tiles far from land", () => {
            const grid = createTestGrid(10, 10);

            // Create a land tile using tile index
            const landTile = grid.tiles[11];
            landTile.terrain = TerrainType.Plains;

            // Pick a tile far away
            const farTile = grid.tiles[88];

            detectCoastline({
                tiles: grid.tiles,
                width: 10,
                height: 10,
                rng: testRng,
                getTile: grid.getTile
            });

            // Far tile should still be DeepSea
            expect(farTile.terrain).toBe(TerrainType.DeepSea);
        });
    });

    describe("isSafeForMountain", () => {
        it("returns true for tiles with many land neighbors", () => {
            const grid = createTestGrid(5, 5);

            // Create land area
            grid.tileMap.get("1,2")!.terrain = TerrainType.Plains;
            grid.tileMap.get("2,2")!.terrain = TerrainType.Plains;
            grid.tileMap.get("3,2")!.terrain = TerrainType.Plains;
            grid.tileMap.get("2,1")!.terrain = TerrainType.Plains;
            grid.tileMap.get("2,3")!.terrain = TerrainType.Plains;

            const centerTile = grid.tileMap.get("2,2")!;
            expect(isSafeForMountain(centerTile, grid.getTile, 3)).toBe(true);
        });

        it("returns false for peninsula tips", () => {
            const grid = createTestGrid(5, 5);

            // Create thin peninsula
            grid.tileMap.get("1,2")!.terrain = TerrainType.Plains;
            grid.tileMap.get("2,2")!.terrain = TerrainType.Plains;

            const tipTile = grid.tileMap.get("2,2")!;
            expect(isSafeForMountain(tipTile, grid.getTile, 3)).toBe(false);
        });
    });
});
