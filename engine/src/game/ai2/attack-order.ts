/**
 * Level 1A: Attack Order Optimization
 * 
 * Plans optimal attack sequence by simulating HP changes to maximize kills.
 * Uses greedy kill optimization with simulated HP tracking.
 */

import { GameState, Unit, UnitType } from "../../core/types.js";
import { hexDistance, getNeighbors } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { getCombatPreviewUnitVsUnit, getCombatPreviewUnitVsCity } from "../helpers/combat-preview.js";
import { getAiMemoryV2, setAiMemoryV2 } from "./memory.js";
import { tryAction } from "../ai/shared/actions.js";
import { getAiProfileV2 } from "./rules.js";
import { countThreatsToTile } from "../ai/units/movement-safety.js";
import { getCivAggression } from "./army-phase.js";

export type PlannedAttack = {
    attacker: Unit;
    targetId: string;
    targetType: "Unit" | "City";
    damage: number;
    wouldKill: boolean;
    score: number;
    returnDamage: number;
};

function isMilitary(u: Unit): boolean {
    return UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Scout && u.type !== UnitType.ArmyScout;
}

function isGarrisoned(unit: Unit, state: GameState, playerId: string): boolean {
    return state.cities.some(c =>
        c.ownerId === playerId &&
        c.coord.q === unit.coord.q &&
        c.coord.r === unit.coord.r
    );
}

function unitValue(u: Unit): number {
    if (String(u.type).startsWith("Army")) return 18;
    if (u.type === UnitType.Titan) return 50;
    if (u.type === UnitType.Riders) return 12;
    if (u.type === UnitType.BowGuard) return 11;
    if (u.type === UnitType.SpearGuard) return 10;
    if (u.type === UnitType.Scout || u.type === UnitType.ArmyScout) return 4;
    if (u.type === UnitType.Settler) return 30;
    return 8;
}

function getThreatLevel(u: Unit): number {
    // Higher threat for units that can deal more damage
    const stats = UNITS[u.type];
    return stats.atk + (stats.rng > 1 ? 2 : 0);
}

/**
 * Score an attack option
 */
