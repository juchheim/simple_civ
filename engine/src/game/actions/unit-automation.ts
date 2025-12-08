import { GameState, HexCoord, Tile, Unit } from "../../core/types.js";
import { hexDistance, hexEquals, hexToString, getNeighbors } from "../../core/hex.js";
import { findPath, findReachableTiles, getMovementCost } from "../helpers/pathfinding.js";
import { refreshPlayerVision } from "../vision.js";
import { MoveUnitAction, SetAutoMoveTargetAction, SetAutoExploreAction, ClearAutoMoveTargetAction, ClearAutoExploreAction } from "./unit-action-types.js";
import { assertOwnership, getUnitOrThrow } from "../helpers/action-helpers.js";
import { handleMoveUnit } from "./unit-movement.js";
import { UNITS } from "../../core/constants.js";
import { buildTileLookup } from "../helpers/combat.js";

// Loop detection constants
const LOOP_HISTORY_SIZE = 8;  // Track last N positions
const LOOP_THRESHOLD = 3;     // Position must repeat 3+ times = loop

function getReachableTiles(unit: Unit, state: GameState, tilesByKey: Map<string, Tile>): Set<string> {
    const reachable = new Set<string>();
    const queue: HexCoord[] = [unit.coord];
    reachable.add(hexToString(unit.coord));

    let idx = 0;
    const MAX_ITERATIONS = state.map.tiles.length + 100; // safety cap

    while (idx < queue.length && idx < MAX_ITERATIONS) {
        const current = queue[idx++];
        for (const neighbor of getNeighbors(current)) {
            const key = hexToString(neighbor);
            if (reachable.has(key)) continue;

            const tile = tilesByKey.get(key);
            if (!tile) continue;

            const moveCost = getMovementCost(tile, unit, state);
            if (moveCost === Infinity) continue;

            reachable.add(key);
            queue.push(neighbor);
        }
    }

    return reachable;
}

/**
 * Detects if a unit is stuck in an exploration loop by checking if any position
 * appears 3+ times in the recent movement history.
 */
function detectExploreLoop(unit: Unit): boolean {
    const history = unit.autoExploreHistory ?? [];
    if (history.length < LOOP_HISTORY_SIZE) return false;

    const counts = new Map<string, number>();
    for (const key of history) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.values()].some(c => c >= LOOP_THRESHOLD);
}

/**
 * Finds the best escape path when a unit is stuck in a loop.
 * Prioritizes tiles at the frontier that are adjacent to unexplored territory.
 */
function findEscapePath(unit: Unit, state: GameState): HexCoord | undefined {
    const reachable = findReachableTiles(unit.coord, unit, state, 20);
    const history = new Set(unit.autoExploreHistory ?? []);
    const revealedSet = new Set(state.revealed[unit.ownerId] ?? []);

    let bestTile: HexCoord | undefined;
    let bestScore = -Infinity;

    for (const [key, coord] of reachable) {
        if (hexEquals(coord, unit.coord)) continue;
        if (history.has(key)) continue; // Skip recently visited

        // Score: adjacency to unexplored + distance from current location
        const adjacentUnrevealed = getNeighbors(coord)
            .filter(n => !revealedSet.has(hexToString(n))).length;
        const distFromCurrent = hexDistance(unit.coord, coord);

        // Prioritize tiles adjacent to unexplored AND far from current loop
        const score = adjacentUnrevealed * 10 + distFromCurrent;

        if (score > bestScore) {
            bestScore = score;
            bestTile = coord;
        }
    }
    return bestTile;
}

/**
 * Records a position in the unit's exploration history for loop detection.
 * Keeps only the most recent LOOP_HISTORY_SIZE positions.
 */
function recordExplorePosition(unit: Unit): void {
    if (!unit.autoExploreHistory) unit.autoExploreHistory = [];
    unit.autoExploreHistory.push(hexToString(unit.coord));
    // Keep only the most recent positions
    if (unit.autoExploreHistory.length > LOOP_HISTORY_SIZE) {
        unit.autoExploreHistory = unit.autoExploreHistory.slice(-LOOP_HISTORY_SIZE);
    }
}

