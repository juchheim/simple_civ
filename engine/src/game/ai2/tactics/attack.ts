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
import { getTacticalTuning } from "../tuning.js";
import { findKillChains } from "../offense/advanced-tactics.js";

export function runAttackPhase(
    state: GameState,
    playerId: string,
    tacticalContext: TacticalContext,
    currentArmyPhase: ArmyPhase
): GameState {
    let next = state;

    if (currentArmyPhase === "attacking") {
        // PHASE 4: Execute Kill Chains first (Focus Fire Coordination)
        // These are mandatory and bypass wait/passivity checks to ensure we secure kills
        const enemies = next.units.filter(u => tacticalContext.enemyIds.has(u.id));
        const myMilitary = next.units.filter(u => u.ownerId === playerId && isMilitary(u) && !u.hasAttacked);
        const killChains = findKillChains(next, myMilitary, enemies);

        // Filter out bad trades (don't suicide units for low value kills)
        const smartKillChains = killChains.filter(chain => chain.isWorthIt);

        const usedAttackerIds = new Set<string>();

        if (smartKillChains.length > 0) {
            aiInfo(`[ATTACK ORDER] ${playerId} executing ${smartKillChains.length} smart kill chains (filtered from ${killChains.length})`);
            for (const chain of smartKillChains) {
                for (const link of chain.attacks) {
                    // Check if unit is still available (alive and unused)
                    if (usedAttackerIds.has(link.attacker.id)) continue;
                    const liveAttacker = next.units.find(u => u.id === link.attacker.id);
                    if (!liveAttacker || liveAttacker.hasAttacked || liveAttacker.movesLeft <= 0) continue;

                    const liveTarget = next.units.find(u => u.id === link.target.id);
                    if (!liveTarget || liveTarget.hp <= 0) continue;

                    // Execute chain step immediately
                    aiInfo(`[KILL CHAIN] ${liveAttacker.id} -> ${liveTarget.id} (Damage: ${link.damage})`);

                    // Construct minimal PlannedAttack for execution
                    // We calculate return damage just to be safe/compliant with type
                    const preview = getCombatPreviewUnitVsUnit(next, liveAttacker, liveTarget);

                    next = executeAttack(next, playerId, {
                        attacker: liveAttacker,
                        targetId: liveTarget.id,
                        targetType: "Unit",
                        damage: link.damage,
                        wouldKill: link.wouldKill,
                        score: 1000, // Force high score
                        returnDamage: preview.returnDamage?.avg ?? 0 // Estimate return damage
                    });

                    usedAttackerIds.add(link.attacker.id);
                }
            }
        }

        let plannedAttacks = planAttackOrderV2(next, playerId, new Set(), true /* isAttackingPhase */);

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

            if (allowOpportunityKill(wouldKill, best.score, currentArmyPhase, getTacticalTuning(next, playerId).army.opportunityKillScore)) {
                next = tryAction(next, best.action);
            } else {
                aiInfo(`[ARMY PHASE] ${playerId} unit ${live.id} waiting (phase: ${currentArmyPhase})`);
            }
        }
    }

    return next;
}
