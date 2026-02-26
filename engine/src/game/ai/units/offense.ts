import { aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { GameState, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { nearestByDistance } from "../shared/metrics.js";
import { findPath } from "../../helpers/pathfinding.js";
import { repositionRanged } from "./defense.js";
// Battle-group execution removed - handled by unified tactical planner (v1.0.3)
import { tryCityAttacks, trebuchetSiegeAttacks } from "./offense-city-attacks.js";
import { handlePostAttackRetreat, handleUnsafeAttack } from "./offense-retreat.js";
import { getAttackingUnits, getEnemyTargets, getWarEnemyIds } from "./offense-targeting.js";
import {
    expectedDamageFrom,
    expectedDamageToUnit,
    enemiesWithin,
    getWarTargets,
    isScoutType,
    shouldUseWarProsecutionMode,
    selectPrimarySiegeCity,
    isAttackSafe,
} from "./unit-helpers.js";

export { routeCityCaptures, routeCaptureUnitsToActiveSieges } from "./siege-routing.js";
export { moveUnitsForCampClearing, attackCampTargets } from "./offense-camp-clearing.js";
export { moveMilitaryTowardTargets } from "./offense-movement.js";

// coordinateBattleGroups removed - battle-group attacks now planned through
// the unified tactical planner (v1.0.3 refactor)

function attemptSettlerPounce(
    next: GameState,
    playerId: string,
    unit: any,
    target: { u: any; d: number; dmg: number; counter: number; isSettler: boolean }
): { state: GameState; acted: boolean } {
    const neighbors = getNeighbors(target.u.coord);
    const bestNeighbor = neighbors
        .map(coord => ({
            coord,
            dist: hexDistance(unit.coord, coord),
            path: findPath(unit.coord, coord, unit, next)
        }))
        .filter(n => n.path.length > 0)
        .sort((a, b) => a.dist - b.dist)[0];

    if (bestNeighbor) {
        const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: bestNeighbor.coord });
        if (moved !== next) {
            next = moved;
            const updatedUnit = next.units.find(u => u.id === unit.id);
            const updatedTarget = next.units.find(u => u.id === target.u.id);
            if (!updatedUnit || updatedUnit.movesLeft <= 0 || !updatedTarget) return { state: next, acted: true };
            const newDist = hexDistance(updatedUnit.coord, updatedTarget.coord);
            if (newDist > 1) return { state: next, acted: true };
            const newTarget = {
                u: updatedTarget,
                d: newDist,
                dmg: expectedDamageToUnit(updatedUnit, updatedTarget, next),
                counter: expectedDamageFrom(updatedTarget, updatedUnit, next),
                isSettler: true
            };
            const attacked = tryAction(next, { type: "Attack", playerId, attackerId: updatedUnit.id, targetId: updatedTarget.id, targetType: "Unit" });
            if (attacked !== next) {
                aiInfo(`[AI ATTACK UNIT] ${playerId} ${updatedUnit.type} attacks ${updatedTarget.ownerId} ${updatedTarget.type}, dealing ${newTarget.dmg} damage (HP: ${updatedTarget.hp})`);
                next = attacked;
                const finalUnit = next.units.find(u => u.id === unit.id);
                if (finalUnit) {
                    const adjAfter = enemiesWithin(next, playerId, finalUnit.coord, 1);
                    if (UNITS[finalUnit.type].rng > 1 && adjAfter > 0) {
                        next = repositionRanged(next, playerId);
                    }
                }
            }
            return { state: next, acted: true };
        }
    }

    return { state: next, acted: false };
}

function performUnitAttack(
    next: GameState,
    playerId: string,
    unit: any,
    target: { u: any; d: number; dmg: number; counter: number; isSettler: boolean }
): GameState {
    const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: target.u.id, targetType: "Unit" });
    if (attacked === next) return next;

    let updated = attacked;
    aiInfo(`[AI ATTACK UNIT] ${playerId} ${unit.type} attacks ${target.u.ownerId} ${target.u.type}, dealing ${target.dmg} damage (HP: ${target.u.hp})`);
    const updatedUnitAfterAttack = updated.units.find(u => u.id === unit.id);
    if (updatedUnitAfterAttack) {
        const adjAfter = enemiesWithin(updated, playerId, updatedUnitAfterAttack.coord, 1);
        if (UNITS[updatedUnitAfterAttack.type].rng > 1 && adjAfter > 0) {
            updated = repositionRanged(updated, playerId);
        }
        updated = handlePostAttackRetreat(updated, playerId, unit.id);
    }
    return updated;
}

