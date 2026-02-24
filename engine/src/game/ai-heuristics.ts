import { CITY_CENTER_MIN_FOOD, CITY_CENTER_MIN_GOLD, CITY_CENTER_MIN_PROD, TERRAIN } from "../core/constants.js";
import { getTileYields } from "./rules.js";
import { hexSpiral, hexDistance, hexEquals } from "../core/hex.js";
import { GameState, OverlayType, Tile, TerrainType } from "../core/types.js";
import { isTileAdjacentToRiver } from "../map/rivers.js";
import { AiPersonality } from "./ai/personality.js";

function isRiverCity(
    tile: Tile,
    state: GameState | { map: { tiles: Tile[]; rivers?: { a: Tile["coord"]; b: Tile["coord"] }[] } },
): boolean {
    return isTileAdjacentToRiver(state.map as GameState["map"], tile.coord);
}

function countNearbyOverlays(tile: Tile, state: GameState | { map: { tiles: Tile[] } }, radius = 2): number {
    const ring = hexSpiral(tile.coord, radius);
    return ring.reduce((sum, coord) => {
        const t = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (!t) return sum;
        const overlayCount = t.overlays.filter(ov =>
            ov === OverlayType.RichSoil || ov === OverlayType.OreVein || ov === OverlayType.SacredSite
        ).length;
        return sum + overlayCount;
    }, 0);
}

function tileValue(
    tile: Tile,
    state: GameState | { map: { tiles: Tile[]; rivers?: { a: Tile["coord"]; b: Tile["coord"] }[] } },
    asCenter: boolean,
    playerId?: string,
): number {
    const y = getTileYields(tile);
    const adjRiver = isTileAdjacentToRiver(state.map as GameState["map"], tile.coord);
    let goldWeight = 1;
    if (playerId && "players" in state) {
        const player = (state as GameState).players.find(p => p.id === playerId);
        const underPressure = !!player?.austerityActive || (player?.netGold ?? 0) < 0 || (player?.treasury ?? 0) <= 20;
        goldWeight = underPressure ? 2 : 1;
    }
    const val = {
        F: y.F + (adjRiver ? 1 : 0),
        P: y.P,
        S: y.S,
        G: y.G,
    };

    if (asCenter) {
        val.F = Math.max(val.F, CITY_CENTER_MIN_FOOD);
        val.P = Math.max(val.P, CITY_CENTER_MIN_PROD);
        val.G = Math.max(val.G, CITY_CENTER_MIN_GOLD);
    }

    return val.F + val.P + val.S + (val.G * goldWeight);
}

function bestNearbyTiles(tile: Tile, state: GameState | { map: { tiles: Tile[] } }, count: number, playerId?: string): Tile[] {
    const nearby = hexSpiral(tile.coord, 2)
        .filter(c => !hexEquals(c, tile.coord))
        .map(coord => state.map.tiles.find(t => hexEquals(t.coord, coord)))
        .filter((t): t is Tile => !!t && TERRAIN[t.terrain].workable);

    const scored = nearby
        .map(t => ({ t, v: tileValue(t, state, false, playerId) }))
        .sort((a, b) => b.v - a.v);
    return scored.slice(0, count).map(s => s.t);
}

/**
 * Calculate distance penalty for city sites based on proximity to existing friendly cities.
 * Penalizes sites that are too close (<4 tiles) or too far (>8 tiles) from existing cities.
 */
function cityDistancePenalty(
    tile: Tile,
    state: GameState | { map: { tiles: Tile[] } },
    _playerId?: string
): number {
    // Need access to cities - only works with full GameState
    if (!('cities' in state)) return 0;

    const gameState = state as GameState;

    // Find ALL cities (to match validation rules that check all cities, not just friendly)
    const allCities = gameState.cities;

    // No penalty for first city
    if (allCities.length === 0) return 0;

    // Find distance to nearest city (any player)
    let minDistance = Infinity;
    for (const city of allCities) {
        const dist = hexDistance(tile.coord, city.coord);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }

    // Apply penalties based on distance
    if (minDistance < 4) {
        // Too close - cities will compete for tiles or validation will block
        return -5; // v0.99 Tuning: Reduced from -10 to allow tighter packing if needed
    } else if (minDistance > 8) {
        // Too far - harder to defend and support
        return -2; // v0.99 Tuning: Reduced from -5 to encourage reaching for good spots
    }

    // Sweet spot: 4-8 tiles away
    return 0;
}

export function scoreCitySite(
    tile: Tile,
    state: GameState | { map: { tiles: Tile[] } },
    playerId?: string,
    personality?: AiPersonality
): number {
    const centerY = tileValue(tile, state, true, playerId);
    const best3 = bestNearbyTiles(tile, state, 3, playerId).reduce((s, t) => s + tileValue(t, state, false, playerId), 0);
    const riverBonus = isRiverCity(tile, state) ? 1 : 0;
    const overlayBonus = countNearbyOverlays(tile, state, 2);
    const distancePenalty = cityDistancePenalty(tile, state, playerId);
    const settleBias = personality?.settleBias ?? {};
    const hillBias = settleBias.hills && tile.terrain === TerrainType.Hills ? settleBias.hills : 0;
    const riverBias = settleBias.rivers && isRiverCity(tile, state) ? settleBias.rivers : 0;
    return centerY + best3 + riverBonus + overlayBonus + distancePenalty + hillBias + riverBias;
}

export function nearestEnemyCityDistance(playerId: string, state: GameState): number | null {
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const enemyCities = state.cities.filter(c => c.ownerId !== playerId);
    if (!myCities.length || !enemyCities.length) return null;
    let best: number | null = null;
    for (const mine of myCities) {
        for (const enemy of enemyCities) {
            const d = hexDistance(mine.coord, enemy.coord);
            if (best === null || d < best) best = d;
        }
    }
    return best;
}

export { tileWorkingPriority, tilesByPriority } from "./ai/city-heuristics.js";