export function handleSetAutoMoveTarget(state: GameState, action: SetAutoMoveTargetAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);

    const tilesByKey = buildTileLookup(state);
    const targetTile = tilesByKey.get(hexToString(action.target));
    if (!targetTile) throw new Error("Invalid target tile");

    unit.autoMoveTarget = action.target;
    unit.isAutoExploring = false;
    return state;
}

export function handleClearAutoMoveTarget(state: GameState, action: ClearAutoMoveTargetAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);

    unit.autoMoveTarget = undefined;
    return state;
}

export function handleSetAutoExplore(state: GameState, action: SetAutoExploreAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);

    unit.isAutoExploring = true;
    unit.autoMoveTarget = undefined;
    unit.autoExploreHistory = []; // Clear history when starting fresh

    if (unit.movesLeft > 0) {
        refreshPlayerVision(state, action.playerId);
        processAutoExplore(state, action.playerId, unit.id);
        processAutoMovement(state, action.playerId, unit.id);
    }

    return state;
}

export function handleClearAutoExplore(state: GameState, action: ClearAutoExploreAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);

    unit.isAutoExploring = false;
    unit.autoMoveTarget = undefined;
    unit.autoExploreHistory = undefined; // Clear history
    return state;
}

export function processAutoMovement(state: GameState, playerId: string, specificUnitId?: string) {
    let unitsWithTargets = state.units.filter(u => u.ownerId === playerId && u.autoMoveTarget);
    if (specificUnitId) {
        unitsWithTargets = unitsWithTargets.filter(u => u.id === specificUnitId);
    }

    const tilesByKey = buildTileLookup(state);

    for (const unit of unitsWithTargets) {
        let moves = 0;
        const MAX_MOVES = 10;

        while (unit.movesLeft > 0 && unit.autoMoveTarget && moves < MAX_MOVES) {
            moves++;

            const path = findPath(unit.coord, unit.autoMoveTarget, unit, state);

            if (path.length === 0) {
                if (hexEquals(unit.coord, unit.autoMoveTarget)) {
                    unit.autoMoveTarget = undefined;
                } else {
                    const targetTile = tilesByKey.get(hexToString(unit.autoMoveTarget!));
                    if (targetTile) {
                        const stats = UNITS[unit.type];
                        const isLand = stats.domain === "Land";
                        const isNaval = stats.domain === "Naval";

                        let invalid = false;
                        if (isLand && (targetTile.terrain === "Coast" || targetTile.terrain === "DeepSea" || targetTile.terrain === "Mountain")) invalid = true;
                        if (isNaval && (targetTile.terrain !== "Coast" && targetTile.terrain !== "DeepSea")) invalid = true;

                        if (invalid) {
                            if (!unit.failedAutoMoveTargets) unit.failedAutoMoveTargets = [];
                            unit.failedAutoMoveTargets.push(unit.autoMoveTarget!);
                            unit.autoMoveTarget = undefined;
                        } else {
                            const reachable = findReachableTiles(unit.coord, unit, state, 10);
                            let bestTile: HexCoord | undefined;
                            let minDist = Infinity;

                            for (const [, coord] of reachable) {
                                const d = hexDistance(coord, unit.autoMoveTarget!);
                                if (d < minDist) {
                                    minDist = d;
                                    bestTile = coord;
                                }
                            }

                            if (bestTile && !hexEquals(bestTile, unit.coord)) {
                                const partialPath = findPath(unit.coord, bestTile, unit, state);
                                if (partialPath.length > 0) {
                                    const nextStep = partialPath[0];
                                    try {
                                        handleMoveUnit(state, {
                                            type: "MoveUnit",
                                            playerId: unit.ownerId,
                                            unitId: unit.id,
                                            to: nextStep,
                                            isAuto: true
                                        } as MoveUnitAction);
                                        continue;
                                    } catch {
                                        if (!unit.failedAutoMoveTargets) unit.failedAutoMoveTargets = [];
                                        unit.failedAutoMoveTargets.push(unit.autoMoveTarget!);
                                        unit.autoMoveTarget = undefined;
                                        break;
                                    }
                                } else {
                                    if (!unit.failedAutoMoveTargets) unit.failedAutoMoveTargets = [];
                                    unit.failedAutoMoveTargets.push(unit.autoMoveTarget!);
                                    unit.autoMoveTarget = undefined;
                                    break;
                                }
                            } else {
                                if (!unit.failedAutoMoveTargets) unit.failedAutoMoveTargets = [];
                                unit.failedAutoMoveTargets.push(unit.autoMoveTarget!);
                                unit.autoMoveTarget = undefined;
                                break;
                            }
                        }
                    }
                }
                break;
            }

            const nextStep = path[0];
            try {
                handleMoveUnit(state, {
                    type: "MoveUnit",
                    playerId: unit.ownerId,
                    unitId: unit.id,
                    to: nextStep,
                    isAuto: true
                } as MoveUnitAction);
            } catch {
                break;
            }
        }
    }
}

