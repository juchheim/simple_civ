import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppUiFlow } from "./useAppUiFlow";

describe("useAppUiFlow", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("initializes with expected default UI state", () => {
        const { result } = renderHook(() => useAppUiFlow());

        expect(result.current.showTechTree).toBe(false);
        expect(result.current.showShroud).toBe(true);
        expect(result.current.showTileYields).toBe(false);
        expect(result.current.showGameMenu).toBe(false);
        expect(result.current.cityToCenter).toBeNull();
        expect(result.current.mapView).toBeNull();
    });

    it("opens and closes tech tree + game menu", () => {
        const { result } = renderHook(() => useAppUiFlow());

        act(() => {
            result.current.openTechTree();
            result.current.openGameMenu();
        });
        expect(result.current.showTechTree).toBe(true);
        expect(result.current.showGameMenu).toBe(true);

        act(() => {
            result.current.closeTechTree();
            result.current.closeGameMenu();
        });
        expect(result.current.showTechTree).toBe(false);
        expect(result.current.showGameMenu).toBe(false);
    });

    it("toggles shroud and tile yields", () => {
        const { result } = renderHook(() => useAppUiFlow());

        act(() => {
            result.current.toggleShroud();
            result.current.toggleTileYields();
        });

        expect(result.current.showShroud).toBe(false);
        expect(result.current.showTileYields).toBe(true);
    });

    it("resets overlays and map navigation", () => {
        const { result } = renderHook(() => useAppUiFlow());

        act(() => {
            result.current.openTechTree();
            result.current.openGameMenu();
            result.current.setCityToCenter({ q: 2, r: 3 });
            result.current.setMapView({
                pan: { x: 10, y: 20 },
                zoom: 1.5,
                size: { width: 1000, height: 700 },
                worldBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
                center: { x: 5, y: 5 },
            });
        });

        act(() => {
            result.current.resetUiOverlays();
            result.current.resetMapNavigation();
        });

        expect(result.current.showTechTree).toBe(false);
        expect(result.current.showGameMenu).toBe(false);
        expect(result.current.cityToCenter).toBeNull();
        expect(result.current.mapView).toBeNull();
    });

    it("clears cityToCenter after 100ms for re-centering behavior", () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useAppUiFlow());

        act(() => {
            result.current.setCityToCenter({ q: 4, r: -1 });
        });
        expect(result.current.cityToCenter).toEqual({ q: 4, r: -1 });

        act(() => {
            vi.advanceTimersByTime(99);
        });
        expect(result.current.cityToCenter).toEqual({ q: 4, r: -1 });

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current.cityToCenter).toBeNull();
    });
});
