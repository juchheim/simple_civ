import { renderHook } from "@testing-library/react";
import { useRenderData } from "./useRenderData";
import { GameState, Tile, TerrainType, Unit, City, UnitType, UnitState } from "@simple-civ/engine";
import { describe, it, expect, vi } from "vitest";
import { TileVisibilityState } from "./useMapVisibility";

// Mock dependencies
vi.mock("../components/GameMap/useRiverPolylines", () => ({
    useRiverPolylines: () => [],
}));

describe("useRenderData", () => {
    const mockTiles: Tile[] = [
        { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
        { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
    ];

    const mockUnits: Unit[] = [
        { id: "u1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 0, r: 0 }, movesLeft: 2, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
        { id: "u2", ownerId: "p2", type: UnitType.SpearGuard, coord: { q: 1, r: 0 }, movesLeft: 2, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
    ];

    const mockCities: City[] = [
        { id: "c1", ownerId: "p1", name: "City 1", coord: { q: 0, r: 0 }, pop: 1, buildings: [], storedFood: 0, storedProduction: 0, workedTiles: [], currentBuild: null, buildProgress: 0, hp: 100, maxHp: 100, isCapital: false, hasFiredThisTurn: false, milestones: [] },
    ];

    const mockGameState = {
        players: [{ id: "p1", color: "red", civName: "TestCiv" }, { id: "p2", color: "blue", civName: "EnemyCiv" }],
    } as unknown as GameState;

    const mockTileVisibility = new Map<string, TileVisibilityState>();
    mockTileVisibility.set("0,0", { isVisible: true, isFogged: false, isShroud: false });
    mockTileVisibility.set("1,0", { isVisible: false, isFogged: true, isShroud: false });

    const mockRenderableKeys = new Set(["0,0", "1,0"]);

    const mockHexToPixel = vi.fn((hex) => ({ x: hex.q * 10, y: hex.r * 10 }));

    const defaultProps = {
        gameState: mockGameState,
        playerId: "p1",
        map: { tiles: mockTiles },
        units: mockUnits,
        cities: mockCities,
        tileVisibility: mockTileVisibility,
        renderableKeys: mockRenderableKeys,
        selectedCoord: null,
        selectedUnitId: null,
        hoveredCoord: null,
        reachableCoords: new Set<string>(),
        hexToPixel: mockHexToPixel,
        FALLBACK_VISIBILITY: { isVisible: false, isFogged: false, isShroud: true },
    };

    it("generates tileRenderData for renderable keys", () => {
        const { result } = renderHook(() => useRenderData(defaultProps));
        expect(result.current.tileRenderData).toHaveLength(2);
        expect(result.current.tileRenderData.find(t => t.key === "0,0")?.visibility.isVisible).toBe(true);
        expect(result.current.tileRenderData.find(t => t.key === "1,0")?.visibility.isVisible).toBe(false);
    });

    it("generates unitRenderData only for visible tiles", () => {
        const { result } = renderHook(() => useRenderData(defaultProps));
        // u1 is at 0,0 (visible), u2 is at 1,0 (not visible)
        expect(result.current.unitRenderData).toHaveLength(1);
        expect(result.current.unitRenderData[0].unit.id).toBe("u1");
        expect(result.current.unitRenderDataOnCity).toHaveLength(1);
        expect(result.current.unitRenderDataOffCity).toHaveLength(0);
    });

    it("generates cityOverlayData for visible cities", () => {
        const { result } = renderHook(() => useRenderData(defaultProps));
        // c1 is at 0,0 (visible)
        expect(result.current.cityOverlayData).toHaveLength(1);
        expect(result.current.cityOverlayData[0].city.id).toBe("c1");
    });
});
