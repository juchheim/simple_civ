import { GameState, HexCoord, Tile, Unit, UnitDomain, TerrainType, UnitType } from "../../core/types.js";
import { TERRAIN, UNITS } from "../../core/constants.js";
import { hexDistance, hexEquals, getNeighbors, hexToString } from "../../core/hex.js";
import { LookupCache, buildLookupCache } from "./lookup-cache.js";

/**
 * Internal pathfinding context - built once per findPath call
 */
type PathContext = {
    cache: LookupCache;
    visibilitySet: Set<string>;
    gameState: GameState;
};

function buildPathContext(gameState: GameState, unit: Unit, externalCache?: LookupCache): PathContext {
    const cache = externalCache ?? buildLookupCache(gameState);
    const visibilitySet = cache.visibilitySet.get(unit.ownerId) ?? new Set();
    return { cache, visibilitySet, gameState };
}

/**
 * Options for pathfinding behavior
 */
export type PathOptions = {
    ignoreFriendlyBlockers?: boolean;
};

/**
 * Calculates the movement cost for a unit to enter a specific tile.
 * Implements "Optimistic" pathfinding:
 * - If tile is visible: Returns actual cost (or Infinity if impassable)
 * - If tile is hidden (Fog/Shroud): Returns 1 (assumes passable)
 */
export function getMovementCost(tile: Tile, unit: Unit, gameState: GameState, ctx?: PathContext, options?: PathOptions): number {
    const stats = UNITS[unit.type];
    if (!stats) {
        console.error(`[Pathfinding Error] Unknown unit type: ${unit.type}`);
        console.error(`Available types: ${Object.keys(UNITS).join(", ")}`);
        return Infinity;
    }

    // Use context if provided, otherwise fall back to old behavior
    const tileKey = hexToString(tile.coord);
    const isVisible = ctx
        ? ctx.visibilitySet.has(tileKey)
        : (gameState.visibility[unit.ownerId] || []).includes(tileKey);

    // If hidden, be optimistic! Assume it's a plain (cost 1) unless we know otherwise
    if (!isVisible) {
        return 1;
    }

    // Check for blocking units - O(1) with cache, O(n) without
    const unitOnTile = ctx
        ? ctx.cache.unitByCoordKey.get(tileKey)
        : gameState.units.find(u => hexEquals(u.coord, tile.coord) && u.id !== unit.id);

    // Filter out self if using cache (cache returns first unit at coord)
    const blockingUnit = unitOnTile && unitOnTile.id !== unit.id ? unitOnTile : undefined;

    if (blockingUnit && blockingUnit.ownerId !== unit.ownerId) return Infinity;

    // Check for peacetime borders
    if (tile.ownerId && tile.ownerId !== unit.ownerId) {
        const diplomacy = gameState.diplomacy[unit.ownerId]?.[tile.ownerId] || "Peace";
        const isCity = ctx
            ? ctx.cache.cityByCoordKey.has(tileKey)
            : gameState.cities.some(c => hexEquals(c.coord, tile.coord));
        if (!isCity && diplomacy !== "War") return Infinity;
    }

    // Terrain-specific logic
    if (stats.domain === UnitDomain.Land) {
        if (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) return Infinity;
        if (tile.terrain === TerrainType.Mountain) return Infinity;

        // Check for peacetime movement restrictions (duplicate from above for domain-specific)
        if (tile.ownerId && tile.ownerId !== unit.ownerId) {
            const diplomacy = gameState.diplomacy[unit.ownerId]?.[tile.ownerId] || "Peace";
            const isCity = ctx
                ? ctx.cache.cityByCoordKey.has(tileKey)
                : gameState.cities.some(c => hexEquals(c.coord, tile.coord));
            if (!isCity && diplomacy !== "War") {
                return Infinity;
            }
        }

        // Check for blocking units
        if (blockingUnit) {
            if (blockingUnit.ownerId !== unit.ownerId) return Infinity;

            // v7.3: Fix pathfinding/validation mismatch.
            // Use strict stacking rules: Cannot pass through unit if we couldn't end turn there.
            // (Military cannot stack with Military, Civilian cannot stack with Civilian)
            // Unless ignoring friendly blockers (e.g. for long-range planning)
            const blockerStats = UNITS[blockingUnit.type];
            // TS2367 Fix: We are in 'if (stats.domain === UnitDomain.Land)', so strictly not Civilian.
            const isMilitary = true;
            const blockerIsMilitary = blockerStats.domain !== UnitDomain.Civilian;

            if (isMilitary === blockerIsMilitary && !options?.ignoreFriendlyBlockers) {
                return Infinity;
            }

            // Allow stacking with penalty (Civilian vs Military, or ignoring blockers)
            return (TERRAIN[tile.terrain].moveCostLand ?? Infinity) + 5;
        }

        return TERRAIN[tile.terrain].moveCostLand ?? Infinity;
    } else if (stats.domain === UnitDomain.Naval) {
        if (tile.terrain !== TerrainType.Coast && tile.terrain !== TerrainType.DeepSea) return Infinity;
        if (unit.type === UnitType.Skiff && tile.terrain === TerrainType.DeepSea) return Infinity;

        if (tile.ownerId && tile.ownerId !== unit.ownerId) {
            const diplomacy = gameState.diplomacy[unit.ownerId]?.[tile.ownerId] || "Peace";
            const isCity = ctx
                ? ctx.cache.cityByCoordKey.has(tileKey)
                : gameState.cities.some(c => hexEquals(c.coord, tile.coord));
            if (!isCity && diplomacy !== "War") {
                return Infinity;
            }
        }

        if (blockingUnit) {
            if (blockingUnit.ownerId !== unit.ownerId) return Infinity;
            return (TERRAIN[tile.terrain].moveCostNaval ?? Infinity) + 5;
        }

        return TERRAIN[tile.terrain].moveCostNaval ?? Infinity;
    }

    return 1;
}

