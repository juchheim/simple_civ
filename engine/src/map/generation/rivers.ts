import {
    HexCoord,
    MapSize,
    OverlayType,
    RiverPoint,
    RiverSegmentDescriptor,
    TerrainType,
    Tile,
} from "../../core/types.js";
import { getNeighbors, hexDistance, hexToString } from "../../core/hex.js";
import { directionBetween, EDGE_TO_CORNER_INDICES } from "../rivers.js";
import { WorldRng } from "./seeding.js";

const HEX_SIZE = 75;
const HEX_CORNER_OFFSETS = Array.from({ length: 6 }, (_v, i) => {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    return {
        x: HEX_SIZE * Math.cos(angleRad),
        y: HEX_SIZE * Math.sin(angleRad),
    };
});

const MAX_COAST_ENTRY_ATTEMPTS = 12;
const COAST_BAND_ALLOWANCE = 5;
const MAX_COAST_BAND_STREAK = 4;
const MAX_SHORELINE_PLATEAU = 1;
const MAX_RIVER_SEARCH_STATES = 1500;

const RIVER_POINT_EPSILON = 1e-6;

const TERRAIN_ELEVATION: Record<TerrainType, number> = {
    [TerrainType.Mountain]: 5,
    [TerrainType.Hills]: 4,
    [TerrainType.Forest]: 3,
    [TerrainType.Plains]: 2,
    [TerrainType.Desert]: 2,
    [TerrainType.Marsh]: 1,
    [TerrainType.Coast]: 0,
    [TerrainType.DeepSea]: -1,
};

type CoastEntry = {
    tile: Tile;
    key: string;
};

type CoastPathResult = {
    path: HexCoord[];
    targetKey: string;
};

type PathNode = {
    coord: HexCoord;
    key: string;
    prev: string | null;
    dir: number | null;
    g: number;
    f: number;
    bandSteps: number;
    bandStreak: number;
    plateau: number;
};

export type RiverEdge = { a: HexCoord; b: HexCoord };

export type RiverGenerationContext = {
    tiles: Tile[];
    mapSize: MapSize;
    rng: WorldRng;
    getTile: (coord: HexCoord) => Tile | undefined;
    isLand: (tile: Tile | undefined) => boolean;
};

export type RiverGenerationResult = {
    riverEdges: RiverEdge[];
    riverPolylines: RiverSegmentDescriptor[][];
};

