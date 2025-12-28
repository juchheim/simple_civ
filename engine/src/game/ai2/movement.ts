import { DiplomacyState, GameState, Unit } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors, hexToString } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { findPath } from "../helpers/pathfinding.js";
import { tryAction } from "../ai/shared/actions.js";
import { TacticalContext } from "./tactical-context.js";
import { isMilitary } from "./unit-roles.js";
import { getAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";

export function nearestFriendlyCity(state: GameState, playerId: string, from: { q: number; r: number }): { q: number; r: number } | null {
    const cities = state.cities.filter(c => c.ownerId === playerId);
    if (cities.length === 0) return null;
    let best = cities[0]!.coord;
    let bestDist = hexDistance(from, best);
    for (const c of cities) {
        const d = hexDistance(from, c.coord);
        if (d < bestDist) {
            bestDist = d;
            best = c.coord;
        }
    }
    return best;
}

export function moveToward(state: GameState, playerId: string, unit: Unit, dest: { q: number; r: number }, cache?: ReturnType<TacticalContext["createLookupCache"]>): GameState {
    // v8.1: Ring defender guard - don't move units that are defending a threatened city
    // This catches ALL callers of moveToward, preventing ring defender shuffling
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const cityInRingOf = myCities.find(c => hexDistance(unit.coord, c.coord) === 1);
    if (cityInRingOf) {
        // Check if this city has nearby enemies (within 3 tiles)
        const enemyIds = new Set(
            state.players
                .filter(p => !p.isEliminated && p.id !== playerId && state.diplomacy[playerId]?.[p.id] === DiplomacyState.War)
                .map(p => p.id)
        );
        const enemiesNearCity = state.units.filter(u =>
            enemyIds.has(u.ownerId) &&
            isMilitary(u) &&
            hexDistance(u.coord, cityInRingOf.coord) <= 3
        );
        if (enemiesNearCity.length > 0) {
            // Don't move - this unit is protecting a threatened city
            return state;
        }
    }

    const path = findPath(unit.coord, dest, unit, state, cache);
    if (path.length === 0) return state;
    const step = path[0];

    const stepKey = hexToString(step);
    const unitAtStep = cache ? cache.unitByCoordKey.get(stepKey) : state.units.find(u => hexEquals(u.coord, step));
    const occupiedFriendlyMil = unitAtStep && unitAtStep.id !== unit.id && unitAtStep.ownerId === playerId && isMilitary(unitAtStep);

    if (occupiedFriendlyMil) {
        const curDist = hexDistance(unit.coord, dest);
        const candidates = getNeighbors(unit.coord)
            .filter(n => hexDistance(n, dest) < curDist)
            .filter(n => {
                const nKey = hexToString(n);
                const uAtN = cache ? cache.unitByCoordKey.get(nKey) : state.units.find(u => hexEquals(u.coord, n));
                return !(uAtN && uAtN.ownerId === playerId && isMilitary(uAtN));
            })
            .sort((a, b) => hexDistance(a, dest) - hexDistance(b, dest));
        for (const alt of candidates) {
            const movedAlt = tryAction(state, { type: "MoveUnit", playerId, unitId: unit.id, to: alt });
            if (movedAlt !== state) return movedAlt;
        }
        return state;
    }

    return tryAction(state, { type: "MoveUnit", playerId, unitId: unit.id, to: step });
}

export function moveTowardAllMoves(
    state: GameState,
    playerId: string,
    unitId: string,
    dest: { q: number; r: number },
    maxSteps = 6,
    _cache?: ReturnType<TacticalContext["createLookupCache"]>
): GameState {
    let next = state;
    let steps = 0;
    while (steps++ < maxSteps) {
        const unit = next.units.find(u => u.id === unitId);
        if (!unit || unit.movesLeft <= 0) return next;
        if (hexDistance(unit.coord, dest) === 0) return next;
        const before = next;
        // Note: can't reuse cache after state mutation (tryAction creates new state)
        next = moveToward(next, playerId, unit, dest);
        if (next === before) return next;
    }
    return next;
}

export function findEngagementPath(start: { q: number; r: number }, target: { q: number; r: number }, unit: Unit, state: GameState, cache?: ReturnType<TacticalContext["createLookupCache"]>): { q: number; r: number }[] | null {
    const direct = findPath(start, target, unit, state, cache);
    if (direct && direct.length > 0) return direct;
    const neighbors = getNeighbors(target).sort((a, b) => hexDistance(a, start) - hexDistance(b, start));
    for (const n of neighbors) {
        if (hexEquals(n, start)) return [];
        const path = findPath(start, n, unit, state, cache);
        if (path && path.length > 0) return path;
    }
    return null;
}

export function retreatIfNeeded(state: GameState, playerId: string, unit: Unit): GameState {
    const hpFrac = unit.maxHp ? unit.hp / unit.maxHp : (unit.hp / UNITS[unit.type].hp);

    // FIX #5: Reduce retreat threshold during active sieges.
    // Units should stay in the fight when we're close to capturing a city.
    const mem = getAiMemoryV2(state, playerId);
    const focusCityId = mem?.focusCityId;
    const focusCity = focusCityId ? state.cities.find(c => c.id === focusCityId) : undefined;
    const inActiveSiege = focusCity && focusCity.ownerId !== playerId && hexDistance(unit.coord, focusCity.coord) <= 4;

    const profile = getAiProfileV2(state, playerId);
    // Defensive fallback: if profile not present on player, skip retreat changes.
    const retreatFrac = profile?.tactics?.retreatHpFrac ?? 0.3;

    // FINAL TUNING: During sieges OR active wars, units are 70% less likely to retreat (effectively halves the HP threshold).
    const atWar = state.players.some(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War"); const effectiveRetreatFrac = (inActiveSiege || atWar)
        ? retreatFrac * 0.5
        : retreatFrac;

    if (hpFrac >= effectiveRetreatFrac) return state;

    // Siege commitment: if we're committed to a capital siege, don't peel off at moderate HP.
    if (focusCity && focusCity.isCapital && focusCity.ownerId !== playerId) {
        const nearFocus = hexDistance(unit.coord, focusCity.coord) <= 4;
        const siegeCommitment = profile?.tactics?.siegeCommitment ?? 0;
        if (nearFocus && siegeCommitment >= 0.7 && hpFrac >= 0.2) {
            return state;
        }
    }

    const enemies = state.players
        .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War")
        .map(p => p.id);
    const nearbyThreat = state.units.some(u => enemies.includes(u.ownerId) && hexDistance(u.coord, unit.coord) <= 2);
    if (!nearbyThreat) return state;

    const cities = state.cities.filter(c => c.ownerId === playerId);
    const safeCity = cities.sort((a, b) => hexDistance(a.coord, unit.coord) - hexDistance(b.coord, unit.coord))[0];
    if (!safeCity) return state;

    // FIX #6: Force Fortify if already safe.
    // If we simply "return state", the unit still has moves, and runFocusSiegeAndCapture might grab it.
    // By forcing Fortify, we consume its moves and lock it down for healing/defense.
    if (hexEquals(unit.coord, safeCity.coord)) {
        return tryAction(state, { type: "FortifyUnit", playerId, unitId: unit.id });
    }

    const next = moveToward(state, playerId, unit, safeCity.coord);
    // If we arrived at safety after moving, also lock down.
    if (next !== state) {
        const movedUnit = next.units.find(u => u.id === unit.id);
        if (movedUnit && movedUnit.movesLeft > 0 && hexEquals(movedUnit.coord, safeCity.coord)) {
            return tryAction(next, { type: "FortifyUnit", playerId, unitId: unit.id });
        }
    }
    return next;
}
