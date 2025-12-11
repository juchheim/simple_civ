/**
 * Landmass generation using Perlin noise with connectivity validation.
 * Creates organic coastlines with bays, peninsulas, and varied geography.
 */

import { HexCoord, MapSize, TerrainType, Tile } from "../../core/types.js";
import { getNeighbors, hexToString } from "../../core/hex.js";
import { createNoise2D, fractalNoise, smoothstep } from "./noise.js";
import type { TerrainRng } from "./terrain.js";

export type LandmassContext = {
    tiles: Tile[];
    width: number;
    height: number;
    rng: TerrainRng;
    getTile: (coord: HexCoord) => Tile | undefined;
};

export type LandmassParams = {
    noiseScale: number;      // Controls feature size (lower = larger features)
    octaves: number;         // Detail levels (more = finer coastlines)
    persistence: number;     // Amplitude falloff per octave
    landThreshold: number;   // Noise value above which tile is land
    edgeFalloffStart: number; // Distance from edge where falloff begins
};

/**
 * Default parameters for each map size.
 * noiseScale controls coastline smoothness (lower = smoother curves)
 * octaves add detail to coastline (1-2 = smooth, 3+ = jagged)
 * landThreshold is now BASE RADIUS (0.7 = land extends 70% toward edges)
 * edgeFalloffStart is unused in new algorithm but kept for compatibility
 */
export const LANDMASS_PARAMS: Record<MapSize, LandmassParams> = {
    // Base radius ~0.7-0.8 means land fills most of map before noise variance
    // Noise then pushes coastline in/out by up to 35%
    Tiny: { noiseScale: 0.3, octaves: 2, persistence: 0.5, landThreshold: 0.75, edgeFalloffStart: 1 },
    Small: { noiseScale: 0.25, octaves: 2, persistence: 0.5, landThreshold: 0.75, edgeFalloffStart: 2 },
    Standard: { noiseScale: 0.2, octaves: 2, persistence: 0.5, landThreshold: 0.75, edgeFalloffStart: 2 },
    Large: { noiseScale: 0.15, octaves: 2, persistence: 0.5, landThreshold: 0.75, edgeFalloffStart: 3 },
    Huge: { noiseScale: 0.12, octaves: 2, persistence: 0.5, landThreshold: 0.75, edgeFalloffStart: 3 },
};

/**
 * Converts hex axial coordinates to world coordinates for noise sampling.
 * Uses pointy-top hex layout math.
 */
function hexToWorld(coord: HexCoord): { x: number; y: number } {
    const size = 1; // Unit hex size
    const x = size * (Math.sqrt(3) * coord.q + Math.sqrt(3) / 2 * coord.r);
    const y = size * (3 / 2 * coord.r);
    return { x, y };
}

/**
 * Calculates distance from tile to nearest map edge (in tiles).
 */
function edgeDistance(tile: Tile, width: number, height: number): number {
    const col = tile.coord.q + Math.floor(tile.coord.r / 2);
    const row = tile.coord.r;
    const toLeft = col;
    const toRight = width - 1 - col;
    const toTop = row;
    const toBottom = height - 1 - row;
    return Math.min(toLeft, toRight, toTop, toBottom);
}

/**
 * Generates the initial landmass using Perlin noise.
 * 
 * NEW APPROACH: Instead of just thresholding noise, we use noise to
 * MODULATE the coastline distance from center. This creates organic
 * blob shapes rather than rectangles with noisy edges.
 * 
 * The algorithm:
 * 1. Calculate normalized distance from map center (0 = center, 1 = corner)
 * 2. Sample noise to get a coastline modifier
 * 3. Land if: distance < baseRadius + (noise * radiusVariance)
 */
export function generateLandmass(
    ctx: LandmassContext,
    params: LandmassParams,
    mapSize: MapSize,
    seed: number
): void {
    const { tiles, width, height } = ctx;
    const { noiseScale, octaves, persistence, landThreshold, edgeFalloffStart } = params;

    // Create seeded noise function
    const noise = createNoise2D(seed);

    // Map center in "column, row" space
    const centerCol = width / 2;
    const centerRow = height / 2;

    // Maximum distance from center to corner (for normalization)
    const maxDist = Math.sqrt(centerCol * centerCol + centerRow * centerRow);

    // Base radius as fraction of map (0.5 = half way to edge)
    // Lower threshold = smaller base landmass = more room for variance
    const baseRadius = landThreshold;

    // How much the noise can push the coastline in/out (as fraction of map)
    // INCREASED: 50% variance creates deep bays and prominent peninsulas
    const radiusVariance = 0.50;

    for (const tile of tiles) {
        // Convert to column/row for distance calculation
        const col = tile.coord.q + Math.floor(tile.coord.r / 2);
        const row = tile.coord.r;

        // Distance from center, normalized to [0, 1]
        const dx = (col - centerCol) / centerCol;
        const dy = (row - centerRow) / centerRow;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);

        // Calculate angle for noise sampling (creates smooth around-the-map variance)
        const angle = Math.atan2(dy, dx);

        // Sample noise using angle and a radial component
        // Lower multiplier = larger coastline features
        const noiseX = Math.cos(angle) * 1.5 + distFromCenter * 0.5;
        const noiseY = Math.sin(angle) * 1.5 + distFromCenter * 0.5;
        const rawNoise = fractalNoise(noise, noiseX * noiseScale * 8, noiseY * noiseScale * 8, octaves, persistence);

        // Normalize noise to [0, 1]
        const normalizedNoise = (rawNoise + 1) / 2;

        // Calculate the coastline radius at this angle
        // noise of 0.5 = base radius, 0 = contracted, 1 = expanded
        const coastlineRadius = baseRadius + (normalizedNoise - 0.5) * 2 * radiusVariance;

        // Determine if this tile is land
        const edgeDist = edgeDistance(tile, width, height);

        if (edgeDist <= 0) {
            // Absolute edge is always deep sea
            tile.terrain = TerrainType.DeepSea;
        } else if (distFromCenter < coastlineRadius) {
            tile.terrain = TerrainType.Plains;
        } else {
            tile.terrain = TerrainType.DeepSea;
        }
    }
}

