import { GameState, HexCoord, OverlayType } from "../core/types.js";
import { getNeighbors, hexEquals, hexNeighbor, hexToString } from "../core/hex.js";

export type RiverEdge = { a: HexCoord; b: HexCoord };

/**
 * Generates a unique string key for a river edge.
 * Canonicalizes the edge by sorting the coordinates.
 * @param edge - The river edge.
 * @returns A string key "q1,r1|q2,r2".
 */
export function riverEdgeKey(edge: RiverEdge): string {
    const a = hexToString(edge.a);
    const b = hexToString(edge.b);
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Normalizes a river edge so that the first coordinate is always "less than" the second.
 * Useful for consistent storage and comparison.
 * @param edge - The river edge to normalize.
 * @returns The normalized edge.
 */
export function normalizeRiverEdge(edge: RiverEdge): RiverEdge {
    const a = hexToString(edge.a);
    const b = hexToString(edge.b);
    return a <= b ? edge : { a: edge.b, b: edge.a };
}

export function directionBetween(a: HexCoord, b: HexCoord): number | null {
    for (let dir = 0; dir < 6; dir++) {
        if (hexEquals(hexNeighbor(a, dir), b)) {
            return dir;
        }
    }
    return null;
}

export function riverDirectionFrom(edge: RiverEdge, origin: HexCoord): number | null {
    if (hexEquals(origin, edge.a)) return directionBetween(edge.a, edge.b);
    if (hexEquals(origin, edge.b)) return directionBetween(edge.b, edge.a);
    return null;
}

/**
 * Finds all river edges adjacent to a specific tile.
 * @param map - The map state containing river data.
 * @param coord - The tile coordinate.
 * @returns Array of adjacent river edges.
 */
export function tileRiverEdges(map: GameState["map"], coord: HexCoord): RiverEdge[] {
    if (map.rivers && map.rivers.length) {
        return map.rivers.filter(edge => hexEquals(edge.a, coord) || hexEquals(edge.b, coord));
    }
    return [];
}

/**
 * Checks if a tile is adjacent to any river.
 * Supports both new river edge data and legacy tile overlays.
 * @param map - The map state.
 * @param coord - The tile coordinate.
 * @returns True if the tile touches a river.
 */
export function isTileAdjacentToRiver(map: GameState["map"], coord: HexCoord): boolean {
    if (map.rivers && map.rivers.length) {
        return map.rivers.some(edge => hexEquals(edge.a, coord) || hexEquals(edge.b, coord));
    }

    // Fallback for legacy maps that only used tile overlays
    const tile = map.tiles.find(t => hexEquals(t.coord, coord));
    if (tile?.overlays.includes(OverlayType.RiverEdge)) return true;

    const neighbors = getNeighbors(coord);
    return neighbors.some(n => {
        const t = map.tiles.find(tt => hexEquals(tt.coord, n));
        return t?.overlays.includes(OverlayType.RiverEdge);
    });
}

/**
 * Counts how many tiles in a list are adjacent to a river.
 * Used for RiverLeague bonuses.
 * @param map - The map state.
 * @param coords - List of tile coordinates.
 * @returns The count of river-adjacent tiles.
 */
export function riverAdjacencyCount(map: GameState["map"], coords: HexCoord[]): number {
    return coords.reduce((sum, coord) => sum + (isTileAdjacentToRiver(map, coord) ? 1 : 0), 0);
}

export const EDGE_TO_CORNER_INDICES: [number, number][] = [
    [0, 1], // E
    [5, 0], // SE
    [4, 5], // SW
    [3, 4], // W
    [2, 3], // NW
    [1, 2], // NE
];

