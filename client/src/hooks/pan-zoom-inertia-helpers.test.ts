import { describe, expect, it } from "vitest";
import {
    applyVelocityPan,
    applyZoomRatioAroundAnchor,
    computeDecayFactor,
    computeEdgePanVelocity,
    computeZoomSmoothing,
    decayVelocity,
    getVelocitySpeed,
    isInEdgeZone
} from "./pan-zoom-inertia-helpers";

describe("pan-zoom-inertia-helpers", () => {
    it("decays inertia velocity by normalized frame", () => {
        const decayFactor = computeDecayFactor(0.9, 2);
        const velocity = decayVelocity({ vx: 10, vy: -5 }, decayFactor);

        expect(decayFactor).toBeCloseTo(0.81);
        expect(velocity.vx).toBeCloseTo(8.1);
        expect(velocity.vy).toBeCloseTo(-4.05);
        expect(getVelocitySpeed(velocity)).toBeCloseTo(Math.hypot(8.1, -4.05));
    });

    it("applies velocity-based pan movement", () => {
        const nextPan = applyVelocityPan({ x: 100, y: 50 }, { vx: 0.2, vy: -0.1 }, 16);
        expect(nextPan).toEqual({ x: 103.2, y: 48.4 });
    });

    it("detects when pointer enters edge pan threshold", () => {
        const size = { width: 800, height: 600 };

        expect(isInEdgeZone({ x: 50, y: 200 }, size, 100)).toBe(true);
        expect(isInEdgeZone({ x: 750, y: 580 }, size, 100)).toBe(true);
        expect(isInEdgeZone({ x: 400, y: 300 }, size, 100)).toBe(false);
    });

    it("computes directional edge pan velocity", () => {
        const size = { width: 800, height: 600 };
        const leftTop = computeEdgePanVelocity({ x: 0, y: 0 }, size, 100, 0.8);
        const rightBottom = computeEdgePanVelocity({ x: 800, y: 600 }, size, 100, 0.8);
        const center = computeEdgePanVelocity({ x: 400, y: 300 }, size, 100, 0.8);

        expect(leftTop).toEqual({ vx: 0.8, vy: 0.8 });
        expect(rightBottom).toEqual({ vx: -0.8, vy: -0.8 });
        expect(center).toEqual({ vx: 0, vy: 0 });
    });

    it("computes zoom smoothing factor and zoom-adjusted pan", () => {
        const smoothing = computeZoomSmoothing(1, 0.2);
        const pan = applyZoomRatioAroundAnchor(
            { x: 100, y: 100 },
            { x: 20, y: 40 },
            1.5,
        );

        expect(smoothing).toBeCloseTo(0.2);
        expect(pan).toEqual({ x: -20, y: 10 });
    });
});
