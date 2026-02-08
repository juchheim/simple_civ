import { GameState, Unit } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { getAiMemoryV2, setAiMemoryV2 } from "../memory.js";
import { buildPerception } from "../perception.js";
import { getUnitRole, isSiegeRole } from "../schema.js";
import { getUnitThreatProfile } from "../tactical-threat.js";
import { scoreAttackOption } from "./scoring.js";
import { canPlanAttack, isGarrisoned, isMilitary } from "./shared.js";

type FocusAttackPlan = {
    attacker: Unit;
    damage: number;
    returnDamage: number;
};

function fallbackTargetScore(enemy: Unit): number {
    const maxHp = enemy.maxHp ?? UNITS[enemy.type].hp;
    const hpMissing = maxHp - enemy.hp;
    const role = getUnitRole(enemy.type);
    const profile = getUnitThreatProfile(enemy);

    let score = hpMissing;
    score += profile.unitThreat * 10;
    score += profile.strategicValue;

    if (isSiegeRole(role)) score += 25;
    if (role === "capture") score += 12;
    if (role === "defense") score += 8;

    return score;
}

function scoreFocusCandidate(
    state: GameState,
    playerId: string,
    enemy: Unit,
    attackPlans: FocusAttackPlan[]
): number {
    if (attackPlans.length === 0) return fallbackTargetScore(enemy);

    let score = 0;
    let simHp = enemy.hp;
    let totalDamage = 0;

    const orderedPlans = [...attackPlans].sort((a, b) => a.damage - b.damage);
    for (const plan of orderedPlans) {
        const scored = scoreAttackOption({
            state,
            playerId,
            attacker: plan.attacker,
            targetType: "Unit",
            target: enemy,
            damage: plan.damage,
            returnDamage: plan.returnDamage,
            targetHpOverride: simHp
        });
        score += scored.score;
        simHp -= plan.damage;
        totalDamage += plan.damage;
    }

    if (totalDamage >= enemy.hp) {
        score += 40;
    }

    return score;
}

/**
 * Update tactical focus target for Level 2 focus fire
 */
export function updateTacticalFocus(state: GameState, playerId: string): GameState {
    const memory = getAiMemoryV2(state, playerId);
    const perception = buildPerception(state, playerId);
    const theaterFresh = memory.operationalTurn !== undefined && (state.turn - memory.operationalTurn) <= 2;
    const theaterTargetId = theaterFresh ? memory.operationalTheaters?.[0]?.targetPlayerId : undefined;
    const theaterTargetCoord = theaterFresh ? memory.operationalTheaters?.[0]?.targetCoord : undefined;

    // Check if current focus is still valid
    if (memory.tacticalFocusUnitId) {
        const focusUnit = state.units.find(u => u.id === memory.tacticalFocusUnitId);
        if (focusUnit && focusUnit.hp > 0) {
            // Check if still in combat range of any of our units
            const inRange = state.units.some(u =>
                u.ownerId === playerId &&
                isMilitary(u) &&
                !isGarrisoned(u, state, playerId) &&
                !u.hasAttacked &&
                u.movesLeft > 0 &&
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

    const attackers = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        !isGarrisoned(u, state, playerId) &&
        !u.hasAttacked &&
        u.movesLeft > 0
    );

    // Score potential focus targets using unified attack scoring.
    const candidates = state.units
        .filter(u => enemies.has(u.ownerId))
        .filter(u => perception.isCoordVisible(u.coord))
        .map(enemy => {
            const attackPlans: FocusAttackPlan[] = [];
            for (const attacker of attackers) {
                if (!canPlanAttack(state, attacker, "Unit", enemy.id)) continue;
                const preview = getCombatPreviewUnitVsUnit(state, attacker, enemy);
                attackPlans.push({
                    attacker,
                    damage: preview.estimatedDamage.avg,
                    returnDamage: preview.returnDamage?.avg ?? 0
                });
            }

            let score = scoreFocusCandidate(state, playerId, enemy, attackPlans);
            if (theaterTargetId && enemy.ownerId === theaterTargetId) {
                score += 35;
            }
            if (theaterTargetCoord) {
                const dist = hexDistance(enemy.coord, theaterTargetCoord);
                if (dist <= 3) score += 20;
                else if (dist <= 6) score += 10;
            }
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
