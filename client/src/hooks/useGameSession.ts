import { useCallback, useEffect, useRef, useState } from "react";
import {
    Action,
    GameState,
    MapSize,
    applyAction,
    generateWorld,
    runAiTurn,
} from "@simple-civ/engine";

type PlayerSetup = { id: string; civName: string; color: string; ai?: boolean };
type GameSetup = { mapSize: MapSize; players: PlayerSetup[]; seed?: number };
type SavedGame = { timestamp: number; gameState: GameState };

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

export function useGameSession(options?: { onSessionRestore?: () => void }) {
    const { onSessionRestore } = options ?? {};
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [playerId, setPlayerId] = useState("p1");
    const [lastGameSettings, setLastGameSettings] = useState<GameSetup | null>(null);
    const skipPersistenceRef = useRef(false);

    const runActions = useCallback((actions: Action[]) => {
        skipPersistenceRef.current = false;
        setGameState(prev => {
            if (!prev || actions.length === 0) return prev;
            let nextState = prev;
            for (const action of actions) {
                nextState = applyAction(nextState, action);
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
        const state = generateWorld(lastGameSettings);
        setGameState(state);
        setPlayerId("p1");
        return true;
    }, [lastGameSettings]);

    const handleSave = useCallback(() => {
        if (!gameState) return false;
        try {
            const saveData: SavedGame = {
                timestamp: Date.now(),
                gameState: gameState,
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch {
            return false;
        }
    }, [gameState]);

    const handleLoad = useCallback(() => {
        skipPersistenceRef.current = false;
        try {
            const rawManual = localStorage.getItem(SAVE_KEY);
            const rawAuto = localStorage.getItem(AUTOSAVE_KEY);

            if (!rawManual && !rawAuto) {
                return false;
            }

            let manualSave: SavedGame | null = null;
            let autoSave: SavedGame | null = null;

            if (rawManual) {
                try {
                    const parsed = JSON.parse(rawManual);
                    manualSave = !parsed.timestamp ? { timestamp: 0, gameState: parsed } : parsed;
                } catch {
                    // Ignore bad manual save
                }
            }

            if (rawAuto) {
                try {
                    const parsed = JSON.parse(rawAuto);
                    autoSave = !parsed.timestamp ? { timestamp: 0, gameState: parsed } : parsed;
                } catch {
                    // Ignore bad autosave
                }
            }

            const chosenSave = manualSave ?? autoSave;
            if (!chosenSave) {
                return false;
            }

            const restored = chosenSave.gameState;
            setGameState(restored);
            setPlayerId(pickActivePlayerId(restored));
            return true;
        } catch {
            return false;
        }
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

    // Session persistence: Load on mount
    useEffect(() => {
        if (skipPersistenceRef.current) return;
        const sessionData = localStorage.getItem(SESSION_SAVE_KEY);
        if (sessionData) {
            try {
                const parsedState = JSON.parse(sessionData);
                setGameState(parsedState);
                setPlayerId(pickActivePlayerId(parsedState));
                onSessionRestore?.();
            } catch (e) {
                console.warn("Failed to restore session", e);
                localStorage.removeItem(SESSION_SAVE_KEY);
            }
        }
    }, [onSessionRestore]);

    // Autoskip AI turns
    useEffect(() => {
        if (!gameState) return;
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

    // Autosave every 5th turn
    useEffect(() => {
        if (!gameState) return;
        if (gameState.turn > 0 && gameState.turn % 5 === 0 && gameState.currentPlayerId === playerId) {
            const saveData: SavedGame = {
                timestamp: Date.now(),
                gameState: gameState,
            };
            try {
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saveData));
                console.log("Autosave created at turn", gameState.turn);
            } catch (e) {
                console.warn("Failed to autosave", e);
            }
        }
    }, [gameState, playerId]);

    return {
        gameState,
        playerId,
        setPlayerId,
        runActions,
        startNewGame,
        restartLastGame,
        handleSave,
        handleLoad,
        setGameState,
        lastGameSettings,
        clearSession,
    };
}
