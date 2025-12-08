import { DiplomacyState, GameState } from "../core/types.js";
import { UNITS } from "../core/constants.js";
import { hexDistance, hexToString, hexSpiral } from "../core/hex.js";
import { buildTileLookup, hasClearLineOfSight } from "./helpers/combat.js";
import { disableSharedVision, setContact } from "./helpers/diplomacy.js";
import { recordFogDelta } from "./history.js";

export function computeVisibility(state: GameState, playerId: string): string[] {
    const visible = new Set<string>();
    const tileByKey = buildTileLookup(state);

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
            const potentialTiles = hexSpiral(city.coord, 2);
            for (const coord of potentialTiles) {
                const key = hexToString(coord);
                if (!tileByKey.has(key)) continue;

                const dist = hexDistance(city.coord, coord);
                // Always see adjacent (dist <= 1) - City center + Ring 1
                if (dist <= 1) {
                    visible.add(key);
                } else if (hasClearLineOfSight(state, city.coord, coord, tileByKey)) {
                    visible.add(key);
                }
            }
        }

        // Always see own territory
        for (const tile of state.map.tiles) {
            if (tile.ownerId === ownerId) {
                visible.add(hexToString(tile.coord));
            }
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

    // Filter to ensure we only return valid map tiles (though hexSpiral checks likely kept us close, tileByKey check ensures validity)
    // The previous implementation iterated all map tiles to filter. We can just check existence.
    // However, logic above already checks `tileByKey.has(key)`.
    return Array.from(visible);
}

export function refreshPlayerVision(state: GameState, playerId: string) {
    const nowVisible = computeVisibility(state, playerId);
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
    handleContactDiscovery(state, playerId, new Set(nowVisible));
}

export function handleContactDiscovery(state: GameState, viewerId: string, visibleKeys: Set<string>) {
    const keyHasEnemy = (key: string): string | null => {
        const unit = state.units.find(u => hexToString(u.coord) === key && u.ownerId !== viewerId);
        if (unit) return unit.ownerId;
        const city = state.cities.find(c => hexToString(c.coord) === key && c.ownerId !== viewerId);
        return city ? city.ownerId : null;
    };

    visibleKeys.forEach(key => {
        const owner = keyHasEnemy(key);
        if (owner) setContact(state, viewerId, owner);
    });
}

