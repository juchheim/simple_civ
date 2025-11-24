import { MapSize, OverlayType, TerrainType, Tile, HexCoord } from "../../core/types.js";
import { getNeighbors } from "../../core/hex.js";

export type TerrainRng = {
    next(): number;
    choice<T>(array: T[]): T;
};

export type TerrainContext = {
    tiles: Tile[];
    width: number;
    height: number;
    mapSize: MapSize;
    rng: TerrainRng;
    getTile: (coord: HexCoord) => Tile | undefined;
    isLand: (tile: Tile | undefined) => boolean;
};

export function applyTerrainNoise(context: TerrainContext) {
    const { tiles, width, height, mapSize, rng, getTile, isLand } = context;

    tiles.forEach(t => (t.terrain = TerrainType.DeepSea));

    const edgeDist = (tile: Tile) => {
        const col = tile.coord.q + Math.floor(tile.coord.r / 2);
        const row = tile.coord.r;
        const toLeft = col;
        const toRight = width - 1 - col;
        const toTop = row;
        const toBottom = height - 1 - row;
        return Math.min(toLeft, toRight, toTop, toBottom);
    };

    tiles.forEach(t => {
        const dist = edgeDist(t);
        if (dist <= 0) {
            t.terrain = TerrainType.DeepSea;
        } else if (dist === 1) {
            t.terrain = TerrainType.Coast;
        } else if (dist === 2) {
            t.terrain = rng.next() < 0.65 ? TerrainType.Coast : TerrainType.Plains;
        } else {
            t.terrain = TerrainType.Plains;
            if (rng.next() < 0.05) t.terrain = TerrainType.Coast;
        }
    });

    tiles.forEach(t => {
        if (t.terrain === TerrainType.Plains) {
            const n = rng.next();
            if (n < 0.18) t.terrain = TerrainType.Forest;
            else if (n < 0.28) t.terrain = TerrainType.Hills;
            else if (n < 0.36) t.terrain = TerrainType.Marsh;
            else if (n < 0.42) t.terrain = TerrainType.Desert;
        }
    });

    const clusterBySize: Record<MapSize, number> = { Small: 2, Standard: 3, Large: 4 };
    const clusterCount = clusterBySize[mapSize] ?? 2;
    for (let i = 0; i < clusterCount; i++) {
        const candidates = tiles.filter(t => isLand(t));
        if (!candidates.length) break;
        const center = rng.choice(candidates);
        if (!center) continue;
        center.terrain = TerrainType.Mountain;
        const ring1 = getNeighbors(center.coord)
            .map(c => getTile(c))
            .filter((t): t is Tile => !!t && isLand(t));
        ring1.forEach(t => {
            if (rng.next() < 0.6) {
                t.terrain = TerrainType.Mountain;
            } else if (rng.next() < 0.85) {
                t.terrain = TerrainType.Hills;
            }
        });
    }

    tiles.forEach(t => {
        if (t.terrain !== TerrainType.Mountain && t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast) {
            const n = rng.next();
            if (n < 0.05) t.overlays.push(OverlayType.RichSoil);
            else if (n < 0.1) t.overlays.push(OverlayType.OreVein);
            else if (n < 0.12) t.overlays.push(OverlayType.SacredSite);
        }
        t.features = t.overlays;
    });
}

