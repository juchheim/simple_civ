import { useCallback, useEffect, useRef, useState } from "react";
import {
    Action,
    GameState,
    applyAction,
    generateWorld,
    refreshPlayerVision,
    runAiTurn,
} from "@simple-civ/engine";
import {
    AUTOSAVE_KEY,
    chooseSave,
    createSaveData,
    ensureEndTurnForWinner,
    GameSetup,
    LAST_SETTINGS_KEY,
    parseSave,
    pickActivePlayerId,
    SAVE_KEY,
    SavedGame,
    SESSION_SAVE_KEY,
    shouldCreateAutosave
} from "./game-session-helpers";

type SessionCommands = {
    startNewGame: (settings: GameSetup) => GameState;
    restartLastGame: () => boolean;
    saveGame: () => boolean;
    loadGame: (slot?: "manual" | "auto") => boolean;
    listSaves: () => { manual: SavedGame | null; auto: SavedGame | null };
    clearSession: () => void;
    runActions: (actions: Action[]) => void;
};

type SessionState = {
    gameState: GameState | null;
    playerId: string;
    lastGameSettings: GameSetup | null;
    error: string | null;
    setError: (msg: string | null) => void;
};

function refreshVisibilityForAllPlayers(state: GameState): GameState {
    for (const player of state.players) {
        if (player.isEliminated) continue;
        refreshPlayerVision(state, player.id);
    }
    return state;
}

/**
 * Hook to manage the game session state (start, save, load, restart).
 * Handles persistence to localStorage and auto-saving.
 * @param options - Configuration options.
 * @param options.onSessionRestore - Callback fired when a session is restored from storage.
 * @returns The session state and command functions.
 */
