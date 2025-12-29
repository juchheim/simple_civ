import { GameState } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { getAiMemoryV2, setAiMemoryV2 } from "../memory.js";
import { getThreatLevel, isMilitary, unitValue } from "./shared.js";

/**
 * Update tactical focus target for Level 2 focus fire
 */
export function updateTacticalFocus(state: GameState, playerId: string): GameState {
    const memory = getAiMemoryV2(state, playerId);

    // Check if current focus is still valid
    if (memory.tacticalFocusUnitId) {
        const focusUnit = state.units.find(u => u.id === memory.tacticalFocusUnitId);
        if (focusUnit && focusUnit.hp > 0) {
            // Check if still in combat range of any of our units
            const inRange = state.units.some(u =>
                u.ownerId === playerId &&
                isMilitary(u) &&
                hexDistance(u.coord, focusUnit.coord) <= UNITS[u.type].rng + 2
            );
            if (inRange) {
                return state; // Keep current focus
            }
        }
    }

    // Need new focus target - pick most killable enemy
    const enemies = new Set<string>();
    for (const p of state.players) {
        if (p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War") {
            enemies.add(p.id);
        }
    }

    if (enemies.size === 0) {
        if (memory.tacticalFocusUnitId) {
            return setAiMemoryV2(state, playerId, { ...memory, tacticalFocusUnitId: undefined });
        }
        return state;
    }

    // Score potential focus targets
    const candidates = state.units
        .filter(u => enemies.has(u.ownerId))
        .map(enemy => {
            let score = 0;

            // Killability - can we kill it this turn?
            const ourDamage = state.units
                .filter(u => u.ownerId === playerId && isMilitary(u) && hexDistance(u.coord, enemy.coord) <= UNITS[u.type].rng)
                .reduce((sum, u) => {
                    const preview = getCombatPreviewUnitVsUnit(state, u, enemy);
                    return sum + preview.estimatedDamage.avg;
                }, 0);

            if (ourDamage >= enemy.hp) score += 200; // Guaranteed kill
            else if (ourDamage >= enemy.hp * 0.7) score += 100; // Likely kill

            // Low HP bonus
            score += (enemy.maxHp ?? UNITS[enemy.type].hp) - enemy.hp;

            // Threat level
            score += getThreatLevel(enemy) * 10;

            // Unit value
            score += unitValue(enemy);

            return { enemy, score };
        })
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score);

    const newFocus = candidates[0]?.enemy;
    if (newFocus) {
        return setAiMemoryV2(state, playerId, { ...memory, tacticalFocusUnitId: newFocus.id });
    }

    return state;
}
