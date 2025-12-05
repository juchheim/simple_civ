import { DiplomacyState, GameState } from "../core/types.js";
import { UNITS } from "../core/constants.js";
import { hexDistance, hexToString } from "../core/hex.js";
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
            for (const tile of state.map.tiles) {
                if (hexDistance(unit.coord, tile.coord) <= range && hasClearLineOfSight(state, unit.coord, tile.coord, tileByKey)) {
                    visible.add(hexToString(tile.coord));
                }
            }
        }
        for (const city of cities) {
            for (const tile of state.map.tiles) {
                if (hexDistance(city.coord, tile.coord) <= 2 && hasClearLineOfSight(state, city.coord, tile.coord, tileByKey)) {
                    visible.add(hexToString(tile.coord));
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

    const tileSet = new Set(state.map.tiles.map(t => hexToString(t.coord)));
    return Array.from(visible).filter(v => tileSet.has(v));
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

