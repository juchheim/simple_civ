import { aiLog, aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType, UnitState, Unit } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { nearestByDistance } from "../shared/metrics.js";
import { findPath } from "../../helpers/pathfinding.js";
import { repositionRanged } from "./defense.js";
import { captureIfPossible } from "./siege-routing.js";
import { coordinateGroupAttack, identifyBattleGroups } from "./battle-groups.js";
export { routeCityCaptures, routeCaptureUnitsToActiveSieges } from "./siege-routing.js";
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
    warGarrisonCap,
    isAttackSafe,
    shouldRetreatAfterAttacking,
    isMeleeAttackExposed,
    hasMilitaryAdvantage,
    findSafeRetreatTile,
    evaluateTileDanger,
    getNearbyThreats
} from "./unit-helpers.js";

function coordinateBattleGroups(state: GameState, playerId: string): GameState {
    let next = state;
    const battleGroups = identifyBattleGroups(next, playerId);
    for (const group of battleGroups) {
        if (group.units.length >= 2) {
            next = coordinateGroupAttack(next, playerId, group);
        }
    }
    return next;
}

function getAttackingUnits(state: GameState, playerId: string) {
    return state.units.filter(u => {
        if (u.ownerId !== playerId || u.type === UnitType.Settler || isScoutType(u.type) || u.state === UnitState.Garrisoned) return false;
        const city = state.cities.find(c => hexEquals(c.coord, u.coord));
        if (city && city.ownerId === playerId) return false;
        return true;
    });
}

function tryCityAttacks(
    state: GameState,
    playerId: string,
    unit: Unit,
    warCities: GameState["cities"],
    primaryCity: GameState["cities"][number] | null
): { state: GameState; acted: boolean } {
    let next = state;
    const stats = UNITS[unit.type];
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

    for (const { city, dmg } of cityTargets) {
        const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: city.id, targetType: "City" });
        if (attacked !== next) {
            aiInfo(`[AI ATTACK CITY] ${playerId} attacks ${city.name} (${city.ownerId}) with ${unit.type}, dealing ${dmg} damage (HP: ${city.hp}→${city.hp - dmg})`);
            next = attacked;
            next = captureIfPossible(next, playerId, unit.id);
            return { state: next, acted: true };
        }
    }

    return { state: next, acted: false };
}

function getWarEnemyIds(state: GameState, playerId: string): string[] {
    return state.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);
}

function getEnemyTargets(next: GameState, unit: any, warEnemyIds: string[]) {
    const stats = UNITS[unit.type];
    return next.units
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

            if (a.dmg !== b.dmg) return b.dmg - a.dmg;

            if (a.isSettler !== b.isSettler) return a.isSettler ? 1 : -1;
            if (a.d !== b.d) return a.d - b.d;
            return a.u.hp - b.u.hp;
        });
}

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

function handlePostAttackRetreat(next: GameState, playerId: string, unitId: string): GameState {
    const liveUnit = next.units.find(u => u.id === unitId);
    if (!liveUnit || liveUnit.movesLeft <= 0) return next;
    if (!shouldRetreatAfterAttacking(liveUnit, next, playerId)) return next;

    const friendlyCities = next.cities.filter(c => c.ownerId === playerId);
    const nearestCity = friendlyCities.length > 0
        ? friendlyCities.sort((a, b) => hexDistance(a.coord, liveUnit.coord) - hexDistance(b.coord, liveUnit.coord))[0]
        : null;
    if (!nearestCity) return next;

    const safeTile = findSafeRetreatTile(next, playerId, liveUnit, nearestCity.coord);
    if (!safeTile) return next;

    const retreated = tryAction(next, { type: "MoveUnit", playerId, unitId: liveUnit.id, to: safeTile });
    if (retreated !== next) {
        aiInfo(`[AI POST-ATTACK RETREAT] ${playerId} ${liveUnit.type} retreating after attack (exposed to multiple threats)`);
        return retreated;
    }

    return next;
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

function handleUnsafeAttack(
    next: GameState,
    playerId: string,
    unit: any,
    attackSafety: { safe: boolean; riskLevel: "low" | "medium" | "high" | "suicidal"; reason: string }
): GameState {
    aiInfo(`[AI SKIP UNSAFE ATTACK] ${playerId} ${unit.type} skipping attack: ${attackSafety.reason}`);

    const inFriendlyCity = next.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, unit.coord));

    if (!inFriendlyCity && (attackSafety.riskLevel === "high" || attackSafety.riskLevel === "suicidal")) {
        const friendlyCities = next.cities.filter(c => c.ownerId === playerId);
        const nearestCity = friendlyCities.length > 0
            ? friendlyCities.sort((a, b) => hexDistance(a.coord, unit.coord) - hexDistance(b.coord, unit.coord))[0]
            : null;
        if (nearestCity && unit.movesLeft > 0) {
            const safeTile = findSafeRetreatTile(next, playerId, unit, nearestCity.coord);
            if (safeTile) {
                const retreated = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: safeTile });
                if (retreated !== next) {
                    aiInfo(`[AI PROACTIVE RETREAT] ${playerId} ${unit.type} retreating from dangerous position`);
                    return retreated;
                }
            }
        }
    }

    return next;
}

export function attackTargets(state: GameState, playerId: string): GameState {
    let next = coordinateBattleGroups(state, playerId);

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
                    UNITS[u.type].domain !== "Civilian"
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
                // v1.1: Titan Deathball Override
                // If Titan exists, rally to it!
                if (titan && current.id !== titan.id) {
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
