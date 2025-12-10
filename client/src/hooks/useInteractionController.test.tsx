import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInteractionController } from "./useInteractionController";
import { useReachablePaths } from "./useReachablePaths";
import { DiplomacyState, GameState, HexCoord, UnitType, UnitState, TerrainType } from "@simple-civ/engine";

vi.mock("./useReachablePaths", () => ({
    useReachablePaths: vi.fn(),
}));

vi.mock("@simple-civ/engine", async () => {
    const actual = await vi.importActual<typeof import("@simple-civ/engine")>("@simple-civ/engine");
    return {
        ...actual,
        findPath: vi.fn(() => []),
    };
});

const mockUseReachablePaths = vi.mocked(useReachablePaths);

const makeState = (overrides: Partial<GameState>): GameState => ({
    players: [
        { id: "p1", civName: "ScholarKingdoms", color: "red", techs: [], completedProjects: [], isEliminated: false, currentTech: null },
        { id: "p2", civName: "ForgeClans", color: "blue", techs: [], completedProjects: [], isEliminated: false, currentTech: null },
    ],
    diplomacy: {},
    diplomacyOffers: [],
    units: [],
    cities: [],
    turn: 1,
    currentPlayerId: "p1",
    phase: "Action",
    map: { width: 5, height: 5, tiles: [] },
    seed: 1,
    visibility: {},
    revealed: {},
    sharedVision: {},
    contacts: {},
    ...overrides,
} as unknown as GameState);

beforeEach(() => {
    vi.clearAllMocks();
    mockUseReachablePaths.mockReturnValue({ reachablePaths: {}, reachableCoordSet: new Set() });
});

