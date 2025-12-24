import { useMemo } from "react";
import { GameState, HexCoord, Unit, Tile, UNITS, TERRAIN, TerrainType, UnitDomain, UnitType } from "@simple-civ/engine";
import { getNeighbors, hexToString } from "../utils/hex";

export type PathInfo = { path: HexCoord[]; movesLeft: number };
export type PathMap = Record<string, PathInfo>;

export function useReachablePaths(gameState: GameState | null, playerId: string, selectedUnitId: string | null) {
    const reachablePaths = useMemo<PathMap>(() => {
        if (!gameState || !selectedUnitId) return {};
        const selectedUnit = gameState.units.find(u => u.id === selectedUnitId);
        if (!selectedUnit || selectedUnit.ownerId !== playerId || selectedUnit.movesLeft <= 0) {
            return {};
        }
        try {
            return computeReachablePaths(gameState, playerId, selectedUnitId);
        } catch (err) {
            console.warn("[Movement] failed to compute reachable tiles", err);
            return {};
        }
    }, [gameState, playerId, selectedUnitId]);

    const reachableCoordSet = useMemo(() => new Set(Object.keys(reachablePaths)), [reachablePaths]);

    return { reachablePaths, reachableCoordSet };
}

/**
 * Optimized reachable path computation using lightweight movement cost calculations.
 * 
 * Instead of cloning the entire game state for each BFS expansion (which caused
 * exponential slowdown for high-movement units like Titan/Landship/Airship),
 * this implementation:
 * 1. Builds O(1) lookup caches once at the start
 * 2. Uses Dijkstra-style BFS with movement cost tracking
 * 3. Only stores path via parent pointers, reconstructing on demand
 */
function computeReachablePaths(state: GameState, playerId: string, unitId: string): PathMap {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || unit.ownerId !== playerId || unit.movesLeft <= 0) {
        return {};
    }

    // Build O(1) lookup caches once
    const tileByKey = new Map<string, Tile>();
    for (const tile of state.map.tiles) {
        tileByKey.set(hexToString(tile.coord), tile);
    }

    const unitByCoordKey = new Map<string, Unit>();
    for (const u of state.units) {
        const key = hexToString(u.coord);
        if (!unitByCoordKey.has(key)) {
            unitByCoordKey.set(key, u);
        }
    }

    const cityCoords = new Set<string>();
    for (const city of state.cities) {
        cityCoords.add(hexToString(city.coord));
    }

    const visibleTiles = new Set<string>(state.visibility[playerId] || []);

    // BFS node with parent pointer for path reconstruction
    type BfsNode = {
        coord: HexCoord;
        movesLeft: number;
        parent: BfsNode | null;
    };

    const startKey = hexToString(unit.coord);
    const startNode: BfsNode = { coord: unit.coord, movesLeft: unit.movesLeft, parent: null };

    // Track best movesLeft seen at each coord to avoid duplicate work
    const bestMovesAt = new Map<string, number>();
    bestMovesAt.set(startKey, unit.movesLeft);

    // Priority queue sorted by movesLeft descending (process highest moves first)
    // Using array with index pointer for O(1) dequeue
    const queue: BfsNode[] = [startNode];
    let queueHead = 0;

    const results: PathMap = {};

    while (queueHead < queue.length) {
        const current = queue[queueHead++];
        const currentKey = hexToString(current.coord);

        // Skip if we've found a better path to this coord
        const bestHere = bestMovesAt.get(currentKey);
        if (bestHere !== undefined && bestHere > current.movesLeft && currentKey !== startKey) {
            continue;
        }

        // Record result (skip start position)
        if (current.parent !== null) {
            const existing = results[currentKey];
            if (!existing || existing.movesLeft < current.movesLeft) {
                // Reconstruct path by walking parent pointers
                const path: HexCoord[] = [];
                let node: BfsNode | null = current;
                while (node && node.parent !== null) {
                    path.unshift(node.coord);
                    node = node.parent;
                }
                results[currentKey] = { path, movesLeft: current.movesLeft };
            }
        }

        // No more moves? Stop expanding from this node
        if (current.movesLeft <= 0) {
            continue;
        }

        // Expand to neighbors
        for (const neighbor of getNeighbors(current.coord)) {
            const neighborKey = hexToString(neighbor);
            const tile = tileByKey.get(neighborKey);
            if (!tile) continue; // Off map

            // Calculate movement cost
            const moveCost = getClientMovementCost(
                tile,
                unit,
                state,
                unitByCoordKey,
                cityCoords,
                visibleTiles,
                neighborKey
            );

            if (moveCost === Infinity) continue; // Impassable

            // Special rule: units with 1 base move can always move if they have any moves left
            const stats = UNITS[unit.type];
            let newMovesLeft: number;
            if (stats.move === 1 || unit.type === UnitType.Titan) {
                // Titans and 1-move units ignore terrain costs
                newMovesLeft = current.movesLeft - 1;
            } else if (current.movesLeft >= moveCost) {
                newMovesLeft = current.movesLeft - moveCost;
            } else {
                // Not enough moves
                continue;
            }

            // Check if this is a better path
            const prevBest = bestMovesAt.get(neighborKey);
            if (prevBest !== undefined && prevBest >= newMovesLeft) {
                continue; // Already found a path with same or more moves remaining
            }

            bestMovesAt.set(neighborKey, newMovesLeft);
            queue.push({
                coord: neighbor,
                movesLeft: newMovesLeft,
                parent: current,
            });
        }
    }

    return results;
}