type Node = {
    coord: HexCoord;
    g: number; // Cost from start
    h: number; // Heuristic to end
    f: number; // Total cost (g + h)
    parent?: Node;
};

/**
 * A* Pathfinding Algorithm
 * Returns an array of HexCoords representing the path from start to end (excluding start).
 * Returns empty array if no path found.
 * 
 * @param cache - Optional external cache for batch pathfinding operations
 */
export function findPath(start: HexCoord, end: HexCoord, unit: Unit, gameState: GameState, cache?: LookupCache, options?: PathOptions): HexCoord[] {
    const startKey = hexToString(start);
    const endKey = hexToString(end);

    if (startKey === endKey) return [];

    // Build context once for entire pathfinding operation
    const ctx = buildPathContext(gameState, unit, cache);

    const openSet = new Map<string, Node>();
    const closedSet = new Set<string>();

    const startNode: Node = {
        coord: start,
        g: 0,
        h: hexDistance(start, end),
        f: hexDistance(start, end)
    };

    openSet.set(startKey, startNode);

    // Safety break to prevent infinite loops in weird edge cases
    let iterations = 0;
    const MAX_ITERATIONS = 5000;

    while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
        iterations++;

        // Find node with lowest f score
        let current: Node | undefined;
        let currentKey = "";

        for (const [key, node] of openSet) {
            if (!current || node.f < current.f) {
                current = node;
                currentKey = key;
            }
        }

        if (!current) break;

        // Found destination?
        if (hexEquals(current.coord, end)) {
            const path: HexCoord[] = [];
            let curr: Node | undefined = current;
            while (curr && curr.parent) {
                path.unshift(curr.coord);
                curr = curr.parent;
            }
            return path;
        }

        openSet.delete(currentKey);
        closedSet.add(currentKey);

        // Check neighbors
        const neighbors = getNeighbors(current.coord);
        for (const neighborCoord of neighbors) {
            const neighborKey = hexToString(neighborCoord);

            if (closedSet.has(neighborKey)) continue;

            // O(1) tile lookup via cache
            const tile = ctx.cache.tileByKey.get(neighborKey);

            // If tile doesn't exist (off map), skip
            if (!tile) continue;

            const moveCost = getMovementCost(tile, unit, gameState, ctx, options);

            // If impassable, skip
            if (moveCost === Infinity) continue;

            const gScore = current.g + moveCost;

            const existingNode = openSet.get(neighborKey);

            if (!existingNode || gScore < existingNode.g) {
                const hScore = hexDistance(neighborCoord, end);
                const newNode: Node = {
                    coord: neighborCoord,
                    g: gScore,
                    h: hScore,
                    f: gScore + hScore,
                    parent: current
                };
                openSet.set(neighborKey, newNode);
            }
        }
    }

    return []; // No path found
}

/**
 * Finds all reachable tiles from a starting point within a given range (or unlimited).
 * Returns a map of reachable HexCoords to their cost/distance.
 * 
 * @param cache - Optional external cache for batch operations
 */
export function findReachableTiles(start: HexCoord, unit: Unit, gameState: GameState, maxRange: number = 20, cache?: LookupCache): Map<string, HexCoord> {
    const reachable = new Map<string, HexCoord>();
    const startKey = hexToString(start);
    reachable.set(startKey, start);

    // Build context once
    const ctx = buildPathContext(gameState, unit, cache);

    // Use index-based deque instead of shift() for O(1) dequeue
    const queue: { coord: HexCoord; cost: number }[] = [{ coord: start, cost: 0 }];
    let queueHead = 0;
    const visited = new Set<string>([startKey]);

    let iterations = 0;
    const MAX_ITERATIONS = 2000;

    while (queueHead < queue.length && iterations < MAX_ITERATIONS) {
        iterations++;
        const current = queue[queueHead++];

        if (current.cost >= maxRange) continue;

        const neighbors = getNeighbors(current.coord);
        for (const neighbor of neighbors) {
            const neighborKey = hexToString(neighbor);
            if (visited.has(neighborKey)) continue;

            // O(1) tile lookup via cache
            const tile = ctx.cache.tileByKey.get(neighborKey);
            if (!tile) continue;

            const moveCost = getMovementCost(tile, unit, gameState, ctx);
            if (moveCost === Infinity) continue;

            visited.add(neighborKey);
            reachable.set(neighborKey, neighbor);
            queue.push({ coord: neighbor, cost: current.cost + 1 });
        }
    }

    return reachable;
}
