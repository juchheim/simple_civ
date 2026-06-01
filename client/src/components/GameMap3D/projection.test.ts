import { describe, expect, it } from "vitest";
import { createProjector, chooseWorldSurface, pixelToHex } from "./projection";

describe("3D board projection", () => {
    it.each([
        [20, 15],
        [25, 20],
        [30, 22],
        [35, 25],
        [40, 30],
    ])("uses a cylinder for the bounded %sx%s map", (width, height) => {
        const decision = chooseWorldSurface(width, height);

        expect(decision.surface.kind).toBe("cylinder");
        expect(decision.worstCompression).toBe(1);
    });

    it("keeps cylinder positions on the configured radius", () => {
        const projector = createProjector({ width: 30, height: 22 });
        const point = projector.positionOf({ q: 0, r: 0 });
        const normal = projector.normalAt({ q: 0, r: 0 });

        expect(projector.surface.kind).toBe("cylinder");
        expect(Math.hypot(point.x, point.z)).toBeCloseTo(projector.surface.radius, 6);
        expect(normal.length()).toBeCloseTo(1, 6);
        expect(normal.y).toBeCloseTo(0, 6);
    });

    it("supports the experimental sphere preview branch", () => {
        const decision = chooseWorldSurface(40, 20, { gridWraps: true, forceSphere: true });

        expect(decision.surface.kind).toBe("sphere");
        expect(decision.reason).toContain("forced");
    });

    it("round-trips flat axial centers for minimap navigation", () => {
        expect(pixelToHex({ x: 0, y: 0 }, 75)).toEqual({ q: 0, r: 0 });
        expect(pixelToHex({ x: Math.sqrt(3) * 75, y: 0 }, 75)).toEqual({ q: 1, r: 0 });
    });
});
