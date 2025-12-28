import { GameState, Unit } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors, hexToString } from "../../core/hex.js";
import { LookupCache } from "../helpers/lookup-cache.js";
import { findPath } from "../helpers/pathfinding.js";

export function pickApproachTile(state: GameState, playerId: string, unit: Unit, cityCoord: { q: number; r: number }, cache?: LookupCache): { q: number; r: number } {
    // Pick an adjacent tile to the city that we can approach without stacking with friendly military.
    const neigh = getNeighbors(cityCoord);
    let best = neigh[0] ?? cityCoord;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const n of neigh) {
        // Avoid any occupied tile (friendly or enemy); movement/capture needs clean adjacency.
        const nKey = hexToString(n);
        const occupied = cache ? cache.unitByCoordKey.has(nKey) : state.units.some(u => hexEquals(u.coord, n));
        if (occupied) continue;
        const score = hexDistance(unit.coord, n);
        // Ensure it is actually reachable under current diplomacy/path rules.
        const path = findPath(unit.coord, n, unit, state, cache);
        if (path.length === 0) continue;
        if (score < bestScore) {
            bestScore = score;
            best = n;
        }
    }
    return best;
}

export function pickRallyCoord(state: GameState, target: { q: number; r: number }, desiredDist: number): { q: number; r: number } {
    // Pick a rally ring coord around the target that is reasonably close to our side.
    // (Bounded scan for performance.)
    let best = target;
    let bestScore = Number.POSITIVE_INFINITY;
    let scanned = 0;
    for (const t of state.map.tiles) {
        if (scanned++ > 900) break;
        const d = hexDistance(t.coord, target);
        if (d !== desiredDist) continue;
        // Prefer tiles that are not occupied by enemy city and are generally reachable.
        const score = Math.abs(t.coord.q - target.q) + Math.abs(t.coord.r - target.r);
        if (score < bestScore) {
            bestScore = score;
            best = t.coord;
        }
    }
    return best;
}

export function pickRingCoordForUnit(
    state: GameState,
    playerId: string,
    unit: Unit,
    target: { q: number; r: number },
    desiredDist: number,
    scanLimit = 1000,
    cache?: LookupCache
): { q: number; r: number } {
    // Pick a coord at an exact distance ring around `target`, biased toward being reachable from `unit`,
    // and avoiding friendly military stacking.
    const candidates: { coord: { q: number; r: number }; score: number }[] = [];
    let scanned = 0;
    for (const t of state.map.tiles) {
        if (scanned++ > scanLimit) break;
        if (hexDistance(t.coord, target) !== desiredDist) continue;
        const tKey = hexToString(t.coord);
        const occupied = cache ? cache.unitByCoordKey.has(tKey) : state.units.some(u => hexEquals(u.coord, t.coord));
        if (occupied) continue;
        const score = hexDistance(unit.coord, t.coord);
        candidates.push({ coord: t.coord, score });
    }
    candidates.sort((a, b) => a.score - b.score);
    for (const c of candidates.slice(0, 30)) {
        const path = findPath(unit.coord, c.coord, unit, state, cache);
        if (path.length > 0) return c.coord;
    }
    return target;
}
