import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMapViewportBridge } from "./useMapViewportBridge";

describe("useMapViewportBridge", () => {
    it("forwards navigate requests to the map handle", () => {
        const { result } = renderHook(() => useMapViewportBridge());
        const centerOnPoint = vi.fn();

        act(() => {
            (result.current.mapRef as any).current = {
                centerOnPoint,
                centerOnCoord: vi.fn(),
            };
            result.current.navigateMapView({ x: 120, y: 240 });
        });

        expect(centerOnPoint).toHaveBeenCalledWith({ x: 120, y: 240 });
    });

    it("is safe when map handle is not mounted", () => {
        const { result } = renderHook(() => useMapViewportBridge());

        expect(() => {
            act(() => {
                result.current.navigateMapView({ x: 1, y: 2 });
            });
        }).not.toThrow();
    });
});
