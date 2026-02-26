import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Action, DifficultyLevel, GameState, MapSize } from "@simple-civ/engine";
import { SetupPlayer } from "./useGameSetupConfig";
import { useAppSessionCommands } from "./useAppSessionCommands";

type TestParams = Parameters<typeof useAppSessionCommands>[0];

function createParams(overrides: Partial<TestParams> = {}): TestParams {
    const players: SetupPlayer[] = [
        { id: "p1", civName: "ForgeClans", color: "#f97316" },
        { id: "p2", civName: "ScholarKingdoms", color: "#0ea5e9", ai: true },
    ];

    return {
        playerId: "p1",
        selectedMapSize: "Standard" as MapSize,
        selectedDifficulty: "Normal" as DifficultyLevel,
        buildPlayers: vi.fn(() => players),
        startNewGame: vi.fn(() => ({ seed: 42 } as GameState)),
        restartLastGame: vi.fn(() => true),
        hasLastGameSettings: true,
        saveGame: vi.fn(() => true),
        loadGame: vi.fn(() => true),
        runActions: vi.fn(),
        clearSession: vi.fn(),
        clearSelection: vi.fn(),
        closeGameMenu: vi.fn(),
        resetUiOverlays: vi.fn(),
        resetToTitleScreen: vi.fn(),
        setShowTechTree: vi.fn(),
        setShowGameMenu: vi.fn(),
        setShowTitleScreen: vi.fn(),
        openSaveModal: vi.fn(),
        openLoadModal: vi.fn(),
        ...overrides,
    };
}

describe("useAppSessionCommands", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("starts a new game and updates setup overlays", () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const params = createParams();
        const { result } = renderHook(() => useAppSessionCommands(params));

        act(() => {
            result.current.handleStartNewGame();
        });

        expect(params.buildPlayers).toHaveBeenCalledWith(undefined);
        expect(params.startNewGame).toHaveBeenCalledWith({
            mapSize: "Standard",
            players: expect.any(Array),
            difficulty: "Normal",
        });
        expect(params.setShowTechTree).toHaveBeenCalledWith(true);
        expect(params.setShowGameMenu).toHaveBeenCalledWith(false);
        expect(params.setShowTitleScreen).toHaveBeenCalledWith(false);
        expect(params.clearSelection).toHaveBeenCalled();
        expect(infoSpy).toHaveBeenCalledWith("[World] seed", 42);
        expect(errorSpy).not.toHaveBeenCalled();
        infoSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it("opens save/load modals and confirms save", () => {
        const params = createParams();
        const { result } = renderHook(() => useAppSessionCommands(params));

        act(() => {
            result.current.handleSaveGame();
            result.current.handleLoadGame();
            result.current.confirmSaveGame();
        });

        expect(params.openSaveModal).toHaveBeenCalled();
        expect(params.openLoadModal).toHaveBeenCalled();
        expect(params.saveGame).toHaveBeenCalled();
    });

    it("loads from slot and handles failure with alert", () => {
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const params = createParams({ loadGame: vi.fn(() => false) });
        const { result } = renderHook(() => useAppSessionCommands(params));

        act(() => {
            result.current.confirmLoadGame("manual");
        });

        expect(params.loadGame).toHaveBeenCalledWith("manual");
        expect(params.setShowTitleScreen).not.toHaveBeenCalled();
        expect(params.clearSelection).not.toHaveBeenCalled();
        expect(params.closeGameMenu).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith("Failed to load game.");
        alertSpy.mockRestore();
    });

    it("skips restart when previous settings are unavailable", () => {
        const params = createParams({ hasLastGameSettings: false });
        const { result } = renderHook(() => useAppSessionCommands(params));

        act(() => {
            result.current.handleRestart();
        });

        expect(params.restartLastGame).not.toHaveBeenCalled();
        expect(params.setShowTechTree).not.toHaveBeenCalled();
    });

    it("dispatches auto-explore clear and resign actions", () => {
        const params = createParams();
        const { result } = renderHook(() => useAppSessionCommands(params));

        act(() => {
            result.current.handleAction({ type: "SetAutoExplore", playerId: "p1", unitId: "u1" } as Action);
            result.current.handleResign();
        });

        expect(params.runActions).toHaveBeenCalledWith([
            { type: "SetAutoExplore", playerId: "p1", unitId: "u1" },
        ]);
        expect(params.runActions).toHaveBeenCalledWith([{ type: "Resign", playerId: "p1" }]);
        expect(params.resetUiOverlays).toHaveBeenCalled();
        expect(params.clearSelection).toHaveBeenCalled();
    });

    it("quits to title via clearSession and reset", () => {
        const params = createParams();
        const { result } = renderHook(() => useAppSessionCommands(params));

        act(() => {
            result.current.quitToTitle();
        });

        expect(params.clearSession).toHaveBeenCalled();
        expect(params.resetToTitleScreen).toHaveBeenCalled();
    });
});