export function generateRivers(context: RiverGenerationContext): RiverGenerationResult {
    const { tiles, mapSize, rng, getTile, isLand } = context;

    const riverEdges: RiverEdge[] = [];
    const riverPolylines: RiverSegmentDescriptor[][] = [];
    const riverTargetsBySize: Record<MapSize, [number, number]> = {
        Tiny: [2, 4],
        Small: [4, 7],
        Standard: [8, 13],
        Large: [10, 15],
        Huge: [14, 20],
    };
    const [riverMin, riverMax] = riverTargetsBySize[mapSize];
    const riverCount = Math.max(1, rng.int(riverMin, riverMax));

    const landTiles = tiles.filter(t => isLand(t));
    const elevationByKey = buildElevationMap(tiles);
    const waterDistance = buildWaterDistance(tiles, getTile);
    const getCoastDist = (coord: HexCoord) => waterDistance.get(hexToString(coord)) ?? Number.MAX_SAFE_INTEGER;

    const riverDegree = new Map<string, number>();
    const existingRiverTiles = new Set<string>();
    const incrementDegree = (key: string) => {
        riverDegree.set(key, (riverDegree.get(key) ?? 0) + 1);
        existingRiverTiles.add(key);
    };

    const addRiverEdge = (a: HexCoord, b: HexCoord) => {
        const keyA = hexToString(a);
        const keyB = hexToString(b);
        const key = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
        if (riverEdges.some(e => {
            const ek = hexToString(e.a) < hexToString(e.b)
                ? `${hexToString(e.a)}|${hexToString(e.b)}`
                : `${hexToString(e.b)}|${hexToString(e.a)}`;
            return ek === key;
        })) return;
        riverEdges.push(keyA < keyB ? { a, b } : { a: b, b: a });
        incrementDegree(keyA);
        incrementDegree(keyB);
    };

    const elevationThreshold = 3;
    const minStartSpacing = 4;
    const minRiverLength = 4;
    const minStartCoastDistance = 2;
    const highElevation = landTiles
        .filter(t => (elevationByKey.get(hexToString(t.coord)) ?? 0) >= elevationThreshold)
        .sort((a, b) => {
            const ea = elevationByKey.get(hexToString(a.coord)) ?? 0;
            const eb = elevationByKey.get(hexToString(b.coord)) ?? 0;
            if (eb !== ea) return eb - ea;
            const da = waterDistance.get(hexToString(a.coord)) ?? Number.MAX_SAFE_INTEGER;
            const db = waterDistance.get(hexToString(b.coord)) ?? Number.MAX_SAFE_INTEGER;
            return db - da;
        });
    const interiorCandidates = highElevation.filter(t => getCoastDist(t.coord) >= minStartCoastDistance);
    const shallowCandidates = highElevation.filter(t => getCoastDist(t.coord) < minStartCoastDistance);

    const chosenStartKeys = new Set<string>();
    const riverStarts: Tile[] = [];
    const tryAddStart = (candidate: Tile) => {
        if (riverStarts.length >= riverCount) return;
        const key = hexToString(candidate.coord);
        if (chosenStartKeys.has(key)) return;
        const spaced = riverStarts.every(r => hexDistance(r.coord, candidate.coord) >= minStartSpacing);
        if (!spaced) return;
        riverStarts.push(candidate);
        chosenStartKeys.add(key);
    };

    for (const candidate of interiorCandidates) {
        if (riverStarts.length >= riverCount) break;
        tryAddStart(candidate);
    }

    if (riverStarts.length < riverCount) {
        for (const candidate of shallowCandidates) {
            if (riverStarts.length >= riverCount) break;
            tryAddStart(candidate);
        }
    }

    if (riverStarts.length < riverCount) {
        const fallback = landTiles
            .filter(t => !chosenStartKeys.has(hexToString(t.coord)))
            .sort((a, b) => {
                const da = waterDistance.get(hexToString(a.coord)) ?? Number.MAX_SAFE_INTEGER;
                const db = waterDistance.get(hexToString(b.coord)) ?? Number.MAX_SAFE_INTEGER;
                return db - da;
            });
        for (const tile of fallback) {
            if (riverStarts.length >= riverCount) break;
            const spaced = riverStarts.every(r => hexDistance(r.coord, tile.coord) >= minStartSpacing);
            if (!spaced) continue;
            riverStarts.push(tile);
        }
    }

    const coastEntries = buildCoastEntries(tiles, getTile, isLand);
    const usedCoastEntries = new Set<string>();

    for (const start of riverStarts) {
        const result = findRiverPathToCoast(
            start,
            coastEntries,
            usedCoastEntries,
            getTile,
            isLand,
            existingRiverTiles,
            riverDegree,
            elevationByKey,
            waterDistance,
            minRiverLength,
            rng,
        );
        if (!result) continue;
        const path = result.path;
        const targetKey = result.targetKey;
        usedCoastEntries.add(targetKey);

        const polylineDescriptor: RiverSegmentDescriptor[] = [];
        let lastPoint: RiverPoint | null = null;

        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            const dir = directionBetween(from, to);
            if (dir === null) continue;
            const toKey = hexToString(to);
            const toDist = waterDistance.get(toKey) ?? Number.MAX_SAFE_INTEGER;
            const isMouth = toDist === 0;

            const cornerPoints = getCornerPoints(from);
            const [cornerA, cornerB] = EDGE_TO_CORNER_INDICES[dir];
            const edgeCornerIdxs = [cornerA, cornerB];

            let entryIdx: number | null = null;
            if (lastPoint) {
                entryIdx = findCornerIndex(from, lastPoint);
            }

            let startIdx = edgeCornerIdxs[0];
            let endIdx = edgeCornerIdxs[1];

            if (entryIdx !== null) {
                const pathToFirst = walkCornerIndices(entryIdx, edgeCornerIdxs[0]);
                const pathToSecond = walkCornerIndices(entryIdx, edgeCornerIdxs[1]);
                let bridgePath: number[];
                if (pathToFirst.length <= pathToSecond.length) {
                    startIdx = edgeCornerIdxs[0];
                    endIdx = edgeCornerIdxs[1];
                    bridgePath = pathToFirst;
                } else {
                    startIdx = edgeCornerIdxs[1];
                    endIdx = edgeCornerIdxs[0];
                    bridgePath = pathToSecond;
                }

                if (bridgePath.length) {
                    let currentIdx = entryIdx;
                    for (const nextIdx of bridgePath) {
                        pushCornerSegment(polylineDescriptor, from, cornerPoints, currentIdx, nextIdx, false);
                        currentIdx = nextIdx;
                    }
                }
            }

            pushCornerSegment(polylineDescriptor, from, cornerPoints, startIdx, endIdx, isMouth);
            lastPoint = cornerPoints[endIdx];
            addRiverEdge(from, to);
        }
        if (polylineDescriptor.length) {
            riverPolylines.push(polylineDescriptor);
        }

        for (let i = 0; i < path.length; i++) {
            const coord = path[i];
            const tile = getTile(coord);
            if (!tile) continue;
            if (!isLand(tile)) continue;
            if (!tile.overlays.includes(OverlayType.RiverEdge)) {
                tile.overlays.push(OverlayType.RiverEdge);
                tile.features = tile.overlays;
            }
            existingRiverTiles.add(hexToString(coord));
        }
        existingRiverTiles.add(targetKey);
    }

    return { riverEdges, riverPolylines };
}

