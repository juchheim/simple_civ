import { describe, expect, it } from "vitest";
import {
    calculateClientDistance,
    calculatePinchZoom,
    calculatePointDistance,
    clampZoom,
    computePinchAdjustedPan,
    isTapGesture
} from "./touch-controller-helpers";

describe("touch-controller-helpers", () => {
    it("calculates point and client distances", () => {
        expect(calculatePointDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
        expect(
            calculateClientDistance(
                { clientX: 10, clientY: 10 },
                { clientX: 13, clientY: 14 },
            ),
        ).toBe(5);
    });

    it("clamps zoom values to min/max bounds", () => {
        expect(clampZoom(1.5, 0.5, 2)).toBe(1.5);
        expect(clampZoom(0.1, 0.5, 2)).toBe(0.5);
        expect(clampZoom(3, 0.5, 2)).toBe(2);
    });

    it("computes pinch zoom using initial distance and bounds", () => {
        const zoomIn = calculatePinchZoom(200, 100, 1, 1, 0.5, 3);
        const zoomOutClamped = calculatePinchZoom(20, 100, 1, 1, 0.5, 3);

        expect(zoomIn).toBe(2);
        expect(zoomOutClamped).toBe(0.5);
    });

    it("computes pan adjusted for pinch center and two-finger drag", () => {
        const pan = computePinchAdjustedPan(
            { x: 200, y: 120 },
            { x: 100, y: 60 },
            { x: 10, y: -5 },
            1,
            1.5,
        );

        expect(pan).toEqual({ x: 65, y: 22.5 });
    });

    it("classifies tap gestures by distance and duration thresholds", () => {
        expect(isTapGesture(5, 120)).toBe(true);
        expect(isTapGesture(12, 120)).toBe(false);
        expect(isTapGesture(5, 500)).toBe(false);
    });
});