function scoreAttack(
    attacker: Unit,
    target: Unit | { id: string; hp: number; isCity: true },
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
    let base = damage * 2;

    // MASSIVE bonus for kills (THE key insight from spec)
    const killBonus = wouldKill ? 150 : 0;

    // Threat bonus for high-threat targets
    const threatBonus = 'isCity' in target ? 0 : getThreatLevel(target as Unit) * 15;

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
    const profile = getAiProfileV2(state, playerId);
    const memory = getAiMemoryV2(state, playerId);

    // Phase 1: Gather eligible attackers (units that can attack right now)
    const eligibleAttackers = state.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !u.hasAttacked &&
        !isGarrisoned(u, state, playerId) && // Garrisoned units can't attack
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
        target: Unit | { id: string; hp: number; maxHp: number; isCity: true };
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

/**
 * Update tactical focus target for Level 2 focus fire
 */
export function updateTacticalFocus(state: GameState, playerId: string): GameState {
    const memory = getAiMemoryV2(state, playerId);

    // Check if current focus is still valid
    if (memory.tacticalFocusUnitId) {
        const focusUnit = state.units.find(u => u.id === memory.tacticalFocusUnitId);
        if (focusUnit && focusUnit.hp > 0) {
            // Check if still in combat range of any of our units
            const inRange = state.units.some(u =>
                u.ownerId === playerId &&
                isMilitary(u) &&
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

    // Score potential focus targets
    const candidates = state.units
        .filter(u => enemies.has(u.ownerId))
        .map(enemy => {
            let score = 0;

            // Killability - can we kill it this turn?
            const ourDamage = state.units
                .filter(u => u.ownerId === playerId && isMilitary(u) && hexDistance(u.coord, enemy.coord) <= UNITS[u.type].rng)
                .reduce((sum, u) => {
                    const preview = getCombatPreviewUnitVsUnit(state, u, enemy);
                    return sum + preview.estimatedDamage.avg;
                }, 0);

            if (ourDamage >= enemy.hp) score += 200; // Guaranteed kill
            else if (ourDamage >= enemy.hp * 0.7) score += 100; // Likely kill

            // Low HP bonus
            score += (enemy.maxHp ?? UNITS[enemy.type].hp) - enemy.hp;

            // Threat level
            score += getThreatLevel(enemy) * 10;

            // Unit value
            score += unitValue(enemy);

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

// =============================================================================
// LEVEL 1B: Move-Then-Attack Coordination
// =============================================================================

export type MoveAttackPlan = {
    unit: Unit;
    moveTo: { q: number; r: number };
    targetId: string;
    targetType: "Unit" | "City";
    exposureDamage: number;
    potentialDamage: number;
    wouldKill: boolean;
    score: number;
};

/**
 * Calculate expected exposure damage for a unit at a given tile
 */
function calculateExposureDamage(state: GameState, playerId: string, tile: { q: number; r: number }, excludeUnitId?: string): number {
    const threats = countThreatsToTile(state, playerId, tile, excludeUnitId);
    return threats.totalDamage;
}

/**
 * Check if a move is survivable (won't die before attacking)
 */
function isMoveSurvivable(state: GameState, playerId: string, unit: Unit, tile: { q: number; r: number }): { survivable: boolean; marginal: boolean; reason: string } {
    const exposure = calculateExposureDamage(state, playerId, tile, undefined);
    const survivalHP = unit.hp - exposure;

    if (survivalHP <= 0) {
        return { survivable: false, marginal: false, reason: "Would die before attacking" };
    }

    if (survivalHP <= 2) {
        return { survivable: true, marginal: true, reason: "Would survive but barely" };
    }

    return { survivable: true, marginal: false, reason: "Safe" };
}

/**
 * Get war duration with any enemy
 */
function getWarDuration(state: GameState, playerId: string): number {
    // Approximate by checking memory or fall back to current turn
    // For simplicity, use a heuristic based on damaged units
    const damagedUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.hp < (u.maxHp ?? UNITS[u.type].hp)
    ).length;
    return Math.min(state.turn, damagedUnits * 5); // Rough approximation
}

/**
 * Anti-stalemate override 1: Power advantage multiplier
 */
function getPowerOverrideMultiplier(state: GameState, playerId: string): number {
    const enemies = state.players.filter(p =>
        p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War"
    );
    if (enemies.length === 0) return 1.0;

    const myUnits = state.units.filter(u => u.ownerId === playerId && isMilitary(u)).length;
    const theirUnits = state.units.filter(u => enemies.some(e => e.id === u.ownerId) && isMilitary(u)).length;
    const ratio = myUnits / Math.max(theirUnits, 1);

    if (ratio >= 2.0) return 0.3;
    if (ratio >= 1.5) return 0.6;
    if (ratio >= 1.2) return 0.8;
    return 1.0;
}

/**
 * Anti-stalemate override 2: War duration escalation
 */
function getWarDurationMultiplier(state: GameState, playerId: string): number {
    const warDuration = getWarDuration(state, playerId);

    if (warDuration >= 30) return 0.3;
    if (warDuration >= 20) return 0.5;
    if (warDuration >= 10) return 0.7;
    return 1.0;
}

/**
 * Anti-stalemate override 3: Objective proximity
 */
function getObjectiveProximityMultiplier(state: GameState, playerId: string, unitCoord: { q: number; r: number }): number {
    const memory = getAiMemoryV2(state, playerId);
    const focusCity = memory.focusCityId ? state.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (!focusCity) return 1.0;

    const dist = hexDistance(unitCoord, focusCity.coord);
    if (dist <= 2) return 0.4;
    if (dist <= 4) return 0.6;
    return 1.0;
}

/**
 * Get combined exposure multiplier from all anti-stalemate overrides
 */
function getEffectiveExposureMultiplier(state: GameState, playerId: string, unitCoord: { q: number; r: number }): number {
    const profile = getAiProfileV2(state, playerId);
    const civAggression = getCivAggression(profile.civName);

    // Start with civ personality multiplier
    let mult = civAggression.exposureMultiplier;

    // Apply overrides (take minimum - most aggressive)
    mult = Math.min(mult, getPowerOverrideMultiplier(state, playerId));
    mult = Math.min(mult, getWarDurationMultiplier(state, playerId));
    mult = Math.min(mult, getObjectiveProximityMultiplier(state, playerId, unitCoord));

    return mult;
}

/**
 * Check if target is high value (worth exposure)
 */
function isHighValueTarget(target: Unit): boolean {
    if (target.type === UnitType.Titan) return true;
    if (target.type === UnitType.Settler) return true;
    // Low HP ranged unit
    if (UNITS[target.type].rng > 1 && target.hp <= 5) return true;
    return false;
}

/**
 * Find tiles a unit can reach with at least minMovesAfter movement remaining
 */
function findReachableTiles(state: GameState, unit: Unit, minMovesAfter: number): { q: number; r: number }[] {
    // Simple BFS to find reachable tiles
    const reachable: { q: number; r: number }[] = [];
    const visited = new Set<string>();

    type QueueItem = { coord: { q: number; r: number }; movesRemaining: number };
    const queue: QueueItem[] = [{ coord: unit.coord, movesRemaining: unit.movesLeft }];
    visited.add(`${unit.coord.q},${unit.coord.r}`);

    while (queue.length > 0) {
        const curr = queue.shift()!;

        if (curr.movesRemaining >= minMovesAfter) {
            reachable.push(curr.coord);
        }

        if (curr.movesRemaining <= 0) continue;

        for (const neighbor of getNeighbors(curr.coord)) {
            const key = `${neighbor.q},${neighbor.r}`;
            if (visited.has(key)) continue;

            const tile = state.map.tiles.find(t => t.coord.q === neighbor.q && t.coord.r === neighbor.r);
            if (!tile) continue;

            // Check for unit at tile (can't move through enemies)
            const unitAtTile = state.units.find(u => u.coord.q === neighbor.q && u.coord.r === neighbor.r);
            if (unitAtTile && unitAtTile.ownerId !== unit.ownerId) continue;

            // Simple move cost (1 for plains, 2 for forest/hills)
            const moveCost = (tile.terrain === 'Hills' || tile.terrain === 'Forest') ? 2 : 1;
            const newMovesRemaining = curr.movesRemaining - moveCost;

            if (newMovesRemaining >= 0) {
                visited.add(key);
                queue.push({ coord: neighbor, movesRemaining: newMovesRemaining });
            }
        }
    }

    return reachable;
}

/**
 * Plan move-then-attack actions for units not in attack range
 */
export function planMoveAndAttack(state: GameState, playerId: string): MoveAttackPlan[] {
    const profile = getAiProfileV2(state, playerId);

    // Get enemies
    const enemies = new Set<string>();
    for (const p of state.players) {
        if (p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War") {
            enemies.add(p.id);
        }
    }
    if (enemies.size === 0) return [];

    // Find units that need to move to attack
    const needsMovement = state.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !u.hasAttacked &&
        !isGarrisoned(u, state, playerId) &&
        isMilitary(u) &&
        !hasAnyTargetInRange(state, u, enemies)
    );

    const plans: MoveAttackPlan[] = [];

    for (const unit of needsMovement) {
        // Find tiles reachable with 1+ move remaining (for attack)
        const reachableTiles = findReachableTiles(state, unit, 1);

        // For each tile, find potential targets
        const opportunities: Array<{
            tile: { q: number; r: number };
            target: Unit | { id: string; hp: number; isCity: true };
            targetType: "Unit" | "City";
            targetId: string;
        }> = [];

        for (const tile of reachableTiles) {
            const range = UNITS[unit.type].rng;

            // Unit targets from this tile
            for (const enemy of state.units.filter(u => enemies.has(u.ownerId))) {
                if (hexDistance(tile, enemy.coord) <= range) {
                    opportunities.push({ tile, target: enemy, targetType: "Unit", targetId: enemy.id });
                }
            }

            // City targets from this tile
            for (const city of state.cities.filter(c => enemies.has(c.ownerId))) {
                if (hexDistance(tile, city.coord) <= range) {
                    opportunities.push({
                        tile,
                        target: { id: city.id, hp: city.hp, isCity: true as const },
                        targetType: "City",
                        targetId: city.id
                    });
                }
            }
        }

        if (opportunities.length === 0) continue;

        // Score each opportunity
        const effectiveExposureMult = getEffectiveExposureMultiplier(state, playerId, unit.coord);

        const scored = opportunities.map(opp => {
            const exposure = calculateExposureDamage(state, playerId, opp.tile, undefined);
            const effectiveExposure = exposure * effectiveExposureMult;

            let potentialDamage: number;
            let wouldKill: boolean;

            if (opp.targetType === "Unit") {
                const preview = getCombatPreviewUnitVsUnit(state, unit, opp.target as Unit);
                potentialDamage = preview.estimatedDamage.avg;
                wouldKill = potentialDamage >= (opp.target as Unit).hp;
            } else {
                const city = state.cities.find(c => c.id === opp.targetId)!;
                const preview = getCombatPreviewUnitVsCity(state, unit, city);
                potentialDamage = preview.estimatedDamage.avg;
                wouldKill = potentialDamage >= city.hp;
            }

            // Score: potential damage + kill bonus - effective exposure
            let score = potentialDamage * 2;
            if (wouldKill) score += 150;
            score -= effectiveExposure * 2;

            // Check survivability
            const survival = isMoveSurvivable(state, playerId, unit, opp.tile);
            if (!survival.survivable) {
                if (!wouldKill && !('isCity' in opp.target && opp.target.hp <= potentialDamage)) {
                    score -= 500; // Heavy penalty for dying without kill
                }
            }

            // High value target bonus
            if (opp.targetType === "Unit" && isHighValueTarget(opp.target as Unit)) {
                score += 100;
            }

            return {
                unit,
                moveTo: opp.tile,
                targetId: opp.targetId,
                targetType: opp.targetType,
                exposureDamage: exposure,
                potentialDamage,
                wouldKill,
                score
            };
        }).sort((a, b) => b.score - a.score);

        if (scored.length > 0 && scored[0].score > 0) {
            plans.push(scored[0]);
        }
    }

    return plans;
}

/**
 * Check if unit has any target in range
 */
function hasAnyTargetInRange(state: GameState, unit: Unit, enemies: Set<string>): boolean {
    const range = UNITS[unit.type].rng;

    for (const enemy of state.units) {
        if (enemies.has(enemy.ownerId) && hexDistance(unit.coord, enemy.coord) <= range) {
            return true;
        }
    }

    for (const city of state.cities) {
        if (enemies.has(city.ownerId) && hexDistance(unit.coord, city.coord) <= range) {
            return true;
        }
    }

    return false;
}

/**
 * Execute a move-then-attack plan
 */
export function executeMoveAttack(state: GameState, playerId: string, plan: MoveAttackPlan): GameState {
    // First move
    let next = tryAction(state, {
        type: "MoveUnit",
        playerId,
        unitId: plan.unit.id,
        to: plan.moveTo
    });

    if (next === state) return state; // Move failed

    // Then attack
    const movedUnit = next.units.find(u => u.id === plan.unit.id);
    if (!movedUnit || movedUnit.hasAttacked || movedUnit.movesLeft <= 0) return next;

    return tryAction(next, {
        type: "Attack",
        playerId,
        attackerId: plan.unit.id,
        targetType: plan.targetType,
        targetId: plan.targetId
    });
}
