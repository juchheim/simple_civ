import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { nearestByDistance } from "../shared/metrics.js";
import { findPath } from "../../helpers/pathfinding.js";
import { repositionRanged } from "./defense.js";
import {
    cityIsCoastal,
    enemiesWithin,
    expectedDamageFrom,
    expectedDamageToCity,
    expectedDamageToUnit,
    friendlyAdjacencyCount,
    getWarTargets,
    shouldUseWarProsecutionMode,
    selectHeldGarrisons,
    selectPrimarySiegeCity,
    stepToward,
    tileDefenseScore,
    warGarrisonCap
} from "./unit-helpers.js";

function captureIfPossible(state: GameState, playerId: string, unitId: string): GameState {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return state;
    const stats = UNITS[unit.type];
    if (!stats.canCaptureCity || stats.domain === "Civilian") return state;

    const adjCities = state.cities.filter(
        c => c.ownerId !== playerId && hexDistance(c.coord, unit.coord) === 1 && c.hp <= 0
    );
    if (adjCities.length > 0) {
        console.info(`[AI CAPTURE ATTEMPT] ${playerId} ${unit.type} attempting to capture ${adjCities.length} cities at HP <=0`);
    }
    for (const city of adjCities) {
        const unitsOnCity = state.units.filter(u => hexEquals(u.coord, city.coord));
        console.info(`[AI CAPTURE] ${playerId} ${unit.type} capturing ${city.name} (${city.ownerId}) at ${city.hp} HP. Units on city: ${unitsOnCity.map(u => u.type).join(", ") || "None"}`);
        const moved = tryAction(state, { type: "MoveUnit", playerId, unitId: unit.id, to: city.coord });
        if (moved !== state) return moved;
    }
    return state;
}

export function routeCityCaptures(state: GameState, playerId: string): GameState {
    let next = state;
    const captureCities = next.cities.filter(c => c.ownerId !== playerId && c.hp <= 0);
    if (!captureCities.length) return next;

    const captureUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        UNITS[u.type].canCaptureCity
    );
    if (!captureUnits.length) return next;

    const assigned = new Set<string>();

    for (const city of captureCities) {
        const candidates = captureUnits.filter(u => !assigned.has(u.id));
        if (!candidates.length) break;

        const unit = nearestByDistance(city.coord, candidates, u => u.coord);
        if (!unit) continue;

        const path = findPath(unit.coord, city.coord, unit, next);
        const step = path[0];
        if (step) {
            const moved = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: unit.id,
                to: step
            });
            if (moved !== next) {
                next = moved;
                assigned.add(unit.id);
                continue;
            }
        }

        next = stepToward(next, playerId, unit.id, city.coord);
        assigned.add(unit.id);
    }

    return next;
}

