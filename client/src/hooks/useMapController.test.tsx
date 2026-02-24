import { renderHook, act } from "@testing-library/react";
import { useMapController } from "./useMapController";
import { HexCoord } from "@simple-civ/engine";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0) as any;
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
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
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
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
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

        act(() => {
            result.current.handleMouseUp();
        });

        expect(result.current.pan.x).toBeGreaterThan(0);
    });

    it("pans when mouse is near edge after delay", async () => {
        // Track current fake time for performance.now mock
        let fakeTime = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => fakeTime);

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

        // Mock svg ref
        Object.defineProperty(result.current.svgRef, "current", {
            value: {
                clientWidth: 800,
                clientHeight: 600,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                getBoundingClientRect: () => ({ left: 0, top: 0 }),
            },
            writable: true,
        });

        // Capture initial pan
        const initialPanX = result.current.pan.x;

        // Move mouse to left edge (x=10, within threshold of 100)
        act(() => {
            result.current.handleMouseMove({
                clientX: 10,
                clientY: 300,
            } as any);
        });

        // Advance timers past EDGE_PAN_DELAY (250ms) + some extra for pan to apply
        // Run multiple animation frames
        for (let i = 0; i < 30; i++) {
            fakeTime += 20; // 20ms per frame
            await act(async () => {
                vi.advanceTimersByTime(20);
            });
        }

        // End edge-pan loop and flush final state sync from ref -> React state.
        act(() => {
            result.current.handleMouseLeave();
        });
        fakeTime += 20;
        await act(async () => {
            vi.advanceTimersByTime(20);
        });

        // Should have panned right (pan.x increases to move view left)
        expect(result.current.pan.x).toBeGreaterThan(initialPanX);
    });
});
