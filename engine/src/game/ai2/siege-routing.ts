import { GameState, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { pickBest } from "./util.js";
import { TacticalContext } from "./tactical-context.js";
import { pickApproachTile, pickRallyCoord, pickRingCoordForUnit } from "./targeting.js";
import { buildPerception } from "./perception.js";
import { isCapturer, isMilitary, isRider, isSiege } from "./unit-roles.js";
import { moveToward, moveTowardAllMoves } from "./movement.js";

export function routeCityCapturesV2(state: GameState, playerId: string, ctx: TacticalContext): GameState {
    let next = state;
    const capturable = next.cities.filter(c => c.ownerId !== playerId && c.hp <= 0);
    if (capturable.length === 0) return next;

    const myCityCoords = new Set(
        next.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`)
    );

    const captureUnits = next.units
        .filter(u => u.ownerId === playerId && u.movesLeft > 0 && isMilitary(u) && UNITS[u.type].canCaptureCity &&
            !myCityCoords.has(`${u.coord.q},${u.coord.r}`))
        .sort((a, b) => (b.type === UnitType.Titan ? 1 : 0) - (a.type === UnitType.Titan ? 1 : 0));

    const assigned = new Set<string>();
    for (const city of capturable) {
        const candidates = captureUnits.filter(u => !assigned.has(u.id));
        if (candidates.length === 0) break;
        const best = pickBest(candidates, u => -hexDistance(u.coord, city.coord));
        const unit = best?.item;
        if (!unit) continue;

        const live = next.units.find(u => u.id === unit.id);
        if (!live) continue;
        const cache = ctx.createLookupCache(next);
        const approach = pickApproachTile(next, playerId, live, city.coord, cache);
        const flow = ctx.getFlowField(approach, { cacheKey: "capture" });
        const before = next;
        next = moveTowardAllMoves(next, playerId, unit.id, approach, 8, cache, flow);
        if (next !== before) assigned.add(unit.id);
    }
    return next;
}

export function runFocusSiegeAndCapture(state: GameState, playerId: string, ctx: TacticalContext): GameState {
    let next = state;
    const enemies = ctx.enemyIds;
    if (enemies.size === 0) return next;

    const mem = ctx.memory;
    const perception = ctx.perception ?? buildPerception(next, playerId);
    const theaterFresh = mem.operationalTurn !== undefined && (next.turn - mem.operationalTurn) <= 2;
    const theaterCityId = theaterFresh ? mem.operationalTheaters?.[0]?.targetCityId : undefined;
    const focusCity = mem.focusCityId
        ? next.cities.find(c => c.id === mem.focusCityId)
        : theaterCityId
            ? next.cities.find(c => c.id === theaterCityId)
            : undefined;
    if (!focusCity || !enemies.has(focusCity.ownerId)) return next;
    if (perception.visibilityKnown && !perception.isCoordVisible(focusCity.coord)) return next;

    const rally = pickRallyCoord(next, focusCity.coord, 3);
    const rallyFlow = ctx.getFlowField(rally, { cacheKey: "siege-rally" });
    const createCache = ctx.createLookupCache;
    const getFlowField = ctx.getFlowField;

    const units = next.units
        .filter(u => u.ownerId === playerId && u.movesLeft > 0 && isMilitary(u))
        .filter(u => u.type !== UnitType.Titan) // Titan handled separately
        .filter(u => !u.isTitanEscort)
        // FIX: Don't move units that haven't attacked yet - they should attack first!
        // If unit hasn't attacked AND is in range of focus city, let tactical planner handle it.
        .filter(u => {
            // If already attacked this turn, safe to move for positioning
            if (u.hasAttacked) return true;
            // If not adjacent to focus city, can't attack it anyway, so move them
            const dist = hexDistance(u.coord, focusCity.coord);
            const range = UNITS[u.type].rng;
            if (dist > range) return true; // Can't attack, safe to move
            // Adjacent units should NOT be moved - they should attack!
            return false;
        })
        .filter(u => {
            const city = next.cities.find(c => hexEquals(c.coord, u.coord));
            if (city && city.ownerId === playerId) {
                return false;
            }
            return true;
        });

    const capturers = units.filter(isCapturer);
    const siege = units.filter(isSiege);
    const riders = units.filter(isRider);
    const others = units.filter(u => !isCapturer(u) && !isSiege(u) && !isRider(u));

    const cityHpPercent = focusCity.maxHp ? focusCity.hp / focusCity.maxHp : 1;

    // Phase 3: Calculate dynamic siege ring distance
    // v9.1: FIXED - Siege units (Range 2) were moving to Range 1 when city was low HP,
    // blocking the inner ring for Capture units (Range 1) and exposing themselves.
    // NOW: Siege units stay at their max range (usually 2).

    for (const u of siege) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;

        // Respect unit's actual range.
        // If range is > 2 (e.g. future artillery), stay at 2 or 3? For now, stick to max range.
        // But clamp to 2 because vision/fog might be an issue at 3+? (Vision is usually 2 or 3).
        // Standard siege is Range 2.
        const unitStats = UNITS[live.type];
        const siegeDist = Math.max(2, unitStats.rng); // Default to at least 2 for siege

        const dist = hexDistance(live.coord, focusCity.coord);
        if (dist === siegeDist) continue;  // Already in position

        const cache = createCache(next);
        const siegeRing = pickRingCoordForUnit(next, playerId, live, focusCity.coord, siegeDist, 1200, cache);
        const flow = getFlowField(siegeRing, { cacheKey: "siege" });
        next = moveToward(next, playerId, live, siegeRing, cache, flow);
    }

    for (const u of capturers) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        const dist = hexDistance(live.coord, focusCity.coord);

        if (dist === 1) continue;

        if (focusCity.hp <= 0) {
            const flow = getFlowField(focusCity.coord, { cacheKey: "siege-capture" });
            next = moveToward(next, playerId, live, focusCity.coord, undefined, flow);
            continue;
        }

        const hpPercent = focusCity.maxHp ? focusCity.hp / focusCity.maxHp : 1;
        const isUnderSiege = hpPercent <= 0.85;

        const noSiegeSupport = siege.length === 0;
        const overwhelmingForce = capturers.length >= 2;
        const shouldAssault = isUnderSiege || noSiegeSupport || overwhelmingForce;

        if (focusCity.isCapital || focusCity.hp <= 12 || shouldAssault) {
            const approach = pickApproachTile(next, playerId, live, focusCity.coord);
            const flow = getFlowField(approach, { cacheKey: "siege-approach" });
            next = moveToward(next, playerId, live, approach, undefined, flow);
        } else {
            next = moveToward(next, playerId, live, rally, undefined, rallyFlow);
        }
    }

    const anchorUnits = [...capturers, ...siege].map(u => next.units.find(x => x.id === u.id)).filter(Boolean) as any[];
    for (const u of riders) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;

        // Phase 3: Riders engage when city is damaged instead of hovering
        if (cityHpPercent < 0.5) {
            // City is hurting - riders move in to help finish it
            const approach = pickApproachTile(next, playerId, live, focusCity.coord);
            const flow = getFlowField(approach, { cacheKey: "siege-rider" });
            next = moveToward(next, playerId, live, approach, undefined, flow);
            continue;
        }

        // Otherwise stay near anchor units
        const nearestAnchorDist = anchorUnits.length
            ? Math.min(...anchorUnits.map(a => hexDistance(a.coord, live.coord)))
            : 0;
        if (nearestAnchorDist > 2) {
            next = moveToward(next, playerId, live, rally, undefined, rallyFlow);
        }
    }

    for (const u of others) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        next = moveToward(next, playerId, live, rally, undefined, rallyFlow);
    }

    return next;
}
