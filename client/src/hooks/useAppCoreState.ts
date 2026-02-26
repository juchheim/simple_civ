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

export function useAppCoreState() {
    const {
        showTitleScreen,
        setShowTitleScreen,
        showTitle,
        hideTitle,
        handleSessionRestore,
    } = useTitleFlow();

    const {
        gameState,
        playerId,
        runActions,
        saveGame,
        loadGame,
        listSaves,
        lastGameSettings,
        clearSession,
        error,
        setError,
        startNewGame,
        restartLastGame,
    } = useGameSession({ onSessionRestore: handleSessionRestore });
    const { mapRef, navigateMapView } = useMapViewportBridge();
    const {
        showSaveModal,
        showLoadModal,
        openSaveModal,
        closeSaveModal,
        openLoadModal,
        closeLoadModal,
    } = useSessionModals();
    const {
        selectedCiv,
        setSelectedCiv,
        selectedMapSize,
        setSelectedMapSize,
        numCivs,
        setNumCivs,
        selectedDifficulty,
        setSelectedDifficulty,
        buildPlayers,
    } = useGameSetupConfig();

    const {
        showCombatPreview,
        toggleCombatPreview,
        disableCombatPreview,
    } = useCombatPreviewPreference();
    const {
        showTechTree,
        setShowTechTree,
        openTechTree,
        closeTechTree,
        showShroud,
        toggleShroud,
        showTileYields,
        toggleTileYields,
        cityToCenter,
        setCityToCenter,
        mapView,
        setMapView,
        showGameMenu,
        setShowGameMenu,
        openGameMenu,
        closeGameMenu,
        resetMapNavigation,
        resetUiOverlays,
    } = useAppUiFlow();
    const {
        activeEra: activeMusicEra,
        musicEnabled,
        setMusicEnabled,
        musicVolume,
        setMusicVolume,
        readyForPlayback: musicReadyForPlayback,
        playbackError: musicPlaybackError,
    } = useEraMusic({
        gameState,
        playerId,
        isInGame: Boolean(gameState && !showTitleScreen && !gameState.winnerId),
    });
    const { musicStatusLabel, toggleMusic } = useMusicUiState({
        activeEra: activeMusicEra,
        readyForPlayback: musicReadyForPlayback,
        playbackError: musicPlaybackError,
        musicEnabled,
        setMusicEnabled,
    });

    const {
        selectedCoord,
        setSelectedCoord,
        selectedUnitId,
        setSelectedUnitId,
        pendingWarAttack,
        setPendingWarAttack,
        pendingCombatPreview,
        confirmCombatPreview,
        cancelCombatPreview,
        handleTileClick,
        reachableCoordSet,
        clearSelection,
    } = useAppInteractionBindings({
        gameState,
        playerId,
        runActions,
        showCombatPreview,
        showTechTree,
        showGameMenu,
        closeTechTree,
        closeGameMenu,
        openGameMenu,
    });

    useAutoClearError(error, setError, 3000);

    const resetToTitleScreen = useTitleScreenReset({
        clearSelection,
        resetUiOverlays,
        resetMapNavigation,
        showTitle,
    });

    const { toasts: allToasts, dismissToast } = useAppToasts(gameState, playerId);

    useSyncTutorialGameId(gameState?.id ?? null);

    const {
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
    } = useAppSessionCommands({
        playerId,
        selectedMapSize,
        selectedDifficulty,
        buildPlayers,
        startNewGame,
        restartLastGame,
        hasLastGameSettings: Boolean(lastGameSettings),
        saveGame,
        loadGame,
        runActions,
        clearSession,
        clearSelection,
        closeGameMenu,
        resetUiOverlays,
        resetToTitleScreen,
        setShowTechTree,
        setShowGameMenu,
        setShowTitleScreen,
        openSaveModal,
        openLoadModal,
    });

    return {
        gameState,
        playerId,
        runActions,
        listSaves,
        error,
        setError,
        showTitleScreen,
        hideTitle,
        selectedCiv,
        setSelectedCiv,
        selectedMapSize,
        setSelectedMapSize,
        numCivs,
        setNumCivs,
        selectedDifficulty,
        setSelectedDifficulty,
        resetToTitleScreen,
        mapRef,
        navigateMapView,
        showSaveModal,
        showLoadModal,
        closeSaveModal,
        closeLoadModal,
        showCombatPreview,
        toggleCombatPreview,
        disableCombatPreview,
        showTechTree,
        openTechTree,
        closeTechTree,
        showShroud,
        toggleShroud,
        showTileYields,
        toggleTileYields,
        cityToCenter,
        setCityToCenter,
        mapView,
        setMapView,
        showGameMenu,
        setShowGameMenu,
        musicEnabled,
        musicVolume,
        setMusicVolume,
        musicStatusLabel,
        toggleMusic,
        selectedCoord,
        setSelectedCoord,
        selectedUnitId,
        setSelectedUnitId,
        pendingWarAttack,
        setPendingWarAttack,
        pendingCombatPreview,
        confirmCombatPreview,
        cancelCombatPreview,
        handleTileClick,
        reachableCoordSet,
        clearSelection,
        allToasts,
        dismissToast,
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
    };
}

export type AppCoreState = ReturnType<typeof useAppCoreState>;
