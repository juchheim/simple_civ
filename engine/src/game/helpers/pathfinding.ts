import { GameState, HexCoord, Tile, Unit, UnitDomain, TerrainType } from "../../core/types.js";
import { TERRAIN, UNITS } from "../../core/constants.js";
import { hexDistance, hexEquals, getNeighbors, hexToString } from "../../core/hex.js";

/**
 * Calculates the movement cost for a unit to enter a specific tile.
 * Implements "Optimistic" pathfinding:
 * - If tile is visible: Returns actual cost (or Infinity if impassable)
 * - If tile is hidden (Fog/Shroud): Returns 1 (assumes passable)
 */
export function getMovementCost(tile: Tile, unit: Unit, gameState: GameState): number {
    const stats = UNITS[unit.type];

    // Check visibility
    const tileKey = hexToString(tile.coord);
    const playerVisibility = gameState.visibility[unit.ownerId] || [];
    const isVisible = playerVisibility.includes(tileKey);

    // If hidden, be optimistic! Assume it's a plain (cost 1) unless we know otherwise
    // We treat Shroud and Fog the same here - if we can't see it NOW, we assume it's clear.
    if (!isVisible) {
        return 1;
    }

    // If visible, check actual terrain constraints
    if (stats.domain === UnitDomain.Land) {
        if (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) return Infinity;
        if (tile.terrain === TerrainType.Mountain) return Infinity;

        // Check for blocking units
        const unitOnTile = gameState.units.find(u => hexEquals(u.coord, tile.coord) && u.id !== unit.id);
        if (unitOnTile) {
            // If enemy, it's impassable (can't move onto them without attacking)
            if (unitOnTile.ownerId !== unit.ownerId) return Infinity;
            // If friendly, it's passable for PATHFINDING (we can move through them or they might move)
            // But give it a penalty so we prefer empty tiles
            return (TERRAIN[tile.terrain].moveCostLand ?? Infinity) + 5;
        }

        return TERRAIN[tile.terrain].moveCostLand ?? Infinity;
    } else if (stats.domain === UnitDomain.Naval) {
        if (tile.terrain !== TerrainType.Coast && tile.terrain !== TerrainType.DeepSea) return Infinity;

        // Check for blocking units
        const unitOnTile = gameState.units.find(u => hexEquals(u.coord, tile.coord) && u.id !== unit.id);
        if (unitOnTile) {
            if (unitOnTile.ownerId !== unit.ownerId) return Infinity;
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
 */
export function findPath(start: HexCoord, end: HexCoord, unit: Unit, gameState: GameState): HexCoord[] {
    const startKey = hexToString(start);
    const endKey = hexToString(end);

    if (startKey === endKey) return [];

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
    const MAX_ITERATIONS = 1000;

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

            // Find the tile object
            const tile = gameState.map.tiles.find(t => hexEquals(t.coord, neighborCoord));

            // If tile doesn't exist (off map), skip
            if (!tile) continue;

            const moveCost = getMovementCost(tile, unit, gameState);

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
