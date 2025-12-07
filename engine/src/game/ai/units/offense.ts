import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType, UnitState } from "../../../core/types.js";
import { TERRAIN, UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { nearestByDistance, sortByDistance } from "../shared/metrics.js";
import { findPath } from "../../helpers/pathfinding.js";
import { repositionRanged } from "./defense.js";
import {
    cityIsCoastal,
    enemiesWithin,
    expectedDamageFrom,
    expectedDamageToCity,
    expectedDamageToUnit,
    getWarTargets,
    isScoutType,
    shouldUseWarProsecutionMode,
    selectHeldGarrisons,
    selectPrimarySiegeCity,
    stepToward,
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
            // Check if step is blocked by friendly unit
            const blockingUnit = next.units.find(u => hexEquals(u.coord, step) && u.ownerId === playerId && u.id !== unit.id);
            if (blockingUnit) {
                let cleared = false;
                // Try to move blocking unit aside
                if (blockingUnit.movesLeft > 0) {
                    const neighbors = getNeighbors(blockingUnit.coord);
                    // Find a free neighbor that isn't the city and isn't the capture unit's tile
                    const escape = neighbors.find(n => {
                        if (hexEquals(n, city.coord) || hexEquals(n, unit.coord)) return false;
                        if (next.units.some(u => hexEquals(u.coord, n))) return false;
                        const tile = next.map.tiles.find(t => hexEquals(t.coord, n));
                        const blocksLos = tile ? TERRAIN[tile.terrain]?.blocksLoS : false;
                        return !blocksLos;
                    });

                    if (escape) {
                        console.info(`[AI CAPTURE] Moving blocking unit ${blockingUnit.type} to make way for ${unit.type}`);
                        const movedBlocker = tryAction(next, {
                            type: "MoveUnit",
                            playerId,
                            unitId: blockingUnit.id,
                            to: escape
                        });
                        if (movedBlocker !== next) {
                            next = movedBlocker;
                            cleared = true;
                            // Now try moving the capture unit again
                        }
                    }
                }

                if (!cleared) {
                    // No escape or no moves? Try SWAP!
                    // "advance through other units by swapping hexes"
                    if (hexDistance(unit.coord, blockingUnit.coord) === 1) {
                        console.info(`[AI CAPTURE] Blocking unit ${blockingUnit.type} cannot move aside. Attempting SWAP with ${unit.type}`);
                        const swapped = tryAction(next, {
                            type: "SwapUnits",
                            playerId,
                            unitId: unit.id,
                            targetUnitId: blockingUnit.id
                        });
                        if (swapped !== next) {
                            next = swapped;
                            assigned.add(unit.id); // Unit moved (swapped)
                            continue;
                        }
                    } else {
                        console.warn(`[AI CAPTURE] Cannot swap: Units not adjacent (${hexDistance(unit.coord, blockingUnit.coord)})`);
                    }
                }
            }

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

// --- SIEGE COMPOSITION AWARENESS (v2.0) ---

/**
 * Check if units near a target city form a viable siege force.
 * A viable siege requires at least one capture-capable unit (SpearGuard, Riders, etc.)
 */
function hasSiegeCapability(
    state: GameState,
    playerId: string,
    targetCity: any,
    radiusToConsider: number = 4
): { hasCaptureUnit: boolean; captureUnits: string[]; siegeUnits: string[] } {
    const nearbyUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        hexDistance(u.coord, targetCity.coord) <= radiusToConsider
    );

    const captureUnits = nearbyUnits.filter(u => UNITS[u.type].canCaptureCity).map(u => u.id);
    const siegeUnits = nearbyUnits.map(u => u.id);

    return {
        hasCaptureUnit: captureUnits.length > 0,
        captureUnits,
        siegeUnits
    };
}

/**
 * Find sieges that are actively being attacked but lack capture-capable units.
 * Returns cities that need capture unit reinforcement.
 */
function findSiegesNeedingCapture(
    state: GameState,
    playerId: string
): Array<{ city: any; priority: number }> {
    const warTargets = getWarTargets(state, playerId);
    const warEnemyIds = warTargets.map(w => w.id);

    const enemyCities = state.cities.filter(c => warEnemyIds.includes(c.ownerId));
    const result: Array<{ city: any; priority: number }> = [];

    for (const city of enemyCities) {
        const siegeStatus = hasSiegeCapability(state, playerId, city, 4);

        // We have units sieging but no capture unit
        if (siegeStatus.siegeUnits.length > 0 && !siegeStatus.hasCaptureUnit) {
            // Higher priority if city HP is low (close to capturable)
            const hpPriority = Math.max(0, 20 - city.hp);
            // More priority if more units are already there
            const unitPriority = siegeStatus.siegeUnits.length * 5;

            result.push({
                city,
                priority: hpPriority + unitPriority
            });

            console.info(`[AI SIEGE COMPOSITION] ${playerId} siege at ${city.name} (HP ${city.hp}) needs capture unit! ${siegeStatus.siegeUnits.length} units sieging.`);
        }
    }

    return result.sort((a, b) => b.priority - a.priority);
}

/**
 * Route capture-capable units to sieges that lack capture capability.
 * Called before general military movement.
 */
export function routeCaptureUnitsToActiveSieges(state: GameState, playerId: string): GameState {
    let next = state;

    const siegesNeedingCapture = findSiegesNeedingCapture(next, playerId);
    if (siegesNeedingCapture.length === 0) return next;

    // Find available capture units that aren't already at a siege
    const captureUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        UNITS[u.type].canCaptureCity
    );

    const assignedUnits = new Set<string>();

    for (const { city } of siegesNeedingCapture) {
        // Check if already has capture unit en route
        const siegeStatus = hasSiegeCapability(next, playerId, city, 4);
        if (siegeStatus.hasCaptureUnit) continue;

        // Find nearest available capture unit
        const availableUnits = captureUnits.filter(u => !assignedUnits.has(u.id));
        if (availableUnits.length === 0) break;

        const nearest = nearestByDistance(city.coord, availableUnits, u => u.coord);
        if (!nearest) continue;

        const distance = hexDistance(nearest.coord, city.coord);

        // Only route if reasonably close (within 8 tiles)
        if (distance > 8) continue;

        assignedUnits.add(nearest.id);

        // Move toward the siege
        console.info(`[AI SIEGE SUPPORT] ${playerId} routing ${nearest.type} to siege at ${city.name} (dist ${distance})`);
        next = stepToward(next, playerId, nearest.id, city.coord);
    }

    return next;
}

