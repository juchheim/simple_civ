import { GameState, UnitType } from "../../../core/types.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { allowOpportunityKill, type ArmyPhase } from "../army-phase.js";
import { planAttackOrderV2, executeAttack } from "../attack-order.js";
import { filterAttacksWithWaitDecision } from "../wait-decision.js";
import { isMilitary } from "../unit-roles.js";
import { bestAttackForUnit } from "../combat-eval.js";
import type { TacticalContext } from "../tactical-context.js";

export function runAttackPhase(
    state: GameState,
    playerId: string,
    tacticalContext: TacticalContext,
    currentArmyPhase: ArmyPhase
): GameState {
    let next = state;

    if (currentArmyPhase === "attacking") {
        let plannedAttacks = planAttackOrderV2(next, playerId);

        const originalCount = plannedAttacks.length;
        plannedAttacks = filterAttacksWithWaitDecision(next, playerId, plannedAttacks);
        const filteredCount = originalCount - plannedAttacks.length;

        aiInfo(`[ATTACK ORDER] ${playerId} planned ${plannedAttacks.length} attacks (${plannedAttacks.filter(a => a.wouldKill).length} kills, ${filteredCount} waiting)`);

        for (const attack of plannedAttacks) {
            const liveAttacker = next.units.find(u => u.id === attack.attacker.id);
            if (!liveAttacker || liveAttacker.hasAttacked || liveAttacker.movesLeft <= 0) continue;

            if (attack.targetType === "Unit") {
                const target = next.units.find(u => u.id === attack.targetId);
                if (!target || target.hp <= 0) continue;
            }

            next = executeAttack(next, playerId, attack);
        }

        return next;
    }

    const attackers = next.units.filter(u =>
        u.ownerId === playerId &&
        !u.hasAttacked &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        !u.isTitanEscort
    );
    for (const unit of attackers) {
        const live = next.units.find(u => u.id === unit.id);
        if (!live || live.hasAttacked) continue;
        const best = bestAttackForUnit(next, playerId, live, tacticalContext.enemyIds);
        if (best && best.score > 0) {
            const preview = getCombatPreviewUnitVsUnit(next, live,
                next.units.find(u => u.id === best.action.targetId) ?? live);
            const wouldKill = best.action.targetType === "Unit"
                ? preview.estimatedDamage.avg >= (next.units.find(u => u.id === best.action.targetId)?.hp ?? 0)
                : false;

            if (allowOpportunityKill(wouldKill, best.score, currentArmyPhase)) {
                next = tryAction(next, best.action);
            } else {
                aiInfo(`[ARMY PHASE] ${playerId} unit ${live.id} waiting (phase: ${currentArmyPhase})`);
            }
        }
    }

    return next;
}
