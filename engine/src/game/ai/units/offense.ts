import { aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType } from "../../../core/types.js";
import { UNITS, TERRAIN } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { nearestByDistance } from "../shared/metrics.js";
import { findPath } from "../../helpers/pathfinding.js";
import { repositionRanged } from "./defense.js";
import { captureIfPossible } from "./siege-routing.js";
// Battle-group execution removed - handled by unified tactical planner (v1.0.3)
import { tryCityAttacks, trebuchetSiegeAttacks } from "./offense-city-attacks.js";
import { handlePostAttackRetreat, handleUnsafeAttack } from "./offense-retreat.js";
import { getAttackingUnits, getEnemyTargets, getWarEnemyIds } from "./offense-targeting.js";
import {
    cityIsCoastal,
    expectedDamageFrom,
    expectedDamageToUnit,
    enemiesWithin,
    getWarTargets,
    isScoutType,
    shouldUseWarProsecutionMode,
    selectHeldGarrisons,
    selectPrimarySiegeCity,
    warGarrisonCap,
    isAttackSafe,
    evaluateTileDanger,
    getNearbyThreats
} from "./unit-helpers.js";

export { routeCityCaptures, routeCaptureUnitsToActiveSieges } from "./siege-routing.js";

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

export function moveMilitaryTowardTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const warTargets = getWarTargets(next, playerId);
    if (!warTargets.length) return next;

    const isInWarProsecutionMode = shouldUseWarProsecutionMode(next, playerId, warTargets);
    const targetCities = next.cities
        .filter(c => warTargets.some(w => w.id === c.ownerId))
        .sort((a, b) => a.hp - b.hp);
    // v2.2: Titan is excluded - it has dedicated logic in titanRampage
    const armyUnits = next.units.filter(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian" && !isScoutType(u.type) && u.type !== UnitType.Titan);
    const garrisonCap = warGarrisonCap(next, playerId, isInWarProsecutionMode);
    const heldGarrisons = selectHeldGarrisons(next, playerId, warTargets, garrisonCap);

    const unitCounts = armyUnits.reduce((acc, u) => {
        acc[u.type] = (acc[u.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    if (targetCities.some(c => c.hp <= 0)) {
        aiInfo(`[AI SIEGE DEBUG] ${playerId} has units: ${JSON.stringify(unitCounts)}. Targets with <=0 HP: ${targetCities.filter(c => c.hp <= 0).map(c => c.name).join(", ")}`);
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
                // Always keep units in cities if:
                // 1. Unit is in heldGarrisons set (prioritized for defense)
                // 2. City is the capital (must always have a defender if possible)
                // 3. No other garrison exists for this city (don't leave cities empty)
                if (heldGarrisons.has(current.id)) break;
                if (friendlyCity.isCapital) break;
                const otherGarrison = next.units.find(u =>
                    u.id !== current.id &&
                    u.ownerId === playerId &&
                    hexEquals(u.coord, friendlyCity.coord) &&
                    UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Titan
                );
                if (!otherGarrison) break;  // Don't leave city ungarrisoned
            }

            const unitTargets = UNITS[current.type].domain === "Naval"
                ? targetCities.filter(c => cityIsCoastal(next, c))
                : targetCities;

            let nearest: any = null;
            if (UNITS[current.type].canCaptureCity) {
                const capturable = unitTargets.filter(c => c.hp <= 0);
                if (capturable.length > 0) {
                    nearest = nearestByDistance(current.coord, capturable, city => city.coord);
                    aiInfo(`[AI CAPTURE MOVE] ${playerId} ${current.type} moving to capture ${nearest.name} (HP ${nearest.hp})`);
                }
            }

            if (!nearest) {
                // v1.0.4: Trebuchet-Titan Synergy
                // Trebuchets can't keep up with Titan (move 1 vs move 3)
                // Instead of following Titan, go directly to Titan's target city
                if (titan && current.type === UnitType.Trebuchet && primaryCity) {
                    nearest = primaryCity;
                    aiInfo(`[AI TREBUCHET TITAN] ${playerId} Trebuchet moving to Titan's target ${primaryCity.name}`);
                }
                // v1.1: Titan Deathball Override
                // If Titan exists, rally to it!
                else if (titan && current.id !== titan.id) {
                    const distToTitan = hexDistance(current.coord, titan.coord);

                    // If we are far from Titan (> 3 tiles), move to Titan
                    if (distToTitan > 3) {
                        nearest = { coord: titan.coord, name: "The Titan" };
                        aiInfo(`[AI DEATHBALL] ${playerId} ${current.type} rallying to Titan (dist ${distToTitan})`);
                    } else {
                        // We are near Titan. Move to Titan's target (if any) or just stick with it.
                        // If we have a primary city (Titan's likely target), go there.
                        // If not, stick to Titan.
                        if (primaryCity) {
                            nearest = primaryCity;
                            // aiInfo(`[AI DEATHBALL] ${playerId} ${current.type} supporting Titan against ${primaryCity.name}`);
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
                    hexDistance(u.coord, nearest.coord) <= 5
                ).length;

                // --- GROUPING LOGIC (v1.0) ---
                // If we are getting close (dist <= 5) but don't have enough support, WAIT.
                // This applies to both Ranged and Melee to form a "Deathball".
                // Distance 5 is the "Staging Area" (safe from most counter-attacks).
                // Riders (Move 2) moving from 4 -> 2 are in danger. Waiting at 5 allows everyone to group up.
                if (currentDist <= 5 && friendliesNearTarget < requiredSiegeGroup) {
                    // Exception: If the city is weak (HP < 50%), charge anyway
                    if (nearest.hp > nearest.maxHp * 0.5) {
                        aiInfo(`[AI GROUPING] ${playerId} ${current.type} waiting for reinforcements at dist ${currentDist} (${friendliesNearTarget}/${requiredSiegeGroup})`);
                        moved = true; // "Moved" means we took an action (waiting), so stop loop
                    }
                }
                // -----------------------------

                // --- v1.0.4: TREBUCHET SIEGE POSITIONING ---
                // Goal: Stay at range 2 from city, behind friendly melee units.
                // Key changes from v1.0.3:
                // - Only waits if enemies exist AND no melee protection
                // - Advances when has melee escort
                // - Holds at range 2 (optimal firing position)
                if (!moved && current.type === UnitType.Trebuchet) {
                    const warEnemyIds = warTargets.map(p => p.id);

                    // Count friendlies between Trebuchet and city (protection check)
                    const friendlyMeleeBetween = armyUnits.filter(u =>
                        u.id !== current.id &&
                        UNITS[u.type].rng === 1 && // Melee only
                        hexDistance(u.coord, nearest.coord) < currentDist // Closer to city than us
                    ).length;

                    // Optimal position: range 2 from city with melee in front
                    const inFiringRange = currentDist <= 2;
                    const hasProtection = friendlyMeleeBetween >= 1;

                    // Danger check: enemies within 2 tiles of Trebuchet
                    const enemiesNearTrebuchet = next.units.filter(u =>
                        warEnemyIds.includes(u.ownerId) &&
                        UNITS[u.type].domain !== "Civilian" &&
                        hexDistance(u.coord, current.coord) <= 2
                    ).length;

                    // RETREAT if enemies closing in and no protection
                    if (enemiesNearTrebuchet > 0 && !hasProtection && current.movesLeft > 0) {
                        // Find safe retreat tile (away from enemies, toward friendlies)
                        const retreatNeighbors = getNeighbors(current.coord)
                            .filter(n => {
                                const tile = next.map.tiles.find(t => hexEquals(t.coord, n));
                                if (!tile || !TERRAIN[tile.terrain].moveCostLand) return false;
                                const hasUnit = next.units.some(u => hexEquals(u.coord, n) && UNITS[u.type].domain !== "Civilian");
                                if (hasUnit) return false;
                                const closestEnemy = next.units
                                    .filter(u => warEnemyIds.includes(u.ownerId) && UNITS[u.type].domain !== "Civilian")
                                    .reduce((min, u) => Math.min(min, hexDistance(u.coord, n)), Infinity);
                                const currentClosest = next.units
                                    .filter(u => warEnemyIds.includes(u.ownerId) && UNITS[u.type].domain !== "Civilian")
                                    .reduce((min, u) => Math.min(min, hexDistance(u.coord, current.coord)), Infinity);
                                return closestEnemy > currentClosest;
                            })
                            .sort((a, b) => {
                                const aFriendly = armyUnits.filter(u => u.id !== current.id).reduce((min, u) => Math.min(min, hexDistance(u.coord, a)), Infinity);
                                const bFriendly = armyUnits.filter(u => u.id !== current.id).reduce((min, u) => Math.min(min, hexDistance(u.coord, b)), Infinity);
                                return aFriendly - bFriendly;
                            });

                        if (retreatNeighbors.length > 0) {
                            const retreatTile = retreatNeighbors[0];
                            const retreated = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: retreatTile });
                            if (retreated !== next) {
                                aiInfo(`[AI TREBUCHET RETREAT] ${playerId} Trebuchet retreating from ${enemiesNearTrebuchet} enemies (no melee protection)`);
                                next = retreated;
                                moved = true;
                            }
                        }
                    }

                    // Count enemy units near the target city
                    const enemyUnitsNearCity = next.units.filter(u =>
                        warEnemyIds.includes(u.ownerId) &&
                        UNITS[u.type].domain !== "Civilian" &&
                        u.type !== UnitType.Scout &&
                        hexDistance(u.coord, nearest.coord) <= 3
                    ).length;

                    // HOLD at firing range - this is where we want to be
                    if (!moved && inFiringRange) {
                        aiInfo(`[AI TREBUCHET POSITION] ${playerId} Trebuchet holding at firing range ${currentDist} (melee escorts: ${friendlyMeleeBetween})`);
                        moved = true;
                    }

                    // ADVANCE if: has melee protection OR no enemies near city
                    if (!moved && (hasProtection || enemyUnitsNearCity === 0)) {
                        // Allow normal movement - don't block
                        moved = false;
                    }
                    // WAIT for escort - only block if close enough that advancing would be dangerous
                    else if (!moved && !hasProtection && enemyUnitsNearCity > 0 && currentDist <= 4) {
                        aiInfo(`[AI TREBUCHET WAIT] ${playerId} Trebuchet waiting for melee escort at dist ${currentDist} (escorts: ${friendlyMeleeBetween}, enemies: ${enemyUnitsNearCity})`);
                        moved = true;
                    }
                    // If currentDist > 4 and no protection, allow normal approach (safe distance)
                }
                // -----------------------------

                if (!moved) {
                    // If we are at range, check if we should hold for reinforcements
                    if (rangedIds.has(current.id) && currentDist <= desiredRange && currentDist >= 2) {
                        if (friendliesNearTarget >= requiredSiegeGroup) {
                            // We have enough support, hold position and bombard (handled by attackTargets)
                            // But if we are too far (e.g. range 3 unit at range 3), we might want to move to range 2 for better visibility?
                            // For now, hold at max range is safe.
                            aiInfo(`[AI SIEGE] ${playerId} ${current.type} holding at range ${currentDist} from ${nearest.name} (Supported by ${friendliesNearTarget} units)`);
                            moved = true;
                        } else {
                            // We are at range but lack support. 
                            // If we wait here, we might get picked off.
                            // But moving closer is worse.
                            // Moving back?
                            // For now, just wait, but log it.
                            aiInfo(`[AI SIEGE] ${playerId} ${current.type} at range ${currentDist} from ${nearest.name}, waiting for group (${friendliesNearTarget}/${requiredSiegeGroup} units)`);
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
                                    // --- RANGED THREAT AWARENESS (v4.0) ---
                                    // Before stepping, check if this puts us in enemy ranged attack range
                                    // If so, try to find a safer alternative path
                                    const stepDanger = evaluateTileDanger(next, playerId, step);
                                    const currentDanger = evaluateTileDanger(next, playerId, current.coord);

                                    // Check specifically for ranged threats at the step location
                                    const rangedThreatsAtStep = getNearbyThreats(next, playerId, step, 3)
                                        .filter(t => {
                                            const tRng = UNITS[t.unit.type as UnitType].rng;
                                            return tRng > 1 && t.distance <= tRng;
                                        });

                                    // Count friendlies nearby for support check
                                    const friendliesNear = armyUnits.filter(u =>
                                        u.id !== current.id && hexDistance(u.coord, step) <= 2
                                    ).length;

                                    // If stepping into ranged danger and we're alone, look for safer path
                                    let shouldTakeSaferPath = false;
                                    if (rangedThreatsAtStep.length > 0 && friendliesNear < 2 && stepDanger > currentDanger + 3) {
                                        // Find alternative neighbors that avoid ranged fire but still make progress
                                        const saferNeighbors = getNeighbors(current.coord)
                                            .filter(n => {
                                                const nDist = hexDistance(n, nearest.coord);
                                                if (nDist >= currentDist) return false; // Must make progress

                                                const nDanger = evaluateTileDanger(next, playerId, n);
                                                if (nDanger >= stepDanger - 2) return false; // Must be meaningfully safer

                                                // Check passability
                                                const nTile = next.map.tiles.find(t => hexEquals(t.coord, n));
                                                if (!nTile) return false;
                                                if (nTile.ownerId && nTile.ownerId !== playerId) {
                                                    const diplomacy = next.diplomacy[playerId]?.[nTile.ownerId];
                                                    const isCity = next.cities.some(c => hexEquals(c.coord, n));
                                                    if (!isCity && diplomacy !== DiplomacyState.War) return false;
                                                }

                                                // Check stacking
                                                const nUnits = next.units.filter(u => hexEquals(u.coord, n));
                                                const nFriendlyMil = nUnits.some(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");
                                                if (nFriendlyMil) return false;

                                                return true;
                                            })
                                            .sort((a, b) => {
                                                // Prefer: 1) lower danger, 2) closer to target
                                                const aDanger = evaluateTileDanger(next, playerId, a);
                                                const bDanger = evaluateTileDanger(next, playerId, b);
                                                if (aDanger !== bDanger) return aDanger - bDanger;
                                                return hexDistance(a, nearest.coord) - hexDistance(b, nearest.coord);
                                            });

                                        if (saferNeighbors.length > 0) {
                                            // Use the safer path instead
                                            const saferStep = saferNeighbors[0];
                                            const saferAttempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: saferStep });
                                            if (saferAttempt !== next) {
                                                aiInfo(`[AI RANGED AVOIDANCE] ${playerId} ${current.type} avoiding ranged fire, taking safer path`);
                                                next = saferAttempt;
                                                moved = true;
                                                shouldTakeSaferPath = true;
                                            }
                                        }
                                    }

                                    if (!shouldTakeSaferPath) {
                                        const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: step });
                                        if (attempt !== next) {
                                            next = attempt;
                                            moved = true;
                                        }
                                    }
                                }
                            }

                            if (!moved) {
                                // Try neighbors - also with ranged threat awareness
                                const neighbors = getNeighbors(current.coord);

                                // --- RANGED THREAT AWARE SORTING ---
                                // Sort by danger first, then distance to target
                                const orderedByDangerAndDist = neighbors
                                    .map(n => ({
                                        coord: n,
                                        dist: hexDistance(n, nearest.coord),
                                        danger: evaluateTileDanger(next, playerId, n)
                                    }))
                                    .filter(n => n.dist <= currentDist) // Only candidates that make progress or hold
                                    .sort((a, b) => {
                                        // Prefer lower danger tiles that still make progress
                                        const dangerDiff = a.danger - b.danger;
                                        if (Math.abs(dangerDiff) > 3) return dangerDiff; // Big danger diff takes priority
                                        return a.dist - b.dist; // Otherwise prefer closer to target
                                    });

                                for (const candidate of orderedByDangerAndDist) {
                                    const n = candidate.coord;
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

/**
 * Move military units toward a target native camp during camp clearing phases.
 * Called when player has active campClearingPrep in Gathering, Positioning, or Ready state.
 */
export function moveUnitsForCampClearing(state: GameState, playerId: string): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player?.campClearingPrep) return next;

    const phase = player.campClearingPrep.state;
    // Only move during Gathering, Positioning, or Ready phases
    if (phase !== "Gathering" && phase !== "Positioning" && phase !== "Ready") return next;

    const targetCamp = next.nativeCamps.find(c => c.id === player.campClearingPrep!.targetCampId);
    if (!targetCamp) return next;

    // v1.1: Build set of city coordinates for garrison protection
    const myCityCoords = new Set(
        next.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`)
    );

    // Get military units that can move toward camp (excluding garrisoned units)
    const units = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Titan &&
        !myCityCoords.has(`${u.coord.q},${u.coord.r}`) // Don't pull garrisoned units
    );

    aiInfo(`[AI CAMP MOVE] ${playerId} moving ${units.length} units toward camp (${phase} phase)`);

    for (const unit of units) {
        const current = next.units.find(u => u.id === unit.id);
        if (!current || current.movesLeft <= 0) continue;

        const distToCamp = hexDistance(current.coord, targetCamp.coord);

        // If already at camp, done
        if (distToCamp === 0) continue;

        // During Ready phase, don't move if we're in attack range
        if (phase === "Ready") {
            const unitRange = UNITS[current.type].rng;
            if (distToCamp <= unitRange) {
                aiInfo(`[AI CAMP ATTACK] ${playerId} ${current.type} in range of camp (${distToCamp} tiles)`);
                continue;
            }
        }

        // Find path to camp
        const path = findPath(current.coord, targetCamp.coord, current, next);
        if (path.length === 0) continue;

        const step = path[0];

        // Check for friendly military on target tile (Stacking Limit)
        const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, step));
        const friendlyMilitary = unitsOnTarget.some(u =>
            u.ownerId === playerId && UNITS[u.type].domain !== "Civilian"
        );
        if (friendlyMilitary) continue;

        const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: step });
        if (moved !== next) {
            next = moved;
            aiInfo(`[AI CAMP MOVE] ${playerId} ${current.type} moving toward camp (dist ${distToCamp}→${distToCamp - 1})`);
        }
    }

    return next;
}

/**
 * Attack native camp units. Called during Ready phase.
 * Prioritizes: archers before champion, lowest HP first, only attacks if worthwhile.
 */
export function attackCampTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player?.campClearingPrep || player.campClearingPrep.state !== "Ready") return next;

    const targetCamp = next.nativeCamps.find(c => c.id === player.campClearingPrep!.targetCampId);
    if (!targetCamp) return next;

    // Get native units for this camp, sorted by priority
    const nativeUnits = next.units
        .filter(u => u.campId === targetCamp.id)
        .sort((a, b) => {
            // Archers before Champion
            if (a.type === UnitType.NativeChampion && b.type !== UnitType.NativeChampion) return 1;
            if (a.type !== UnitType.NativeChampion && b.type === UnitType.NativeChampion) return -1;
            // Lowest HP first
            return a.hp - b.hp;
        });

    if (nativeUnits.length === 0) {
        // Camp cleared! Remove prep
        aiInfo(`[AI CAMP] ${playerId} camp ${targetCamp.id} cleared!`);
        return {
            ...next,
            players: next.players.map(p =>
                p.id === playerId ? { ...p, campClearingPrep: undefined } : p
            )
        };
    }

    // Get our military units that can attack
    const attackers = next.units.filter(u =>
        u.ownerId === playerId &&
        !u.hasAttacked &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Titan
    );

    for (const attacker of attackers) {
        const current = next.units.find(u => u.id === attacker.id);
        if (!current || current.hasAttacked) continue;

        const stats = UNITS[current.type];

        // Find targets in range
        const targets = nativeUnits
            .filter(native => {
                const updatedNative = next.units.find(u => u.id === native.id);
                if (!updatedNative) return false;
                return hexDistance(current.coord, updatedNative.coord) <= stats.rng;
            })
            .map(native => {
                const updatedNative = next.units.find(u => u.id === native.id)!;
                return {
                    unit: updatedNative,
                    dmg: expectedDamageToUnit(current, updatedNative, next),
                    counter: expectedDamageFrom(updatedNative, current, next)
                };
            });

        if (targets.length === 0) continue;

        // Pick best target (lowest HP first, prefer kills)
        const bestTarget = targets
            .sort((a, b) => {
                const aKills = a.dmg >= a.unit.hp ? 0 : 1;
                const bKills = b.dmg >= b.unit.hp ? 0 : 1;
                if (aKills !== bKills) return aKills - bKills;
                return a.unit.hp - b.unit.hp;
            })[0];

        // Check if attack is worthwhile: survive OR kill
        const wouldSurvive = current.hp > bestTarget.counter;
        const wouldKill = bestTarget.dmg >= bestTarget.unit.hp;

        if (!wouldSurvive && !wouldKill) {
            aiInfo(`[AI CAMP SKIP] ${playerId} ${current.type} skipping attack (would die without killing)`);
            continue;
        }

        // Attack!
        const attacked = tryAction(next, {
            type: "Attack",
            playerId,
            attackerId: current.id,
            targetId: bestTarget.unit.id,
            targetType: "Unit"
        });

        if (attacked !== next) {
            aiInfo(`[AI CAMP ATTACK] ${playerId} ${current.type} attacks ${bestTarget.unit.type} (${bestTarget.dmg} dmg, HP: ${bestTarget.unit.hp})`);
            next = attacked;
        }
    }

    return next;
}
