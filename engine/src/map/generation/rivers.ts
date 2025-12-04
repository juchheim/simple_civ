import {
    HexCoord,
    MapSize,
    RiverSegmentDescriptor,
    TerrainType,
    Tile,
} from "../../core/types.js";
import { getNeighbors, hexDistance, hexToString } from "../../core/hex.js";
import { directionBetween } from "../rivers.js";
import { buildElevationMap, buildWaterDistance, makeRiverEdgeKey } from "./rivers-helpers.js";
import { buildCoastEntries, selectRiverStarts, type CoastEntry } from "./rivers-selection.js";
import { findRiverPathToCoast as findRiverPathToCoastModule, type CoastPathResult } from "./rivers-pathfinding.js";
import { buildRiverPolylines, markRiverOverlays } from "./rivers-polylines.js";
import { WorldRng } from "./seeding.js";
import { RIVER_PARAMS } from "./rivers-params.js";

const {
    MAX_COAST_ENTRY_ATTEMPTS,
    COAST_BAND_ALLOWANCE,
    MAX_COAST_BAND_STREAK,
    MAX_SHORELINE_PLATEAU,
    MAX_RIVER_SEARCH_STATES,
    elevationThreshold,
    minStartSpacing,
    minRiverLength,
    minStartCoastDistance,
    riverTargetsBySize,
} = RIVER_PARAMS;

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
    options?: RiverGenerationOptions;
};

export type RiverGenerationResult = {
    riverEdges: RiverEdge[];
    riverPolylines: RiverSegmentDescriptor[][];
    metrics?: RiverGenerationMetrics;
};

export type RiverGenerationOptions = {
    usePathfinderModule?: boolean;
    collectMetrics?: boolean;
};

export type RiverGenerationMetrics = {
    requestedRiverCount: number;
    startsSelected: number;
    pathsCompleted: number;
    riverLengths: number[];
};

export function generateRivers(context: RiverGenerationContext): RiverGenerationResult {
    const { tiles, mapSize, rng, getTile, isLand, options } = context;
    const useModulePathfinder = options?.usePathfinderModule ?? false;
    const collectMetrics = options?.collectMetrics ?? false;

    const riverEdges: RiverEdge[] = [];
    const riverPolylines: RiverSegmentDescriptor[][] = [];
    const [riverMin, riverMax] = riverTargetsBySize[mapSize];
    const riverCount = Math.max(1, rng.int(riverMin, riverMax));
    const metrics: RiverGenerationMetrics | undefined = collectMetrics
        ? { requestedRiverCount: riverCount, startsSelected: 0, pathsCompleted: 0, riverLengths: [] }
        : undefined;

    const landTiles = tiles.filter(t => isLand(t));
    const elevationByKey = buildElevationMap(tiles);
    const waterDistance = buildWaterDistance(tiles, getTile);

    const riverDegree = new Map<string, number>();
    const existingRiverTiles = new Set<string>();
    const incrementDegree = (key: string) => {
        riverDegree.set(key, (riverDegree.get(key) ?? 0) + 1);
        existingRiverTiles.add(key);
    };

    const addRiverEdge = (a: HexCoord, b: HexCoord) => {
        const keyA = hexToString(a);
        const keyB = hexToString(b);
        const key = makeRiverEdgeKey(a, b);
        if (riverEdges.some(e => makeRiverEdgeKey(e.a, e.b) === key)) return;
        riverEdges.push(keyA < keyB ? { a, b } : { a: b, b: a });
        incrementDegree(keyA);
        incrementDegree(keyB);
    };

    const riverStarts = selectRiverStarts({
        riverCount,
        elevationThreshold,
        minStartSpacing,
        minStartCoastDistance,
        landTiles,
        elevationByKey,
        waterDistance,
    });
    if (metrics) metrics.startsSelected = riverStarts.length;

    const coastEntries = buildCoastEntries(tiles, getTile, isLand);
    const usedCoastEntries = new Set<string>();
    const pathfinder = useModulePathfinder ? findRiverPathToCoastModule : findRiverPathToCoastLegacy;

    for (const start of riverStarts) {
        const result = pathfinder(
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
        if (metrics) {
            metrics.pathsCompleted += 1;
            metrics.riverLengths.push(Math.max(0, path.length - 1));
        }

        const polylines = buildRiverPolylines(path, waterDistance, addRiverEdge);
        riverPolylines.push(...polylines);
        markRiverOverlays(riverEdges, tiles, isLand, getTile);
        for (const coord of path) {
            existingRiverTiles.add(hexToString(coord));
        }
        existingRiverTiles.add(targetKey);
    }

    return { riverEdges, riverPolylines, metrics };
}


function findRiverPathToCoastLegacy(
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

export function isTileAdjacentToRiver(map: { riverPolylines?: RiverSegmentDescriptor[][] }, coord: HexCoord): boolean {
    if (!map.riverPolylines) return false;
    const coordKey = hexToString(coord);
    for (const polyline of map.riverPolylines) {
        for (const segment of polyline) {
            if (hexToString(segment.tile) === coordKey) return true;
        }
    }
    return false;
}