/**
 * Client-side movement cost calculation - mirrors engine logic but uses pre-built caches.
 * Returns Infinity for impassable tiles, otherwise the movement cost.
 */
function getClientMovementCost(
    tile: Tile,
    unit: Unit,
    state: GameState,
    unitByCoordKey: Map<string, Unit>,
    cityCoords: Set<string>,
    visibleTiles: Set<string>,
    tileKey: string
): number {
    const stats = UNITS[unit.type];
    if (!stats) return Infinity;

    const isVisible = visibleTiles.has(tileKey);

    // Optimistic pathfinding: assume hidden tiles are passable
    if (!isVisible) {
        return 1;
    }

    // Check for blocking units
    const unitOnTile = unitByCoordKey.get(tileKey);
    const blockingUnit = unitOnTile && unitOnTile.id !== unit.id ? unitOnTile : undefined;

    if (blockingUnit && blockingUnit.ownerId !== unit.ownerId) {
        return Infinity; // Enemy unit blocks
    }

    // Check peacetime borders
    if (tile.ownerId && tile.ownerId !== unit.ownerId) {
        const diplomacy = state.diplomacy[unit.ownerId]?.[tile.ownerId] || "Peace";
        const isCity = cityCoords.has(tileKey);
        if (!isCity && diplomacy !== "War") {
            return Infinity; // Can't enter enemy territory during peace
        }
    }

    // Domain-specific checks
    if (stats.domain === UnitDomain.Land) {
        if (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) {
            return Infinity;
        }
        if (tile.terrain === TerrainType.Mountain) {
            return Infinity;
        }

        if (blockingUnit) {
            // Friendly unit - add penalty but allow through
            return (TERRAIN[tile.terrain]?.moveCostLand ?? 999) + 5;
        }

        return TERRAIN[tile.terrain]?.moveCostLand ?? 1;
    } else if (stats.domain === UnitDomain.Naval) {
        if (tile.terrain !== TerrainType.Coast && tile.terrain !== TerrainType.DeepSea) {
            return Infinity;
        }
        if (unit.type === UnitType.Skiff && tile.terrain === TerrainType.DeepSea) {
            return Infinity;
        }

        if (blockingUnit) {
            return (TERRAIN[tile.terrain]?.moveCostNaval ?? 999) + 5;
        }

        return TERRAIN[tile.terrain]?.moveCostNaval ?? 1;
    } else if (stats.domain === UnitDomain.Air) {
        // Air units can go anywhere on the map
        return 1;
    }

    return 1;
}
