import { GameState, HexCoord, Tile, Unit, City } from "../../core/types.js";
import { hexToString } from "../../core/hex.js";

/**
 * Centralized lookup cache for O(1) access to game state data.
 * Build once at turn start, use throughout turn, discard at end.
 */
export type LookupCache = {
    tileByKey: Map<string, Tile>;
    unitByCoordKey: Map<string, Unit>;
    cityByCoordKey: Map<string, City>;
    visibilitySet: Map<string, Set<string>>; // playerId -> visible hex keys
    tilesByOwner: Map<string, HexCoord[]>; // ownerId -> owned tile coords
};

/**
 * Build lookup cache from current game state.
 * Call at start of turn/operation, discard when done.
 */
export function buildLookupCache(state: GameState): LookupCache {
    const tileByKey = new Map<string, Tile>();
    const tilesByOwner = new Map<string, HexCoord[]>();

    const mapTiles = Array.isArray(state.map?.tiles) ? state.map.tiles : [];
    for (const tile of mapTiles) {
        if (!tile.coord) continue;
        const key = hexToString(tile.coord);
        tileByKey.set(key, tile);

        if (tile.ownerId) {
            let owned = tilesByOwner.get(tile.ownerId);
            if (!owned) {
                owned = [];
                tilesByOwner.set(tile.ownerId, owned);
            }
            owned.push(tile.coord);
        }
    }

    const unitByCoordKey = new Map<string, Unit>();
    for (const unit of state.units) {
        if (!unit.coord) continue;
        const key = hexToString(unit.coord);
        // If multiple units on same tile, keep the first (shouldn't happen normally)
        if (!unitByCoordKey.has(key)) {
            unitByCoordKey.set(key, unit);
        }
    }

    const cityByCoordKey = new Map<string, City>();
    for (const city of state.cities) {
        if (!city.coord) continue;
        const key = hexToString(city.coord);
        cityByCoordKey.set(key, city);
    }

    const visibilitySet = new Map<string, Set<string>>();
    for (const [playerId, visibleKeys] of Object.entries(state.visibility ?? {})) {
        visibilitySet.set(playerId, new Set(visibleKeys));
    }

    return {
        tileByKey,
        unitByCoordKey,
        cityByCoordKey,
        visibilitySet,
        tilesByOwner,
    };
}

/**
 * Get tile by coordinate key - O(1)
 */
export function getTileCached(cache: LookupCache, coord: HexCoord): Tile | undefined {
    return cache.tileByKey.get(hexToString(coord));
}

/**
 * Get unit at coordinate - O(1)
 */
export function getUnitAtCached(cache: LookupCache, coord: HexCoord): Unit | undefined {
    return cache.unitByCoordKey.get(hexToString(coord));
}

/**
 * Get city at coordinate - O(1)
 */
export function getCityAtCached(cache: LookupCache, coord: HexCoord): City | undefined {
    return cache.cityByCoordKey.get(hexToString(coord));
}

/**
 * Check if tile is visible to player - O(1)
 */
export function isVisibleCached(cache: LookupCache, playerId: string, coord: HexCoord): boolean {
    const playerSet = cache.visibilitySet.get(playerId);
    return playerSet?.has(hexToString(coord)) ?? false;
}

/**
 * Get all tiles owned by a player - O(1)
 */
export function getOwnedTilesCached(cache: LookupCache, ownerId: string): HexCoord[] {
    return cache.tilesByOwner.get(ownerId) ?? [];
}
