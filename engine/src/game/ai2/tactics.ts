import { GameState, UnitType } from "../../core/types.js";
import { tryAction } from "../ai/shared/actions.js";
import { getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { selectFocusTargetV2 } from "./strategy.js";
import { aiInfo } from "../ai/debug-logging.js";
import { identifyBattleGroups, coordinateGroupAttack } from "../ai/units/battle-groups.js";
import { aidVulnerableUnits, repositionRanged } from "../ai/units/defense.js";
import { updateArmyPhase, allowOpportunityKill } from "./army-phase.js";
import { planAttackOrderV2, executeAttack, updateTacticalFocus, planMoveAndAttack, executeMoveAttack } from "./attack-order.js";
import { filterAttacksWithWaitDecision } from "./wait-decision.js";
import { isMilitary } from "./unit-roles.js";
import { buildTacticalContext } from "./tactical-context.js";
import { retreatIfNeeded } from "./movement.js";
import { bestAttackForUnit } from "./combat-eval.js";
import { routeCityCapturesV2 } from "./siege-routing.js";
import { runSiegeAndRally } from "./siege-rally.js";
import { runTitanPhase, runTitanPreMovement } from "./titan-flow.js";

export function runTacticsV2(state: GameState, playerId: string): GameState {
    let next = state;

    // Ensure focus target exists (sets memory).
    const focused = selectFocusTargetV2(next, playerId);
    next = focused.state;
    const tacticalContext = buildTacticalContext(next, playerId);

    // Retreat pass.
    // v6.6h: Escorts skip retreat - they stay with Titan
    const unitsForRetreat = next.units.filter(u => u.ownerId === playerId && u.movesLeft > 0 && isMilitary(u) && u.type !== UnitType.Titan && !u.isTitanEscort);
    for (const unit of unitsForRetreat) {
        const live = next.units.find(u => u.id === unit.id);
        if (!live || live.movesLeft <= 0) continue;
        next = retreatIfNeeded(next, playerId, live);
    }

    // Note: Ranged repositioning is handled by repositionRanged() AFTER attacks
    // This avoids conflicts where pre-attack movement wastes moves or positions units suboptimally

    // v6.6d: CRITICAL FIX - Titan movement must run EARLY, before other units use their moves!
    // Previously ran after attacks/repositioning exhausted all movesLeft.
    next = runTitanPreMovement(next, playerId);


    // Aid vulnerable units: send reinforcements to isolated allies before attacking
    next = aidVulnerableUnits(next, playerId);

    // Level 4: Update army phase state machine
    const armyPhaseResult = updateArmyPhase(next, playerId);
    next = armyPhaseResult.state;
    const currentArmyPhase = armyPhaseResult.phase;
    aiInfo(`[ARMY PHASE] ${playerId} is in phase: ${currentArmyPhase}`);

    // Battle group coordination: identify clusters of units engaged with enemies and coordinate focus-fire
    const battleGroups = identifyBattleGroups(next, playerId);
    for (const group of battleGroups) {
        next = coordinateGroupAttack(next, playerId, group);
    }

    // Level 2: Update tactical focus target before attack planning
    next = updateTacticalFocus(next, playerId);

    // Level 1A: Optimized attack ordering with simulated HP tracking
    // This replaces the per-unit bestAttackForUnit loop with a coordinated approach
    // that considers kill sequencing and prevents spread damage
    if (currentArmyPhase === 'attacking') {
        let plannedAttacks = planAttackOrderV2(next, playerId);

        // Level 3: Filter out attacks where the unit should wait
        const originalCount = plannedAttacks.length;
        plannedAttacks = filterAttacksWithWaitDecision(next, playerId, plannedAttacks);
        const filteredCount = originalCount - plannedAttacks.length;

        aiInfo(`[ATTACK ORDER] ${playerId} planned ${plannedAttacks.length} attacks (${plannedAttacks.filter(a => a.wouldKill).length} kills, ${filteredCount} waiting)`);

        for (const attack of plannedAttacks) {
            // Verify attacker still valid
            const liveAttacker = next.units.find(u => u.id === attack.attacker.id);
            if (!liveAttacker || liveAttacker.hasAttacked || liveAttacker.movesLeft <= 0) continue;

            // Overkill prevention: verify target still alive
            if (attack.targetType === "Unit") {
                const target = next.units.find(u => u.id === attack.targetId);
                if (!target || target.hp <= 0) continue;
            }

            next = executeAttack(next, playerId, attack);
        }
    } else {
        // Not in attack phase - only allow opportunity kills
        // v6.6h: Escorts skip opportunity attacks - they stay with Titan
        const attackers = next.units.filter(u => u.ownerId === playerId && !u.hasAttacked && isMilitary(u) && u.type !== UnitType.Titan && !u.isTitanEscort);
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
    }

    // Level 1B: Move-Then-Attack for units not in immediate attack range
    if (currentArmyPhase === 'attacking') {
        const moveAttackPlans = planMoveAndAttack(next, playerId);
        aiInfo(`[MOVE-ATTACK] ${playerId} planned ${moveAttackPlans.length} move-attack combos`);

        for (const plan of moveAttackPlans) {
            const liveUnit = next.units.find(u => u.id === plan.unit.id);
            if (!liveUnit || liveUnit.hasAttacked || liveUnit.movesLeft <= 0) continue;

            next = executeMoveAttack(next, playerId, plan);
        }
    }

    // Post-attack ranged repositioning: kite ranged units away from melee after they attack
    next = repositionRanged(next, playerId);

    // Immediate capture routing: if any enemy city is at 0 HP, send a capturer to take it now.
    next = routeCityCapturesV2(next, playerId, tacticalContext);

    // Titan agent (separate so it doesn't get blocked by generic movement/attacks).
    next = runTitanPhase(next, playerId, tacticalContext);
    // v6.6d: followTitan moved to run EARLY (before attacks) so escorts have moves available

    next = runSiegeAndRally(next, playerId);
    return next;
}
