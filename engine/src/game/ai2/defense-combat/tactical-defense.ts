import { Action, GameState, Unit } from "../../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { assessDefenseSituation, type DefenseAction, type DefenseSituation } from "../defense-situation.js";
import { type MoveAttackPlan, type PlannedAttack } from "../attack-order.js";
import { scoreDefenseAttackPreview } from "../attack-order/scoring.js";
import { canPlanAttack, isGarrisoned } from "../attack-order/shared.js";

type AttackAction = Extract<Action, { type: "Attack" }>;

export type TacticalDefenseAction =
    | {
        intent: "attack";
        unitId: string;
        action: AttackAction;
        score: number;
        wouldKill: boolean;
        plan: PlannedAttack;
        cityId: string;
        reason: DefenseAction;
    }
    | {
        intent: "move-attack";
        unitId: string;
        score: number;
        plan: MoveAttackPlan;
        cityId: string;
        reason: DefenseAction;
    };

export type TacticalDefensePlan = Array<{
    situation: DefenseSituation;
    actions: TacticalDefenseAction[];
}>;

/**
 * v8.0: Tactical Defense System
 * 
 * Uses defense situation assessment to plan intelligent defensive actions:
 * - Intercept: Melee units pursue ranged enemies
 * - Focus-fire: Coordinate multiple units on weakest enemy
 * - Sortie: Counter-attack when we have advantage
 */
export function planTacticalDefense(state: GameState, playerId: string): TacticalDefensePlan {
    return assessDefenseSituation(state, playerId)
        .filter(situation => situation.threatLevel !== "none")
        .map(situation => {
            let actions: TacticalDefenseAction[] = [];
            switch (situation.recommendedAction) {
                case "intercept":
                    actions = planInterceptActions(state, playerId, situation);
                    break;
                case "focus-fire":
                    actions = planFocusFireActions(state, playerId, situation);
                    break;
                case "sortie":
                    actions = planSortieActions(state, playerId, situation);
                    break;
                case "retreat":
                case "hold":
                default:
                    actions = [];
                    break;
            }

            return { situation, actions };
        });
}

function buildDefenseAttackAction(
    state: GameState,
    playerId: string,
    attacker: Unit,
    target: Unit,
    city: DefenseSituation["city"],
    reason: DefenseAction
): TacticalDefenseAction {
    const scored = scoreDefenseAttackPreview({
        state,
        playerId,
        attacker,
        target,
        cityCoord: city.coord
    });
    return {
        intent: "attack",
        unitId: attacker.id,
        action: {
            type: "Attack",
            playerId,
            attackerId: attacker.id,
            targetId: target.id,
            targetType: "Unit"
        },
        score: scored.score,
        wouldKill: scored.wouldKill,
        plan: {
            attacker,
            targetId: target.id,
            targetType: "Unit",
            damage: scored.damage,
            wouldKill: scored.wouldKill,
            score: scored.score,
            returnDamage: scored.returnDamage
        },
        cityId: city.id,
        reason
    };
}

function buildDefenseMoveAttackAction(
    state: GameState,
    playerId: string,
    attacker: Unit,
    target: Unit,
    moveTo: { q: number; r: number },
    city: DefenseSituation["city"],
    reason: DefenseAction
): TacticalDefenseAction {
    const scored = scoreDefenseAttackPreview({
        state,
        playerId,
        attacker,
        target,
        cityCoord: city.coord
    });
    return {
        intent: "move-attack",
        unitId: attacker.id,
        score: scored.score,
        plan: {
            unit: attacker,
            moveTo,
            targetId: target.id,
            targetType: "Unit",
            exposureDamage: 0,
            potentialDamage: scored.damage,
            wouldKill: scored.wouldKill,
            score: scored.score
        },
        cityId: city.id,
        reason
    };
}

function findInterceptMoveTile(
    state: GameState,
    unit: Unit,
    target: Unit
): { q: number; r: number } | null {
    const neighbors = getNeighbors(target.coord);
    for (const neighbor of neighbors) {
        const moveDist = hexDistance(unit.coord, neighbor);
        if (moveDist !== 1) continue;
        const tile = state.map.tiles.find(t => hexEquals(t.coord, neighbor));
        if (!tile) continue;
        if (state.units.some(u => hexEquals(u.coord, neighbor))) continue;

        if (tile.ownerId && tile.ownerId !== unit.ownerId) {
            const isCity = state.cities.some(c => hexEquals(c.coord, neighbor));
            const diplomacy = state.diplomacy?.[unit.ownerId]?.[tile.ownerId];
            if (!isCity && diplomacy !== "War") continue;
        }

        if (!canPlanAttack(state, unit, "Unit", target.id, neighbor)) continue;
        return neighbor;
    }

    return null;
}

/**
 * Plan intercept action: Melee units move toward and attack ranged enemies
 * v8.1: Only intercept if we can ACTUALLY attack this turn (move + attack)
 */
