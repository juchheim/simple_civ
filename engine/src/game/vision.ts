import { DiplomacyState, GameState } from "../core/types.js";
import { UNITS } from "../core/constants.js";
import { hexDistance, hexToString, hexSpiral } from "../core/hex.js";
import { buildTileLookup, hasClearLineOfSight } from "./helpers/combat.js";
import { disableSharedVision, setContact } from "./helpers/diplomacy.js";
import { recordFogDelta } from "./history.js";
import { LookupCache, buildLookupCache, getOwnedTilesCached } from "./helpers/lookup-cache.js";

export function computeVisibility(state: GameState, playerId: string, cache?: LookupCache): string[] {
    const visible = new Set<string>();
    const tileByKey = cache?.tileByKey ?? buildTileLookup(state);
    const effectiveCache = cache ?? buildLookupCache(state);

    const addVisionFrom = (ownerId: string) => {
        const units = state.units.filter(u => u.ownerId === ownerId);
        const cities = state.cities.filter(c => c.ownerId === ownerId);

        for (const unit of units) {
            const range = UNITS[unit.type].vision ?? 2;
            const potentialTiles = hexSpiral(unit.coord, range);

            for (const coord of potentialTiles) {
                const key = hexToString(coord);
                if (!tileByKey.has(key)) continue;

                const dist = hexDistance(unit.coord, coord);
                // Always see adjacent (dist <= 1) regardless of LoS
                if (dist <= 1) {
                    visible.add(key);
                } else if (hasClearLineOfSight(state, unit.coord, coord, tileByKey)) {
                    visible.add(key);
                }
            }
        }

        for (const city of cities) {
            // Cities see all tiles within their work radius (Ring 2) without terrain blocking
            const potentialTiles = hexSpiral(city.coord, 2);
            for (const coord of potentialTiles) {
                const key = hexToString(coord);
                if (!tileByKey.has(key)) continue;
                visible.add(key);
            }
        }

        // Always see own territory - O(1) lookup via cache instead of O(tiles) iteration
        const ownedTiles = getOwnedTilesCached(effectiveCache, ownerId);
        for (const coord of ownedTiles) {
            visible.add(hexToString(coord));
        }
    };

    addVisionFrom(playerId);
    const shared = state.sharedVision?.[playerId];
    if (shared) {
        for (const [other, active] of Object.entries(shared)) {
            if (!active) continue;
            if (state.diplomacy[playerId]?.[other] !== DiplomacyState.Peace) {
                disableSharedVision(state, playerId, other);
                continue;
            }
            addVisionFrom(other);
        }
    }

    return Array.from(visible);
}

export function refreshPlayerVision(state: GameState, playerId: string, cache?: LookupCache) {
    const nowVisible = computeVisibility(state, playerId, cache);
    state.visibility[playerId] = nowVisible;
    const prev = new Set(state.revealed[playerId] ?? []);

    // Calculate Delta for History
    const deltaKeys = nowVisible.filter(k => !prev.has(k));
    if (deltaKeys.length > 0) {
        // convert string keys back to HexCoords
        const deltaCoords = deltaKeys.map(k => {
            const [q, r] = k.split(",").map(Number);
            return { q, r };
        });
        recordFogDelta(state, playerId, deltaCoords);
    }

    nowVisible.forEach(v => prev.add(v));
    state.revealed[playerId] = Array.from(prev);
    handleContactDiscovery(state, playerId, new Set(nowVisible), cache);
}

export function handleContactDiscovery(state: GameState, viewerId: string, visibleKeys: Set<string>, cache?: LookupCache) {
    // Build unit/city maps for O(1) lookup if no cache provided
    const effectiveCache = cache ?? buildLookupCache(state);
    const unitByKey = effectiveCache.unitByCoordKey;
    const cityByKey = effectiveCache.cityByCoordKey;

    // v7.7: Pre-compute valid player IDs to skip native units (ownerId: "natives")
    const playerIds = new Set(state.players.map(p => p.id));

    visibleKeys.forEach(key => {
        // O(1) lookup instead of O(units + cities) per key
        const unit = unitByKey.get(key);
        if (unit && unit.ownerId !== viewerId && playerIds.has(unit.ownerId)) {
            setContact(state, viewerId, unit.ownerId);
            return;
        }
        const city = cityByKey.get(key);
        if (city && city.ownerId !== viewerId && playerIds.has(city.ownerId)) {
            setContact(state, viewerId, city.ownerId);
        }
    });
}