function hexToPixel(hex: HexCoord) {
    const x = HEX_SIZE * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
    const y = HEX_SIZE * ((3 / 2) * hex.r);
    return { x, y };
}

function getCornerPoints(tile: HexCoord) {
    return HEX_CORNER_OFFSETS.map(offset => {
        const center = hexToPixel(tile);
        return { x: center.x + offset.x, y: center.y + offset.y };
    });
}

function squaredDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function findCornerIndex(tile: HexCoord, point: RiverPoint): number | null {
    const corners = getCornerPoints(tile);
    for (let idx = 0; idx < corners.length; idx++) {
        if (squaredDistance(corners[idx], point) < RIVER_POINT_EPSILON) {
            return idx;
        }
    }
    return null;
}

function walkCornerIndices(fromIdx: number, toIdx: number): number[] {
    if (fromIdx === toIdx) return [];
    const clockwise: number[] = [];
    let idx = fromIdx;
    while (idx !== toIdx) {
        idx = (idx + 1) % 6;
        clockwise.push(idx);
    }
    const counter: number[] = [];
    idx = fromIdx;
    while (idx !== toIdx) {
        idx = (idx + 5) % 6;
        counter.push(idx);
    }
    return counter.length < clockwise.length ? counter : clockwise;
}

function pushCornerSegment(
    segments: RiverSegmentDescriptor[],
    tile: HexCoord,
    cornerPoints: RiverPoint[],
    startIdx: number,
    endIdx: number,
    isMouth = false,
) {
    segments.push({
        tile,
        cornerA: startIdx,
        cornerB: endIdx,
        start: cornerPoints[startIdx],
        end: cornerPoints[endIdx],
        isMouth,
    });
}