export function processAutoExplore(state: GameState, playerId: string, specificUnitId?: string) {
    let explorers = state.units.filter(u => u.ownerId === playerId && u.isAutoExploring);
    if (specificUnitId) {
        explorers = explorers.filter(u => u.id === specificUnitId);
    }

    if (explorers.length === 0) return;

    const revealedSet = new Set(state.revealed[playerId] || []);
    const tilesByKey = buildTileLookup(state);

    const unexploredTiles = state.map.tiles.filter(t => !revealedSet.has(hexToString(t.coord)));

    if (unexploredTiles.length === 0) {
        explorers.forEach(u => {
            u.isAutoExploring = false;
            u.autoMoveTarget = undefined;
            u.autoExploreHistory = undefined;
        });
        return;
    }

    for (const unit of explorers) {
        // Record current position for loop detection
        recordExplorePosition(unit);

        if (unit.autoMoveTarget) {
            const targetKey = hexToString(unit.autoMoveTarget);

            if (revealedSet.has(targetKey)) {
                unit.autoMoveTarget = undefined;
            } else {
                continue;
            }
        }

        const reachableKeys = getReachableTiles(unit, state, tilesByKey);

        let bestTarget: HexCoord | undefined;
        let bestDist = Infinity;

        for (const tile of unexploredTiles) {
            const key = hexToString(tile.coord);
            if (!reachableKeys.has(key)) continue;
            if (hexEquals(tile.coord, unit.coord)) continue;
            if (unit.failedAutoMoveTargets?.some(t => hexEquals(t, tile.coord))) continue;

            const dist = hexDistance(unit.coord, tile.coord);
            if (dist < bestDist) {
                bestDist = dist;
                bestTarget = tile.coord;
            }
        }

        if (bestTarget) {
            unit.autoMoveTarget = bestTarget;
            unit.autoExploreHistory = []; // Clear history when we find a good target
            continue;
        }

        // No directly reachable unexplored tile found - check for loop
        if (detectExploreLoop(unit)) {
            // We're stuck in a loop - try to find an escape path
            const escapeTile = findEscapePath(unit, state);
            if (escapeTile) {
                unit.autoMoveTarget = escapeTile;
                unit.autoExploreHistory = []; // Clear history when escaping
                continue;
            }
            // No escape path found - give up
            unit.autoMoveTarget = undefined;
            unit.isAutoExploring = false;
            unit.autoExploreHistory = undefined;
            continue;
        }

        // Not in a loop yet - try the fallback: find reachable tile closest to unexplored
        const reachable = findReachableTiles(unit.coord, unit, state, 15);
        let bestTile: HexCoord | undefined;
        let minScore = Infinity;

        let closestUnexplored: HexCoord | undefined;
        let closestDist = Infinity;

        for (const tile of unexploredTiles) {
            const d = hexDistance(unit.coord, tile.coord);
            if (d < closestDist) {
                closestDist = d;
                closestUnexplored = tile.coord;
            }
        }

        if (closestUnexplored) {
            for (const [, coord] of reachable) {
                const d = hexDistance(coord, closestUnexplored);
                if (d < minScore) {
                    minScore = d;
                    bestTile = coord;
                }
            }
        }

        if (bestTile && !hexEquals(bestTile, unit.coord)) {
            unit.autoMoveTarget = bestTile;
        } else {
            unit.autoMoveTarget = undefined;
            unit.isAutoExploring = false;
            unit.autoExploreHistory = undefined;
        }
    }
}