export function attackTargets(state: GameState, playerId: string): GameState {
    // v1.0.4: Trebuchets fire first (siege softening)
    let next = trebuchetSiegeAttacks(state, playerId);

    // Battle-group coordination moved to unified tactical planner (v1.0.3)


    const units = getAttackingUnits(next, playerId);
    const warTargets = getWarTargets(next, playerId);
    const isInWarProsecutionMode = shouldUseWarProsecutionMode(next, playerId, warTargets);
    const warCities = next.cities.filter(c => c.ownerId !== playerId);
    const primaryCity = selectPrimarySiegeCity(
        next,
        playerId,
        units,
        warCities,
        { forceRetarget: isInWarProsecutionMode, preferClosest: isInWarProsecutionMode }
    );
    for (const unit of units) {
        if (unit.hasAttacked) continue;

        const cityAttack = tryCityAttacks(next, playerId, unit, warCities, primaryCity);
        next = cityAttack.state;
        if (cityAttack.acted) continue;

        // v1.0.3: Trebuchets can only attack cities, not units - skip unit attack logic
        if (unit.type === UnitType.Trebuchet) continue;

        const warEnemyIds = getWarEnemyIds(next, playerId);
        const enemyUnits = getEnemyTargets(next, unit, warEnemyIds);
        const target = enemyUnits[0];
        const adjEnemies = enemiesWithin(next, playerId, unit.coord, 1);
        const rangedAndUnsafe = UNITS[unit.type].rng > 1 && adjEnemies > 0 && target && target.dmg < target.u.hp;

        // v3.0: Check attack safety based on military advantage
        const attackSafety = target ? isAttackSafe(unit, target.u, target.u.coord, next, playerId) : { safe: false, riskLevel: "suicidal" as const, reason: "No target" };

        // Only attack if: can kill, trades favorably, OR has HP buffer - AND attack is safe
        const tradeWorthIt = target && (
            target.dmg >= target.u.hp ||
            (target.dmg >= 2 && target.dmg >= target.counter) ||
            (unit.hp > target.counter + 2 && target.dmg >= 2)
        );

        if (target && tradeWorthIt && attackSafety.safe && !rangedAndUnsafe) {
            if (target.isSettler && target.d > 1 && unit.movesLeft > 0) {
                const settlerAttack = attemptSettlerPounce(next, playerId, unit, target);
                next = settlerAttack.state;
                if (settlerAttack.acted) continue;
            }

            next = performUnitAttack(next, playerId, unit, target);
        } else if (target && tradeWorthIt && !attackSafety.safe) {
            next = handleUnsafeAttack(next, playerId, unit, attackSafety);
        }
    }
    return next;
}

export function moveUnitsForPreparation(state: GameState, playerId: string): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player || !player.warPreparation || player.warPreparation.state !== "Positioning") return next;

    const targetId = player.warPreparation.targetId;
    const targetCities = next.cities.filter(c => c.ownerId === targetId);
    if (targetCities.length === 0) return next;

    // v0.99: Minimum Garrison Logic
    // Strategy is deterministic based on start turn: Even = Cautious, Odd = Risky
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const reservedUnitIds = new Set<string>();

    for (const city of myCities) {
        // Always protect Capital
        if (city.isCapital) {
            const garrison = next.units.find(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
            if (garrison) reservedUnitIds.add(garrison.id);
            continue;
        }

        // v1.1: ALWAYS protect ALL city garrisons, not just capital/threatened
        // This prevents cities from being left undefended during war preparation
        const garrison = next.units.find(u =>
            u.ownerId === playerId &&
            hexEquals(u.coord, city.coord) &&
            UNITS[u.type].domain !== "Civilian" &&
            !isScoutType(u.type)
        );
        if (garrison) reservedUnitIds.add(garrison.id);
    }

    const units = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Titan &&
        !reservedUnitIds.has(u.id)
    );

    for (const unit of units) {
        // Find closest enemy city
        const nearestCity = nearestByDistance(unit.coord, targetCities, c => c.coord);
        if (!nearestCity) continue;

        // Target is 2 tiles away from city (border)
        // We want to be close but NOT inside their territory if we are not at war
        // Actually, "outside dotted line" usually means outside territory.
        // Territory is defined by tile ownership.

        // Find a tile near the city that is NOT owned by the enemy
        // Ideally distance 2 or 3 from city center.

        // Scan area around city
        // We can just scan area around UNIT and move towards city, stopping at border.

        const path = findPath(unit.coord, nearestCity.coord, unit, next);
        if (path.length === 0) continue;

        // Walk the path until we hit enemy territory
        // If we are far away, just move closer.
        // If we are close, ensure we don't step into enemy territory.

        // Check if next step is enemy territory
        const nextStep = path[0];
        const nextTile = next.map.tiles.find(t => hexEquals(t.coord, nextStep));

        // If next step is owned by target, DON'T MOVE there.
        if (nextTile && nextTile.ownerId === targetId) {
            // We are at the border. Stay here.
            continue;
        }

        // If next step is free (or owned by us/neutral), move there.
        // But we also want to spread out, not stack.
        // And we want to be close to the city.

        // If we are already adjacent to enemy territory, we might want to stay or move along the border.
        // For simplicity: Move towards city, but stop if next tile is enemy territory.

        // Check for friendly military on target tile (Stacking Limit)
        const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, nextStep));
        const friendlyMilitary = unitsOnTarget.some(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");
        if (friendlyMilitary) continue;

        const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: nextStep });
        if (moved !== next) {
            next = moved;
        }
    }

    return next;
}