describe("useInteractionController", () => {
    it("queues war declaration when attacking an enemy at peace", () => {
        const dispatchAction = vi.fn();
        const runActions = vi.fn();
        const gameState = makeState({
            diplomacy: {
                "p1": { "p2": DiplomacyState.Peace },
                "p2": { "p1": DiplomacyState.Peace },
            },
            units: [
                { id: "u1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 0, r: 0 }, movesLeft: 1, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
                { id: "u2", ownerId: "p2", type: UnitType.Scout, coord: { q: 0, r: 1 }, movesLeft: 1, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
            ],
            visibility: { "p1": ["0,0", "0,1"] },
            revealed: { "p1": ["0,0", "0,1"] },
        });

        const { result } = renderHook(() => useInteractionController({ gameState, playerId: "p1", dispatchAction, runActions }));

        act(() => {
            result.current.setSelectedUnitId("u1");
        });
        act(() => {
            result.current.handleTileClick({ q: 0, r: 1 } as HexCoord);
        });

        expect(dispatchAction).not.toHaveBeenCalled();
        expect(result.current.pendingWarAttack).toEqual(expect.objectContaining({
            targetPlayerId: "p2",
            action: expect.objectContaining({ type: "Attack", targetId: "u2" }),
        }));
    });

    it("attacks immediately when already at war", () => {
        const dispatchAction = vi.fn();
        const runActions = vi.fn();
        const gameState = makeState({
            diplomacy: {
                "p1": { "p2": DiplomacyState.War },
                "p2": { "p1": DiplomacyState.War },
            },
            units: [
                { id: "u1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 0, r: 0 }, movesLeft: 1, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
                { id: "u2", ownerId: "p2", type: UnitType.Scout, coord: { q: 0, r: 1 }, movesLeft: 1, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
            ],
            visibility: { "p1": ["0,0", "0,1"] },
            revealed: { "p1": ["0,0", "0,1"] },
        });

        const { result } = renderHook(() => useInteractionController({
            gameState,
            playerId: "p1",
            dispatchAction,
            runActions,
            showCombatPreview: false,
        }));

        act(() => {
            result.current.setSelectedUnitId("u1");
        });
        act(() => {
            result.current.handleTileClick({ q: 0, r: 1 } as HexCoord);
        });

        expect(dispatchAction).toHaveBeenCalledWith(expect.objectContaining({
            type: "Attack",
            attackerId: "u1",
            targetId: "u2",
        }));
        expect(result.current.pendingWarAttack).toBeNull();
        expect(result.current.selectedUnitId).toBeNull();
        expect(result.current.selectedCoord).toBeNull();
    });

    it("stacks a civilian onto a friendly military unit when allowed", () => {
        const dispatchAction = vi.fn();
        const runActions = vi.fn();
        const gameState = makeState({
            units: [
                { id: "settler", ownerId: "p1", type: UnitType.Settler, coord: { q: 0, r: 0 }, movesLeft: 1, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
                { id: "guard", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 1, r: 0 }, movesLeft: 1, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
            ],
            visibility: { "p1": ["0,0", "1,0"] },
            revealed: { "p1": ["0,0", "1,0"] },
        });

        const { result } = renderHook(() => useInteractionController({ gameState, playerId: "p1", dispatchAction, runActions }));

        act(() => {
            result.current.setSelectedUnitId("settler");
        });
        act(() => {
            result.current.handleTileClick({ q: 1, r: 0 } as HexCoord);
        });

        expect(dispatchAction).toHaveBeenCalledWith(expect.objectContaining({
            type: "MoveUnit",
            unitId: "settler",
            to: { q: 1, r: 0 },
        }));
        expect(result.current.selectedUnitId).toBe("settler");
        expect(result.current.selectedCoord).toEqual({ q: 1, r: 0 });
        expect(result.current.pendingWarAttack).toBeNull();
    });

    it("executes planned path actions when reachable path exists", () => {
        mockUseReachablePaths.mockReturnValue({
            reachablePaths: {
                "0,1": { path: [{ q: 0, r: 1 }], movesLeft: 0 },
            },
            reachableCoordSet: new Set(["0,1"]),
        });

        const dispatchAction = vi.fn();
        const runActions = vi.fn();
        const gameState = makeState({
            units: [
                { id: "u1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 0, r: 0 }, movesLeft: 1, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
            ],
            visibility: { "p1": ["0,0", "0,1"] },
            revealed: { "p1": ["0,0", "0,1"] },
        });

        const { result } = renderHook(() => useInteractionController({ gameState, playerId: "p1", dispatchAction, runActions }));

        act(() => {
            result.current.setSelectedUnitId("u1");
        });
        act(() => {
            result.current.handleTileClick({ q: 0, r: 1 } as HexCoord);
        });

        expect(runActions).toHaveBeenCalledWith([
            {
                type: "MoveUnit",
                playerId: "p1",
                unitId: "u1",
                to: { q: 0, r: 1 },
            },
        ]);
        expect(result.current.selectedUnitId).toBeNull();
        expect(result.current.selectedCoord).toBeNull();
    });

    it("allows unit to move to adjacent fogged tile", () => {
        const dispatchAction = vi.fn();
        const runActions = vi.fn();
        const gameState = makeState({
            units: [
                { id: "u1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 0, r: 0 }, movesLeft: 1, hp: 100, maxHp: 100, state: UnitState.Normal, hasAttacked: false },
            ],
            map: {
                width: 5,
                height: 5,
                tiles: [
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] },
                ],
            },
            // 0,0 is visible, 0,1 is fogged (revealed but not visible) and adjacent
            visibility: { "p1": ["0,0"] },
            revealed: { "p1": ["0,0", "0,1"] },
        });

        const { result } = renderHook(() => useInteractionController({ gameState, playerId: "p1", dispatchAction, runActions }));

        act(() => {
            result.current.setSelectedUnitId("u1");
        });

        // Click on fogged tile 0,1 which is adjacent
        act(() => {
            result.current.handleTileClick({ q: 0, r: 1 } as HexCoord);
        });

        // Should call dispatchAction with MoveUnit for adjacent move
        expect(dispatchAction).toHaveBeenCalledWith({
            type: "MoveUnit",
            playerId: "p1",
            unitId: "u1",
            to: { q: 0, r: 1 },
        });
        // Unit should be deselected after the move (movesLeft was 1)
        expect(result.current.selectedUnitId).toBeNull();
        expect(result.current.selectedCoord).toBeNull();
    });
});
