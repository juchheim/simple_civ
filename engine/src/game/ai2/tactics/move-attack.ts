import { GameState } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { planMoveAndAttack, executeMoveAttack } from "../attack-order.js";
import type { ArmyPhase } from "../army-phase.js";

export function runMoveAttackPhase(
    state: GameState,
    playerId: string,
    currentArmyPhase: ArmyPhase
): GameState {
    if (currentArmyPhase !== "attacking") return state;

    let next = state;
    const moveAttackPlans = planMoveAndAttack(next, playerId);
    aiInfo(`[MOVE-ATTACK] ${playerId} planned ${moveAttackPlans.length} move-attack combos`);

    for (const plan of moveAttackPlans) {
        const liveUnit = next.units.find(u => u.id === plan.unit.id);
        if (!liveUnit || liveUnit.hasAttacked || liveUnit.movesLeft <= 0) continue;

        next = executeMoveAttack(next, playerId, plan);
    }

    return next;
}
