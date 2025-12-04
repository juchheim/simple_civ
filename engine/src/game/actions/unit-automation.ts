import { GameState, HexCoord } from "../../core/types.js";
import { hexDistance, hexEquals, hexToString } from "../../core/hex.js";
import { findPath, findReachableTiles } from "../helpers/pathfinding.js";
import { refreshPlayerVision } from "../vision.js";
import { MoveUnitAction, SetAutoMoveTargetAction, SetAutoExploreAction, ClearAutoMoveTargetAction, ClearAutoExploreAction } from "./unit-action-types.js";
import { assertOwnership, getUnitOrThrow } from "../helpers/action-helpers.js";
import { handleMoveUnit } from "./unit-movement.js";
import { UNITS } from "../../core/constants.js";

export function handleSetAutoMoveTarget(state: GameState, action: SetAutoMoveTargetAction): GameState {
    const unit = getUnitOrThrow(state, action.unitId);
    assertOwnership(unit, action.playerId);

    const targetTile = state.map.tiles.find(t => hexEquals(t.coord, action.target));
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
    return state;
}

export function processAutoMovement(state: GameState, playerId: string, specificUnitId?: string) {
    let unitsWithTargets = state.units.filter(u => u.ownerId === playerId && u.autoMoveTarget);
    if (specificUnitId) {
        unitsWithTargets = unitsWithTargets.filter(u => u.id === specificUnitId);
    }

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
                    const targetTile = state.map.tiles.find(t => hexEquals(t.coord, unit.autoMoveTarget!));
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

    const unexploredTiles = state.map.tiles.filter(t => !revealedSet.has(hexToString(t.coord)));

    if (unexploredTiles.length === 0) {
        explorers.forEach(u => {
            u.isAutoExploring = false;
            u.autoMoveTarget = undefined;
        });
        return;
    }

    for (const unit of explorers) {
        if (unit.autoMoveTarget) {
            const targetKey = hexToString(unit.autoMoveTarget);

            if (revealedSet.has(targetKey)) {
                unit.autoMoveTarget = undefined;
            } else {
                continue;
            }
        }

        const candidates: Array<{ tile: typeof unexploredTiles[0]; dist: number }> = [];

        for (const tile of unexploredTiles) {
            if (unit.failedAutoMoveTargets?.some(t => hexEquals(t, tile.coord))) continue;

            const dist = hexDistance(unit.coord, tile.coord);
            const path = findPath(unit.coord, tile.coord, unit, state);

            if (path.length > 0) {
                candidates.push({ tile, dist });
            }
        }

        if (candidates.length > 0) {
            candidates.sort((a, b) => a.dist - b.dist);
            unit.autoMoveTarget = candidates[0].tile.coord;
        } else {
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
            }
        }
    }
}
