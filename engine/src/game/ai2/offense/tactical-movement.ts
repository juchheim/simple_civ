/**
 * Tactical Movement Coordination
 * 
 * Moves units into optimal positions BEFORE attacking to enable:
 * 1. FLANKING - Position units on opposite sides of targets
 * 2. ENCIRCLEMENT - Surround isolated enemies
 * 3. CONCENTRATION - Mass units at breakthrough points
 * 4. CUT OFF - Block enemy retreat routes
 */

import { GameState, Unit, UnitType } from "../../../core/types.js";
import { hexDistance, getNeighbors } from "../../../core/hex.js";
import { isMilitary } from "../unit-roles.js";
import { getAiMemoryV2 } from "../memory.js";
import { tryAction } from "../../ai/shared/actions.js";
import {
    analyzeTacticalSituation,
    getHexAngle,
    type IsolatedUnit
} from "./advanced-tactics.js";

type Coord = { q: number; r: number };

// ============================================================================
// TYPES
// ============================================================================

export type TacticalMove = {
    unit: Unit;
    from: Coord;
    to: Coord;
    purpose: "flank" | "encircle" | "concentrate" | "cutoff" | "advance";
    priority: number;
};

export type FlankingPosition = {
    coord: Coord;
    angleTo: number;  // 0-5 hex direction to target
    oppositeAngle: number;  // Ideal opposite (angleTo + 3) % 6
    flankQuality: number;  // Higher = better flanking position
};

// Check if terrain is impassable
function isImpassable(terrain: string): boolean {
    return terrain === "Water" || terrain === "Mountain";
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Plan tactical movements to position units for optimal attacks
 */
export function planTacticalMovements(
    state: GameState,
    playerId: string
): TacticalMove[] {
    const memory = getAiMemoryV2(state, playerId);
    const focusCity = memory.focusCityId
        ? state.cities.find(c => c.id === memory.focusCityId)
        : undefined;

    if (!focusCity) return [];

    const situation = analyzeTacticalSituation(state, playerId, focusCity.coord);
    const moves: TacticalMove[] = [];

    // Get units that can move but haven't attacked yet
    const mobileUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !u.hasAttacked &&
        isMilitary(u) &&
        u.type !== UnitType.Titan
    );

    const assignedUnits = new Set<string>();
    const targetCoords = new Set<string>();

    // Priority 1: Encircle isolated enemies (DEFEAT IN DETAIL)
    for (const isolated of situation.isolatedEnemies.slice(0, 3)) {
        const encirclementMoves = planEncirclement(state, playerId, isolated, mobileUnits, assignedUnits, targetCoords);
        moves.push(...encirclementMoves);
    }

    // Priority 2: Flank high-value targets (PINCER)
    for (const encircled of situation.encircledEnemies.slice(0, 2)) {
        // Already surrounded - reinforce the encirclement
        const reinforceMoves = planFlankingReinforcement(state, playerId, encircled.unit, mobileUnits, assignedUnits, targetCoords);
        moves.push(...reinforceMoves);
    }

    // Priority 3: Advance remaining units toward focus city (SCHWERPUNKT)
    const advanceMoves = planConcentratedAdvance(state, focusCity.coord, mobileUnits, assignedUnits, targetCoords);
    moves.push(...advanceMoves);

    return moves.sort((a, b) => b.priority - a.priority);
}

// ============================================================================
// ENCIRCLEMENT POSITIONING
// ============================================================================

/**
 * Plan moves to encircle an isolated enemy
 */
function planEncirclement(
    state: GameState,
    playerId: string,
    isolated: IsolatedUnit,
    mobileUnits: Unit[],
    assignedUnits: Set<string>,
    targetCoords: Set<string>
): TacticalMove[] {
    const moves: TacticalMove[] = [];
    const targetCoord = isolated.unit.coord;
    const neighbors = getNeighbors(targetCoord);

    // Find which directions are already covered by our units
    const coveredAngles = new Set<number>();
    for (const neighbor of neighbors) {
        const ourUnit = state.units.find(u =>
            u.ownerId === playerId &&
            hexDistance(u.coord, neighbor) === 0
        );
        if (ourUnit) {
            coveredAngles.add(getHexAngle(neighbor, targetCoord));
        }
    }

    // Find uncovered positions (for encirclement)
    const uncoveredPositions: FlankingPosition[] = [];
    for (const neighbor of neighbors) {
        const key = `${neighbor.q},${neighbor.r}`;
        if (targetCoords.has(key)) continue; // Already targeting this tile

        // Check if tile is empty and passable
        const tile = state.map.tiles.find(t => t.coord.q === neighbor.q && t.coord.r === neighbor.r);
        if (!tile || isImpassable(tile.terrain)) continue;

        // Check if tile is occupied
        const occupied = state.units.some(u => hexDistance(u.coord, neighbor) === 0);
        if (occupied) continue;

        const angle = getHexAngle(neighbor, targetCoord);
        const oppositeAngle = (angle + 3) % 6;

        // Better quality if this creates a true flank (opposite to existing)
        const createsFlank = coveredAngles.has(oppositeAngle) ? 50 : 0;

        uncoveredPositions.push({
            coord: neighbor,
            angleTo: angle,
            oppositeAngle,
            flankQuality: 30 + createsFlank
        });
    }

    // Sort by flanking quality
    uncoveredPositions.sort((a, b) => b.flankQuality - a.flankQuality);

    // Assign units to fill gaps
    for (const pos of uncoveredPositions.slice(0, 3)) {
        // Find nearest unassigned unit that can reach this position
        const candidates = mobileUnits
            .filter(u => !assignedUnits.has(u.id))
            .filter(u => {
                const dist = hexDistance(u.coord, pos.coord);
                return dist <= u.movesLeft && dist > 0;
            })
            .sort((a, b) => hexDistance(a.coord, pos.coord) - hexDistance(b.coord, pos.coord));

        if (candidates.length > 0) {
            const unit = candidates[0];
            moves.push({
                unit,
                from: unit.coord,
                to: pos.coord,
                purpose: "encircle",
                priority: 80 + pos.flankQuality
            });
            assignedUnits.add(unit.id);
            targetCoords.add(`${pos.coord.q},${pos.coord.r}`);
        }
    }

    return moves;
}