export function attackTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const units = next.units.filter(u => u.ownerId === playerId && u.type !== UnitType.Settler);
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
        const stats = UNITS[unit.type];
        if (unit.hasAttacked) continue;

        const cityTargets = warCities
            .filter(c => hexDistance(c.coord, unit.coord) <= stats.rng && c.hp > 0)
            .map(c => ({ city: c, dmg: expectedDamageToCity(unit, c, next) }))
            .sort((a, b) => {
                const aKill = a.dmg >= a.city.hp ? 0 : 1;
                const bKill = b.dmg >= b.city.hp ? 0 : 1;
                if (aKill !== bKill) return aKill - bKill;
                if (primaryCity) {
                    const aPrimary = a.city.id === primaryCity.id ? -1 : 0;
                    const bPrimary = b.city.id === primaryCity.id ? -1 : 0;
                    if (aPrimary !== bPrimary) return aPrimary - bPrimary;
                }
                return a.city.hp - b.city.hp;
            });
        let acted = false;
        for (const { city, dmg } of cityTargets) {
            const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: city.id, targetType: "City" });
            if (attacked !== next) {
                console.info(`[AI ATTACK CITY] ${playerId} attacks ${city.name} (${city.ownerId}) with ${unit.type}, dealing ${dmg} damage (HP: ${city.hp}→${city.hp - dmg})`);
                next = attacked;
                next = captureIfPossible(next, playerId, unit.id);
                acted = true;
                break;
            }
        }
        if (acted) continue;

        const warEnemyIds = next.players
            .filter(p =>
                p.id !== playerId &&
                !p.isEliminated &&
                next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
            )
            .map(p => p.id);

        const enemyUnits = next.units
            .filter(u => warEnemyIds.includes(u.ownerId))
            .map(u => ({
                u,
                d: hexDistance(u.coord, unit.coord),
                dmg: expectedDamageToUnit(unit, u, next),
                counter: expectedDamageFrom(u, unit, next),
                isSettler: u.type === UnitType.Settler
            }))
            .filter(({ d, isSettler }) => {
                if (isSettler) return d === 1;
                return d <= stats.rng;
            })
            .sort((a, b) => {
                const aKill = a.dmg >= a.u.hp ? 0 : 1;
                const bKill = b.dmg >= b.u.hp ? 0 : 1;
                if (aKill !== bKill) return aKill - bKill;
                if (a.isSettler !== b.isSettler) return a.isSettler ? 1 : -1;
                if (a.d !== b.d) return a.d - b.d;
                return a.u.hp - b.u.hp;
            });
        const target = enemyUnits[0];
        const adjEnemies = enemiesWithin(next, playerId, unit.coord, 1);
        const rangedAndUnsafe = UNITS[unit.type].rng > 1 && adjEnemies > 0 && target && target.dmg < target.u.hp;
        if (target && (
            target.dmg >= target.u.hp ||
            (target.dmg >= 2 && target.dmg >= target.counter) ||
            (unit.hp > target.counter + 2 && target.dmg >= 2)
        ) && !rangedAndUnsafe) {
            if (target.isSettler && target.d > 1 && unit.movesLeft > 0) {
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
                        if (!updatedUnit || updatedUnit.movesLeft <= 0 || !updatedTarget) continue;
                        const newDist = hexDistance(updatedUnit.coord, updatedTarget.coord);
                        if (newDist > 1) continue;
                        const newTarget = {
                            u: updatedTarget,
                            d: newDist,
                            dmg: expectedDamageToUnit(updatedUnit, updatedTarget, next),
                            counter: expectedDamageFrom(updatedTarget, updatedUnit, next),
                            isSettler: true
                        };
                        const attacked = tryAction(next, { type: "Attack", playerId, attackerId: updatedUnit.id, targetId: updatedTarget.id, targetType: "Unit" });
                        if (attacked !== next) {
                            console.info(`[AI ATTACK UNIT] ${playerId} ${updatedUnit.type} attacks ${updatedTarget.ownerId} ${updatedTarget.type}, dealing ${newTarget.dmg} damage (HP: ${updatedTarget.hp})`);
                            next = attacked;
                            const finalUnit = next.units.find(u => u.id === unit.id);
                            if (finalUnit) {
                                const adjAfter = enemiesWithin(next, playerId, finalUnit.coord, 1);
                                if (UNITS[finalUnit.type].rng > 1 && adjAfter > 0) {
                                    next = repositionRanged(next, playerId);
                                }
                            }
                        }
                        continue;
                    }
                }
            }
            
            const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: target.u.id, targetType: "Unit" });
            if (attacked !== next) {
                console.info(`[AI ATTACK UNIT] ${playerId} ${unit.type} attacks ${target.u.ownerId} ${target.u.type}, dealing ${target.dmg} damage (HP: ${target.u.hp})`);
                next = attacked;
                const updatedUnitAfterAttack = next.units.find(u => u.id === unit.id);
                if (updatedUnitAfterAttack) {
                    const adjAfter = enemiesWithin(next, playerId, updatedUnitAfterAttack.coord, 1);
                    if (UNITS[updatedUnitAfterAttack.type].rng > 1 && adjAfter > 0) {
                        next = repositionRanged(next, playerId);
                    }
                }
            }
        }
    }
    return next;
}

