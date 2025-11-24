export const EDGE_TO_CORNER_INDICES: [number, number][] = [
    [0, 1], // E
    [5, 0], // SE
    [4, 5], // SW
    [3, 4], // W
    [2, 3], // NW
    [1, 2], // NE
];
import { GameState, HexCoord, OverlayType } from "@simple-civ/engine";
import { getNeighbors, hexEquals, hexNeighbor, hexToString } from "./hex";

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

    // Fallback for legacy saves that relied on tile overlays
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

export function buildRiverPolylines(edges: RiverEdge[]): HexCoord[][] {
    if (!edges.length) return [];

    const coordByKey = new Map<string, HexCoord>();
    const adjacency = new Map<string, Set<string>>();

    const addNode = (coord: HexCoord) => {
        const key = hexToString(coord);
        coordByKey.set(key, coord);
        if (!adjacency.has(key)) adjacency.set(key, new Set());
        return key;
    };

    const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

    edges.forEach(edge => {
        const aKey = addNode(edge.a);
        const bKey = addNode(edge.b);
        adjacency.get(aKey)!.add(bKey);
        adjacency.get(bKey)!.add(aKey);
    });

    const visitedEdges = new Set<string>();
    const polylines: HexCoord[][] = [];

    const traverse = (startKey: string) => {
        if (!coordByKey.has(startKey)) return;
        const path: HexCoord[] = [coordByKey.get(startKey)!];
        let currentKey = startKey;
        while (true) {
            const neighbors = adjacency.get(currentKey);
            if (!neighbors) break;
            let nextKey: string | null = null;
            for (const neighbor of neighbors) {
                const eKey = edgeKey(currentKey, neighbor);
                if (visitedEdges.has(eKey)) continue;
                visitedEdges.add(eKey);
                nextKey = neighbor;
                break;
            }
            if (!nextKey) break;
            path.push(coordByKey.get(nextKey)!);
            currentKey = nextKey;
        }
        if (path.length > 1) {
            polylines.push(path);
        }
    };

    // Trace from endpoints first (degree 1)
    adjacency.forEach((neighbors, key) => {
        if (neighbors.size === 1) {
            traverse(key);
        }
    });

    // Handle remaining edges (loops)
    adjacency.forEach((_neighbors, key) => {
        const neighbors = adjacency.get(key);
        if (!neighbors) return;
        for (const neighbor of neighbors) {
            const eKey = edgeKey(key, neighbor);
            if (!visitedEdges.has(eKey)) {
                traverse(key);
                break;
            }
        }
    });

    return polylines;
}