// ============================================================================
// FLANKING REINFORCEMENT
// ============================================================================

function planFlankingReinforcement(
    state: GameState,
    playerId: string,
    target: Unit,
    mobileUnits: Unit[],
    assignedUnits: Set<string>,
    targetCoords: Set<string>
): TacticalMove[] {
    const moves: TacticalMove[] = [];
    const neighbors = getNeighbors(target.coord);

    // Find existing attacker positions
    const attackerPositions = state.units
        .filter(u => u.ownerId === playerId && hexDistance(u.coord, target.coord) <= 2)
        .map(u => getHexAngle(u.coord, target.coord));

    // Find reinforcement positions that would improve the flank
    for (const neighbor of neighbors) {
        const key = `${neighbor.q},${neighbor.r}`;
        if (targetCoords.has(key)) continue;

        const tile = state.map.tiles.find(t => t.coord.q === neighbor.q && t.coord.r === neighbor.r);
        if (!tile || isImpassable(tile.terrain)) continue;

        const occupied = state.units.some(u => hexDistance(u.coord, neighbor) === 0);
        if (occupied) continue;

        const angle = getHexAngle(neighbor, target.coord);

        // Skip if this angle is already well-covered
        if (attackerPositions.filter(a => Math.abs(a - angle) <= 1).length >= 2) continue;

        // Find nearby unit that can move here
        const candidates = mobileUnits
            .filter(u => !assignedUnits.has(u.id))
            .filter(u => {
                const dist = hexDistance(u.coord, neighbor);
                return dist <= u.movesLeft && dist > 0 && dist <= 3;
            })
            .sort((a, b) => hexDistance(a.coord, neighbor) - hexDistance(b.coord, neighbor));

        if (candidates.length > 0) {
            const unit = candidates[0];
            moves.push({
                unit,
                from: unit.coord,
                to: neighbor,
                purpose: "flank",
                priority: 60
            });
            assignedUnits.add(unit.id);
            targetCoords.add(key);
        }
    }

    return moves;
}

// ============================================================================
// CONCENTRATED ADVANCE (SCHWERPUNKT)
// ============================================================================

function planConcentratedAdvance(
    state: GameState,
    focusCoord: Coord,
    mobileUnits: Unit[],
    assignedUnits: Set<string>,
    targetCoords: Set<string>
): TacticalMove[] {
    const moves: TacticalMove[] = [];

    // Get unassigned units that are far from focus
    const distantUnits = mobileUnits
        .filter(u => !assignedUnits.has(u.id))
        .filter(u => hexDistance(u.coord, focusCoord) > 3)
        .sort((a, b) => hexDistance(a.coord, focusCoord) - hexDistance(b.coord, focusCoord));

    for (const unit of distantUnits.slice(0, 5)) {
        // Simple movement toward focus (use 1 step at a time to avoid pathfinding complexity)
        const neighbors = getNeighbors(unit.coord);
        const bestNeighbor = neighbors
            .filter(n => {
                const tile = state.map.tiles.find(t => t.coord.q === n.q && t.coord.r === n.r);
                if (!tile || isImpassable(tile.terrain)) return false;
                const occupied = state.units.some(u => hexDistance(u.coord, n) === 0);
                return !occupied;
            })
            .sort((a, b) => hexDistance(a, focusCoord) - hexDistance(b, focusCoord))[0];

        if (bestNeighbor && hexDistance(bestNeighbor, focusCoord) < hexDistance(unit.coord, focusCoord)) {
            const key = `${bestNeighbor.q},${bestNeighbor.r}`;
            if (!targetCoords.has(key)) {
                moves.push({
                    unit,
                    from: unit.coord,
                    to: bestNeighbor,
                    purpose: "concentrate",
                    priority: 40
                });
                assignedUnits.add(unit.id);
                targetCoords.add(key);
            }
        }
    }

    return moves;
}

// ============================================================================
// EXECUTION
// ============================================================================

/**
 * Execute planned tactical movements
 */
export function executeTacticalMovements(
    state: GameState,
    playerId: string,
    moves: TacticalMove[]
): GameState {
    let next = state;

    // Execute in priority order
    const sortedMoves = [...moves].sort((a, b) => b.priority - a.priority);

    for (const move of sortedMoves) {
        const liveUnit = next.units.find(u => u.id === move.unit.id);
        if (!liveUnit || liveUnit.movesLeft <= 0) continue;

        // Check destination is still valid
        const occupied = next.units.some(u =>
            hexDistance(u.coord, move.to) === 0 && u.id !== move.unit.id
        );
        if (occupied) continue;

        // Execute the move using correct action format
        const action = {
            type: "MoveUnit" as const,
            playerId,
            unitId: move.unit.id,
            to: move.to
        };

        next = tryAction(next, action);
    }

    return next;
}
