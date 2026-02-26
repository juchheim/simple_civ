import { GameState, MapSize } from "@simple-civ/engine";
import { CIV_OPTIONS } from "../data/civs";

export type PlayerSetup = { id: string; civName: string; color: string; ai?: boolean };

export type GameSetup = {
    mapSize: MapSize;
    players: PlayerSetup[];
    seed?: number;
    startWithRandomSeed?: boolean;
    difficulty?: "Easy" | "Normal" | "Hard" | "Expert";
};

export type SavedGame = {
    timestamp: number;
    gameState: GameState;
    turn: number;
    civName: string;
};

export const SAVE_KEY = "simple-civ-save";
export const AUTOSAVE_KEY = "simple-civ-autosave";
export const SESSION_SAVE_KEY = "simple-civ-session";
export const LAST_SETTINGS_KEY = "simple-civ-last-settings";

export function getCivTitle(rawCivName?: string): string {
    if (!rawCivName) return "Unknown";
    return CIV_OPTIONS.find(civ => civ.id === rawCivName)?.title || rawCivName;
}

export function pickActivePlayerId(state: GameState): string {
    const currentPlayer = state.players.find(player => player.id === state.currentPlayerId);
    const fallbackPlayer = state.players.find(player => !player.isAI);
    return currentPlayer && !currentPlayer.isAI
        ? state.currentPlayerId
        : fallbackPlayer?.id ?? state.currentPlayerId;
}

export function createSaveData(gameState: GameState, timestamp = Date.now()): SavedGame {
    const rawCivName = gameState.players.find(player => player.id === gameState.currentPlayerId)?.civName;
    return {
        timestamp,
        gameState,
        turn: gameState.turn,
        civName: getCivTitle(rawCivName),
    };
}

export function parseSave(raw: string): SavedGame | null {
    try {
        const parsed = JSON.parse(raw);

        if (!parsed.timestamp && parsed.turn) {
            const rawCivName = parsed.players?.find((player: any) => player.id === parsed.currentPlayerId)?.civName;
            return {
                timestamp: 0,
                gameState: parsed,
                turn: parsed.turn,
                civName: getCivTitle(rawCivName),
            };
        }

        if (parsed.gameState && (parsed.turn === undefined || parsed.civName === undefined)) {
            const state = parsed.gameState;
            const rawCivName = parsed.civName ?? (state.players?.find((player: any) => player.id === state.currentPlayerId)?.civName);
            return {
                timestamp: parsed.timestamp,
                gameState: state,
                turn: parsed.turn ?? state.turn ?? 0,
                civName: getCivTitle(rawCivName),
            };
        }

        if (parsed.civName && !parsed.civName.includes(" ")) {
            parsed.civName = getCivTitle(parsed.civName);
        }

        return parsed;
    } catch {
        return null;
    }
}

export function chooseSave(
    slot: "manual" | "auto" | undefined,
    manualSave: SavedGame | null,
    autoSave: SavedGame | null,
): SavedGame | null {
    if (slot === "manual") return manualSave;
    if (slot === "auto") return autoSave;
    return manualSave ?? autoSave;
}

export function ensureEndTurnForWinner<T extends { winnerId?: string; endTurn?: number; turn: number }>(state: T): T {
    if (state.winnerId && !state.endTurn) {
        (state as any).endTurn = state.turn;
    }
    return state;
}

export function shouldCreateAutosave(
    gameState: GameState,
    playerId: string,
    lastAutosavedTurn: number | null,
): boolean {
    if (gameState.turn <= 0) return false;
    if (gameState.turn % 5 !== 0) return false;
    if (gameState.currentPlayerId !== playerId) return false;
    if (lastAutosavedTurn === gameState.turn) return false;
    return true;
}
