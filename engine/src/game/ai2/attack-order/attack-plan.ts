import { City, GameState, Unit } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { getCombatPreviewUnitVsCity, getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { canPlanAttack, isGarrisoned, isMilitary } from "./shared.js";
import { scoreAttackOption } from "./scoring.js";

export type PlannedAttack = {
    attacker: Unit;
    targetId: string;
    targetType: "Unit" | "City";
    damage: number;
    wouldKill: boolean;
    score: number;
    returnDamage: number;
};

/**
 * Main entry point: Plan optimal attack order for all eligible units
 */
export function planAttackOrderV2(
    state: GameState,
    playerId: string,
    excludedUnitIds: Set<string> = new Set()
): PlannedAttack[] {
    // Phase 1: Gather eligible attackers (units that can attack right now)
    const eligibleAttackers = state.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !u.hasAttacked &&
        !excludedUnitIds.has(u.id) &&
        !isGarrisoned(u, state, playerId) && // Garrisoned units can't attack
        !u.isTitanEscort && // v6.6h: Reserved escorts don't attack - stay with Titan
        isMilitary(u)
    );

    // Get enemy player IDs (those we're at war with)
    const enemies = new Set<string>();
    for (const p of state.players) {
        if (p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War") {
            enemies.add(p.id);
        }
    }

    if (enemies.size === 0) return [];

    // Phase 2: For each attacker, find valid targets in range
    type AttackOption = {
        attacker: Unit;
        targetId: string;
        targetType: "Unit" | "City";
        target: Unit | City;
    };

    const attackOptions: AttackOption[] = [];

    for (const attacker of eligibleAttackers) {
        // Unit targets
        const unitTargets = state.units.filter(u =>
            enemies.has(u.ownerId) &&
            canPlanAttack(state, attacker, "Unit", u.id)
        );
        for (const target of unitTargets) {
            attackOptions.push({ attacker, targetId: target.id, targetType: "Unit", target });
        }

        // City targets
        const cityTargets = state.cities.filter(c =>
            enemies.has(c.ownerId) &&
            canPlanAttack(state, attacker, "City", c.id)
        );
        for (const city of cityTargets) {
            attackOptions.push({
                attacker,
                targetId: city.id,
                targetType: "City",
                target: city
            });
        }
    }

    // Phase 3: Greedy kill optimization with simulated HP
    const simulatedHP = new Map<string, number>();

    // Initialize simulated HP for all enemies
    for (const u of state.units) {
        if (enemies.has(u.ownerId)) {
            simulatedHP.set(u.id, u.hp);
        }
    }
    for (const c of state.cities) {
        if (enemies.has(c.ownerId)) {
            simulatedHP.set(c.id, c.hp);
        }
    }

    const plannedAttacks: PlannedAttack[] = [];
    const usedAttackers = new Set<string>();

    while (attackOptions.length > 0) {
        // Score all remaining options using SIMULATED HP
        const scored = attackOptions
            .filter(opt => !usedAttackers.has(opt.attacker.id))
            .filter(opt => {
                const simHP = simulatedHP.get(opt.targetId);
                return simHP !== undefined && simHP > 0;
            })
            .map(opt => {
                const simHP = simulatedHP.get(opt.targetId)!;

                let damage: number;
                let returnDamage: number;

                if (opt.targetType === "Unit") {
                    const preview = getCombatPreviewUnitVsUnit(state, opt.attacker, opt.target as Unit);
                    damage = preview.estimatedDamage.avg;
                    returnDamage = preview.returnDamage?.avg ?? 0;
                } else {
                    const city = state.cities.find(c => c.id === opt.targetId)!;
                    const preview = getCombatPreviewUnitVsCity(state, opt.attacker, city);
                    damage = preview.estimatedDamage.avg;
                    returnDamage = preview.returnDamage?.avg ?? 0;
                }

                const scoredAttack = scoreAttackOption({
                    state,
                    playerId,
                    attacker: opt.attacker,
                    targetType: opt.targetType,
                    target: opt.target,
                    damage,
                    returnDamage,
                    targetHpOverride: simHP
                });

                return { ...opt, damage, returnDamage, wouldKill: scoredAttack.wouldKill, score: scoredAttack.score };
            })
            .sort((a, b) => b.score - a.score);

        if (scored.length === 0) break;

        const best = scored[0];
        plannedAttacks.push({
            attacker: best.attacker,
            targetId: best.targetId,
            targetType: best.targetType,
            damage: best.damage,
            wouldKill: best.wouldKill,
            score: best.score,
            returnDamage: best.returnDamage
        });

        usedAttackers.add(best.attacker.id);

        // Update simulated HP
        const currentHP = simulatedHP.get(best.targetId) ?? 0;
        simulatedHP.set(best.targetId, currentHP - best.damage);
    }

    return plannedAttacks;
}