export function moveMilitaryTowardTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const warTargets = getWarTargets(next, playerId);
    if (!warTargets.length) return next;

    const isInWarProsecutionMode = shouldUseWarProsecutionMode(next, playerId, warTargets);
    const targetCities = next.cities
        .filter(c => warTargets.some(w => w.id === c.ownerId))
        .sort((a, b) => a.hp - b.hp);
    const armyUnits = next.units.filter(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");
    const garrisonCap = warGarrisonCap(next, playerId, isInWarProsecutionMode);
    const heldGarrisons = selectHeldGarrisons(next, playerId, warTargets, garrisonCap);

    const unitCounts = armyUnits.reduce((acc, u) => {
        acc[u.type] = (acc[u.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    if (targetCities.some(c => c.hp <= 0)) {
        console.info(`[AI SIEGE DEBUG] ${playerId} has units: ${JSON.stringify(unitCounts)}. Targets with <=0 HP: ${targetCities.filter(c => c.hp <= 0).map(c => c.name).join(", ")}`);
    }

    const rangedIds = new Set(
        armyUnits.filter(u => UNITS[u.type].rng > 1).map(u => u.id)
    );
    const primaryCity = selectPrimarySiegeCity(
        next,
        playerId,
        armyUnits,
        targetCities,
        { forceRetarget: isInWarProsecutionMode, preferClosest: isInWarProsecutionMode }
    );

    for (const unit of armyUnits) {
        let current = unit;
        let safety = 0;
        while (safety < 3) {
            safety++;
            next = captureIfPossible(next, playerId, current.id);
            const updated = next.units.find(u => u.id === current.id);
            if (!updated) break;
            current = updated;
            if (current.movesLeft <= 0) break;

            const friendlyCity = next.cities.find(c => c.ownerId === playerId && hexEquals(c.coord, current.coord));
            if (friendlyCity) {
                if (heldGarrisons.has(current.id)) break;
            }

            const unitTargets = UNITS[current.type].domain === "Naval"
                ? targetCities.filter(c => cityIsCoastal(next, c))
                : targetCities;

            let nearest: any = null;
            if (UNITS[current.type].canCaptureCity) {
                const capturable = unitTargets.filter(c => c.hp <= 0);
                if (capturable.length > 0) {
                    nearest = nearestByDistance(current.coord, capturable, city => city.coord);
                    console.info(`[AI CAPTURE MOVE] ${playerId} ${current.type} moving to capture ${nearest.name} (HP ${nearest.hp})`);
                }
            }

            if (!nearest) {
                nearest = nearestByDistance(
                    current.coord,
                    primaryCity ? [primaryCity] : unitTargets,
                    city => city.coord
                );
            }

            if (!nearest) break;
            if (hexDistance(nearest.coord, current.coord) === 0) break;

            let path = findPath(current.coord, nearest.coord, current, next);

            if (path.length === 0 && hexDistance(current.coord, nearest.coord) > 1) {
                const neighbors = getNeighbors(nearest.coord);
                const validNeighbors = neighbors
                    .map(n => ({ coord: n, path: findPath(current.coord, n, current, next) }))
                    .filter(n => n.path.length > 0)
                    .sort((a, b) => a.path.length - b.path.length);

                if (validNeighbors.length > 0) {
                    path = validNeighbors[0].path;
                }
            }

            let moved = false;
            if (path.length > 0) {
                const step = path[0];
                const desiredRange = UNITS[current.type].rng;
                const currentDist = hexDistance(current.coord, nearest.coord);
                const requiredSiegeGroup = isInWarProsecutionMode ? 2 : 3;

                const friendliesNearTarget = armyUnits.filter(u =>
                    hexDistance(u.coord, nearest.coord) <= 3
                ).length;

                if (rangedIds.has(current.id) && currentDist <= desiredRange && currentDist >= 2 && friendliesNearTarget >= requiredSiegeGroup) {
                    console.info(`[AI SIEGE] ${playerId} ${current.type} holding at range ${currentDist} from ${nearest.name} (${friendliesNearTarget} units nearby)`);
                    moved = true;
                } else {
                    if (rangedIds.has(current.id) && currentDist <= desiredRange) {
                        console.info(`[AI SIEGE] ${playerId} ${current.type} at range ${currentDist} from ${nearest.name}, waiting for group (${friendliesNearTarget}/${requiredSiegeGroup} units)`);
                    }
                    const stepDist = hexDistance(step, nearest.coord);
                    if (rangedIds.has(current.id) && desiredRange > 1 && stepDist === 0) {
                        moved = false;
                    } else {
                        const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: step });
                        if (attempt !== next) {
                            next = attempt;
                            moved = true;
                        }
                    }
                }
            }
            if (!moved) {
                const neighbors = getNeighbors(current.coord)
                    .map(coord => ({
                        coord,
                        dist: hexDistance(coord, nearest.coord),
                        defense: tileDefenseScore(next, coord),
                        friendlyNearby: friendlyAdjacencyCount(next, playerId, coord)
                    }))
                    .filter(n => n.friendlyNearby <= 2);
                const ordered = neighbors.sort((a, b) => {
                    const desiredRange = UNITS[current.type].rng;
                    const aRangeScore = rangedIds.has(current.id) && desiredRange > 1
                        ? Math.abs(desiredRange - a.dist)
                        : a.dist;
                    const bRangeScore = rangedIds.has(current.id) && desiredRange > 1
                        ? Math.abs(desiredRange - b.dist)
                        : b.dist;
                    if (aRangeScore !== bRangeScore) return aRangeScore - bRangeScore;
                    if (a.friendlyNearby !== b.friendlyNearby) return a.friendlyNearby - b.friendlyNearby;
                    return b.defense - a.defense;
                });
                for (const n of ordered) {
                    const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: n.coord });
                    if (attempt !== next) {
                        next = attempt;
                        moved = true;
                        break;
                    }
                }
            }
            if (!moved) break;
        }
    }
    return next;
}
