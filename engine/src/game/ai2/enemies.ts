import { DiplomacyState, GameState } from "../../core/types.js";

export function warEnemyIds(state: GameState, playerId: string): Set<string> {
    const ids = new Set<string>();
    for (const p of state.players) {
        if (p.id === playerId || p.isEliminated) continue;
        if (state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War) ids.add(p.id);
    }
    return ids;
}