// --- UNIT COORDINATION (v2.0) ---

/**
 * A battle group is a cluster of friendly units that are near each other and near enemies.
 * Used for coordinating attacks.
 */
interface BattleGroup {
    units: any[];
    centerCoord: { q: number; r: number };
    nearbyEnemies: any[];
    primaryTarget: any | null;
}

/**
 * Identify clusters of friendly units that are engaged with enemies.
 * Returns groups that can coordinate their attacks.
 */
function identifyBattleGroups(state: GameState, playerId: string): BattleGroup[] {
    const militaryUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        !isScoutType(u.type) &&
        !u.hasAttacked
    );

    if (militaryUnits.length === 0) return [];

    // Find enemies at war with us
    const warEnemyIds = state.players
        .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War)
        .map(p => p.id);
    const enemyUnits = state.units.filter(u => warEnemyIds.includes(u.ownerId));

    // Group units that are within 3 tiles of each other
    const groups: BattleGroup[] = [];
    const assigned = new Set<string>();

    for (const unit of militaryUnits) {
        if (assigned.has(unit.id)) continue;

        // Find nearby enemies within attack range
        const nearbyEnemies = enemyUnits.filter(e => {
            const dist = hexDistance(unit.coord, e.coord);
            return dist <= 3; // Within potential engagement range
        });

        // Skip if no enemies nearby
        if (nearbyEnemies.length === 0) continue;

        // Find other friendly units in this area
        const groupUnits = militaryUnits.filter(other => {
            if (assigned.has(other.id)) return false;
            const dist = hexDistance(unit.coord, other.coord);
            return dist <= 3;
        });

        // Mark all as assigned
        for (const u of groupUnits) {
            assigned.add(u.id);
        }

        // Find the best target (lowest HP enemy that multiple units can hit)
        const targetCandidates = nearbyEnemies.map(enemy => {
            const unitsInRange = groupUnits.filter(u => {
                const stats = UNITS[u.type];
                const dist = hexDistance(u.coord, enemy.coord);
                return dist <= stats.rng;
            });
            const totalDamage = unitsInRange.reduce((sum, u) => sum + expectedDamageToUnit(u, enemy, state), 0);
            return { enemy, unitsInRange, totalDamage, canKill: totalDamage >= enemy.hp };
        }).sort((a, b) => {
            // Prioritize killable targets
            if (a.canKill !== b.canKill) return a.canKill ? -1 : 1;
            // Then targets more units can hit
            if (a.unitsInRange.length !== b.unitsInRange.length) return b.unitsInRange.length - a.unitsInRange.length;
            // Then lowest HP
            return a.enemy.hp - b.enemy.hp;
        });

        const primaryTarget = targetCandidates[0]?.enemy || null;

        // Calculate center of group
        const avgQ = groupUnits.reduce((s, u) => s + u.coord.q, 0) / groupUnits.length;
        const avgR = groupUnits.reduce((s, u) => s + u.coord.r, 0) / groupUnits.length;

        groups.push({
            units: groupUnits,
            centerCoord: { q: Math.round(avgQ), r: Math.round(avgR) },
            nearbyEnemies,
            primaryTarget
        });
    }

    return groups;
}

