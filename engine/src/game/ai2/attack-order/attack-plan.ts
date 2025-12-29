import { GameState, Unit } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { getCombatPreviewUnitVsCity, getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { getAiMemoryV2 } from "../memory.js";
import { getAiProfileV2 } from "../rules.js";
import { countThreatsToTile } from "../../ai/units/movement-safety.js";
import { getThreatLevel, isGarrisoned, isMilitary, unitValue } from "./shared.js";

export type PlannedAttack = {
    attacker: Unit;
    targetId: string;
    targetType: "Unit" | "City";
    damage: number;
    wouldKill: boolean;
    score: number;
    returnDamage: number;
};

type CityTarget = { id: string; hp: number; maxHp: number; isCity: true };

/**
 * Score an attack option
 */
function scoreAttack(
    attacker: Unit,
    target: Unit | CityTarget,
    state: GameState,
    playerId: string,
    simulatedHP: Map<string, number>,
    damage: number,
    returnDamage: number
): number {
    const targetHP = simulatedHP.get(target.id) ?? ('hp' in target ? target.hp : 0);
    const wouldKill = damage >= targetHP;

    const profile = getAiProfileV2(state, playerId);

    // Base damage value
    const base = damage * 2;

    // MASSIVE bonus for kills (THE key insight from spec)
    const killBonus = wouldKill ? 150 : 0;

    // Threat bonus for high-threat targets
    // FIXv7.5: Massive bonus for Cities so we actually attack them (Combat ADHD fix)
    let threatBonus = 0;
    if ('isCity' in target) {
        threatBonus = 200; // Base priority: Cities are ALWAYS threats
        // Bonus for focus target
        const memory = getAiMemoryV2(state, playerId);
        if (memory.focusCityId === target.id) {
            threatBonus += 100;
        }
    } else {
        threatBonus = getThreatLevel(target as Unit) * 15;
    }

    // Ranged overkill penalty - prefer melee to finish when ranged wastes damage
    let rangedFinishPenalty = 0;
    if (wouldKill && UNITS[attacker.type].rng > 1 && damage > targetHP + 2) {
        rangedFinishPenalty = 30;
    }

    // Suicide penalty
    const isSuicide = returnDamage >= attacker.hp;
    let suicidePenalty = 0;
    if (isSuicide) {
        if (wouldKill && !('isCity' in target) && unitValue(target as Unit) > unitValue(attacker)) {
            suicidePenalty = 20; // Small penalty, trade is worth it
        } else {
            suicidePenalty = 200; // Never suicide for no kill
        }
    }

    // Risk penalty (scaled down if we're getting the kill)
    const riskPenalty = wouldKill ? (returnDamage * 0.3) : (returnDamage * 1.5);

    // Exposure penalty for melee attacks that leave us surrounded
    let exposurePenalty = 0;
    if (!('isCity' in target) && UNITS[attacker.type].rng === 1) {
        const targetUnit = target as Unit;
        const threats = countThreatsToTile(state, playerId, targetUnit.coord, targetUnit.id);
        if (threats.count >= 3 && !wouldKill) {
            exposurePenalty = 80;
        } else if (threats.count >= 2) {
            exposurePenalty = (threats.totalDamage * 0.8) * (1 - profile.tactics.riskTolerance);
        }
    }

    return base + killBonus + threatBonus - rangedFinishPenalty - suicidePenalty - riskPenalty - exposurePenalty;
}

/**
 * Main entry point: Plan optimal attack order for all eligible units
 */
export function planAttackOrderV2(state: GameState, playerId: string): PlannedAttack[] {
    const memory = getAiMemoryV2(state, playerId);

    // Phase 1: Gather eligible attackers (units that can attack right now)
    const eligibleAttackers = state.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !u.hasAttacked &&
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
        target: Unit | CityTarget;
    };

    const attackOptions: AttackOption[] = [];

    for (const attacker of eligibleAttackers) {
        const range = UNITS[attacker.type].rng;

        // Unit targets
        const unitTargets = state.units.filter(u =>
            enemies.has(u.ownerId) &&
            hexDistance(attacker.coord, u.coord) <= range
        );
        for (const target of unitTargets) {
            attackOptions.push({ attacker, targetId: target.id, targetType: "Unit", target });
        }

        // City targets
        const cityTargets = state.cities.filter(c =>
            enemies.has(c.ownerId) &&
            hexDistance(attacker.coord, c.coord) <= range
        );
        for (const city of cityTargets) {
            attackOptions.push({
                attacker,
                targetId: city.id,
                targetType: "City",
                target: { id: city.id, hp: city.hp, maxHp: city.maxHp, isCity: true as const }
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

    // Level 2: Focus Fire - get tactical focus target if set
    const focusUnitId = memory.tacticalFocusUnitId;

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

                const wouldKill = simHP - damage <= 0;

                let score = scoreAttack(
                    opt.attacker,
                    opt.target,
                    state,
                    playerId,
                    simulatedHP,
                    damage,
                    returnDamage
                );

                // Level 2: Focus bonus - prefer attacking designated focus target
                if (focusUnitId && opt.targetId === focusUnitId) {
                    score += 50;
                }

                return { ...opt, damage, returnDamage, wouldKill, score };
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
