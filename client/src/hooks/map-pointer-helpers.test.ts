import { describe, expect, it } from "vitest";
import {
    computeDragMetrics,
    computePanFromDrag,
    computePointerVelocity,
    computeWheelDesiredZoom,
    createPointerSample,
    hasMeaningfulZoomDelta
} from "./map-pointer-helpers";

describe("map-pointer-helpers", () => {
    it("creates pointer samples and drag metrics", () => {
        const sample = createPointerSample(10, 15, 100);
        const drag = computeDragMetrics({ x: 20, y: 30 }, { x: 32, y: 39 });

        expect(sample).toEqual({ x: 10, y: 15, time: 100 });
        expect(drag).toEqual({ deltaX: 12, deltaY: 9, distance: 15 });
    });

    it("computes pointer velocity and ignores non-positive dt", () => {
        const previous = createPointerSample(10, 10, 100);
        const next = createPointerSample(30, 50, 120);
        const sameTime = createPointerSample(30, 50, 100);

        expect(computePointerVelocity(previous, next)).toEqual({ vx: 1, vy: 2 });
        expect(computePointerVelocity(previous, sameTime)).toBeNull();
    });

    it("computes panned position from drag deltas", () => {
        const nextPan = computePanFromDrag({ x: 200, y: 100 }, { deltaX: -20, deltaY: 40 });
        expect(nextPan).toEqual({ x: 180, y: 140 });
    });

    it("computes wheel zoom target with clamping", () => {
        const zoomIn = computeWheelDesiredZoom(1, -100, 0.001, 0.5, 3);
        const zoomOutClamped = computeWheelDesiredZoom(1, 10_000, 0.001, 0.5, 3);

        expect(zoomIn).toBeCloseTo(Math.exp(0.1));
        expect(zoomOutClamped).toBe(0.5);
    });

    it("detects meaningful zoom deltas", () => {
        expect(hasMeaningfulZoomDelta(1, 1.0001)).toBe(false);
        expect(hasMeaningfulZoomDelta(1, 1.001)).toBe(true);
    });
});
