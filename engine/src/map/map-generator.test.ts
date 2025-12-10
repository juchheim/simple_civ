import { describe, it, expect } from "vitest";
import { generateWorld } from "./map-generator";
import { getNeighbors, hexDistance, hexSpiral } from "../core/hex";
import { OverlayType, TerrainType, UnitType } from "../core/types";
import { getTileYields } from "../game/rules.js";

// Use Large map size for deterministic tests since its dimensions weren't changed in v0.96
const createDeterministicSettings = () => ({
    mapSize: "Large" as const,
    seed: 1337,
    players: ["red", "blue", "green", "yellow"].map((color, idx) => ({
        id: `p${idx + 1}`,
        civName: `Civ ${idx + 1}`,
        color,
    })),
});

describe("World Generation", () => {
    it("should generate a map with correct dimensions", () => {
        const state = generateWorld({
            mapSize: "Standard",
            players: [{ id: "p1", civName: "Civ A", color: "red" }],
        });

        // v1.0 balance: Standard map size increased to 23x17
        expect(state.map.width).toBe(23);
        expect(state.map.height).toBe(17);
        expect(state.map.tiles.length).toBe(23 * 17);
    });

    it("should place players with starting units", () => {
        const state = generateWorld({
            mapSize: "Small",
            players: [
                { id: "p1", civName: "Civ A", color: "red" },
                { id: "p2", civName: "Civ B", color: "blue" },
            ],
        });

        expect(state.players.length).toBe(2);
        expect(state.units.length).toBe(6); // v2.0: 3 units per player (Settler, Scout, SpearGuard)

        const p1Units = state.units.filter((u) => u.ownerId === "p1");
        expect(p1Units).toHaveLength(3);
        expect(p1Units.some((u) => u.type === UnitType.Settler)).toBe(true);
        expect(p1Units.some((u) => u.type === UnitType.Scout)).toBe(true);
        expect(p1Units.some((u) => u.type === UnitType.SpearGuard)).toBe(true);
    });

    it("should ensure starting positions are on valid terrain", () => {
        const state = generateWorld({
            mapSize: "Standard",
            players: [{ id: "p1", civName: "Civ A", color: "red" }],
        });

        const settler = state.units.find((u) => u.type === UnitType.Settler);
        expect(settler).toBeDefined();

        const tile = state.map.tiles.find(
            (t) => t.coord.q === settler!.coord.q && t.coord.r === settler!.coord.r
        );
        expect(tile).toBeDefined();
        expect(tile!.terrain).not.toBe(TerrainType.DeepSea);
        expect(tile!.terrain).not.toBe(TerrainType.Mountain);
        expect(tile!.terrain).not.toBe(TerrainType.Coast);
    });

    it("should emit river polylines with concrete coordinates", () => {
        const state = generateWorld({
            mapSize: "Small",
            seed: 42,
            players: [{ id: "p1", civName: "Civ A", color: "red" }],
        });

        expect(state.map.riverPolylines).toBeDefined();
        const hasPolyline = state.map.riverPolylines!.some(poly => poly.length > 0);
        expect(hasPolyline).toBe(true);

        state.map.riverPolylines!.forEach(polyline => {
            polyline.forEach(segment => {
                expect(typeof segment.start.x).toBe("number");
                expect(typeof segment.start.y).toBe("number");
                expect(typeof segment.end.x).toBe("number");
                expect(typeof segment.end.y).toBe("number");
            });
        });
    });

    it("should spawn scout adjacent to settler", () => {
        const state = generateWorld({
            mapSize: "Standard",
            players: [{ id: "p1", civName: "Civ A", color: "red" }],
        });

        const settler = state.units.find((u) => u.type === UnitType.Settler);
        const scout = state.units.find((u) => u.type === UnitType.Scout);

        expect(settler).toBeDefined();
        expect(scout).toBeDefined();

        // Should not be on same tile
        expect(settler!.coord).not.toEqual(scout!.coord);

        // Should be neighbors
        const neighbors = getNeighbors(settler!.coord);
        const isNeighbor = neighbors.some(n => n.q === scout!.coord.q && n.r === scout!.coord.r);
        expect(isNeighbor).toBe(true);

        // Scout should be on valid terrain
        const scoutTile = state.map.tiles.find(t => t.coord.q === scout!.coord.q && t.coord.r === scout!.coord.r);
        expect(scoutTile).toBeDefined();
        expect(scoutTile!.terrain).not.toBe(TerrainType.DeepSea);
        expect(scoutTile!.terrain).not.toBe(TerrainType.Mountain);
        expect(scoutTile!.terrain).not.toBe(TerrainType.Coast);
    });

    it("locks river polylines for deterministic seed", () => {
        const state = generateWorld(createDeterministicSettings());

        // Verify river polylines are generated with valid structure
        expect(state.map.riverPolylines).toBeDefined();
        expect(state.map.riverPolylines!.length).toBeGreaterThan(0);

        // Verify each polyline has valid segments with numeric coordinates
        for (const polyline of state.map.riverPolylines!) {
            expect(polyline.length).toBeGreaterThan(0);
            for (const segment of polyline) {
                expect(typeof segment.start.x).toBe("number");
                expect(typeof segment.start.y).toBe("number");
                expect(typeof segment.end.x).toBe("number");
                expect(typeof segment.end.y).toBe("number");
                expect(Number.isFinite(segment.start.x)).toBe(true);
                expect(Number.isFinite(segment.start.y)).toBe(true);
                expect(Number.isFinite(segment.end.x)).toBe(true);
                expect(Number.isFinite(segment.end.y)).toBe(true);
            }
        }

        // Verify determinism: same seed produces same number of river polylines
        const state2 = generateWorld(createDeterministicSettings());
        expect(state2.map.riverPolylines!.length).toBe(state.map.riverPolylines!.length);

        // Verify each polyline has the same number of segments
        for (let i = 0; i < state.map.riverPolylines!.length; i++) {
            expect(state2.map.riverPolylines![i].length).toBe(state.map.riverPolylines![i].length);
        }
    });

    it("maintains start-site spacing and guarantees food/production tiles", () => {
        const state = generateWorld(createDeterministicSettings());
        const settlers = state.units.filter(u => u.type === UnitType.Settler);
        expect(settlers).toHaveLength(state.players.length);

        // spacing: every pair at least 6 tiles apart
        for (let i = 0; i < settlers.length; i++) {
            for (let j = i + 1; j < settlers.length; j++) {
                expect(hexDistance(settlers[i].coord, settlers[j].coord)).toBeGreaterThanOrEqual(6);
            }
        }

        const tileKey = (coord: { q: number; r: number }) => `${coord.q},${coord.r}`;
        const tileMap = new Map(state.map.tiles.map(tile => [tileKey(tile.coord), tile]));
        const getTile = (coord: { q: number; r: number }) => tileMap.get(tileKey(coord));
        const isLand = (tile: { terrain: TerrainType } | undefined) =>
            !!tile &&
            tile.terrain !== TerrainType.Mountain &&
            tile.terrain !== TerrainType.DeepSea &&
            tile.terrain !== TerrainType.Coast;

        const hasYield = (
            origin: { q: number; r: number },
            radius: number,
            predicate: (tile: (typeof state.map.tiles)[number]) => boolean
        ) => {
            const ring = hexSpiral(origin, radius);
            return ring.some(coord => {
                const tile = getTile(coord);
                return tile && isLand(tile) && predicate(tile);
            });
        };

        const effectiveYields = (tile: (typeof state.map.tiles)[number]) => {
            const yields = getTileYields(tile);
            const neighbors = getNeighbors(tile.coord);
            const adjRiver = neighbors.some(coord => getTile(coord)?.overlays.includes(OverlayType.RiverEdge));
            return {
                food: yields.F + (adjRiver ? 1 : 0),
                prod: yields.P,
            };
        };

        for (const settler of settlers) {
            const startTile = getTile(settler.coord);
            expect(isLand(startTile)).toBe(true);

            const hasFood = hasYield(settler.coord, 2, tile => effectiveYields(tile).food >= 2);
            const hasProduction = hasYield(settler.coord, 2, tile => effectiveYields(tile).prod >= 2);
            const hasSettleNeighbor = hasYield(settler.coord, 1, () => true);

            expect(hasFood).toBe(true);
            expect(hasProduction).toBe(true);
            expect(hasSettleNeighbor).toBe(true);
        }
    });

    it("keeps overlay counts consistent for deterministic terrain noise", () => {
        const state = generateWorld(createDeterministicSettings());
        const counts = state.map.tiles.reduce<Record<string, Record<string, number>>>((acc, tile) => {
            if (!tile.overlays.length) return acc;
            if (!acc[tile.terrain]) acc[tile.terrain] = {};
            for (const overlay of tile.overlays) {
                acc[tile.terrain][overlay] = (acc[tile.terrain][overlay] ?? 0) + 1;
            }
            return acc;
        }, {});

        // Verify determinism: same seed produces same overlay distribution
        const state2 = generateWorld(createDeterministicSettings());
        const counts2 = state2.map.tiles.reduce<Record<string, Record<string, number>>>((acc, tile) => {
            if (!tile.overlays.length) return acc;
            if (!acc[tile.terrain]) acc[tile.terrain] = {};
            for (const overlay of tile.overlays) {
                acc[tile.terrain][overlay] = (acc[tile.terrain][overlay] ?? 0) + 1;
            }
            return acc;
        }, {});

        expect(counts).toEqual(counts2);

        // Verify overlays exist and have valid counts
        expect(Object.keys(counts).length).toBeGreaterThan(0);
        for (const [, overlays] of Object.entries(counts)) {
            expect(Object.keys(overlays).length).toBeGreaterThan(0);
            for (const count of Object.values(overlays)) {
                expect(count).toBeGreaterThan(0);
            }
        }
    });
});
