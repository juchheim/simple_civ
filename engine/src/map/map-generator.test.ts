import { describe, it, expect } from "vitest";
import { generateWorld } from "./map-generator";
import { getNeighbors, hexDistance, hexSpiral } from "../core/hex";
import { OverlayType, TerrainType, UnitType } from "../core/types";
import { getTileYields } from "../game/rules.js";

const createStandardSettings = () => ({
    mapSize: "Standard" as const,
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
            mapSize: "Small",
            players: [{ id: "p1", civName: "Civ A", color: "red" }],
        });

        expect(state.map.width).toBe(16);
        expect(state.map.height).toBe(12);
        expect(state.map.tiles.length).toBe(16 * 12);
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
        expect(state.units.length).toBe(4); // 2 units per player

        const p1Units = state.units.filter((u) => u.ownerId === "p1");
        expect(p1Units).toHaveLength(2);
        expect(p1Units.some((u) => u.type === UnitType.Settler)).toBe(true);
        expect(p1Units.some((u) => u.type === UnitType.Scout)).toBe(true);
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
        const state = generateWorld(createStandardSettings());

        const signature = state.map.riverPolylines?.map((polyline) =>
            polyline.map((segment) => [
                Number(segment.start.x.toFixed(3)),
                Number(segment.start.y.toFixed(3)),
                Number(segment.end.x.toFixed(3)),
                Number(segment.end.y.toFixed(3)),
            ])
        ) ?? [];

        expect(signature).toEqual([
            [
                [1493.894, 862.5, 1428.942, 825],
                [1428.942, 825, 1363.99, 862.5],
                [1363.99, 862.5, 1363.99, 937.5],
                [1363.99, 937.5, 1299.038, 975],
                [1299.038, 975, 1234.086, 937.5],
                [1234.086, 937.5, 1234.086, 862.5],
                [1234.086, 862.5, 1234.086, 937.5],
                [1234.086, 937.5, 1169.134, 975],
                [1169.134, 975, 1104.182, 937.5],
                [1104.182, 937.5, 1169.134, 975],
                [1169.134, 975, 1169.134, 1050],
                [1169.134, 1050, 1104.182, 1087.5],
                [1104.182, 1087.5, 1104.182, 1162.5],
                [1104.182, 1162.5, 1169.134, 1200],
            ],
            [
                [974.279, 487.5, 909.327, 525],
                [909.327, 525, 974.279, 487.5],
                [974.279, 487.5, 1039.23, 525],
                [1039.23, 525, 1039.23, 600],
                [1039.23, 600, 1104.182, 637.5],
                [1104.182, 637.5, 1169.134, 600],
                [1169.134, 600, 1234.086, 637.5],
                [1234.086, 637.5, 1234.086, 712.5],
                [1234.086, 712.5, 1234.086, 637.5],
                [1234.086, 637.5, 1299.038, 600],
                [1299.038, 600, 1363.99, 637.5],
                [1363.99, 637.5, 1299.038, 600],
                [1299.038, 600, 1299.038, 525],
                [1299.038, 525, 1363.99, 487.5],
                [1363.99, 487.5, 1363.99, 412.5],
                [1363.99, 412.5, 1299.038, 375],
            ],
            [
                [1753.701, 1087.5, 1818.653, 1050],
                [1818.653, 1050, 1818.653, 975],
                [1818.653, 975, 1753.701, 937.5],
                [1753.701, 937.5, 1753.701, 862.5],
                [1753.701, 862.5, 1818.653, 825],
                [1818.653, 825, 1818.653, 750],
                [1818.653, 750, 1753.701, 712.5],
                [1753.701, 712.5, 1818.653, 750],
                [1818.653, 750, 1883.605, 712.5],
                [1883.605, 712.5, 1883.605, 637.5],
                [1883.605, 637.5, 1948.557, 600],
                [1948.557, 600, 2013.509, 637.5],
            ],
            [
                [519.615, 750, 454.663, 712.5],
                [454.663, 712.5, 519.615, 750],
                [519.615, 750, 519.615, 825],
                [519.615, 825, 454.663, 862.5],
                [454.663, 862.5, 454.663, 937.5],
                [454.663, 937.5, 519.615, 975],
                [519.615, 975, 519.615, 1050],
                [519.615, 1050, 454.663, 1087.5],
                [454.663, 1087.5, 389.711, 1050],
                [389.711, 1050, 324.76, 1087.5],
                [324.76, 1087.5, 324.76, 1162.5],
            ],
        ]);
    });

    it("maintains start-site spacing and guarantees food/production tiles", () => {
        const state = generateWorld(createStandardSettings());
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
        const state = generateWorld(createStandardSettings());
        const counts = state.map.tiles.reduce<Record<string, Record<string, number>>>((acc, tile) => {
            if (!tile.overlays.length) return acc;
            if (!acc[tile.terrain]) acc[tile.terrain] = {};
            for (const overlay of tile.overlays) {
                acc[tile.terrain][overlay] = (acc[tile.terrain][overlay] ?? 0) + 1;
            }
            return acc;
        }, {});

        expect(counts).toEqual({
            [TerrainType.Desert]: {
                [OverlayType.RiverEdge]: 1,
            },
            [TerrainType.Forest]: {
                [OverlayType.OreVein]: 2,
                [OverlayType.RichSoil]: 1,
                [OverlayType.RiverEdge]: 4,
            },
            [TerrainType.Hills]: {
                [OverlayType.OreVein]: 1,
                [OverlayType.RiverEdge]: 3,
            },
            [TerrainType.Marsh]: {
                [OverlayType.OreVein]: 2,
                [OverlayType.RichSoil]: 1,
                [OverlayType.RiverEdge]: 1,
            },
            [TerrainType.Plains]: {
                [OverlayType.OreVein]: 1,
                [OverlayType.RichSoil]: 3,
                [OverlayType.RiverEdge]: 15,
            },
        });
    });
});