function planInterceptActions(state: GameState, playerId: string, situation: DefenseSituation): TacticalDefenseAction[] {
    const actions: TacticalDefenseAction[] = [];

    const rangedEnemies = situation.nearbyEnemies.filter(e => UNITS[e.type]?.rng > 1);
    if (rangedEnemies.length === 0) return actions;

    const enemiesNearCity = situation.nearbyEnemies.filter(e =>
        hexDistance(e.coord, situation.city.coord) <= 2
    );
    if (enemiesNearCity.length > 0) {
        aiInfo(`[INTERCEPT] Skipping intercept - ${enemiesNearCity.length} enemies near city, holding ring`);
        return actions;
    }

    const sortedRanged = [...rangedEnemies].sort((a, b) =>
        hexDistance(a.coord, situation.city.coord) - hexDistance(b.coord, situation.city.coord)
    );

    const meleeUnits = situation.ringUnits.filter(u => {
        const liveUnit = state.units.find(lu => lu.id === u.id);
        if (!liveUnit || liveUnit.movesLeft <= 0 || liveUnit.hasAttacked) return false;
        // Skip garrisoned units - they cannot attack
        if (isGarrisoned(liveUnit, state, playerId)) return false;
        return UNITS[liveUnit.type]?.rng === 1;
    });

    const usedUnits = new Set<string>();

    for (const target of sortedRanged) {
        const liveTarget = state.units.find(u => u.id === target.id);
        if (!liveTarget || liveTarget.hp <= 0) continue;

        for (const melee of meleeUnits) {
            if (usedUnits.has(melee.id)) continue;
            const liveUnit = state.units.find(u => u.id === melee.id);
            if (!liveUnit || liveUnit.movesLeft <= 0 || liveUnit.hasAttacked) continue;

            const dist = hexDistance(liveUnit.coord, liveTarget.coord);
            if (dist === 1 && canPlanAttack(state, liveUnit, "Unit", liveTarget.id)) {
                actions.push(buildDefenseAttackAction(state, playerId, liveUnit, liveTarget, situation.city, "intercept"));
                usedUnits.add(liveUnit.id);
                break;
            }

            if (dist === 2 && liveUnit.movesLeft >= 1) {
                const moveTo = findInterceptMoveTile(state, liveUnit, liveTarget);
                if (moveTo) {
                    actions.push(buildDefenseMoveAttackAction(state, playerId, liveUnit, liveTarget, moveTo, situation.city, "intercept"));
                    usedUnits.add(liveUnit.id);
                    break;
                }
            }
        }
    }

    return actions;
}

/**
 * Plan focus-fire: Coordinate multiple units to eliminate single target
 */
function planFocusFireActions(state: GameState, playerId: string, situation: DefenseSituation): TacticalDefenseAction[] {
    const target = situation.focusTarget;
    if (!target) return [];

    const liveTarget = state.units.find(u => u.id === target.id);
    if (!liveTarget) return [];

    aiInfo(`[FOCUS-FIRE] Targeting ${liveTarget.type} (HP: ${liveTarget.hp})`);

    // Do NOT include garrison - garrisoned units cannot attack
    const attackers = [...situation.ringUnits];

    const actions: TacticalDefenseAction[] = [];
    for (const attacker of attackers) {
        const liveAttacker = state.units.find(u => u.id === attacker.id);
        if (!liveAttacker || liveAttacker.movesLeft <= 0 || liveAttacker.hasAttacked) continue;
        // Safety: explicitly skip garrisoned units (can't attack) - don't rely on ringUnits filtering
        if (isGarrisoned(liveAttacker, state, playerId)) continue;
        if (liveTarget.hp <= 0) break;

        if (canPlanAttack(state, liveAttacker, "Unit", liveTarget.id)) {
            actions.push(buildDefenseAttackAction(state, playerId, liveAttacker, liveTarget, situation.city, "focus-fire"));
        }
    }

    return actions;
}

/**
 * Plan sortie: Counter-attack when we have advantage
 */
function planSortieActions(state: GameState, playerId: string, situation: DefenseSituation): TacticalDefenseAction[] {
    if (situation.defenseScore < situation.threatScore * 1.2) return [];
    if (situation.ringUnits.length < 3) return [];

    aiInfo(`[SORTIE] ${situation.city.name} counter-attacking!`);

    const scoredEnemies = [...situation.nearbyEnemies]
        .map(enemy => {
            let bestScore = -Infinity;
            for (const unit of situation.ringUnits) {
                const liveUnit = state.units.find(u => u.id === unit.id);
                if (!liveUnit || liveUnit.movesLeft <= 0 || liveUnit.hasAttacked) continue;
                if (!canPlanAttack(state, liveUnit, "Unit", enemy.id)) continue;

                const scored = scoreDefenseAttackPreview({
                    state,
                    playerId,
                    attacker: liveUnit,
                    target: enemy,
                    cityCoord: situation.city.coord
                });
                if (scored.score > bestScore) bestScore = scored.score;
            }
            return { enemy, score: bestScore };
        })
        .filter(entry => entry.score > -Infinity)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.enemy);

    const actions: TacticalDefenseAction[] = [];
    const usedUnits = new Set<string>();

    for (const unit of situation.ringUnits) {
        const liveUnit = state.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.movesLeft <= 0 || liveUnit.hasAttacked) continue;
        if (usedUnits.has(liveUnit.id)) continue;
        // Skip garrisoned units - they cannot attack
        if (isGarrisoned(liveUnit, state, playerId)) continue;

        for (const enemy of scoredEnemies) {
            if (!canPlanAttack(state, liveUnit, "Unit", enemy.id)) continue;
            actions.push(buildDefenseAttackAction(state, playerId, liveUnit, enemy, situation.city, "sortie"));
            usedUnits.add(liveUnit.id);
            break;
        }
    }

    return actions;
}