function buildElevationMap(tiles: Tile[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const tile of tiles) {
        map.set(hexToString(tile.coord), TERRAIN_ELEVATION[tile.terrain] ?? 1);
    }
    return map;
}

function buildWaterDistance(tiles: Tile[], getTile: (coord: HexCoord) => Tile | undefined): Map<string, number> {
    const distance = new Map<string, number>();
    const queue: Tile[] = [];

    for (const tile of tiles) {
        const key = hexToString(tile.coord);
        if (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) {
            distance.set(key, 0);
            queue.push(tile);
        }
    }

    let index = 0;
    while (index < queue.length) {
        const current = queue[index++];
        const currentKey = hexToString(current.coord);
        const base = distance.get(currentKey) ?? 0;

        for (const neighborCoord of getNeighbors(current.coord)) {
            const neighbor = getTile(neighborCoord);
            if (!neighbor) continue;
            const neighborKey = hexToString(neighbor.coord);
            if (distance.has(neighborKey)) continue;
            distance.set(neighborKey, base + 1);
            queue.push(neighbor);
        }
    }

    return distance;
}

function buildCoastEntries(
    tiles: Tile[],
    getTile: (coord: HexCoord) => Tile | undefined,
    isLand: (tile: Tile | undefined) => boolean,
): CoastEntry[] {
    const entries: CoastEntry[] = [];
    for (const tile of tiles) {
        if (tile.terrain !== TerrainType.Coast) continue;
        const hasLandNeighbor = getNeighbors(tile.coord).some(coord => {
            const neighbor = getTile(coord);
            return neighbor && isLand(neighbor);
        });
        if (!hasLandNeighbor) continue;
        entries.push({ tile, key: hexToString(tile.coord) });
    }
    return entries;
}

function findRiverPathToCoast(
    start: Tile,
    coastEntries: CoastEntry[],
    usedCoastEntries: Set<string>,
    getTile: (coord: HexCoord) => Tile | undefined,
    isLand: (tile: Tile | undefined) => boolean,
    existingRiverTiles: Set<string>,
    riverDegree: Map<string, number>,
    elevationByKey: Map<string, number>,
    waterDistance: Map<string, number>,
    minRiverLength: number,
    rng: WorldRng,
): CoastPathResult | null {
    if (!coastEntries.length) return null;

    const ranked = coastEntries
        .filter(entry => !usedCoastEntries.has(entry.key))
        .map(entry => ({
            entry,
            distance: hexDistance(start.coord, entry.tile.coord),
            noise: rng.next(),
        }))
        .sort((a, b) => {
            if (a.distance !== b.distance) return a.distance - b.distance;
            return a.noise - b.noise;
        });

    for (const candidate of ranked.slice(0, MAX_COAST_ENTRY_ATTEMPTS)) {
        const result = findRiverPathToTarget(
            start,
            candidate.entry,
            usedCoastEntries,
            getTile,
            isLand,
            existingRiverTiles,
            riverDegree,
            elevationByKey,
            waterDistance,
            minRiverLength,
            rng,
        );
        if (result) {
            return result;
        }
    }

    return null;
}

