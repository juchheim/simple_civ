import React from "react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppPresenterModel } from "./useAppPresenterModel";
import { useInGameContentProps } from "./useInGameContentProps";
import { useLoadGameModalPresenterProps } from "./useLoadGameModalPresenterProps";
import { useTitleFlowContentProps } from "./useTitleFlowContentProps";

vi.mock("./useTitleFlowContentProps", () => ({
    useTitleFlowContentProps: vi.fn(),
}));

vi.mock("./useInGameContentProps", () => ({
    useInGameContentProps: vi.fn(),
}));

vi.mock("./useLoadGameModalPresenterProps", () => ({
    useLoadGameModalPresenterProps: vi.fn(),
}));

const mockUseTitleFlowContentProps = vi.mocked(useTitleFlowContentProps);
const mockUseInGameContentProps = vi.mocked(useInGameContentProps);
const mockUseLoadGameModalPresenterProps = vi.mocked(useLoadGameModalPresenterProps);

function createCore(overrides: Record<string, unknown> = {}) {
    return {
        gameState: { id: "game-1" },
        playerId: "p1",
        runActions: vi.fn(),
        listSaves: vi.fn(() => []),
        error: null,
        setError: vi.fn(),
        showTitleScreen: false,
        hideTitle: vi.fn(),
        selectedCiv: "ForgeClans",
        setSelectedCiv: vi.fn(),
        selectedMapSize: "Standard",
        setSelectedMapSize: vi.fn(),
        numCivs: 4,
        setNumCivs: vi.fn(),
        selectedDifficulty: "Normal",
        setSelectedDifficulty: vi.fn(),
        resetToTitleScreen: vi.fn(),
        mapRef: { current: null },
        navigateMapView: vi.fn(),
        showSaveModal: false,
        showLoadModal: true,
        closeSaveModal: vi.fn(),
        closeLoadModal: vi.fn(),
        showCombatPreview: true,
        toggleCombatPreview: vi.fn(),
        disableCombatPreview: vi.fn(),
        showTechTree: false,
        openTechTree: vi.fn(),
        closeTechTree: vi.fn(),
        showShroud: true,
        toggleShroud: vi.fn(),
        showTileYields: false,
        toggleTileYields: vi.fn(),
        cityToCenter: null,
        setCityToCenter: vi.fn(),
        mapView: null,
        setMapView: vi.fn(),
        showGameMenu: false,
        setShowGameMenu: vi.fn(),
        musicEnabled: true,
        musicVolume: 0.5,
        setMusicVolume: vi.fn(),
        musicStatusLabel: "Music is idle.",
        toggleMusic: vi.fn(),
        selectedCoord: { q: 1, r: 2 },
        setSelectedCoord: vi.fn(),
        selectedUnitId: "u1",
        setSelectedUnitId: vi.fn(),
        pendingWarAttack: null,
        setPendingWarAttack: vi.fn(),
        pendingCombatPreview: null,
        confirmCombatPreview: vi.fn(),
        cancelCombatPreview: vi.fn(),
        handleTileClick: vi.fn(),
        reachableCoordSet: new Set<string>(),
        clearSelection: vi.fn(),
        allToasts: [{ id: "t1", message: "toast" }],
        dismissToast: vi.fn(),
        handleStartNewGame: vi.fn(),
        handleAction: vi.fn(),
        handleChooseTech: vi.fn(),
        handleSaveGame: vi.fn(),
        confirmSaveGame: vi.fn(),
        handleLoadGame: vi.fn(),
        confirmLoadGame: vi.fn(),
        handleRestart: vi.fn(),
        handleResign: vi.fn(),
        quitToTitle: vi.fn(),
        ...overrides,
    } as any;
}

describe("useAppPresenterModel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseTitleFlowContentProps.mockReturnValue({ view: "title" } as any);
        mockUseInGameContentProps.mockReturnValue({ view: "game" } as any);
        mockUseLoadGameModalPresenterProps.mockReturnValue({ isOpen: true } as any);
    });

    it("maps core state into title/game/modal presenter hooks", () => {
        const core = createCore();
        const { result } = renderHook(() => useAppPresenterModel(core));

        expect(mockUseTitleFlowContentProps).toHaveBeenCalledWith(expect.objectContaining({
            showTitleScreen: false,
            onShowSetup: core.hideTitle,
            onLoadGame: core.handleLoadGame,
            selectedCiv: "ForgeClans",
            selectedMapSize: "Standard",
            numCivs: 4,
            selectedDifficulty: "Normal",
            onStartGame: core.handleStartNewGame,
            onBack: core.resetToTitleScreen,
        }));

        expect(mockUseInGameContentProps).toHaveBeenCalledWith(expect.objectContaining({
            gameState: core.gameState,
            playerId: "p1",
            onAction: core.handleAction,
            onLoad: core.handleLoadGame,
            onQuit: core.quitToTitle,
            showCombatPreview: true,
            onDisableCombatPreview: core.disableCombatPreview,
            error: null,
            setError: core.setError,
        }));

        expect(mockUseLoadGameModalPresenterProps).toHaveBeenCalledWith({
            isOpen: true,
            onClose: core.closeLoadModal,
            listSaves: core.listSaves,
            onLoad: core.confirmLoadGame,
        });

        expect(result.current.loadGameModalPresenterProps).toEqual({ isOpen: true });
        expect(result.current.appShellProps.hasGameState).toBe(true);
        expect(React.isValidElement(result.current.appShellProps.titleContent)).toBe(true);
        expect(React.isValidElement(result.current.appShellProps.gameContent)).toBe(true);
    });

    it("sets hasGameState false when no game is active", () => {
        const core = createCore({ gameState: null });
        const { result } = renderHook(() => useAppPresenterModel(core));
        expect(result.current.appShellProps.hasGameState).toBe(false);
    });
});
