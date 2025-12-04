import { describe, it, expect } from "vitest";
import { directionBetween, isTileAdjacentToRiver, riverEdgeKey } from "./rivers.js";
import { TerrainType, Tile, OverlayType } from "../core/types.js";

const baseTile = (q: number, r: number, overlays: Tile["overlays"] = []): Tile => ({
    coord: { q, r },
    terrain: TerrainType.Plains,
    overlays,
    overlays,
});

describe("river helpers", () => {
    it("generates stable river edge keys", () => {
        const a = { q: 0, r: 0 };
        const b = { q: 1, r: 0 };
        expect(riverEdgeKey({ a, b })).toBe(riverEdgeKey({ a: b, b: a }));
    });

    it("computes axial direction between neighboring hexes", () => {
        const center = { q: 0, r: 0 };
        expect(directionBetween(center, { q: 1, r: 0 })).toBe(0);
        expect(directionBetween(center, { q: 1, r: -1 })).toBe(1);
        expect(directionBetween(center, { q: 0, r: -1 })).toBe(2);
        expect(directionBetween(center, { q: -1, r: 0 })).toBe(3);
        expect(directionBetween(center, { q: -1, r: 1 })).toBe(4);
        expect(directionBetween(center, { q: 0, r: 1 })).toBe(5);
    });

    it("detects river adjacency from edge data", () => {
        const a = { q: 0, r: 0 };
        const b = { q: 1, r: 0 };
        const map = {
            width: 2,
            height: 1,
            tiles: [baseTile(0, 0), baseTile(1, 0)],
            rivers: [{ a, b }],
        };

        expect(isTileAdjacentToRiver(map, a)).toBe(true);
        expect(isTileAdjacentToRiver(map, b)).toBe(true);
        expect(isTileAdjacentToRiver(map, { q: -1, r: 0 })).toBe(false);
    });

    it("falls back to overlay adjacency when river edges are absent", () => {
        const tileWithOverlay = baseTile(0, 0, [OverlayType.RiverEdge]);
        const neighbor = baseTile(1, 0);
        const map = {
            width: 2,
            height: 1,
            tiles: [tileWithOverlay, neighbor],
            rivers: [],
        };

        expect(isTileAdjacentToRiver(map, tileWithOverlay.coord)).toBe(true);
        expect(isTileAdjacentToRiver(map, neighbor.coord)).toBe(true);
    });
});
