import { useCallback, useEffect, useRef, useState } from "react";
import {
    Action,
    GameState,
    MapSize,
    applyAction,
    generateWorld,
    runAiTurn,
} from "@simple-civ/engine";
import { CIV_OPTIONS } from "../data/civs";

type PlayerSetup = { id: string; civName: string; color: string; ai?: boolean };
type GameSetup = { mapSize: MapSize; players: PlayerSetup[]; seed?: number; startWithRandomSeed?: boolean };
type SavedGame = { timestamp: number; gameState: GameState; turn: number; civName: string };

const SAVE_KEY = "simple-civ-save";
const AUTOSAVE_KEY = "simple-civ-autosave";
const SESSION_SAVE_KEY = "simple-civ-session";

function pickActivePlayerId(state: GameState) {
    const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
    const fallbackPlayer = state.players.find(p => !p.isAI);
    return currentPlayer && !currentPlayer.isAI
        ? state.currentPlayerId
        : fallbackPlayer?.id ?? state.currentPlayerId;
}

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

// Helper to parse and normalize save data
function parseSave(raw: string): SavedGame | null {
    try {
        const parsed = JSON.parse(raw);

        // Handle very old legacy format (raw GameState, no timestamp wrapper)
        if (!parsed.timestamp && parsed.turn) {
            const rawCivName = parsed.players?.find((p: any) => p.id === parsed.currentPlayerId)?.civName;
            const title = CIV_OPTIONS.find(c => c.id === rawCivName)?.title || rawCivName || "Unknown";
            return {
                timestamp: 0,
                gameState: parsed,
                turn: parsed.turn,
                civName: title
            };
        }

        // Handle standard format (wrapper with timestamp)
        // Check if metadata is missing (previous format) and backfill it
        if (parsed.gameState && (parsed.turn === undefined || parsed.civName === undefined)) {
            const state = parsed.gameState;
            const rawCivName = parsed.civName ?? (state.players?.find((p: any) => p.id === state.currentPlayerId)?.civName);
            const title = CIV_OPTIONS.find(c => c.id === rawCivName)?.title || rawCivName || "Unknown";
            return {
                timestamp: parsed.timestamp,
                gameState: state,
                turn: parsed.turn ?? state.turn ?? 0,
                civName: title
            };
        }

        // Assume it's the new correct format, but maybe double check if civName looks like an ID and fix it?
        // Let's just fix it on load to be safe
        if (parsed.civName && !parsed.civName.includes(" ")) {
            const title = CIV_OPTIONS.find(c => c.id === parsed.civName)?.title;
            if (title) parsed.civName = title;
        }

        // Assume it's the new correct format
        return parsed;
    } catch {
        return null;
    }
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
            const saveData: SavedGame = {
                timestamp: Date.now(),
                gameState: gameState,
                turn: gameState.turn,
                civName: (() => {
                    const raw = gameState.players.find(p => p.id === gameState.currentPlayerId)?.civName;
                    return CIV_OPTIONS.find(c => c.id === raw)?.title || raw || "Unknown";
                })(),
            };
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

            let chosenSave: SavedGame | null = null;

            if (slot === "manual") chosenSave = manualSave;
            else if (slot === "auto") chosenSave = autoSave;
            else chosenSave = manualSave ?? autoSave; // Default behavior

            if (!chosenSave) {
                return false;
            }

            const restored = chosenSave.gameState;
            if (restored.winnerId && !restored.endTurn) {
                (restored as any).endTurn = restored.turn;
            }
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
            localStorage.setItem("simple-civ-last-settings", JSON.stringify(lastGameSettings));
        }
    }, [lastGameSettings]);

    // Session persistence: Load on mount
    useEffect(() => {
        if (skipPersistenceRef.current) return;
        const sessionData = localStorage.getItem(SESSION_SAVE_KEY);
        if (sessionData) {
            try {
                const parsedState = JSON.parse(sessionData);
                if (parsedState?.winnerId && !parsedState.endTurn) {
                    parsedState.endTurn = parsedState.turn;
                }
                setGameState(parsedState);
                setPlayerId(pickActivePlayerId(parsedState));
                onSessionRestore?.();
            } catch (e) {
                console.warn("Failed to restore session", e);
                localStorage.removeItem(SESSION_SAVE_KEY);
            }
        }

        const settingsData = localStorage.getItem("simple-civ-last-settings");
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

        // Only autosave on specific turns, and only ONCE per turn (when we haven't saved this turn yet)
        if (gameState.turn > 0 && gameState.turn % 5 === 0 && gameState.currentPlayerId === playerId) {
            if (lastAutosavedTurnRef.current === gameState.turn) {
                return;
            }

            const rawCivName = gameState.players.find(p => p.id === gameState.currentPlayerId)?.civName;
            const title = CIV_OPTIONS.find(c => c.id === rawCivName)?.title || rawCivName || "Unknown";

            const saveData: SavedGame = {
                timestamp: Date.now(),
                gameState: gameState,
                turn: gameState.turn,
                civName: title,
            };
            try {
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveData));
                console.log("Autosave created at turn", gameState.turn);
                lastAutosavedTurnRef.current = gameState.turn;
            } catch (e) {
                console.warn("Failed to autosave", e);
            }
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
