import { DiplomacyState, UnitType } from "../../core/types.js";
import type { GameState, Unit } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { aiInfo } from "../ai/debug-logging.js";
import { getAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { buildTacticalContext } from "./tactical-context.js";
import { runFocusSiegeAndCapture } from "./siege-routing.js";
import { isMilitary } from "./unit-roles.js";
import { moveToward, moveTowardAllMoves } from "./movement.js";

/**
 * Orchestrates siege pushes and rally/staging behaviors around the focused city.
 * Handles combined-arms capture coordination, immediate post-war rallies, and
 * pre-war staging/rally movement to avoid trickling units.
 */
export function runSiegeAndRally(state: GameState, playerId: string): GameState {
    let next = state;

    // Main siege/capture behavior: coordinate a combined-arms push on the focused city.
    let tacticalContext = buildTacticalContext(next, playerId);
    next = runFocusSiegeAndCapture(next, playerId, tacticalContext);

    // Rally logic depends on the latest tactical state.
    tacticalContext = buildTacticalContext(next, playerId);
    const enemies = tacticalContext.enemyIds;
    const inWar = enemies.size > 0;

    const memory = getAiMemoryV2(next, playerId);
    const focusCity = memory.focusCityId ? next.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (!focusCity) return next;

    const profile = getAiProfileV2(next, playerId);
    const myCities = next.cities.filter(c => c.ownerId === playerId);

    next = runPostWarRally(next, playerId, focusCity, myCities, memory, inWar);
    next = runPreWarRally(next, playerId, focusCity, myCities, profile, memory, inWar);

    return next;
}

function runPostWarRally(
    state: GameState,
    playerId: string,
    focusCity: { coord: Unit["coord"]; name: string },
    myCities: { coord: Unit["coord"] }[],
    memory: ReturnType<typeof getAiMemoryV2>,
    inWar: boolean
): GameState {
    let next = state;
    const justDeclaredWar = memory.focusSetTurn === next.turn && inWar;
    if (!justDeclaredWar) return next;

    aiInfo(`[POST-WAR RALLY] ${playerId} just declared war - rallying all forces to ${focusCity.name}`);

    const rallyTarget = focusCity.coord;
    const myCityCoords = new Set(myCities.map(c => `${c.coord.q},${c.coord.r}`));

    const militaryToRally = next.units.filter(u => {
        if (u.ownerId !== playerId) return false;
        if (u.movesLeft <= 0) return false;
        if (!isMilitary(u)) return false;
        if (u.type === UnitType.Titan) return false; // Titan has its own agent
        if (u.isTitanEscort) return false; // Escorts follow Titan
        if (u.isHomeDefender) return false; // Home defenders stay in territory
        if (myCityCoords.has(`${u.coord.q},${u.coord.r}`)) return false; // Don't pull garrisons
        // v8.1: Don't pull ring defenders (distance 1 from any city) - REVERTED: deadlock fix
        // const inRing = myCities.some(c => hexDistance(u.coord, c.coord) === 1);
        // if (inRing) return false;
        if (hexDistance(u.coord, rallyTarget) <= 3) return false; // Already close enough
        return true;
    }).sort((a, b) =>
        hexDistance(a.coord, rallyTarget) - hexDistance(b.coord, rallyTarget)
    );

    let rallied = 0;
    for (const unit of militaryToRally) {
        const liveUnit = next.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.movesLeft <= 0) continue;

        // Use ALL movement to get there fast
        const before = next;
        next = moveTowardAllMoves(next, playerId, liveUnit.id, rallyTarget, 6);
        if (next !== before) rallied++;
    }

    if (rallied > 0) {
        aiInfo(`[POST-WAR RALLY] ${playerId} rallied ${rallied} units toward ${focusCity.name}`);
    }

    return next;
}

function runPreWarRally(
    state: GameState,
    playerId: string,
    focusCity: { coord: Unit["coord"] },
    myCities: { coord: Unit["coord"] }[],
    profile: ReturnType<typeof getAiProfileV2>,
    memory: ReturnType<typeof getAiMemoryV2>,
    inWar: boolean
): GameState {
    let next = state;

    // Pre-war rally: if we have a focus target and can initiate wars, start staging a strike group even while at peace.
    // This avoids a deadlock where diplomacy wants staged forces before declaring but no one ever moves toward the front.
    const focusedTargetId = memory.focusTargetPlayerId;
    const stanceToFocus = focusedTargetId ? (next.diplomacy?.[playerId]?.[focusedTargetId] ?? DiplomacyState.Peace) : DiplomacyState.Peace;
    const canPreWarRally =
        !inWar &&
        !!focusedTargetId &&
        stanceToFocus === DiplomacyState.Peace &&
        profile.diplomacy.canInitiateWars &&
        profile.tactics.forceConcentration >= 0.65;

    // Force concentration / staging: if we don't have enough units near the focus city, rally at a staging ring instead of trickling in.
    const requiredNear = Math.max(2, Math.ceil(profile.tactics.forceConcentration * 4));
    const nearCount = next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        hexDistance(u.coord, focusCity.coord) <= 5
    ).length;
    const shouldStage = (nearCount < requiredNear) && (profile.tactics.forceConcentration >= 0.65);

    const cityTiles = new Set(next.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`));
    const movers = next.units
        .filter(u => {
            if (u.ownerId !== playerId) return false;
            if (u.movesLeft <= 0) return false;
            if (!isMilitary(u)) return false;
            if (u.type === UnitType.Titan) return false;
            if (u.isHomeDefender) return false; // v7.1: Home defenders stay in territory
            if (cityTiles.has(`${u.coord.q},${u.coord.r}`)) return false; // don't pull garrisons off cities
            // v8.1: Don't pull ring defenders (distance 1 from any city) - REVERTED: deadlock fix
            // const inRing = myCities.some(c => hexDistance(u.coord, c.coord) === 1);
            // if (inRing) return false;
            return true;
        })
        .sort((a, b) => hexDistance(a.coord, focusCity.coord) - hexDistance(b.coord, focusCity.coord));

    // If we're not at war yet, move a real strike group (not 2 units) so we can actually declare and capture fast.
    const maxPreWarMovers = canPreWarRally ? Math.max(8, requiredNear - nearCount) : movers.length;
    let movedCount = 0;

    for (const unit of movers) {
        const live = next.units.find(u => u.id === unit.id);
        if (!live || live.movesLeft <= 0) continue;
        if (hexDistance(live.coord, focusCity.coord) <= UNITS[live.type].rng) continue; // already in range-ish
        const dest = (shouldStage || canPreWarRally) ? pickStagingCoord(next, focusCity.coord, live) : focusCity.coord;

        const before = next;
        next = moveToward(before, playerId, live, dest);
        if (next !== before) {
            movedCount += 1;
            if (canPreWarRally && movedCount >= maxPreWarMovers) break;
        }
    }

    return next;
}

function pickStagingCoord(state: GameState, focusCoord: Unit["coord"], unit: Unit): { q: number; r: number } {
    const desiredDist = 5;
    let best = focusCoord;
    let bestScore = Number.POSITIVE_INFINITY;
    // Scan a limited subset (map tiles are not huge; still keep it bounded).
    let scanned = 0;
    for (const t of state.map.tiles) {
        if (scanned++ > 600) break;
        const dCity = hexDistance(t.coord, focusCoord);
        if (dCity !== desiredDist) continue;
        const dUnit = hexDistance(t.coord, unit.coord);
        if (dUnit < bestScore) {
            bestScore = dUnit;
            best = t.coord;
        }
    }
    return best;
}
