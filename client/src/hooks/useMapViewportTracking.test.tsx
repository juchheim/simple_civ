import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useMapViewportSize, useViewportChangeNotifier } from "./useMapViewportTracking";

type ResizeCallback = (entries: Array<{ contentRect: { width: number; height: number } }>) => void;

let resizeCallback: ResizeCallback | null = null;

class MockResizeObserver {
    constructor(callback: ResizeCallback) {
        resizeCallback = callback;
    }
    observe() { }
    disconnect() { }
}

describe("useMapViewportTracking", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", MockResizeObserver);
        resizeCallback = null;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reads initial viewport size from container ref", () => {
        const containerRef = {
            current: {
                clientWidth: 800,
                clientHeight: 600,
            } as HTMLDivElement
        };

        const { result } = renderHook(() => useMapViewportSize(containerRef));
        expect(result.current).toEqual({ width: 800, height: 600 });
    });

    it("updates viewport size when resize observer reports changes", () => {
        const containerRef = {
            current: {
                clientWidth: 640,
                clientHeight: 480,
            } as HTMLDivElement
        };

        const { result } = renderHook(() => useMapViewportSize(containerRef));
        expect(result.current).toEqual({ width: 640, height: 480 });

        act(() => {
            resizeCallback?.([{ contentRect: { width: 1024, height: 768 } }]);
        });

        expect(result.current).toEqual({ width: 1024, height: 768 });
    });

    it("notifies only when viewport frame values change", () => {
        const onViewChange = vi.fn();
        const viewportA = {
            pan: { x: 10, y: 20 },
            zoom: 1,
            size: { width: 800, height: 600 },
            worldBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
            center: { x: 5, y: 5 },
        };
        const viewportAClone = {
            ...viewportA,
            pan: { ...viewportA.pan },
            size: { ...viewportA.size },
        };
        const viewportB = {
            ...viewportA,
            pan: { x: 12, y: 20 },
        };

        const { rerender } = renderHook(
            ({ viewport }) => useViewportChangeNotifier(viewport, onViewChange),
            { initialProps: { viewport: viewportA } },
        );
        expect(onViewChange).toHaveBeenCalledTimes(1);
        expect(onViewChange).toHaveBeenLastCalledWith(viewportA);

        rerender({ viewport: viewportAClone });
        expect(onViewChange).toHaveBeenCalledTimes(1);

        rerender({ viewport: viewportB });
        expect(onViewChange).toHaveBeenCalledTimes(2);
        expect(onViewChange).toHaveBeenLastCalledWith(viewportB);
    });
});