export function useGameSession(options?: { onSessionRestore?: () => void }): SessionState & SessionCommands {
    const { onSessionRestore } = options ?? {};
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [playerId, setPlayerId] = useState("p1");
    const [lastGameSettings, setLastGameSettings] = useState<GameSetup | null>(null);
    const [error, setError] = useState<string | null>(null);
    const skipPersistenceRef = useRef(false);

    const runActions = useCallback((actions: Action[]) => {
        skipPersistenceRef.current = false;
        setGameState(prev => {
            if (!prev || actions.length === 0) return prev;
            let nextState = prev;
            try {
                for (const action of actions) {
                    nextState = applyAction(nextState, action);
                }
                setError(null); // Clear previous errors on success
            } catch (e: any) {
                console.warn("Action failed:", e);
                setError(e.message || "Unknown error occurred");
                return prev; // Abort and return previous state
            }

            const nextPlayer = nextState.players.find(p => p.id === nextState.currentPlayerId);
            if (nextPlayer && !nextPlayer.isAI && nextState.currentPlayerId !== playerId) {
                setPlayerId(nextState.currentPlayerId);
            }
            return nextState;
        });
    }, [playerId]);

    const startNewGame = useCallback((settings: GameSetup) => {
        skipPersistenceRef.current = false;
        const state = generateWorld(settings);
        setGameState(state);
        setPlayerId("p1");
        setLastGameSettings({ ...settings, seed: state.seed });
        return state;
    }, []);

    const restartLastGame = useCallback(() => {
        if (!lastGameSettings) return false;
        skipPersistenceRef.current = false;

        const settings = { ...lastGameSettings };
        if (settings.startWithRandomSeed) {
            delete settings.seed;
        }

        const state = generateWorld(settings);
        setGameState(state);
        setPlayerId("p1");

        // If we generated a new seed, ensure it's saved in the new settings, but keep the flag
        setLastGameSettings({ ...settings, seed: state.seed });
        return true;
    }, [lastGameSettings]);

    const saveGame = useCallback(() => {
        if (!gameState) return false;
        try {
            const saveData = createSaveData(gameState);
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch {
            return false;
        }
    }, [gameState]);

    const loadGame = useCallback((slot?: "manual" | "auto") => {
        skipPersistenceRef.current = false;
        try {
            const rawManual = localStorage.getItem(SAVE_KEY);
            const rawAuto = localStorage.getItem(AUTOSAVE_KEY);

            const manualSave = rawManual ? parseSave(rawManual) : null;
            const autoSave = rawAuto ? parseSave(rawAuto) : null;
            const chosenSave = chooseSave(slot, manualSave, autoSave);

            if (!chosenSave) {
                return false;
            }

            const restored = refreshVisibilityForAllPlayers(ensureEndTurnForWinner(chosenSave.gameState));
            setGameState(restored);
            setPlayerId(pickActivePlayerId(restored));
            return true;
        } catch {
            return false;
        }
    }, []);

    const listSaves = useCallback(() => {
        const getSave = (key: string): SavedGame | null => {
            const raw = localStorage.getItem(key);
            return raw ? parseSave(raw) : null;
        };

        return {
            manual: getSave(SAVE_KEY),
            auto: getSave(AUTOSAVE_KEY)
        };
    }, []);

    const clearSession = useCallback(() => {
        skipPersistenceRef.current = true;
        setGameState(null);
        setLastGameSettings(null);
        localStorage.removeItem(SESSION_SAVE_KEY);
    }, []);

    // Session persistence: Save on every state change
    useEffect(() => {
        if (!gameState || skipPersistenceRef.current) return;
        localStorage.setItem(SESSION_SAVE_KEY, JSON.stringify(gameState));
    }, [gameState]);

    // Persist lastGameSettings
    useEffect(() => {
        if (lastGameSettings) {
            localStorage.setItem(LAST_SETTINGS_KEY, JSON.stringify(lastGameSettings));
        }
    }, [lastGameSettings]);

    // Session persistence: Load on mount
    useEffect(() => {
        if (skipPersistenceRef.current) return;
        const sessionData = localStorage.getItem(SESSION_SAVE_KEY);
        if (sessionData) {
            try {
                const parsedState = refreshVisibilityForAllPlayers(ensureEndTurnForWinner(JSON.parse(sessionData)));
                setGameState(parsedState);
                setPlayerId(pickActivePlayerId(parsedState));
                onSessionRestore?.();
            } catch (e) {
                console.warn("Failed to restore session", e);
                localStorage.removeItem(SESSION_SAVE_KEY);
            }
        }

        const settingsData = localStorage.getItem(LAST_SETTINGS_KEY);
        if (settingsData) {
            try {
                setLastGameSettings(JSON.parse(settingsData));
            } catch {
                // Ignore bad settings
            }
        }
    }, [onSessionRestore]);

    // Autoskip AI turns
    useEffect(() => {
        if (!gameState || gameState.winnerId) return;
        let next = gameState;
        const current = () => next.players.find(p => p.id === next.currentPlayerId);
        let safety = 0;
        while (current()?.isAI && safety < 10) {
            next = runAiTurn(next, next.currentPlayerId);
            safety++;
        }
        if (next !== gameState) {
            setGameState(next);
            const nextPlayer = next.players.find(p => p.id === next.currentPlayerId);
            if (nextPlayer && !nextPlayer.isAI && next.currentPlayerId !== playerId) {
                setPlayerId(next.currentPlayerId);
            }
        }
    }, [gameState, playerId]);

    const lastAutosavedTurnRef = useRef<number | null>(null);

    // Autosave every 5th turn
    useEffect(() => {
        if (!gameState) return;

        if (!shouldCreateAutosave(gameState, playerId, lastAutosavedTurnRef.current)) {
            return;
        }

        try {
            const saveData = createSaveData(gameState);
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveData));
            console.log("Autosave created at turn", gameState.turn);
            lastAutosavedTurnRef.current = gameState.turn;
        } catch (e) {
            console.warn("Failed to autosave", e);
        }
    }, [gameState, playerId]);

    return {
        gameState,
        playerId,
        lastGameSettings,
        error,
        setError,
        startNewGame,
        restartLastGame,
        saveGame,
        loadGame,
        listSaves,
        clearSession,
        runActions,
    };
}
