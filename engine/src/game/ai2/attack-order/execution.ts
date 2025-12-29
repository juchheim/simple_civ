import { GameState } from "../../../core/types.js";
import { tryAction } from "../../ai/shared/actions.js";
import type { PlannedAttack } from "./attack-plan.js";

/**
 * Execute a planned attack
 */
export function executeAttack(state: GameState, playerId: string, attack: PlannedAttack): GameState {
    // Overkill prevention: check if target is already dead
    if (attack.targetType === "Unit") {
        const target = state.units.find(u => u.id === attack.targetId);
        if (!target || target.hp <= 0) return state;
    } else {
        const target = state.cities.find(c => c.id === attack.targetId);
        if (!target) return state;
    }

    return tryAction(state, {
        type: "Attack",
        playerId,
        attackerId: attack.attacker.id,
        targetType: attack.targetType,
        targetId: attack.targetId
    });
}
