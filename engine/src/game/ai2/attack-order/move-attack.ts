import { City, GameState, Unit } from "../../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { getCombatPreviewUnitVsCity, getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { createMoveContext } from "../../helpers/movement.js";
import { getAiMemoryV2 } from "../memory.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getAiProfileV2 } from "../rules.js";
import { countThreatsToTile } from "../../ai/units/movement-safety.js";
import { getCivAggression } from "../army-phase.js";

import { canPlanAttack, isGarrisoned, isMilitary } from "./shared.js";
import { scoreMoveAttackOption } from "./scoring.js";
import { getTacticalTuning } from "../tuning.js";

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

    const tuning = getTacticalTuning(state, playerId);
    if (survivalHP <= tuning.moveAttack.survivalHpMarginal) {
        return { survivable: true, marginal: true, reason: "Would survive but barely" };
    }

    return { survivable: true, marginal: false, reason: "Safe" };
}

/**
 * Get war duration with any enemy
 */
function getWarDuration(state: GameState, playerId: string): number {
    const warStarts = state.players
        .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War")
        .map(p => state.diplomacyChangeTurn?.[playerId]?.[p.id] ?? 0)
        .filter(turn => turn > 0);
    if (warStarts.length === 0) return 0;
    return state.turn - Math.min(...warStarts);
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

    const tuning = getTacticalTuning(state, playerId);
    if (ratio >= 2.0) return tuning.moveAttack.powerOverride2xMult;
    if (ratio >= 1.5) return tuning.moveAttack.powerOverride1_5xMult;
    if (ratio >= 1.2) return tuning.moveAttack.powerOverride1_2xMult;
    return 1.0;
}

/**
 * Anti-stalemate override 2: War duration escalation
 */
function getWarDurationMultiplier(state: GameState, playerId: string): number {
    const warDuration = getWarDuration(state, playerId);

    const tuning = getTacticalTuning(state, playerId);
    if (warDuration >= 30) return tuning.moveAttack.warDuration30Mult;
    if (warDuration >= 20) return tuning.moveAttack.warDuration20Mult;
    if (warDuration >= 10) return tuning.moveAttack.warDuration10Mult;
    return 1.0;
}

/**
 * Anti-stalemate override 3: Objective proximity
 */
function getObjectiveProximityMultiplier(state: GameState, playerId: string, unitCoord: { q: number; r: number }): number {
    const memory = getAiMemoryV2(state, playerId);
    const focusCity = memory.focusCityId ? state.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (!focusCity) return 1.0;

    const tuning = getTacticalTuning(state, playerId);
    const dist = hexDistance(unitCoord, focusCity.coord);
    if (dist <= 2) return tuning.moveAttack.objectiveDist2Mult;
    if (dist <= 4) return tuning.moveAttack.objectiveDist4Mult;
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
 * Find adjacent tiles a unit can move to and still have moves left to attack.
 */
function findMoveAttackTiles(state: GameState, unit: Unit, minMovesAfter: number): { q: number; r: number }[] {
    const tuning = getTacticalTuning(state, unit.ownerId); // Not used here? Ah, maybe wait.
    // The previous code didn't use tuning for findMoveAttackTiles logic (1 move).
    // The scanMoves logic might be relevant but here it just checks cost.

    return getNeighbors(unit.coord).filter(coord => {
        const tile = state.map.tiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
        if (!tile) return false;

        // Avoid stepping onto occupied tiles (move would fail).
        if (state.units.some(u => hexEquals(u.coord, coord))) return false;

        // Respect visible peacetime borders.
        if (tile.ownerId && tile.ownerId !== unit.ownerId) {
            const isCity = state.cities.some(c => hexEquals(c.coord, coord));
            const diplomacy = state.diplomacy[unit.ownerId]?.[tile.ownerId];
            if (!isCity && diplomacy !== "War") return false;
        }

        try {
            const moveContext = createMoveContext(unit, tile, state);
            return unit.movesLeft - moveContext.cost >= minMovesAfter;
        } catch {
            return false;
        }
    });
}

/**
 * Check if unit has any target in range
 */
function hasAnyTargetInRange(state: GameState, unit: Unit, enemies: Set<string>): boolean {
    for (const enemy of state.units) {
        if (enemies.has(enemy.ownerId) && canPlanAttack(state, unit, "Unit", enemy.id)) {
            return true;
        }
    }

    for (const city of state.cities) {
        if (enemies.has(city.ownerId) && canPlanAttack(state, unit, "City", city.id)) {
            return true;
        }
    }

    return false;
}

/**
 * Plan move-then-attack actions for units not in attack range
 */
export function planMoveAndAttack(
    state: GameState,
    playerId: string,
    excludedUnitIds: Set<string> = new Set()
): MoveAttackPlan[] {
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
        !excludedUnitIds.has(u.id) &&
        !isGarrisoned(u, state, playerId) &&
        !u.isTitanEscort && // v6.6h: Reserved escorts don't attack - stay with Titan
        isMilitary(u) &&
        !hasAnyTargetInRange(state, u, enemies)
    );

    const plans: MoveAttackPlan[] = [];

    for (const unit of needsMovement) {
        // Find adjacent tiles where we can still attack after moving
        const reachableTiles = findMoveAttackTiles(state, unit, 1);

        // For each tile, find potential targets
        const opportunities: Array<{
            tile: { q: number; r: number };
            target: Unit | { id: string; hp: number; isCity: true };
            targetType: "Unit" | "City";
            targetId: string;
        }> = [];

        for (const tile of reachableTiles) {
            // Unit targets from this tile
            for (const enemy of state.units.filter(u => enemies.has(u.ownerId))) {
                if (canPlanAttack(state, unit, "Unit", enemy.id, tile)) {
                    opportunities.push({ tile, target: enemy, targetType: "Unit", targetId: enemy.id });
                }
            }

            // City targets from this tile
            for (const city of state.cities.filter(c => enemies.has(c.ownerId))) {
                if (canPlanAttack(state, unit, "City", city.id, tile)) {
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
            const virtualAttacker = { ...unit, coord: opp.tile };
            let potentialDamage: number;
            let returnDamage: number;

            let target: Unit | City = opp.target as Unit;
            if (opp.targetType === "Unit") {
                const preview = getCombatPreviewUnitVsUnit(state, virtualAttacker, opp.target as Unit);
                potentialDamage = preview.estimatedDamage.avg;
                returnDamage = preview.returnDamage?.avg ?? 0;
            } else {
                const city = state.cities.find(c => c.id === opp.targetId)!;
                target = city;
                const preview = getCombatPreviewUnitVsCity(state, virtualAttacker, city);
                potentialDamage = preview.estimatedDamage.avg;
                returnDamage = preview.returnDamage?.avg ?? 0;
            }

            const scoredAttack = scoreMoveAttackOption({
                state,
                playerId,
                attacker: virtualAttacker,
                targetType: opp.targetType,
                target,
                damage: potentialDamage,
                returnDamage,
                exposureDamage: exposure,
                exposureMultiplier: effectiveExposureMult
            });
            const wouldKill = scoredAttack.wouldKill;

            let score = scoredAttack.score;

            // Check survivability
            const survival = isMoveSurvivable(state, playerId, unit, opp.tile);
            if (!survival.survivable) {
                if (!wouldKill) {
                    // tuning is not defined here yet.
                    const tuning = getTacticalTuning(state, playerId);
                    score -= tuning.moveAttack.deathWithoutKillPenalty;
                }
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
