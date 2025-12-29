import { GameState, Unit, UnitType } from "../../../core/types.js";
import { hexDistance, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { getCombatPreviewUnitVsCity, getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { getAiMemoryV2 } from "../memory.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getAiProfileV2 } from "../rules.js";
import { countThreatsToTile } from "../../ai/units/movement-safety.js";
import { getCivAggression } from "../army-phase.js";
import { isGarrisoned, isMilitary } from "./shared.js";

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
 * Plan move-then-attack actions for units not in attack range
 */
export function planMoveAndAttack(state: GameState, playerId: string): MoveAttackPlan[] {
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
        !u.isTitanEscort && // v6.6h: Reserved escorts don't attack - stay with Titan
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
 * Execute a move-then-attack plan
 */
export function executeMoveAttack(state: GameState, playerId: string, plan: MoveAttackPlan): GameState {
    // First move
    const next = tryAction(state, {
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
