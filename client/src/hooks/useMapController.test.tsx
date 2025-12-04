import { renderHook, act } from "@testing-library/react";
import { useMapController } from "./useMapController";
import { HexCoord } from "@simple-civ/engine";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

describe("useMapController", () => {
    const mockTiles = [
        { coord: { q: 0, r: 0 }, terrain: "Plains" },
        { coord: { q: 1, r: 0 }, terrain: "Plains" },
    ] as any[];

    const mockHexToPixel = (hex: HexCoord) => ({ x: hex.q * 100, y: hex.r * 100 });
    const mockOnTileClick = vi.fn();
    const mockOnHoverTile = vi.fn();
    const mockOnViewChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("initializes with default state", () => {
        const { result } = renderHook(() =>
            useMapController({
                tiles: mockTiles,
                hexToPixel: mockHexToPixel,
                onTileClick: mockOnTileClick,
                onHoverTile: mockOnHoverTile,
                onViewChange: mockOnViewChange,
            })
        );

        expect(result.current.pan).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
        expect(result.current.zoom).toBe(1);
        expect(result.current.isPanning).toBe(false);
    });

    it("centers on coordinate", () => {
        const { result } = renderHook(() =>
            useMapController({
                tiles: mockTiles,
                hexToPixel: mockHexToPixel,
                onTileClick: mockOnTileClick,
                onHoverTile: mockOnHoverTile,
                onViewChange: mockOnViewChange,
            })
        );

        // Mock container ref
        Object.defineProperty(result.current.containerRef, "current", {
            value: { clientWidth: 800, clientHeight: 600 },
            writable: true,
        });

        act(() => {
            result.current.centerOnCoord({ q: 0, r: 0 });
        });

        // Center (400, 300) - Hex (0, 0) -> Pan (400, 300)
        expect(result.current.pan).toEqual({ x: 400, y: 300 });
    });

    it("handles panning", () => {
        const { result } = renderHook(() =>
            useMapController({
                tiles: mockTiles,
                hexToPixel: mockHexToPixel,
                onTileClick: mockOnTileClick,
                onHoverTile: mockOnHoverTile,
                onViewChange: mockOnViewChange,
            })
        );

        // Mock svg ref
        const mockSvg = {
            getBoundingClientRect: () => ({ left: 0, top: 0 }),
        };
        Object.defineProperty(result.current.svgRef, "current", {
            value: mockSvg,
            writable: true,
        });

        // Mouse Down
        act(() => {
            result.current.handleMouseDown({
                button: 0,
                clientX: 100,
                clientY: 100,
            } as any);
        });

        // Mouse Move (drag)
        act(() => {
            result.current.handleMouseMove({
                clientX: 150, // +50
                clientY: 150, // +50
            } as any);
        });

        expect(result.current.isPanning).toBe(true);
        expect(result.current.pan.x).toBeGreaterThan(0); // Should have moved
    });
});
