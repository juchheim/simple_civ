import { describe, expect, it } from "vitest";
import {
    computeWorldBoundsFromViewport,
    computeWorldCenter,
    computeFitToTilesView,
    createViewport,
    findClosestHexAtWorldPoint,
    isSameViewportFrame,
    panToCenterPoint,
    screenToWorldPoint,
} from "./map-controller-math";

describe("map-controller-math", () => {
    it("converts screen points into world points", () => {
        const world = screenToWorldPoint({ x: 300, y: 250 }, { x: 100, y: 50 }, 2);
        expect(world).toEqual({ x: 100, y: 100 });
    });

    it("finds the nearest hex in hit radius", () => {
        const tiles = [
            { coord: { q: 0, r: 0 }, terrain: "Plains" },
            { coord: { q: 1, r: 0 }, terrain: "Plains" },
        ] as any[];

        const hex = findClosestHexAtWorldPoint(
            { x: 95, y: 5 },
            tiles,
            coord => ({ x: coord.q * 100, y: coord.r * 100 }),
            25,
        );

        expect(hex).toEqual({ q: 1, r: 0 });
    });

    it("computes pan that centers a world point", () => {
        const pan = panToCenterPoint({ x: 100, y: 50 }, { width: 800, height: 600 }, 1.5);
        expect(pan).toEqual({ x: 250, y: 225 });
    });

    it("computes fit view for tile bounds", () => {
        const tiles = [
            { coord: { q: 0, r: 0 }, terrain: "Plains" },
            { coord: { q: 1, r: 0 }, terrain: "Plains" },
        ] as any[];

        const fit = computeFitToTilesView({
            tiles,
            hexToPixel: coord => ({ x: coord.q * 20, y: coord.r * 20 }),
            containerSize: { width: 100, height: 100 },
            hexRadius: 10,
            padding: 10,
            maxZoom: 3,
        });

        expect(fit.zoom).toBe(2);
        expect(fit.pan).toEqual({ x: 30, y: 50 });
    });

    it("computes world bounds and center from viewport", () => {
        const worldBounds = computeWorldBoundsFromViewport(
            { x: 100, y: 50 },
            2,
            { width: 800, height: 600 },
        );
        const center = computeWorldCenter(worldBounds);

        expect(worldBounds).toEqual({
            minX: -50,
            maxX: 350,
            minY: -25,
            maxY: 275,
        });
        expect(center).toEqual({ x: 150, y: 125 });
    });

    it("creates a full viewport model", () => {
        const viewport = createViewport(
            { x: 100, y: 50 },
            2,
            { width: 800, height: 600 },
        );

        expect(viewport).toEqual({
            pan: { x: 100, y: 50 },
            zoom: 2,
            size: { width: 800, height: 600 },
            worldBounds: {
                minX: -50,
                maxX: 350,
                minY: -25,
                maxY: 275,
            },
            center: { x: 150, y: 125 },
        });
    });

    it("compares viewport frames by pan/zoom/size", () => {
        const previous = {
            pan: { x: 10, y: 20 },
            zoom: 1.5,
            size: { width: 1000, height: 700 },
        };
        const nextSame = {
            pan: { x: 10, y: 20 },
            zoom: 1.5,
            size: { width: 1000, height: 700 },
        };
        const nextDifferent = {
            pan: { x: 11, y: 20 },
            zoom: 1.5,
            size: { width: 1000, height: 700 },
        };

        expect(isSameViewportFrame(previous, nextSame)).toBe(true);
        expect(isSameViewportFrame(previous, nextDifferent)).toBe(false);
        expect(isSameViewportFrame(null, nextSame)).toBe(false);
    });
});
