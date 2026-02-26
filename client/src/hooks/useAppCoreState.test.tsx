import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppCoreState } from "./useAppCoreState";
import { useAppInteractionBindings } from "./useAppInteractionBindings";
import { useAppSessionCommands } from "./useAppSessionCommands";
import { useAppToasts } from "./useAppToasts";
import { useAppUiFlow } from "./useAppUiFlow";
import { useAutoClearError } from "./useAutoClearError";
import { useCombatPreviewPreference } from "./useCombatPreviewPreference";
import { useEraMusic } from "./useEraMusic";
import { useGameSession } from "./useGameSession";
import { useGameSetupConfig } from "./useGameSetupConfig";
import { useMapViewportBridge } from "./useMapViewportBridge";
import { useMusicUiState } from "./useMusicUiState";
import { useSessionModals } from "./useSessionModals";
import { useSyncTutorialGameId } from "./useSyncTutorialGameId";
import { useTitleFlow } from "./useTitleFlow";
import { useTitleScreenReset } from "./useTitleScreenReset";

vi.mock("./useTitleFlow", () => ({ useTitleFlow: vi.fn() }));
vi.mock("./useGameSession", () => ({ useGameSession: vi.fn() }));
vi.mock("./useMapViewportBridge", () => ({ useMapViewportBridge: vi.fn() }));
vi.mock("./useSessionModals", () => ({ useSessionModals: vi.fn() }));
vi.mock("./useGameSetupConfig", () => ({ useGameSetupConfig: vi.fn() }));
vi.mock("./useCombatPreviewPreference", () => ({ useCombatPreviewPreference: vi.fn() }));
vi.mock("./useAppUiFlow", () => ({ useAppUiFlow: vi.fn() }));
vi.mock("./useEraMusic", () => ({ useEraMusic: vi.fn() }));
vi.mock("./useMusicUiState", () => ({ useMusicUiState: vi.fn() }));
vi.mock("./useAppInteractionBindings", () => ({ useAppInteractionBindings: vi.fn() }));
vi.mock("./useAutoClearError", () => ({ useAutoClearError: vi.fn() }));
vi.mock("./useTitleScreenReset", () => ({ useTitleScreenReset: vi.fn() }));
vi.mock("./useAppToasts", () => ({ useAppToasts: vi.fn() }));
vi.mock("./useSyncTutorialGameId", () => ({ useSyncTutorialGameId: vi.fn() }));
vi.mock("./useAppSessionCommands", () => ({ useAppSessionCommands: vi.fn() }));

const mockUseTitleFlow = vi.mocked(useTitleFlow);
const mockUseGameSession = vi.mocked(useGameSession);
const mockUseMapViewportBridge = vi.mocked(useMapViewportBridge);
const mockUseSessionModals = vi.mocked(useSessionModals);
const mockUseGameSetupConfig = vi.mocked(useGameSetupConfig);
const mockUseCombatPreviewPreference = vi.mocked(useCombatPreviewPreference);
const mockUseAppUiFlow = vi.mocked(useAppUiFlow);
const mockUseEraMusic = vi.mocked(useEraMusic);
const mockUseMusicUiState = vi.mocked(useMusicUiState);
const mockUseAppInteractionBindings = vi.mocked(useAppInteractionBindings);
const mockUseAutoClearError = vi.mocked(useAutoClearError);
const mockUseTitleScreenReset = vi.mocked(useTitleScreenReset);
const mockUseAppToasts = vi.mocked(useAppToasts);
const mockUseSyncTutorialGameId = vi.mocked(useSyncTutorialGameId);
const mockUseAppSessionCommands = vi.mocked(useAppSessionCommands);

