import type { Action, GameState, Unit } from "../../core/types.js";
import { UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { aiInfo, isAiDebugEnabled } from "../ai/debug-logging.js";
import { tryAction } from "../ai/shared/actions.js";
import { clearValidationContext, initValidationContext, isContextInitialized } from "../ai/shared/validation.js";
import { getCombatPreviewUnitVsCity, getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { allowOpportunityKill, type ArmyPhase } from "./army-phase.js";
import {
    executeAttack,
    executeMoveAttack,
    planAttackOrderV2,
    planMoveAndAttack,
    type MoveAttackPlan,
    type PlannedAttack
} from "./attack-order.js";
import { isGarrisoned } from "./attack-order/shared.js";
import { bestAttackForUnit } from "./combat-eval.js";
import {
    planTacticalDefense,
    type TacticalDefenseAction,
    type TacticalDefensePlan
} from "./defense-combat/tactical-defense.js";
import { planDefensiveRingCombat } from "./defense-combat/ring-combat.js";
import { planHomeDefenderAttacks, planHomeDefenderMoves } from "./defense-combat/home-defender.js";
import { planLastStandAttacks } from "./defense-combat/last-stand.js";
import { buildDefenseAssessment } from "./defense/assessment.js";
import { planDefenseAssignments } from "./defense/steps.js";
import { planMutualDefenseReinforcements } from "./defense-mutual-defense.js";
import { planDefensiveRing } from "./defense-ring.js";
import { runTitanPreMovement, runTitanPhase } from "./titan-flow.js";
import { DefenseAttackPlan, DefenseMovePlan } from "./defense-actions.js";
import { selectFocusTargetV2 } from "./strategy.js";
import { scoreAttackOptionWithBreakdown, scoreDefenseAttackOptionWithBreakdown, scoreMoveAttackOptionWithBreakdown, type ScoreBreakdown } from "./tactical-scoring.js";
import { buildTacticalContext, type TacticalContext } from "./tactical-context.js";
import { runTacticsPreparation } from "./tactics/prep.js";
import { runPostAttackPhase } from "./tactics/post-attack.js";
import { isMilitary } from "./unit-roles.js";
import { filterAttacksWithWaitDecision } from "./wait-decision.js";
import { identifyBattleGroups } from "../ai/units/battle-groups.js";
import { UNITS } from "../../core/constants.js";
import { getMilitaryDoctrine } from "./military-doctrine.js"; // New
import { planSiegeOperations } from "./siege-manager.js"; // New
import { canPlanAttack } from "./attack-order/shared.js";
import { scoreAttackOption } from "./attack-order/scoring.js";
import { getTacticalTuning } from "./tuning.js";
import { clamp01 } from "./util.js";

export type TacticalPlannerMode = "offense-only" | "full";

type AttackAction = Extract<Action, { type: "Attack" }>;
type MoveAction = Extract<Action, { type: "MoveUnit" | "FortifyUnit" }>;

export type PlannedOpportunityAttack = {
    attackerId: string;
    action: AttackAction;
    score: number;
    wouldKill: boolean;
};

export type TacticalActionIntent = "attack" | "move-attack" | "opportunity" | "garrison" | "support" | "retreat";
export type TacticalActionSource = "offense" | "defense";

type TacticalActionBase = {
    unitId: string;
    source: TacticalActionSource;
    score: number;
    cityId?: string;
    reason?: string;
};

export type TacticalActionPlan =
    | (TacticalActionBase & {
        intent: "attack";
        action: AttackAction;
        wouldKill: boolean;
        plan: PlannedAttack;
    })
    | (TacticalActionBase & {
        intent: "move-attack";
        plan: MoveAttackPlan;
    })
    | (TacticalActionBase & {
        intent: "opportunity";
        action: AttackAction;
        wouldKill: boolean;
    })
    | (TacticalActionBase & {
        intent: "garrison" | "support" | "retreat";
        action: MoveAction;
    });

export type OffensePlan = {
    actions: TacticalActionPlan[];
    waitingAttacks: number;
};

export type TacticalPlan = {
    mode: TacticalPlannerMode;
    armyPhase: ArmyPhase;
    defensePlan: TacticalDefensePlan;
    offensePlan: OffensePlan;
    actions: TacticalActionPlan[];
    tacticalContext: TacticalContext;
    focusTargetId?: string;
    focusCityId?: string;
};

export type TacticalPlanResult = {
    state: GameState;
    plan: TacticalPlan;
};

type AttackPlanAction = Extract<TacticalActionPlan, { intent: "attack" }>;
type MoveAttackPlanAction = Extract<TacticalActionPlan, { intent: "move-attack" }>;
type OpportunityPlanAction = Extract<TacticalActionPlan, { intent: "opportunity" }>;

const tacticalIntentPriority: Record<TacticalActionIntent, number> = {
    "retreat": 6,
    "garrison": 5,
    "support": 4,
    "attack": 3,
    "move-attack": 2, // Must be lower than attack to prefer standing still and hitting
    "opportunity": 1,
};

const tacticalIntentUtilityBase: Record<TacticalActionIntent, number> = {
    "retreat": 0.92,
    "garrison": 0.82,
    "support": 0.72,
    "attack": 0.62,
    "move-attack": 0.52,
    "opportunity": 0.42,
};

const tacticalSourceUtilityBias: Record<TacticalActionSource, number> = {
    "defense": 0,
    "offense": 0,
};

const TACTICAL_SCORE_SCALE = 400;
const TACTICAL_SCORE_WEIGHT = 0.06;

type TacticalUtilityBreakdown = {
    total: number;
    components: Record<string, number>;
    notes?: string[];
};

function isAttackAction(action: TacticalActionPlan): action is AttackPlanAction {
    return action.intent === "attack";
}

function isMoveAttackAction(action: TacticalActionPlan): action is MoveAttackPlanAction {
    return action.intent === "move-attack";
}

function isOpportunityAction(action: TacticalActionPlan): action is OpportunityPlanAction {
    return action.intent === "opportunity";
}

function normalizeTacticalScore(score: number): number {
    if (!Number.isFinite(score)) return 0;
    return clamp01(score / TACTICAL_SCORE_SCALE);
}

function scoreTacticalActionUtility(action: TacticalActionPlan): TacticalUtilityBreakdown {
    const intentBase = tacticalIntentUtilityBase[action.intent] ?? 0;
    const scoreNorm = normalizeTacticalScore(action.score);
    const sourceBias = tacticalSourceUtilityBias[action.source] ?? 0;
    const total = clamp01(intentBase + (scoreNorm * TACTICAL_SCORE_WEIGHT) + sourceBias);
    return {
        total,
        components: {
            intent: intentBase,
            score: scoreNorm * TACTICAL_SCORE_WEIGHT,
            source: sourceBias,
        },
    };
}

function isBetterAction(candidate: TacticalActionPlan, existing: TacticalActionPlan): boolean {
    const candidateUtility = scoreTacticalActionUtility(candidate).total;
    const existingUtility = scoreTacticalActionUtility(existing).total;

    if (Math.abs(candidateUtility - existingUtility) > 0.0001) {
        return candidateUtility > existingUtility;
    }
    if (candidate.score !== existing.score) {
        return candidate.score > existing.score;
    }
    if (tacticalIntentPriority[candidate.intent] !== tacticalIntentPriority[existing.intent]) {
        return tacticalIntentPriority[candidate.intent] > tacticalIntentPriority[existing.intent];
    }
    return false;
}

type ScoredTacticalAction = {
    action: TacticalActionPlan;
    utility: number;
    order: number;
};

function getTacticalActionBudget(state: GameState, playerId: string, totalActions: number): number {
    const totalMilitary = state.units.filter(u => u.ownerId === playerId && isMilitary(u)).length;
    // Placeholder: keep full budget for now (one action per unit). This enables a future cap
    // without changing ordering/selection semantics today.
    return Math.max(totalActions, totalMilitary);
}

function applyTacticalUtilityBudget(
    state: GameState,
    playerId: string,
    actions: TacticalActionPlan[]
): TacticalActionPlan[] {
    if (actions.length <= 1) return actions;

    const scored: ScoredTacticalAction[] = actions.map((action, order) => ({
        action,
        order,
        utility: scoreTacticalActionUtility(action).total
    }));

    const budget = getTacticalActionBudget(state, playerId, scored.length);
    const selected = scored
        .sort((a, b) => b.utility - a.utility || a.order - b.order)
        .slice(0, budget);

    // Preserve defense-first ordering for execution stability.
    const defense = selected.filter(entry => entry.action.source === "defense").sort((a, b) => a.order - b.order);
    const offense = selected.filter(entry => entry.action.source === "offense").sort((a, b) => a.order - b.order);

    return [...defense, ...offense].map(entry => entry.action);
}

function resolveActionConflicts(actions: TacticalActionPlan[]): TacticalActionPlan[] {
    const bestByUnit = new Map<string, { action: TacticalActionPlan; order: number }>();

    actions.forEach((action, index) => {
        const current = bestByUnit.get(action.unitId);
        if (!current || isBetterAction(action, current.action)) {
            bestByUnit.set(action.unitId, { action, order: index });
        }
    });

    return Array.from(bestByUnit.values())
        .sort((a, b) => a.order - b.order)
        .map(entry => entry.action);
}

function formatScoreBreakdown(breakdown: ScoreBreakdown): string {
    const parts = Object.entries(breakdown.components)
        .filter(([, value]) => Math.abs(value) >= 0.01)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([key, value]) => `${key}:${value.toFixed(1)}`);
    if (breakdown.notes && breakdown.notes.length > 0) {
        parts.push(`notes:${breakdown.notes.join("|")}`);
    }
    return parts.join(", ");
}

function logTacticalScoreBreakdowns(state: GameState, playerId: string, actions: TacticalActionPlan[]): void {
    if (!isAiDebugEnabled()) return;

    for (const action of actions) {
        let breakdown: ScoreBreakdown | null = null;
        let targetLabel = "none";

        if (action.intent === "attack") {
            const target = action.plan.targetType === "Unit"
                ? state.units.find(u => u.id === action.plan.targetId)
                : state.cities.find(c => c.id === action.plan.targetId);
            if (!target) continue;
            targetLabel = `${action.plan.targetType.toLowerCase()}:${action.plan.targetId}`;

            if (action.source === "defense" && action.cityId && action.plan.targetType === "Unit") {
                const city = state.cities.find(c => c.id === action.cityId);
                if (city) {
                    breakdown = scoreDefenseAttackOptionWithBreakdown({
                        state,
                        playerId,
                        attacker: action.plan.attacker,
                        targetType: "Unit",
                        target: target as GameState["units"][number],
                        damage: action.plan.damage,
                        returnDamage: action.plan.returnDamage,
                        cityCoord: city.coord
                    }).breakdown;
                }
            }

            if (!breakdown) {
                breakdown = scoreAttackOptionWithBreakdown({
                    state,
                    playerId,
                    attacker: action.plan.attacker,
                    targetType: action.plan.targetType,
                    target,
                    damage: action.plan.damage,
                    returnDamage: action.plan.returnDamage
                }).breakdown;
            }
        } else if (action.intent === "move-attack") {
            const target = action.plan.targetType === "Unit"
                ? state.units.find(u => u.id === action.plan.targetId)
                : state.cities.find(c => c.id === action.plan.targetId);
            if (!target) continue;
            targetLabel = `${action.plan.targetType.toLowerCase()}:${action.plan.targetId}`;

            const virtualAttacker = { ...action.plan.unit, coord: action.plan.moveTo };
            const preview = action.plan.targetType === "Unit"
                ? getCombatPreviewUnitVsUnit(state, virtualAttacker, target as GameState["units"][number])
                : getCombatPreviewUnitVsCity(state, virtualAttacker, target as GameState["cities"][number]);

            if (action.source === "defense" && action.cityId && action.plan.targetType === "Unit") {
                const city = state.cities.find(c => c.id === action.cityId);
                if (city) {
                    breakdown = scoreDefenseAttackOptionWithBreakdown({
                        state,
                        playerId,
                        attacker: virtualAttacker,
                        targetType: "Unit",
                        target: target as GameState["units"][number],
                        damage: preview.estimatedDamage.avg,
                        returnDamage: preview.returnDamage?.avg ?? 0,
                        cityCoord: city.coord
                    }).breakdown;
                }
            }

            if (!breakdown) {
                breakdown = scoreMoveAttackOptionWithBreakdown({
                    state,
                    playerId,
                    attacker: virtualAttacker,
                    targetType: action.plan.targetType,
                    target,
                    damage: preview.estimatedDamage.avg,
                    returnDamage: preview.returnDamage?.avg ?? 0,
                    exposureDamage: action.plan.exposureDamage
                }).breakdown;
            }
        } else if (action.intent === "opportunity") {
            const attacker = state.units.find(u => u.id === action.action.attackerId);
            const target = action.action.targetType === "Unit"
                ? state.units.find(u => u.id === action.action.targetId)
                : state.cities.find(c => c.id === action.action.targetId);
            if (!attacker || !target) continue;
            targetLabel = `${action.action.targetType.toLowerCase()}:${action.action.targetId}`;

            const preview = action.action.targetType === "Unit"
                ? getCombatPreviewUnitVsUnit(state, attacker, target as GameState["units"][number])
                : getCombatPreviewUnitVsCity(state, attacker, target as GameState["cities"][number]);

            breakdown = scoreAttackOptionWithBreakdown({
                state,
                playerId,
                attacker,
                targetType: action.action.targetType,
                target,
                damage: preview.estimatedDamage.avg,
                returnDamage: preview.returnDamage?.avg ?? 0
            }).breakdown;
        }

        if (!breakdown) continue;
        const breakdownText = formatScoreBreakdown(breakdown);
        aiInfo(`[TACTICAL SCORE] ${action.source}:${action.intent} unit ${action.unitId} -> ${targetLabel} total:${breakdown.total.toFixed(1)} { ${breakdownText} }`);
    }
}

export function resolveTacticalActionConflicts(actions: TacticalActionPlan[]): TacticalActionPlan[] {
    return resolveActionConflicts(actions);
}

function toTacticalDefenseAction(action: TacticalDefenseAction): TacticalActionPlan {
    if (action.intent === "attack") {
        return {
            intent: "attack",
            unitId: action.unitId,
            source: "defense",
            action: action.action,
            score: action.score,
            wouldKill: action.wouldKill,
            plan: action.plan,
            cityId: action.cityId,
            reason: action.reason
        };
    }

    return {
        intent: "move-attack",
        unitId: action.unitId,
        source: "defense",
        score: action.score,
        plan: action.plan,
        cityId: action.cityId,
        reason: action.reason
    };
}

function toDefenseAttackAction(action: DefenseAttackPlan): TacticalActionPlan {
    if (action.intent === "attack") {
        const plan = action.plan as PlannedAttack;
        return {
            intent: "attack",
            unitId: action.unitId,
            source: "defense",
            action: {
                type: "Attack",
                playerId: plan.attacker.ownerId,
                attackerId: plan.attacker.id,
                targetId: plan.targetId,
                targetType: plan.targetType
            },
            score: action.score,
            wouldKill: action.wouldKill,
            plan,
            cityId: action.cityId,
            reason: action.reason
        };
    }

    return {
        intent: "move-attack",
        unitId: action.unitId,
        source: "defense",
        score: action.score,
        plan: action.plan as MoveAttackPlan,
        cityId: action.cityId,
        reason: action.reason
    };
}

function toDefenseMoveAction(action: DefenseMovePlan): TacticalActionPlan {
    return {
        intent: action.intent,
        unitId: action.unitId,
        source: "defense",
        action: action.action,
        score: action.score,
        cityId: action.cityId,
        reason: action.reason
    };
}

function executeTacticalActions(
    state: GameState,
    playerId: string,
    actions: TacticalActionPlan[]
): GameState {
    let next = state;

    for (const action of actions) {
        if (action.intent === "attack") {
            next = executeAttack(next, playerId, action.plan);
            continue;
        }
        if (action.intent === "move-attack") {
            next = executeMoveAttack(next, playerId, action.plan);
            continue;
        }
        if (action.intent === "opportunity") {
            next = tryAction(next, action.action);
            continue;
        }
        if (action.intent === "garrison" || action.intent === "support" || action.intent === "retreat") {
            next = tryAction(next, action.action);
        }
    }

    return next;
}

function planOpportunityAttacks(
    state: GameState,
    playerId: string,
    tacticalContext: TacticalContext,
    armyPhase: ArmyPhase,
    reservedUnitIds: Set<string>
): PlannedOpportunityAttack[] {
    const attackers = state.units.filter(u =>
        u.ownerId === playerId &&
        !u.hasAttacked &&
        !reservedUnitIds.has(u.id) &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        !u.isTitanEscort
    );

    const opportunities: PlannedOpportunityAttack[] = [];
    const visibleTargets = tacticalContext.perception.visibleTargets;

    for (const unit of attackers) {
        const live = state.units.find(u => u.id === unit.id);
        if (!live || live.hasAttacked) continue;
        const best = bestAttackForUnit(state, playerId, live, tacticalContext.enemyIds, visibleTargets);
        if (!best || best.score <= 0) continue;

        let wouldKill = false;
        if (best.action.targetType === "Unit") {
            const target = state.units.find(u => u.id === best.action.targetId);
            if (target) {
                const preview = getCombatPreviewUnitVsUnit(state, live, target);
                wouldKill = preview.estimatedDamage.avg >= target.hp;
            }
        }

        const action = best.action as AttackAction;
        if (!action || action.type !== "Attack") continue;

        const tuning = getTacticalTuning(state, playerId);
        const killerIsTitan = live.type === UnitType.Titan;
        // Allow opportunity attacks if:
        // 1. Will kill target (standard)
        // 2. Target is Titan and score is positive (chip away at boss)
        const targetIsTitan = best.action.targetType === "Unit" &&
            state.units.find(u => u.id === best.action.targetId)?.type === UnitType.Titan;

        if (allowOpportunityKill(wouldKill, best.score, armyPhase, tuning.army.opportunityKillScore) ||
            (targetIsTitan && best.score > 0 && !killerIsTitan)) {
            opportunities.push({
                attackerId: live.id,
                action,
                score: best.score,
                wouldKill
            });
        } else {
            aiInfo(`[ARMY PHASE] ${playerId} unit ${live.id} waiting (phase: ${armyPhase})`);
        }
    }

    return opportunities;
}

/**
 * Plan battle-group attacks for coordinated focus fire.
 * Returns TacticalActionPlan[] for units in battle groups, gated by armyPhase.
 * (v1.0.3: Moved from direct execution in prep.ts/offense.ts to unified planner)
 */
function planBattleGroupActions(
    state: GameState,
    playerId: string,
    reservedUnitIds: Set<string>
): TacticalActionPlan[] {
    const battleGroups = identifyBattleGroups(state, playerId);
    const actions: TacticalActionPlan[] = [];

    for (const group of battleGroups) {
        if (!group.primaryTarget) continue;
        // v1.0.3: Removed group.units.length >= 2 restriction - all battle groups are processed
        // (matches original prep.ts behavior; offense.ts had >= 2 but this was inconsistent)

        // Sort units: ranged first (to soften targets), then melee
        const sortedUnits = [...group.units].sort((a, b) => {
            const aRng = UNITS[a.type].rng;
            const bRng = UNITS[b.type].rng;
            return bRng - aRng;
        });

        let currentTarget = group.primaryTarget;
        let simulatedTargetHp = currentTarget.hp;

        for (const unit of sortedUnits) {
            // Skip if reserved, garrisoned, has attacked, or no moves
            if (reservedUnitIds.has(unit.id)) continue;
            if (unit.hasAttacked) continue;
            if (unit.movesLeft <= 0) continue;
            if (isGarrisoned(unit, state, playerId)) continue;
            if (unit.isTitanEscort) continue;

            // v1.0.3: Retarget if current target would be dead (simulated HP <= 0)
            // This matches the old coordinateGroupAttack behavior
            if (simulatedTargetHp <= 0) {
                const replacement = findReplacementTargetForUnit(state, playerId, unit, group.nearbyEnemies);
                if (!replacement) continue;
                currentTarget = replacement;
                simulatedTargetHp = replacement.hp;
                aiInfo(`[BATTLE GROUP] ${playerId} retargeting to ${replacement.type} (previous target dead)`);
            }

            // Validate attack is legal (includes LoS check via canPlanAttack)
            if (!canPlanAttack(state, unit, "Unit", currentTarget.id)) continue;

            // Get combat preview
            const preview = getCombatPreviewUnitVsUnit(state, unit, currentTarget);
            const damage = preview.estimatedDamage.avg;
            const returnDamage = preview.returnDamage?.avg ?? 0;

            // Score this attack with simulated HP
            const scored = scoreAttackOption({
                state,
                playerId,
                attacker: unit,
                targetType: "Unit",
                target: currentTarget,
                damage,
                returnDamage,
                targetHpOverride: simulatedTargetHp
            });

            // Only include attacks with positive score
            if (scored.score <= 0) continue;

            const attackAction: AttackAction = {
                type: "Attack",
                playerId,
                attackerId: unit.id,
                targetId: currentTarget.id,
                targetType: "Unit"
            };

            const plan: PlannedAttack = {
                attacker: unit,
                targetId: currentTarget.id,
                targetType: "Unit",
                damage,
                returnDamage,
                wouldKill: scored.wouldKill,
                score: scored.score
            };

            actions.push({
                intent: "attack",
                unitId: unit.id,
                source: "offense",
                action: attackAction,
                score: scored.score,
                wouldKill: scored.wouldKill,
                plan,
                reason: "battle-group"
            });

            // Update simulated HP for next unit in group
            simulatedTargetHp -= damage;

            aiInfo(`[BATTLE GROUP] ${playerId} ${unit.type} planned attack on ${currentTarget.type} (group focus fire)`);
        }
    }

    return actions;
}

/**
 * Find a replacement target when the current target is dead (simulated).
 * Returns the best target in range for the given unit.
 */
function findReplacementTargetForUnit(
    state: GameState,
    _playerId: string,
    unit: Unit,
    nearbyEnemies: Unit[]
): Unit | undefined {
    const stats = UNITS[unit.type];
    const inRangeEnemies = nearbyEnemies
        .filter(e => {
            const dist = hexDistance(unit.coord, e.coord);
            return dist <= stats.rng && canPlanAttack(state, unit, "Unit", e.id);
        })
        .sort((a, b) => a.hp - b.hp); // Prefer lowest HP

    return inRangeEnemies[0];
}

function buildOffensePlan(
    state: GameState,
    playerId: string,
    tacticalContext: TacticalContext,
    armyPhase: ArmyPhase,
    reservedUnitIds: Set<string>
): OffensePlan {
    // CRITICAL FIX: Plan attacks during BOTH 'attacking' AND 'staged' phases
    // Previously only 'attacking' phase got real attack plans, which is why
    // 95-turn wars happened - units in 'staged' phase never attacked!
    // Verify military doctrine and siege mechanics first
    const doctrine = getMilitaryDoctrine(state, playerId);
    const siegePlan = planSiegeOperations(state, playerId, tacticalContext.memory.focusCityId, reservedUnitIds, doctrine);

    // Add Siege Cycling Moves to the actions immediately
    const siegeActions: TacticalActionPlan[] = siegePlan.cycleMoves.map(move => ({
        intent: "support",
        unitId: move.unitId,
        playerId,
        source: "offense",
        score: 200, // High score to ensure execution
        action: move,
        reason: "Cycling wounded unit"
    }));

    if (armyPhase === "attacking" || armyPhase === "staged") {
        // Reserve units already used in siege cycling
        // (They are already added to reservedUnitIds by planSiegeOperations, but safe to double check logic flow)

        const visibleTargets = tacticalContext.perception.visibleTargets;
        let plannedAttacks = planAttackOrderV2(state, playerId, reservedUnitIds, armyPhase === "attacking", visibleTargets);
        const originalCount = plannedAttacks.length;

        // CRITICAL FIX #2: Skip wait-decision filtering during staged phase
        // The wait conditions were too aggressive and blocking nearly all attacks
        // During staged phase, if we have attacks planned, EXECUTE them!
        let waitingAttacks = 0;
        if (armyPhase === "attacking") {
            plannedAttacks = filterAttacksWithWaitDecision(state, playerId, plannedAttacks);
            waitingAttacks = originalCount - plannedAttacks.length;
        }

        // Enable move-attacks in BOTH phases now
        // Previously staged phase had no move-attacks, limiting offensive pressure
        const moveAttackPlans = planMoveAndAttack(state, playerId, reservedUnitIds, visibleTargets);

        const attackActions: TacticalActionPlan[] = plannedAttacks.map(attack => ({
            intent: "attack",
            unitId: attack.attacker.id,
            source: "offense",
            action: {
                type: "Attack",
                playerId,
                attackerId: attack.attacker.id,
                targetId: attack.targetId,
                targetType: attack.targetType
            },
            score: attack.score,
            wouldKill: attack.wouldKill,
            plan: attack
        }));

        // v1.0.3: Add battle-group coordinated attacks, with wait-decision filtering
        const battleGroupPlans = planBattleGroupActions(state, playerId, reservedUnitIds);
        // Extract PlannedAttack from battle-group actions for wait-decision filter
        const battleGroupPlannedAttacks = battleGroupPlans
            .filter((a): a is Extract<TacticalActionPlan, { intent: "attack" }> => a.intent === "attack")
            .map(a => a.plan);
        const filteredBattleGroupPlans = filterAttacksWithWaitDecision(state, playerId, battleGroupPlannedAttacks);
        const filteredBattleGroupPlanIds = new Set(filteredBattleGroupPlans.map(p => p.attacker.id));
        const battleGroupActions = battleGroupPlans.filter(a => filteredBattleGroupPlanIds.has(a.unitId));

        const moveAttackActions: TacticalActionPlan[] = moveAttackPlans.map(plan => ({
            intent: "move-attack",
            unitId: plan.unit.id,
            source: "offense",
            score: plan.score,
            plan
        }));

        return {
            actions: resolveActionConflicts([...siegeActions, ...attackActions, ...battleGroupActions, ...moveAttackActions]),
            waitingAttacks,
        };

    }

    const opportunityAttacks = planOpportunityAttacks(state, playerId, tacticalContext, armyPhase, reservedUnitIds);

    return {
        waitingAttacks: 0,
        actions: resolveActionConflicts(opportunityAttacks.map(opp => ({
            intent: "opportunity",
            unitId: opp.attackerId,
            source: "offense",
            action: opp.action,
            score: opp.score,
            wouldKill: opp.wouldKill
        })))
    };
}

export function planTacticalTurn(
    state: GameState,
    playerId: string,
    mode: TacticalPlannerMode = "full"
): TacticalPlanResult {
    let next = state;
    let defensePlan: TacticalDefensePlan = [];
    let defenseActions: TacticalActionPlan[] = [];
    const reservedUnitIds = new Set<string>();
    const reservedCoords = new Set<string>();

    const focused = selectFocusTargetV2(next, playerId);
    next = focused.state;

    const preContext = buildTacticalContext(next, playerId);
    const preparation = runTacticsPreparation(next, playerId, preContext.getFlowField);
    next = preparation.state;

    const tacticalContext = buildTacticalContext(next, playerId);

    if (mode === "full") {
        const assessment = buildDefenseAssessment(next, playerId);
        if (assessment) {
            const defenseMovePlans: DefenseMovePlan[] = [];
            const defenseAttackPlans: DefenseAttackPlan[] = [];

            defenseMovePlans.push(
                ...planDefenseAssignments(next, playerId, assessment, reservedUnitIds, reservedCoords, tacticalContext.getFlowField)
            );
            defenseMovePlans.push(
                ...planDefensiveRing(next, playerId, reservedUnitIds, reservedCoords, tacticalContext.getFlowField)
            );
            defenseMovePlans.push(
                ...planMutualDefenseReinforcements(next, playerId, reservedUnitIds, reservedCoords, tacticalContext.getFlowField)
            );

            defenseAttackPlans.push(
                ...planHomeDefenderAttacks(next, playerId, reservedUnitIds)
            );
            defenseAttackPlans.push(
                ...planDefensiveRingCombat(next, playerId, reservedUnitIds, reservedCoords)
            );
            defenseAttackPlans.push(
                ...planLastStandAttacks(next, playerId, reservedUnitIds, reservedCoords)
            );

            defenseMovePlans.push(
                ...planHomeDefenderMoves(next, playerId, reservedUnitIds, reservedCoords)
            );

            const defenseMoveActions = defenseMovePlans.map(toDefenseMoveAction);
            const defenseAttackActions = defenseAttackPlans.map(toDefenseAttackAction);

            defensePlan = planTacticalDefense(next, playerId);
            const situationalDefenseActions: TacticalActionPlan[] = [];

            for (const entry of defensePlan) {
                for (const action of entry.actions.map(toTacticalDefenseAction)) {
                    if (reservedUnitIds.has(action.unitId)) continue;
                    if (action.intent === "move-attack") {
                        const destKey = `${action.plan.moveTo.q},${action.plan.moveTo.r}`;
                        if (reservedCoords.has(destKey)) continue;
                        reservedCoords.add(destKey);
                    }
                    reservedUnitIds.add(action.unitId);
                    situationalDefenseActions.push(action);
                }
            }

            defenseActions = resolveActionConflicts([
                ...defenseMoveActions,
                ...defenseAttackActions,
                ...situationalDefenseActions
            ]);

            if (defenseActions.length > 0 && defensePlan.length > 0) {
                for (const entry of defensePlan) {
                    aiInfo(`[TACTICAL] ${entry.situation.city.name}: ${entry.situation.threatLevel} threat, recommending ${entry.situation.recommendedAction}`);
                }
            }
        }
    }

    const offenseReservedUnitIds = new Set(reservedUnitIds);
    for (const unit of next.units) {
        if (unit.ownerId !== playerId) continue;
        if (!isMilitary(unit)) continue;
        if (!isGarrisoned(unit, next, playerId)) continue;
        offenseReservedUnitIds.add(unit.id);
    }

    const offensePlan = buildOffensePlan(next, playerId, tacticalContext, preparation.armyPhase, offenseReservedUnitIds);

    const actions = applyTacticalUtilityBudget(
        next,
        playerId,
        resolveActionConflicts([...defenseActions, ...offensePlan.actions])
    );
    logTacticalScoreBreakdowns(next, playerId, actions);

    return {
        state: next,
        plan: {
            mode,
            armyPhase: preparation.armyPhase,
            defensePlan,
            offensePlan,
            actions,
            tacticalContext,
            focusTargetId: focused.focusTargetId,
            focusCityId: focused.focusCityId
        }
    };
}

export function executeTacticalPlan(
    state: GameState,
    playerId: string,
    plan: TacticalPlan
): GameState {
    let next = state;

    const defenseActions = plan.actions.filter(action => action.source === "defense");
    const offenseActions = plan.actions.filter(action => action.source === "offense");

    if (defenseActions.length > 0) {
        next = executeTacticalActions(next, playerId, defenseActions);
    }

    // CRITICAL FIX: Execute attacks during BOTH 'attacking' AND 'staged' phases
    // Previously only 'attacking' phase executed attacks, causing 95-turn wars
    if (plan.armyPhase === "attacking" || plan.armyPhase === "staged") {
        const attackActions = offenseActions.filter(isAttackAction);
        const moveAttackActions = offenseActions.filter(isMoveAttackAction);

        const killCount = attackActions.filter(a => a.wouldKill).length;
        aiInfo(`[ATTACK ORDER] ${playerId} planned ${attackActions.length} attacks (${killCount} kills, ${plan.offensePlan.waitingAttacks} waiting)`);
        next = executeTacticalActions(next, playerId, attackActions);

        // Only do move-attacks in full attacking phase
        if (plan.armyPhase === "attacking") {
            aiInfo(`[MOVE-ATTACK] ${playerId} planned ${moveAttackActions.length} move-attack combos`);
            next = executeTacticalActions(next, playerId, moveAttackActions);
        }
    } else {
        // During rallying/scattered phases, execute opportunity attacks
        const opportunityActions = offenseActions.filter(isOpportunityAction);
        next = executeTacticalActions(next, playerId, opportunityActions);
    }

    return runPostAttackPhase(next, playerId, plan.tacticalContext);
}

export function runTacticalPlanner(
    state: GameState,
    playerId: string,
    mode: TacticalPlannerMode = "full"
): GameState {
    // v9.10: Run Titan pre-movement to rally deathball before general tactics
    let next = runTitanPreMovement(state, playerId);

    const result = planTacticalTurn(next, playerId, mode);
    const hadValidationContext = isContextInitialized();
    initValidationContext(result.state, playerId);
    next = executeTacticalPlan(result.state, playerId, result.plan);

    // v9.10: Run Titan agent after general tactics to execute Titan's attack
    next = runTitanPhase(next, playerId, result.plan.tacticalContext);

    if (!hadValidationContext) {
        clearValidationContext();
    }
    return next;
}
