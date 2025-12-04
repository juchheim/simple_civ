import { renderHook } from "@testing-library/react";
import { useMapVisibility } from "./useMapVisibility";
import { GameState, Tile, TerrainType } from "@simple-civ/engine";
import { describe, it, expect } from "vitest";

describe("useMapVisibility", () => {
    const mockTiles: Tile[] = [
        { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains },
        { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains },
        { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains },
    ];

    const mockGameState = {
        visibility: {
            "p1": ["0,0"],
        },
        revealed: {
            "p1": ["0,0", "1,0"],
        },
    } as unknown as GameState;

    it("correctly identifies visible, fogged, and shroud tiles", () => {
        const { result } = renderHook(() =>
            useMapVisibility({
                gameState: mockGameState,
                playerId: "p1",
                map: { tiles: mockTiles },
            })
        );

        const { tileVisibility } = result.current;

        // Visible tile (0,0)
        expect(tileVisibility.get("0,0")).toEqual({
            isVisible: true,
            isFogged: false,
            isShroud: false,
        });

        // Fogged tile (1,0) - revealed but not visible
        expect(tileVisibility.get("1,0")).toEqual({
            isVisible: false,
            isFogged: true,
            isShroud: false,
        });

        // Shroud tile (2,0) - neither visible nor revealed
        expect(tileVisibility.get("2,0")).toEqual({
            isVisible: false,
            isFogged: false,
            isShroud: true,
        });
    });

    it("calculates renderable keys with buffer", () => {
        const { result } = renderHook(() =>
            useMapVisibility({
                gameState: mockGameState,
                playerId: "p1",
                map: { tiles: mockTiles },
            })
        );

        const { renderableKeys } = result.current;

        // Should include visible (0,0) and revealed (1,0) plus neighbors
        expect(renderableKeys.has("0,0")).toBe(true);
        expect(renderableKeys.has("1,0")).toBe(true);
        // Buffer check: (0,0) neighbor (1,0) is included, and (2,0) is neighbor of (1,0)
        expect(renderableKeys.has("2,0")).toBe(true);
    });
});
