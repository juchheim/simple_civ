import { CITY_CENTER_MIN_FOOD, CITY_CENTER_MIN_PROD, TERRAIN } from "../core/constants.js";
import { getTileYields } from "./rules.js";
import { hexSpiral, hexDistance, hexEquals } from "../core/hex.js";
import { AiVictoryGoal, City, GameState, OverlayType, Tile } from "../core/types.js";
import { isTileAdjacentToRiver } from "../map/rivers.js";

type YieldKey = "F" | "P" | "S";

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
): number {
    const y = getTileYields(tile);
    const adjRiver = isTileAdjacentToRiver(state.map as GameState["map"], tile.coord);
    const val = {
        F: y.F + (adjRiver ? 1 : 0),
        P: y.P,
        S: y.S,
    };

    if (asCenter) {
        val.F = Math.max(val.F, CITY_CENTER_MIN_FOOD);
        val.P = Math.max(val.P, CITY_CENTER_MIN_PROD);
    }

    return val.F + val.P + val.S;
}

function bestNearbyTiles(tile: Tile, state: GameState | { map: { tiles: Tile[] } }, count: number): Tile[] {
    const nearby = hexSpiral(tile.coord, 2)
        .filter(c => !hexEquals(c, tile.coord))
        .map(coord => state.map.tiles.find(t => hexEquals(t.coord, coord)))
        .filter((t): t is Tile => !!t && TERRAIN[t.terrain].workable);

    const scored = nearby
        .map(t => ({ t, v: tileValue(t, state, false) }))
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
    playerId?: string
): number {
    // Need access to cities - only works with full GameState
    if (!('cities' in state)) return 0;

    const gameState = state as GameState;

    // Find all friendly cities (same player)
    const friendlyCities = gameState.cities.filter(c => playerId ? c.ownerId === playerId : true);

    // No penalty for first city
    if (friendlyCities.length === 0) return 0;

    // Find distance to nearest friendly city
    let minDistance = Infinity;
    for (const city of friendlyCities) {
        const dist = hexDistance(tile.coord, city.coord);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }

    // Apply penalties based on distance
    if (minDistance < 4) {
        // Too close - cities will compete for tiles
        return -10;
    } else if (minDistance > 8) {
        // Too far - harder to defend and support
        return -5;
    }

    // Sweet spot: 4-8 tiles away
    return 0;
}

export function scoreCitySite(
    tile: Tile,
    state: GameState | { map: { tiles: Tile[] } },
    playerId?: string
): number {
    const centerY = tileValue(tile, state, true);
    const best3 = bestNearbyTiles(tile, state, 3).reduce((s, t) => s + tileValue(t, state, false), 0);
    const riverBonus = isRiverCity(tile, state) ? 1 : 0;
    const overlayBonus = countNearbyOverlays(tile, state, 2);
    const distancePenalty = cityDistancePenalty(tile, state, playerId);
    return centerY + best3 + riverBonus + overlayBonus + distancePenalty;
}

export function tileWorkingPriority(goal: AiVictoryGoal, city: City, state: GameState): YieldKey[] {
    const avgPop =
        state.cities.filter(c => c.ownerId === city.ownerId).reduce((s, c) => s + c.pop, 0) /
        Math.max(1, state.cities.filter(c => c.ownerId === city.ownerId).length);
    const popBehind = city.pop < Math.max(3, Math.floor(avgPop));
    if (popBehind) return ["F", "P", "S"];
    if (goal === "Progress") return ["S", "P", "F"];
    if (goal === "Conquest") return ["P", "F", "S"];
    return ["F", "P", "S"];
}

export function tilesByPriority(city: City, state: GameState, prioritized: YieldKey[]): Tile[] {
    const radius = 2;
    const owned = hexSpiral(city.coord, radius)
        .map(c => state.map.tiles.find(t => hexEquals(t.coord, c) && t.ownerId === city.ownerId))
        .filter((t): t is Tile => !!t && TERRAIN[t.terrain].workable);

    const scoreTile = (tile: Tile) => {
        const y = getTileYields(tile);
        const adjRiver = isTileAdjacentToRiver(state.map, tile.coord);
        const weighted = {
            F: y.F + (adjRiver ? 1 : 0),
            P: y.P,
            S: y.S,
        };
        return (
            weighted[prioritized[0]] * 100 +
            weighted[prioritized[1]] * 10 +
            weighted[prioritized[2]] +
            (tile.overlays.includes(OverlayType.RichSoil) ? 0.1 : 0)
        );
    };

    return owned.sort((a, b) => scoreTile(b) - scoreTile(a));
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