describe("useAppCoreState", () => {
    const gameState = { id: "game-1", winnerId: null } as any;
    const runActions = vi.fn();
    const setError = vi.fn();
    const clearSelection = vi.fn();
    const closeGameMenu = vi.fn();
    const resetUiOverlays = vi.fn();
    const setShowTechTree = vi.fn();
    const setShowGameMenu = vi.fn();
    const setShowTitleScreen = vi.fn();
    const openSaveModal = vi.fn();
    const openLoadModal = vi.fn();
    const hideTitle = vi.fn();
    const showTitle = vi.fn();
    const handleSessionRestore = vi.fn();
    const resetToTitleScreen = vi.fn();
    const mapRef = { current: null };
    const navigateMapView = vi.fn();
    const dismissToast = vi.fn();
    const handleStartNewGame = vi.fn();
    const handleAction = vi.fn();
    const handleChooseTech = vi.fn();
    const handleSaveGame = vi.fn();
    const confirmSaveGame = vi.fn();
    const handleLoadGame = vi.fn();
    const confirmLoadGame = vi.fn();
    const handleRestart = vi.fn();
    const handleResign = vi.fn();
    const quitToTitle = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        mockUseTitleFlow.mockReturnValue({
            showTitleScreen: false,
            setShowTitleScreen,
            showTitle,
            hideTitle,
            handleSessionRestore,
        });
        mockUseGameSession.mockReturnValue({
            gameState,
            playerId: "p1",
            runActions,
            saveGame: vi.fn(),
            loadGame: vi.fn(),
            listSaves: vi.fn(() => []),
            lastGameSettings: { mapSize: "Standard" },
            clearSession: vi.fn(),
            error: "boom",
            setError,
            startNewGame: vi.fn(),
            restartLastGame: vi.fn(),
        } as any);
        mockUseMapViewportBridge.mockReturnValue({
            mapRef,
            navigateMapView,
        });
        mockUseSessionModals.mockReturnValue({
            showSaveModal: true,
            showLoadModal: true,
            openSaveModal,
            closeSaveModal: vi.fn(),
            openLoadModal,
            closeLoadModal: vi.fn(),
        });
        mockUseGameSetupConfig.mockReturnValue({
            selectedCiv: "ForgeClans",
            setSelectedCiv: vi.fn(),
            selectedMapSize: "Standard",
            setSelectedMapSize: vi.fn(),
            numCivs: 4,
            setNumCivs: vi.fn(),
            selectedDifficulty: "Normal",
            setSelectedDifficulty: vi.fn(),
            buildPlayers: vi.fn(() => []),
        } as any);
        mockUseCombatPreviewPreference.mockReturnValue({
            showCombatPreview: true,
            setShowCombatPreview: vi.fn(),
            toggleCombatPreview: vi.fn(),
            disableCombatPreview: vi.fn(),
        });
        mockUseAppUiFlow.mockReturnValue({
            showTechTree: false,
            setShowTechTree,
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
            setShowGameMenu,
            openGameMenu: vi.fn(),
            closeGameMenu,
            resetMapNavigation: vi.fn(),
            resetUiOverlays,
        });
        mockUseEraMusic.mockReturnValue({
            activeEra: null,
            musicEnabled: true,
            setMusicEnabled: vi.fn(),
            musicVolume: 0.5,
            setMusicVolume: vi.fn(),
            readyForPlayback: true,
            playbackError: null,
        } as any);
        mockUseMusicUiState.mockReturnValue({
            musicStatusLabel: "Music is idle.",
            toggleMusic: vi.fn(),
        });
        mockUseAppInteractionBindings.mockReturnValue({
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
            reachableCoordSet: new Set<string>(["1,2"]),
            clearSelection,
        } as any);
        mockUseTitleScreenReset.mockReturnValue(resetToTitleScreen);
        mockUseAppToasts.mockReturnValue({
            toasts: [{ id: "t1", message: "hello" }],
            dismissToast,
        } as any);
        mockUseAppSessionCommands.mockReturnValue({
            handleStartNewGame,
            handleAction,
            handleChooseTech,
            handleSaveGame,
            confirmSaveGame,
            handleLoadGame,
            confirmLoadGame,
            handleRestart,
            handleResign,
            quitToTitle,
        });
    });

    it("wires child hooks with expected orchestration arguments", () => {
        renderHook(() => useAppCoreState());

        expect(mockUseGameSession).toHaveBeenCalledWith({ onSessionRestore: handleSessionRestore });
        expect(mockUseEraMusic).toHaveBeenCalledWith(expect.objectContaining({
            gameState,
            playerId: "p1",
            isInGame: true,
        }));
        expect(mockUseAppInteractionBindings).toHaveBeenCalledWith(expect.objectContaining({
            gameState,
            playerId: "p1",
            runActions,
            showCombatPreview: true,
            showTechTree: false,
            showGameMenu: false,
        }));
        expect(mockUseTitleScreenReset).toHaveBeenCalledWith(expect.objectContaining({
            clearSelection,
            resetUiOverlays,
            showTitle,
        }));
        expect(mockUseAutoClearError).toHaveBeenCalledWith("boom", setError, 3000);
        expect(mockUseSyncTutorialGameId).toHaveBeenCalledWith("game-1");
        expect(mockUseAppSessionCommands).toHaveBeenCalledWith(expect.objectContaining({
            playerId: "p1",
            hasLastGameSettings: true,
            resetToTitleScreen,
            setShowTechTree,
            setShowGameMenu,
            setShowTitleScreen,
            openSaveModal,
            openLoadModal,
            closeGameMenu,
            resetUiOverlays,
        }));
    });

    it("returns merged state and handlers from composed hooks", () => {
        const { result } = renderHook(() => useAppCoreState());

        expect(result.current.gameState).toBe(gameState);
        expect(result.current.hideTitle).toBe(hideTitle);
        expect(result.current.mapRef).toBe(mapRef);
        expect(result.current.navigateMapView).toBe(navigateMapView);
        expect(result.current.musicStatusLabel).toBe("Music is idle.");
        expect(result.current.resetToTitleScreen).toBe(resetToTitleScreen);
        expect(result.current.dismissToast).toBe(dismissToast);
        expect(result.current.handleStartNewGame).toBe(handleStartNewGame);
        expect(result.current.handleLoadGame).toBe(handleLoadGame);
        expect(result.current.quitToTitle).toBe(quitToTitle);
    });
});