/**
 * Ensures all land tiles form a single connected region.
 * Uses flood fill to find the largest connected land mass,
 * then converts any isolated land to water.
 * 
 * NOTE: This function treats paths through Coast tiles as valid connections,
 * since Coast is adjacent to land and represents shallow water.
 */
export function ensureConnectivity(ctx: LandmassContext): void {
    const { tiles, getTile } = ctx;

    // Helper: is this a "mainland" tile (not water, not just coast)
    const isMainland = (t: Tile) =>
        t.terrain !== TerrainType.DeepSea &&
        t.terrain !== TerrainType.Coast;

    // Helper: can we traverse through this tile during connectivity check
    // We allow traversal through Coast tiles because they're adjacent to land
    const isTraversable = (t: Tile) =>
        t.terrain !== TerrainType.DeepSea;

    // Find all mainland tiles (the ones we want to be connected)
    const mainlandTiles = tiles.filter(isMainland);

    if (mainlandTiles.length === 0) return;

    // Find connected components using flood fill
    const visited = new Set<string>();
    const components: Set<string>[] = [];

    for (const tile of mainlandTiles) {
        const key = hexToString(tile.coord);
        if (visited.has(key)) continue;

        // BFS to find connected component (can traverse through coast)
        const component = new Set<string>();
        const queue = [tile];

        while (queue.length > 0) {
            const current = queue.shift()!;
            const currentKey = hexToString(current.coord);

            if (visited.has(currentKey)) continue;
            visited.add(currentKey);

            // Only add mainland tiles to the component (not coast tiles)
            if (isMainland(current)) {
                component.add(currentKey);
            }

            // Check neighbors - can traverse through coast
            for (const neighborCoord of getNeighbors(current.coord)) {
                const neighbor = getTile(neighborCoord);
                if (!neighbor) continue;

                const neighborKey = hexToString(neighbor.coord);
                if (visited.has(neighborKey)) continue;

                // Traverse through any non-DeepSea tile
                if (isTraversable(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }

        if (component.size > 0) {
            components.push(component);
        }
    }

    // Find largest component
    let largestComponent: Set<string> = new Set();
    for (const component of components) {
        if (component.size > largestComponent.size) {
            largestComponent = component;
        }
    }

    // Convert isolated mainland to water
    for (const tile of mainlandTiles) {
        const key = hexToString(tile.coord);
        if (!largestComponent.has(key)) {
            tile.terrain = TerrainType.DeepSea;
        }
    }
}

/**
 * Detects and marks coastline tiles.
 * A coast tile is a water tile adjacent to land.
 */
export function detectCoastline(ctx: LandmassContext): void {
    const { tiles, getTile } = ctx;

    const isLandTerrain = (t: Tile | undefined) =>
        !!t &&
        t.terrain !== TerrainType.DeepSea &&
        t.terrain !== TerrainType.Coast;

    for (const tile of tiles) {
        // Only process water tiles
        if (tile.terrain !== TerrainType.DeepSea) continue;

        // Check if any neighbor is land
        const hasLandNeighbor = getNeighbors(tile.coord).some(coord => {
            const neighbor = getTile(coord);
            return isLandTerrain(neighbor);
        });

        if (hasLandNeighbor) {
            tile.terrain = TerrainType.Coast;
        }
    }
}

/**
 * Checks if a tile is safe for mountain placement.
 * Returns true if tile has at least minLandNeighbors adjacent land tiles.
 * This prevents mountains from blocking access to peninsulas.
 */
export function isSafeForMountain(
    tile: Tile,
    getTile: (coord: HexCoord) => Tile | undefined,
    minLandNeighbors: number = 3
): boolean {
    const isLandTerrain = (t: Tile | undefined) =>
        !!t &&
        t.terrain !== TerrainType.DeepSea &&
        t.terrain !== TerrainType.Coast &&
        t.terrain !== TerrainType.Mountain;

    const landNeighborCount = getNeighbors(tile.coord)
        .filter(coord => isLandTerrain(getTile(coord)))
        .length;

    return landNeighborCount >= minLandNeighbors;
}