function findRiverPathToTarget(
    start: Tile,
    targetEntry: CoastEntry,
    usedCoastEntries: Set<string>,
    getTile: (coord: HexCoord) => Tile | undefined,
    isLand: (tile: Tile | undefined) => boolean,
    existingRiverTiles: Set<string>,
    riverDegree: Map<string, number>,
    elevationByKey: Map<string, number>,
    waterDistance: Map<string, number>,
    minRiverLength: number,
    rng: WorldRng,
): CoastPathResult | null {
    const targetKey = targetEntry.key;
    const targetCoord = targetEntry.tile.coord;
    const startKey = hexToString(start.coord);
    const startCoastDist = waterDistance.get(startKey) ?? Number.MAX_SAFE_INTEGER;

    const startNode: PathNode = {
        coord: start.coord,
        key: startKey,
        prev: null,
        dir: null,
        g: 0,
        f: heuristicCost(start.coord, targetCoord),
        bandSteps: startCoastDist <= 2 ? 1 : 0,
        bandStreak: startCoastDist <= 1 ? 1 : 0,
        plateau: 0,
    };

    const open: PathNode[] = [startNode];
    const nodeByKey = new Map<string, PathNode>([[startKey, startNode]]);
    const gScore = new Map<string, number>([[startKey, 0]]);

    let expansions = 0;
    while (open.length && expansions < MAX_RIVER_SEARCH_STATES) {
        expansions++;
        open.sort((a, b) => a.f - b.f);
        const current = open.shift()!;
        if (current.key === targetKey) {
            if (current.g >= minRiverLength) {
                return { path: reconstructPath(current.key, nodeByKey), targetKey };
            }
            continue;
        }

        const currentTile = getTile(current.coord);
        if (!currentTile) continue;

        const currentCoastDist = waterDistance.get(current.key) ?? Number.MAX_SAFE_INTEGER;
        const needsLength = current.g < minRiverLength;
        const forcingCoast =
            currentCoastDist <= 2 &&
            (current.g >= minRiverLength || current.bandSteps >= COAST_BAND_ALLOWANCE);
        const neighborCoords = getNeighbors(current.coord);
        const seekInland = needsLength && currentCoastDist <= 2;
        let inlandOptionAvailable = false;
        if (seekInland) {
            for (const coord of neighborCoords) {
                const neighbor = getTile(coord);
                if (!neighbor) continue;
                const neighborKey = hexToString(neighbor.coord);
                if (neighborKey === targetKey) continue;
                const neighborCoastDist = waterDistance.get(neighborKey) ?? Number.MAX_SAFE_INTEGER;
                if (neighborCoastDist <= currentCoastDist) continue;
                if (!isLand(neighbor) || neighbor.terrain === TerrainType.Coast) continue;
                if (existingRiverTiles.has(neighborKey)) continue;
                const touchesRiver = getNeighbors(neighbor.coord).some(adj => {
                    const key = hexToString(adj);
                    if (key === current.key) return false;
                    return existingRiverTiles.has(key);
                });
                if (touchesRiver) continue;
                inlandOptionAvailable = true;
                break;
            }
        }

        if (current.g >= minRiverLength) {
            const coastNeighbor = selectAvailableCoastNeighbor(
                currentTile,
                getTile,
                usedCoastEntries,
                riverDegree,
                rng,
            );
            if (coastNeighbor) {
                const basePath = reconstructPath(current.key, nodeByKey);
                basePath.push(coastNeighbor.tile.coord);
                return { path: basePath, targetKey: coastNeighbor.key };
            }
        }

        for (const neighborCoord of neighborCoords) {
            const neighbor = getTile(neighborCoord);
            if (!neighbor) continue;
            const neighborKey = hexToString(neighbor.coord);
            const isTarget = neighborKey === targetKey;
            const neighborCoastDist = waterDistance.get(neighborKey) ?? Number.MAX_SAFE_INTEGER;

            if (!isTarget) {
                if (!isLand(neighbor)) continue;
                if (neighbor.terrain === TerrainType.Coast) continue;
                if (existingRiverTiles.has(neighborKey)) continue;
                const touchesRiver = getNeighbors(neighbor.coord).some(coord => {
                    const key = hexToString(coord);
                    if (key === current.key) return false;
                    return existingRiverTiles.has(key);
                });
                if (touchesRiver) continue;
            } else {
                const degree = riverDegree.get(neighborKey) ?? 0;
                if (degree >= 1) continue;
            }

            if (!isTarget && forcingCoast && neighborCoastDist >= currentCoastDist) continue;

            if (!isTarget && seekInland && inlandOptionAvailable && neighborCoastDist <= currentCoastDist) {
                continue;
            }

            if (!isTarget && currentCoastDist <= 1) {
                if (needsLength) {
                    if (neighborCoastDist <= currentCoastDist) continue;
                } else if (neighborCoastDist <= 1) {
                    continue;
                }
            }

            const nextBandSteps = neighborCoastDist <= 2 ? current.bandSteps + 1 : 0;
            const nextBandStreak = neighborCoastDist <= 1 ? current.bandStreak + 1 : 0;
            const nextPlateau =
                currentCoastDist <= 2 && neighborCoastDist === currentCoastDist ? current.plateau + 1 : 0;
            if (
                !isTarget &&
                currentCoastDist <= 2 &&
                neighborCoastDist === currentCoastDist &&
                nextPlateau > MAX_SHORELINE_PLATEAU
            ) {
                continue;
            }
            if (!isTarget) {
                if (neighborCoastDist <= 2 && nextBandSteps > COAST_BAND_ALLOWANCE) continue;
                if (neighborCoastDist <= 1 && nextBandStreak > MAX_COAST_BAND_STREAK) continue;
            }

            const dirToNeighbor = directionBetween(current.coord, neighbor.coord);
            if (current.dir !== null && dirToNeighbor !== null) {
                const diff = Math.abs(dirToNeighbor - current.dir);
                const wrapped = Math.min(diff, 6 - diff);
                if (wrapped > 1) continue;
            }

            const tentativeG = current.g + 1;
            const recordedG = gScore.get(neighborKey);
            if (recordedG !== undefined && tentativeG >= recordedG) continue;

            const currentElevation = elevationByKey.get(current.key) ?? 0;
            const neighborElevation = elevationByKey.get(neighborKey) ?? 0;
            const elevationPenalty = Math.max(0, neighborElevation - currentElevation);
            const heuristic = heuristicCost(neighbor.coord, targetCoord);
            const coastBias = Math.max(0, neighborCoastDist - 1);
            const fScore = tentativeG + heuristic + elevationPenalty * 2 + coastBias * 0.5;

            const nextNode: PathNode = {
                coord: neighbor.coord,
                key: neighborKey,
                prev: current.key,
                dir: dirToNeighbor,
                g: tentativeG,
                f: fScore,
                bandSteps: isTarget ? 0 : nextBandSteps,
                bandStreak: isTarget ? 0 : nextBandStreak,
                plateau: isTarget ? 0 : nextPlateau,
            };

            gScore.set(neighborKey, tentativeG);
            nodeByKey.set(neighborKey, nextNode);
            open.push(nextNode);
        }
    }

    return null;
}