/**
 * Coordinate attacks within a battle group.
 * Orders: ranged units attack first (soften), then melee (finish).
 * Focus fire: all units target the same enemy until dead.
 */
function coordinateGroupAttack(
    state: GameState,
    playerId: string,
    group: BattleGroup
): GameState {
    let next = state;

    if (!group.primaryTarget) return next;

    // Sort units: ranged first (to soften targets), then melee
    const sortedUnits = [...group.units].sort((a, b) => {
        const aRng = UNITS[a.type as UnitType].rng;
        const bRng = UNITS[b.type as UnitType].rng;
        return bRng - aRng; // Higher range first
    });

    // Track the current primary target (may change if killed)
    let currentTarget = group.primaryTarget;

    for (const unit of sortedUnits) {
        const liveUnit = next.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.hasAttacked) continue;

        // Check if current target is still alive
        const targetStillAlive = next.units.find(u => u.id === currentTarget.id);

        if (!targetStillAlive) {
            // Target died - find new target with focus fire logic
            const warEnemyIds = next.players
                .filter(p => p.id !== playerId && !p.isEliminated && next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War)
                .map(p => p.id);

            const newTargets = next.units
                .filter(u => warEnemyIds.includes(u.ownerId) && hexDistance(u.coord, liveUnit.coord) <= UNITS[liveUnit.type].rng)
                .sort((a, b) => a.hp - b.hp); // Lowest HP first

            if (newTargets.length === 0) continue;
            currentTarget = newTargets[0];
        }

        const stats = UNITS[liveUnit.type];
        const dist = hexDistance(liveUnit.coord, currentTarget.coord);

        if (dist > stats.rng) continue; // Out of range

        const dmg = expectedDamageToUnit(liveUnit, currentTarget, next);
        const attacked = tryAction(next, {
            type: "Attack",
            playerId,
            attackerId: liveUnit.id,
            targetId: currentTarget.id,
            targetType: "Unit"
        });

        if (attacked !== next) {
            console.info(`[AI COORDINATED] ${playerId} ${liveUnit.type} attacks ${currentTarget.type} for ${dmg} dmg (focus fire)`);
            next = attacked;
        }
    }

    return next;
}

