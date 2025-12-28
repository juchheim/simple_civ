import { GameState, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { pickBest } from "./util.js";
import { TacticalContext } from "./tactical-context.js";
import { pickApproachTile, pickRallyCoord, pickRingCoordForUnit } from "./targeting.js";
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
        const before = next;
        next = moveTowardAllMoves(next, playerId, unit.id, approach, 8);
        if (next !== before) assigned.add(unit.id);
    }
    return next;
}

export function runFocusSiegeAndCapture(state: GameState, playerId: string, ctx: TacticalContext): GameState {
    let next = state;
    const enemies = ctx.enemyIds;
    if (enemies.size === 0) return next;

    const mem = ctx.memory;
    const focusCity = mem.focusCityId ? next.cities.find(c => c.id === mem.focusCityId) : undefined;
    if (!focusCity || !enemies.has(focusCity.ownerId)) return next;

    const rally = pickRallyCoord(next, focusCity.coord, 3);
    const createCache = ctx.createLookupCache;

    const units = next.units
        .filter(u => u.ownerId === playerId && u.movesLeft > 0 && isMilitary(u))
        .filter(u => u.type !== UnitType.Titan) // Titan handled separately
        .filter(u => !u.isTitanEscort)
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

    for (const u of siege) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        const dist = hexDistance(live.coord, focusCity.coord);
        if (dist <= 2) continue;
        const cache = createCache(next);
        const siegeRing = pickRingCoordForUnit(next, playerId, live, focusCity.coord, 2, 1200, cache);
        next = moveToward(next, playerId, live, siegeRing);
    }

    for (const u of capturers) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        const dist = hexDistance(live.coord, focusCity.coord);

        if (dist === 1) continue;

        if (focusCity.hp <= 0) {
            next = moveToward(next, playerId, live, focusCity.coord);
            continue;
        }

        const hpPercent = focusCity.maxHp ? focusCity.hp / focusCity.maxHp : 1;
        const isUnderSiege = hpPercent <= 0.85;

        const noSiegeSupport = siege.length === 0;
        const overwhelmingForce = capturers.length >= 2;
        const shouldAssault = isUnderSiege || noSiegeSupport || overwhelmingForce;

        if (focusCity.isCapital || focusCity.hp <= 12 || shouldAssault) {
            const approach = pickApproachTile(next, playerId, live, focusCity.coord);
            next = moveToward(next, playerId, live, approach);
        } else {
            next = moveToward(next, playerId, live, rally);
        }
    }

    const anchorUnits = [...capturers, ...siege].map(u => next.units.find(x => x.id === u.id)).filter(Boolean) as any[];
    for (const u of riders) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        const nearestAnchorDist = anchorUnits.length
            ? Math.min(...anchorUnits.map(a => hexDistance(a.coord, live.coord)))
            : 0;
        if (nearestAnchorDist > 2) {
            next = moveToward(next, playerId, live, rally);
        }
    }

    for (const u of others) {
        const live = next.units.find(x => x.id === u.id);
        if (!live || live.movesLeft <= 0) continue;
        next = moveToward(next, playerId, live, rally);
    }

    return next;
}
