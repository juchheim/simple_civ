import { useCallback } from "react";
import { Action, DifficultyLevel, GameState, MapSize, TechId } from "@simple-civ/engine";
import { SetupPlayer } from "./useGameSetupConfig";

type LoadSlot = "manual" | "auto";

type UseAppSessionCommandsParams = {
    playerId: string;
    selectedMapSize: MapSize;
    selectedDifficulty: DifficultyLevel;
    buildPlayers: (parsedSeed?: number) => SetupPlayer[];
    startNewGame: (settings: { mapSize: MapSize; players: SetupPlayer[]; difficulty: DifficultyLevel }) => GameState;
    restartLastGame: () => boolean;
    hasLastGameSettings: boolean;
    saveGame: () => boolean;
    loadGame: (slot?: LoadSlot) => boolean;
    runActions: (actions: Action[]) => void;
    clearSession: () => void;
    clearSelection: () => void;
    closeGameMenu: () => void;
    resetUiOverlays: () => void;
    resetToTitleScreen: () => void;
    setShowTechTree: (show: boolean) => void;
    setShowGameMenu: (show: boolean) => void;
    setShowTitleScreen: (show: boolean) => void;
    openSaveModal: () => void;
    openLoadModal: () => void;
};

type UseAppSessionCommandsResult = {
    handleStartNewGame: () => void;
    handleAction: (action: Action) => void;
    handleChooseTech: (techId: TechId) => void;
    handleSaveGame: () => void;
    confirmSaveGame: () => void;
    handleLoadGame: () => void;
    confirmLoadGame: (slot: LoadSlot) => void;
    handleRestart: () => void;
    handleResign: () => void;
    quitToTitle: () => void;
};

export function useAppSessionCommands({
    playerId,
    selectedMapSize,
    selectedDifficulty,
    buildPlayers,
    startNewGame,
    restartLastGame,
    hasLastGameSettings,
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
}: UseAppSessionCommandsParams): UseAppSessionCommandsResult {
    const handleStartNewGame = useCallback(() => {
        try {
            const players = buildPlayers(undefined);
            const settings = { mapSize: selectedMapSize, players, difficulty: selectedDifficulty };
            const state = startNewGame(settings);
            console.info("[World] seed", state.seed);
            setShowTechTree(true);
            setShowGameMenu(false);
            setShowTitleScreen(false);
            clearSelection();
        } catch (error: any) {
            console.error("App: Error generating world:", error);
            alert(`Failed to start game: ${error?.message ?? error}`);
        }
    }, [
        buildPlayers,
        clearSelection,
        selectedDifficulty,
        selectedMapSize,
        setShowGameMenu,
        setShowTechTree,
        setShowTitleScreen,
        startNewGame,
    ]);

    const handleAction = useCallback((action: Action) => {
        runActions([action]);
        if (action.type === "SetAutoExplore") {
            clearSelection();
        }
    }, [clearSelection, runActions]);

    const handleChooseTech = useCallback((techId: TechId) => {
        handleAction({ type: "ChooseTech", playerId, techId });
        setShowTechTree(false);
    }, [handleAction, playerId, setShowTechTree]);

    const handleSaveGame = useCallback(() => {
        openSaveModal();
    }, [openSaveModal]);

    const confirmSaveGame = useCallback(() => {
        saveGame();
        // Toast is handled by modal for now or we can add one here
        // But modal has built-in feedback as per implementation
    }, [saveGame]);

    const handleLoadGame = useCallback(() => {
        openLoadModal();
    }, [openLoadModal]);

    const confirmLoadGame = useCallback((slot: LoadSlot) => {
        const success = loadGame(slot);
        if (success) {
            setShowTitleScreen(false);
            clearSelection();
            closeGameMenu();
        } else {
            alert("Failed to load game.");
        }
    }, [clearSelection, closeGameMenu, loadGame, setShowTitleScreen]);

    const handleRestart = useCallback(() => {
        if (!hasLastGameSettings) return;
        try {
            const restarted = restartLastGame();
            if (!restarted) return;
            console.info("[World] Restarted with previous settings");
            setShowTechTree(true);
            closeGameMenu();
            clearSelection();
        } catch (error: any) {
            console.error("App: Error restarting game:", error);
            alert(`Failed to restart game: ${error?.message ?? error}`);
        }
    }, [
        clearSelection,
        closeGameMenu,
        hasLastGameSettings,
        restartLastGame,
        setShowTechTree,
    ]);

    const quitToTitle = useCallback(() => {
        clearSession();
        resetToTitleScreen();
    }, [clearSession, resetToTitleScreen]);

    const handleResign = useCallback(() => {
        handleAction({ type: "Resign", playerId });
        resetUiOverlays();
        clearSelection();
    }, [clearSelection, handleAction, playerId, resetUiOverlays]);

    return {
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