function heuristicCost(from: HexCoord, to: HexCoord): number {
    return hexDistance(from, to);
}

function selectAvailableCoastNeighbor(
    tile: Tile,
    getTile: (coord: HexCoord) => Tile | undefined,
    usedCoastEntries: Set<string>,
    riverDegree: Map<string, number>,
    rng: WorldRng,
): { tile: Tile; key: string } | null {
    const candidates = getNeighbors(tile.coord)
        .map(coord => getTile(coord))
        .filter((t): t is Tile => !!t && t.terrain === TerrainType.Coast)
        .map(neighbor => ({ tile: neighbor, key: hexToString(neighbor.coord) }))
        .filter(candidate => !usedCoastEntries.has(candidate.key))
        .filter(candidate => (riverDegree.get(candidate.key) ?? 0) < 1);
    if (!candidates.length) return null;
    const idx = Math.floor(rng.next() * candidates.length);
    return candidates[idx];
}

function reconstructPath(
    endKey: string,
    nodeByKey: Map<string, { coord: HexCoord; prev: string | null }>,
): HexCoord[] {
    const path: HexCoord[] = [];
    let currentKey: string | null = endKey;
    while (currentKey) {
        const node = nodeByKey.get(currentKey);
        if (!node) break;
        path.unshift(node.coord);
        currentKey = node.prev;
    }
    return path;
}