export function attackTargets(state: GameState, playerId: string): GameState {
    let next = state;

    // v2.0: Coordinated group attacks with focus fire
    const battleGroups = identifyBattleGroups(next, playerId);
    for (const group of battleGroups) {
        if (group.units.length >= 2) { // Only coordinate if 2+ units
            next = coordinateGroupAttack(next, playerId, group);
        }
    }

    // v1.0 Fix: Exclude garrisoned units from active attacks to prevent "unprovoked" city attacks.
    // Garrisoned units will still retaliate if the city is attacked.
    // v1.3 Fix: Explicitly check for presence in city, as u.state might not be updated yet.
    const units = next.units.filter(u => {
        if (u.ownerId !== playerId || u.type === UnitType.Settler || isScoutType(u.type) || u.state === UnitState.Garrisoned) return false;
        const city = next.cities.find(c => hexEquals(c.coord, u.coord));
        if (city && city.ownerId === playerId) return false;
        return true;
    });
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

                // Smart Targeting: Maximize damage (Ignore Bait)
                if (a.dmg !== b.dmg) return b.dmg - a.dmg;

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

export function moveUnitsForPreparation(state: GameState, playerId: string): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player || !player.warPreparation || player.warPreparation.state !== "Positioning") return next;

    const targetId = player.warPreparation.targetId;
    const targetCities = next.cities.filter(c => c.ownerId === targetId);
    if (targetCities.length === 0) return next;

    // v0.99: Minimum Garrison Logic
    // Strategy is deterministic based on start turn: Even = Cautious, Odd = Risky
    const isCautious = player.warPreparation.startedTurn % 2 === 0;
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const reservedUnitIds = new Set<string>();

    for (const city of myCities) {
        // Always protect Capital
        if (city.isCapital) {
            const garrison = next.units.find(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
            if (garrison) reservedUnitIds.add(garrison.id);
            continue;
        }

        // If Cautious, protect threatened cities
        if (isCautious) {
            const isThreatened = enemiesWithin(next, playerId, city.coord, 4) > 0;
            if (isThreatened) {
                const garrison = next.units.find(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
                if (garrison) reservedUnitIds.add(garrison.id);
            }
        }
    }

    const units = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian" &&
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

export function moveMilitaryTowardTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const warTargets = getWarTargets(next, playerId);
    if (!warTargets.length) return next;

    const isInWarProsecutionMode = shouldUseWarProsecutionMode(next, playerId, warTargets);
    const targetCities = next.cities
        .filter(c => warTargets.some(w => w.id === c.ownerId))
        .sort((a, b) => a.hp - b.hp);
    const armyUnits = next.units.filter(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian" && !isScoutType(u.type));
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

    // v1.1: Titan Deathball Logic
    // If we have a Titan, ALL units should rally to it or its target.
    const titan = next.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);
    const _titanTarget = null as any;
    if (titan) {
        // Find what the Titan is targeting (closest enemy capital or city)
        // We replicate the Titan's targeting logic here to ensure sync
        const warEnemies = next.players.filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        );
        const enemyCities = next.cities
            .filter(c => warEnemies.some(e => e.id === c.ownerId))
            .sort((a, b) => {
                if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
                return a.hp - b.hp;
            });

        if (enemyCities.length > 0) {
            // Titan targets the nearest high-value city
            // We assume Titan logic (titan.ts) picks the best one.
            // For the Deathball, we just want to be near the Titan.
            // But if the Titan is far, we should move to where the Titan is GOING.

            // Actually, simplest "Deathball" is: Move to Titan's location.
            // If we are near Titan, move to Titan's target.

            // Let's define "Near Titan" as distance <= 3.
        }
    }

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
                // v1.1: Titan Deathball Override
                // If Titan exists, rally to it!
                if (titan && current.id !== titan.id) {
                    const distToTitan = hexDistance(current.coord, titan.coord);

                    // If we are far from Titan (> 3 tiles), move to Titan
                    if (distToTitan > 3) {
                        nearest = { coord: titan.coord, name: "The Titan" };
                        console.info(`[AI DEATHBALL] ${playerId} ${current.type} rallying to Titan (dist ${distToTitan})`);
                    } else {
                        // We are near Titan. Move to Titan's target (if any) or just stick with it.
                        // If we have a primary city (Titan's likely target), go there.
                        // If not, stick to Titan.
                        if (primaryCity) {
                            nearest = primaryCity;
                            // console.info(`[AI DEATHBALL] ${playerId} ${current.type} supporting Titan against ${primaryCity.name}`);
                        } else {
                            nearest = { coord: titan.coord, name: "The Titan" };
                        }
                    }
                }

                if (!nearest) {
                    nearest = nearestByDistance(
                        current.coord,
                        primaryCity ? [primaryCity] : unitTargets,
                        city => city.coord
                    );
                }
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

                // Dynamic siege group size: Min 1, Max 3, but never more than 50% of our total army
                const totalArmySize = armyUnits.length;
                const dynamicGroupSize = Math.max(1, Math.min(3, Math.ceil(totalArmySize / 2)));
                const requiredSiegeGroup = isInWarProsecutionMode ? Math.max(1, dynamicGroupSize - 1) : dynamicGroupSize;

                const friendliesNearTarget = armyUnits.filter(u =>
                    hexDistance(u.coord, nearest.coord) <= 3
                ).length;

                // --- GROUPING LOGIC (v1.0) ---
                // If we are getting close (dist <= 3) but don't have enough support, WAIT.
                // This applies to both Ranged and Melee to form a "Deathball".
                if (currentDist <= 3 && friendliesNearTarget < requiredSiegeGroup) {
                    // Exception: If the city is weak (HP < 50%), charge anyway
                    if (nearest.hp > nearest.maxHp * 0.5) {
                        console.info(`[AI GROUPING] ${playerId} ${current.type} waiting for reinforcements at dist ${currentDist} (${friendliesNearTarget}/${requiredSiegeGroup})`);
                        moved = true; // "Moved" means we took an action (waiting), so stop loop
                    }
                }
                // -----------------------------

                if (!moved) {
                    // If we are at range, check if we should hold for reinforcements
                    if (rangedIds.has(current.id) && currentDist <= desiredRange && currentDist >= 2) {
                        if (friendliesNearTarget >= requiredSiegeGroup) {
                            // We have enough support, hold position and bombard (handled by attackTargets)
                            // But if we are too far (e.g. range 3 unit at range 3), we might want to move to range 2 for better visibility?
                            // For now, hold at max range is safe.
                            console.info(`[AI SIEGE] ${playerId} ${current.type} holding at range ${currentDist} from ${nearest.name} (Supported by ${friendliesNearTarget} units)`);
                            moved = true;
                        } else {
                            // We are at range but lack support. 
                            // If we wait here, we might get picked off.
                            // But moving closer is worse.
                            // Moving back?
                            // For now, just wait, but log it.
                            console.info(`[AI SIEGE] ${playerId} ${current.type} at range ${currentDist} from ${nearest.name}, waiting for group (${friendliesNearTarget}/${requiredSiegeGroup} units)`);
                            // If we've been waiting too long (how to track?), we should attack anyway.
                            // For now, let's say if we have at least 1 other friend, we stay.
                            if (friendliesNearTarget > 1) {
                                moved = true;
                            } else {
                                // Alone. Maybe retreat or regroup? 
                                // Or just stay and hope.
                                moved = true;
                            }
                        }
                    } else {
                        // Not at range, or melee unit. Move closer.
                        const stepDist = hexDistance(step, nearest.coord);

                        // Ranged units shouldn't move closer than their max range unless necessary
                        if (rangedIds.has(current.id) && desiredRange > 1 && stepDist < 2 && currentDist <= desiredRange) {
                            // Don't move into melee range if we are already in range
                            moved = false;
                        } else {
                            // Check for peacetime movement restrictions
                            const tile = next.map.tiles.find(t => hexEquals(t.coord, step));
                            let allowed = true;
                            if (tile && tile.ownerId && tile.ownerId !== playerId) {
                                const diplomacy = next.diplomacy[playerId]?.[tile.ownerId];
                                const isCity = next.cities.some(c => hexEquals(c.coord, step));
                                if (!isCity && diplomacy !== DiplomacyState.War) allowed = false;
                            }

                            if (allowed) {
                                // Check for friendly military on target tile (Stacking Limit)
                                const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, step));
                                const friendlyMilitary = unitsOnTarget.some(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");

                                if (!friendlyMilitary) {
                                    const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: step });
                                    if (attempt !== next) {
                                        next = attempt;
                                        moved = true;
                                    }
                                }
                            }

                            if (!moved) {
                                // Try neighbors
                                const neighbors = getNeighbors(current.coord);
                                const ordered = sortByDistance(nearest.coord, neighbors, (c: { q: number, r: number }) => c);
                                for (const n of ordered) {
                                    // Don't move backwards or stay same distance if possible?
                                    // Actually, just try any neighbor that is closer or same distance?
                                    // Or just any neighbor that works?
                                    // If we are blocked, stepping sideways (same dist) is good.
                                    // Stepping backwards (dist + 1) is bad.
                                    const nDist = hexDistance(n, nearest.coord);
                                    if (nDist > currentDist) continue;

                                    // Check for peacetime movement restrictions
                                    const tile = next.map.tiles.find(t => hexEquals(t.coord, n));
                                    if (tile && tile.ownerId && tile.ownerId !== playerId) {
                                        const diplomacy = next.diplomacy[playerId]?.[tile.ownerId];
                                        const isCity = next.cities.some(c => hexEquals(c.coord, n));
                                        if (!isCity && diplomacy !== "War") continue;
                                    }

                                    // Check for friendly military on target tile (Stacking Limit)
                                    const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, n));
                                    const friendlyMilitary = unitsOnTarget.some(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");
                                    if (friendlyMilitary) continue;

                                    const altAttempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: n });
                                    if (altAttempt !== next) {
                                        next = altAttempt;
                                        moved = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (!moved) break;
        }
    }
    return next;
}
