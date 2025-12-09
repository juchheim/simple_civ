
import { GameState, HistoryEventType, TurnStats, HexCoord } from "../core/types.js";
import { getCityYields } from "./rules.js";
import { UNITS } from "../core/constants.js";

/**
 * Logs a significant game event to the history.
 */
export function logEvent(state: GameState, type: HistoryEventType, playerId: string, data: any) {
    if (!state.history) {
        state.history = { events: [], playerStats: {}, playerFog: {} };
    }
    state.history.events.push({
        turn: state.turn,
        type,
        playerId,
        data,
    });
}

/**
 * Records the current statistics for a player for this turn.
 * Should be called at the start or end of a turn.
 */
export function recordTurnStats(state: GameState, playerId: string) {
    if (!state.history) {
        state.history = { events: [], playerStats: {}, playerFog: {} };
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    if (!state.history.playerStats[playerId]) {
        state.history.playerStats[playerId] = [];
    }

    // Calculate Stats
    const cities = state.cities.filter(c => c.ownerId === playerId);
    let totalScience = 0;
    let totalProduction = 0;

    cities.forEach(c => {
        if (!c.coord) return;
        const yields = getCityYields(c, state);
        totalScience += yields.S;
        totalProduction += yields.P;
    });

    // Military Strength estimation
    const units = state.units.filter(u => u.ownerId === playerId);
    const militaryScore = units.reduce((sum, u) => {
        const stats = UNITS[u.type];
        return sum + (stats.atk + stats.def) * (u.hp / stats.hp);
    }, 0);

    // Territory
    const territory = state.map.tiles.filter(t => t.ownerId === playerId).length;

    // Score (Simple aggregate for now)
    const score = (cities.length * 10) + (player.techs.length * 5) + (territory) + (militaryScore * 0.5);

    const stats: TurnStats = {
        turn: state.turn,
        playerId,
        stats: {
            science: totalScience,
            production: totalProduction,
            military: Math.floor(militaryScore),
            territory,
            score: Math.floor(score),
        }
    };

    state.history.playerStats[playerId].push(stats);
}

/**
 * Records newly revealed fog tiles for a player.
 * @param state 
 * @param playerId 
 * @param newTiles List of newly revealed HexCoords
 */
export function recordFogDelta(state: GameState, playerId: string, newTiles: HexCoord[]) {
    if (newTiles.length === 0) return;

    if (!state.history) {
        state.history = { events: [], playerStats: {}, playerFog: {} };
    }
    if (!state.history.playerFog[playerId]) {
        state.history.playerFog[playerId] = {};
    }

    // We store by turn to allow scrubbing.
    // If multiple updates happen in one turn, we merge or push.
    // Simple approach: One entry per turn, if it exists, append? 
    // Actually, dictionary is best.

    if (!state.history.playerFog[playerId][state.turn]) {
        state.history.playerFog[playerId][state.turn] = [];
    }

    state.history.playerFog[playerId][state.turn].push(...newTiles);
}
