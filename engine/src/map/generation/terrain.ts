import { MapSize, OverlayType, TerrainType, Tile, HexCoord } from "../../core/types.js";
import { getNeighbors } from "../../core/hex.js";
import {
    generateLandmass,
    ensureConnectivity,
    detectCoastline,
    isSafeForMountain,
    LANDMASS_PARAMS
} from "./landmass.js";

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
    seed: number; // Added for noise-based landmass generation
};

export function applyTerrainNoise(context: TerrainContext) {
    const { tiles, width, height, mapSize, rng, getTile, isLand, seed } = context;

    // Reset all tiles to DeepSea
    tiles.forEach(t => (t.terrain = TerrainType.DeepSea));

    // Phase 1: Generate organic landmass using Perlin noise
    const landmassParams = LANDMASS_PARAMS[mapSize];
    const landmassContext = { tiles, width, height, rng, getTile };

    generateLandmass(landmassContext, landmassParams, mapSize, seed);

    // Phase 2: Ensure all land is connected (remove islands)
    ensureConnectivity(landmassContext);

    // Phase 3: Detect and mark coastline tiles
    detectCoastline(landmassContext);

    // Phase 4: Apply terrain variety to land tiles (Forest, Hills, etc.)
    tiles.forEach(t => {
        if (t.terrain === TerrainType.Plains) {
            const n = rng.next();
            if (n < 0.18) t.terrain = TerrainType.Forest;
            else if (n < 0.28) t.terrain = TerrainType.Hills;
            else if (n < 0.36) t.terrain = TerrainType.Marsh;
            else if (n < 0.42) t.terrain = TerrainType.Desert;
        }
    });

    // Phase 5: Place mountain clusters
    // Only place on tiles with 3+ land neighbors to avoid blocking peninsulas
    const clusterBySize: Record<MapSize, number> = { Tiny: 1, Small: 2, Standard: 3, Large: 4, Huge: 6 };
    const clusterCount = clusterBySize[mapSize] ?? 2;

    for (let i = 0; i < clusterCount; i++) {
        // Filter to safe locations for mountains
        const candidates = tiles.filter(t =>
            isLand(t) && isSafeForMountain(t, getTile, 3)
        );
        if (!candidates.length) break;

        const center = rng.choice(candidates);
        if (!center) continue;

        center.terrain = TerrainType.Mountain;

        // Spread to neighbors, but only if safe
        const ring1 = getNeighbors(center.coord)
            .map(c => getTile(c))
            .filter((t): t is Tile => !!t && isLand(t));

        ring1.forEach(t => {
            // Check if placing a mountain here is safe
            if (isSafeForMountain(t, getTile, 2)) {
                if (rng.next() < 0.6) {
                    t.terrain = TerrainType.Mountain;
                } else if (rng.next() < 0.85) {
                    t.terrain = TerrainType.Hills;
                }
            } else {
                // Not safe for mountain, make it hills instead
                if (rng.next() < 0.5) {
                    t.terrain = TerrainType.Hills;
                }
            }
        });
    }

    // Phase 5b: Re-run connectivity check to catch any islands created by mountains
    // This is necessary because mountain clusters could theoretically block access
    ensureConnectivity(landmassContext);

    // Phase 5c: Re-detect coastline after connectivity fix
    detectCoastline(landmassContext);

    // Phase 6: Place resource overlays
    tiles.forEach(t => {
        if (t.terrain !== TerrainType.Mountain && t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast) {
            const n = rng.next();
            if (n < 0.05) t.overlays.push(OverlayType.RichSoil);
            else if (n < 0.1) t.overlays.push(OverlayType.OreVein);
            else if (n < 0.12) t.overlays.push(OverlayType.SacredSite);
        }
    });

    // Phase 7: Place goodie huts on land tiles without other overlays (~3% chance)
    tiles.forEach(t => {
        if (t.terrain !== TerrainType.Mountain && t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast) {
            if (t.overlays.length === 0 && rng.next() < 0.03) {
                t.overlays.push(OverlayType.GoodieHut);
            }
        }
    });
}

