import { GameState, HexCoord, OverlayType } from "../core/types.js";
import { getNeighbors, hexEquals, hexNeighbor, hexToString } from "../core/hex.js";

export type RiverEdge = { a: HexCoord; b: HexCoord };

export function riverEdgeKey(edge: RiverEdge): string {
    const a = hexToString(edge.a);
    const b = hexToString(edge.b);
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

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

export function tileRiverEdges(map: GameState["map"], coord: HexCoord): RiverEdge[] {
    if (map.rivers && map.rivers.length) {
        return map.rivers.filter(edge => hexEquals(edge.a, coord) || hexEquals(edge.b, coord));
    }
    return [];
}

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

