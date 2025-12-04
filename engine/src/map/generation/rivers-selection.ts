import { hexDistance, hexToString, getNeighbors } from "../../core/hex.js";
import { TerrainType, Tile } from "../../core/types.js";
import { buildWaterDistance } from "./rivers-helpers.js";

export type CoastEntry = {
    tile: Tile;
    key: string;
};

export type RiverStartSelectionParams = {
    riverCount: number;
    elevationThreshold: number;
    minStartSpacing: number;
    minStartCoastDistance: number;
    landTiles: Tile[];
    elevationByKey: Map<string, number>;
    waterDistance: Map<string, number>;
};

export function buildCoastEntries(
    tiles: Tile[],
    getTile: (coord: { q: number; r: number }) => Tile | undefined,
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

export function selectRiverStarts(params: RiverStartSelectionParams): Tile[] {
    const {
        riverCount,
        elevationThreshold,
        minStartSpacing,
        minStartCoastDistance,
        landTiles,
        elevationByKey,
        waterDistance,
    } = params;

    const getCoastDist = (coord: { q: number; r: number }) => waterDistance.get(hexToString(coord)) ?? Number.MAX_SAFE_INTEGER;

    const highElevation = landTiles
        .filter(t => (elevationByKey.get(hexToString(t.coord)) ?? 0) >= elevationThreshold)
        .sort((a, b) => {
            const ea = elevationByKey.get(hexToString(a.coord)) ?? 0;
            const eb = elevationByKey.get(hexToString(b.coord)) ?? 0;
            if (eb !== ea) return eb - ea;
            const da = getCoastDist(a.coord);
            const db = getCoastDist(b.coord);
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
                const da = getCoastDist(a.coord);
                const db = getCoastDist(b.coord);
                return db - da;
            });
        for (const tile of fallback) {
            if (riverStarts.length >= riverCount) break;
            const spaced = riverStarts.every(r => hexDistance(r.coord, tile.coord) >= minStartSpacing);
            if (!spaced) continue;
            riverStarts.push(tile);
        }
    }

    return riverStarts;
}

export function buildWaterDistanceForTiles(
    tiles: Tile[],
    getTile: (coord: { q: number; r: number }) => Tile | undefined,
): Map<string, number> {
    return buildWaterDistance(tiles, getTile);
}
