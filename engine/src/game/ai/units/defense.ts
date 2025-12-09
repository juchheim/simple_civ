import { aiLog, aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { nearestByDistance, sortByDistance } from "../shared/metrics.js";
import {
    enemiesWithin,
    friendlyAdjacencyCount,
    getWarTargets,
    isAtWar,
    isScoutType,
    shouldUseWarProsecutionMode,
    stepToward,
    tileDefenseScore,
    warGarrisonCap,
    getThreatLevel,
    getBestSkirmishPosition,
    findSafeRetreatTile,
    shouldRetreat
} from "./unit-helpers.js";

export function defendCities(state: GameState, playerId: string): GameState {
    let next = state;
    const playerCities = next.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return next;

    const warTargets = getWarTargets(next, playerId);
    const warEnemyIds = warTargets.map(p => p.id);
    const isInWarProsecutionMode = shouldUseWarProsecutionMode(next, playerId, warTargets);
    const garrisonCap = warEnemyIds.length ? warGarrisonCap(next, playerId, isInWarProsecutionMode) : playerCities.length;
    const garrisonedCities = new Set(
        playerCities
            .filter(c => next.units.some(u => u.ownerId === playerId && hexEquals(u.coord, c.coord)))
            .map(c => c.id)
    );
    let availableGarrisonSlots = warEnemyIds.length ? Math.max(0, garrisonCap - garrisonedCities.size) : playerCities.length;

    const reserved = new Set<string>();

    // --- CAPITAL DEFENSE PROTOCOL (v1.0) ---
    const capital = playerCities.find(c => c.isCapital);
    if (capital) {
        const threat = getThreatLevel(next, capital, playerId);
        if (threat === "critical" || threat === "high") {
            const defendersNeeded = threat === "critical" ? 3 : 1;
            const defendersNearby = next.units.filter(u =>
                u.ownerId === playerId &&
                hexDistance(u.coord, capital.coord) <= 3 &&
                UNITS[u.type].domain !== "Civilian"
            );

            if (defendersNearby.length < defendersNeeded) {
                // Pull units from further away
                const available = next.units.filter(u =>
                    u.ownerId === playerId &&
                    u.movesLeft > 0 &&
                    !reserved.has(u.id) &&
                    UNITS[u.type].domain !== "Civilian" &&
                    !isScoutType(u.type)
                );

                // Sort by distance to capital
                const reinforcements = sortByDistance(capital.coord, available, u => u.coord);

                for (const unit of reinforcements) {
                    if (defendersNearby.length + reserved.size >= defendersNeeded) break;

                    // Move towards capital
                    const moved = stepToward(next, playerId, unit.id, capital.coord);
                    if (moved !== next) {
                        next = moved;
                        reserved.add(unit.id);
                    }
                }
            }
        }
    }
    // ---------------------------------------

    for (const city of playerCities) {
        const hasGarrison = next.units.some(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
        const available = next.units.filter(u =>
            u.ownerId === playerId &&
            u.movesLeft > 0 &&
            !reserved.has(u.id) &&
            u.type !== UnitType.Settler &&
            !isScoutType(u.type)
        );
        const nearbyWarEnemies = warEnemyIds.length
            ? next.units.filter(u => warEnemyIds.includes(u.ownerId) && hexDistance(u.coord, city.coord) <= 3)
            : [];
        const isThreatened = nearbyWarEnemies.length > 0;

        if (!hasGarrison) {
            if (warEnemyIds.length && !city.isCapital && !isThreatened && availableGarrisonSlots <= 0) continue;
            const combatReady = available.filter(u => UNITS[u.type].domain !== "Civilian");
            const pool = combatReady.length ? combatReady : available;
            const adjacent = pool.find(u => hexDistance(u.coord, city.coord) === 1);
            if (adjacent) {
                const movedDirect = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: adjacent.id,
                    to: city.coord
                });
                if (movedDirect !== next) {
                    next = movedDirect;
                    reserved.add(adjacent.id);
                    const garrisonedNow = next.units.some(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
                    if (garrisonedNow && warEnemyIds.length && !garrisonedCities.has(city.id)) {
                        garrisonedCities.add(city.id);
                        availableGarrisonSlots = Math.max(0, availableGarrisonSlots - 1);
                    }
                }
            }
            if (next.units.some(u => u.ownerId === playerId && hexEquals(u.coord, city.coord))) continue;

            const candidate = nearestByDistance(city.coord, pool, u => u.coord);
            if (candidate) {
                const moved = stepToward(next, playerId, candidate.id, city.coord);
                if (moved !== next) {
                    next = moved;
                    reserved.add(candidate.id);
                } else if (hexDistance(candidate.coord, city.coord) === 1) {
                    const direct = tryAction(next, {
                        type: "MoveUnit",
                        playerId,
                        unitId: candidate.id,
                        to: city.coord
                    });
                    if (direct !== next) {
                        next = direct;
                        reserved.add(candidate.id);
                        const garrisonedNow = next.units.some(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
                        if (garrisonedNow && warEnemyIds.length && !garrisonedCities.has(city.id)) {
                            garrisonedCities.add(city.id);
                            availableGarrisonSlots = Math.max(0, availableGarrisonSlots - 1);
                        }
                    }
                }
                const garrisonedNow = next.units.some(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
                if (garrisonedNow && warEnemyIds.length && !garrisonedCities.has(city.id)) {
                    garrisonedCities.add(city.id);
                    availableGarrisonSlots = Math.max(0, availableGarrisonSlots - 1);
                }
            }
        }

        if (!warEnemyIds.length) continue;

        if (!nearbyWarEnemies.length) continue;

        const defendersInRing = next.units.filter(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            !isScoutType(u.type) &&
            hexDistance(u.coord, city.coord) <= 2
        );
        if (defendersInRing.length > 0) continue;

        const remaining = next.units.filter(u =>
            u.ownerId === playerId &&
            u.movesLeft > 0 &&
            !reserved.has(u.id) &&
            UNITS[u.type].domain !== "Civilian" &&
            !isScoutType(u.type)
        );
        if (!remaining.length) continue;

        const targetEnemy = nearestByDistance(city.coord, nearbyWarEnemies, u => u.coord);
        const interceptSpots = getNeighbors(city.coord);
        const orderedSpots = sortByDistance(targetEnemy?.coord ?? city.coord, interceptSpots, coord => coord);

        const defender = nearestByDistance(city.coord, remaining, u => u.coord);
        if (defender) {
            for (const spot of orderedSpots) {
                const moved = stepToward(next, playerId, defender.id, spot);
                if (moved !== next) {
                    next = moved;
                    reserved.add(defender.id);
                    break;
                }
            }
        }
    }

    return next;
}

export function rotateGarrisons(state: GameState, playerId: string): GameState {
    if (!isAtWar(state, playerId)) return state;
    let next = state;
    const playerCities = next.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return next;

    const warEnemyIds = next.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);
    const enemyUnits = next.units.filter(u => warEnemyIds.includes(u.ownerId));

    const reserved = new Set<string>();

    for (const city of playerCities) {
        const garrison = next.units.find(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
        if (!garrison) continue;
        if (garrison.hp > 4) continue;
        if (garrison.movesLeft <= 0) continue;

        const candidates = next.units.filter(u =>
            u.ownerId === playerId &&
            u.id !== garrison.id &&
            !reserved.has(u.id) &&
            UNITS[u.type].domain !== "Civilian" &&
            !isScoutType(u.type) &&
            u.movesLeft > 0 &&
            u.hp > garrison.hp &&
            hexDistance(u.coord, city.coord) === 1
        );
        if (candidates.length === 0) {
            const ring2 = next.units.filter(u =>
                u.ownerId === playerId &&
                u.id !== garrison.id &&
                !reserved.has(u.id) &&
                UNITS[u.type].domain !== "Civilian" &&
                u.movesLeft > 0 &&
                u.hp > garrison.hp &&
                hexDistance(u.coord, city.coord) === 2
            );
            if (ring2.length) {
                const bringer = ring2.sort((a, b) => b.hp - a.hp)[0];
                const engaged = enemiesWithin(next, playerId, bringer.coord, 2) > 0;
                if (!engaged) {
                    next = stepToward(next, playerId, bringer.id, city.coord);
                }
                continue;
            }

            const ring3 = next.units.filter(u =>
                u.ownerId === playerId &&
                u.id !== garrison.id &&
                !reserved.has(u.id) &&
                UNITS[u.type].domain !== "Civilian" &&
                u.movesLeft > 0 &&
                u.hp > garrison.hp &&
                hexDistance(u.coord, city.coord) === 3
            );
            if (ring3.length) {
                const bringer = ring3.sort((a, b) => b.hp - a.hp)[0];
                const engaged3 = enemiesWithin(next, playerId, bringer.coord, 2) > 0;
                if (!engaged3) {
                    next = stepToward(next, playerId, bringer.id, city.coord);
                }
            }
            continue;
        }

        const replacement = candidates.sort((a, b) => b.hp - a.hp)[0];

        const neighbors = getNeighbors(city.coord)
            .map(coord => {
                const occupant = next.units.find(u => hexEquals(u.coord, coord));
                const enemyDist = enemyUnits.length
                    ? Math.min(...enemyUnits.map(e => hexDistance(e.coord, coord)))
                    : Number.POSITIVE_INFINITY;
                return { coord, occupant, enemyDist };
            })
            .filter(n => !n.occupant || n.occupant.id === garrison.id)
            .sort((a, b) => {
                if (a.enemyDist !== b.enemyDist) return b.enemyDist - a.enemyDist;
                const aTile = next.map.tiles.find(t => hexEquals(t.coord, a.coord));
                const bTile = next.map.tiles.find(t => hexEquals(t.coord, b.coord));
                const aFriendly = aTile?.ownerId === playerId ? 1 : 0;
                const bFriendly = bTile?.ownerId === playerId ? 1 : 0;
                if (aFriendly !== bFriendly) return bFriendly - aFriendly;
                return 0;
            });

        let swapped = false;
        for (const neighbor of neighbors) {
            const movedOut = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: garrison.id,
                to: neighbor.coord
            });
            if (movedOut === next) continue;
            next = movedOut;

            const liveReplacement = next.units.find(u => u.id === replacement.id);
            if (!liveReplacement) break;

            const movedIn = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: liveReplacement.id,
                to: city.coord
            });
            if (movedIn !== next) {
                next = movedIn;
                reserved.add(liveReplacement.id);
                swapped = true;
            }
            break;
        }

        if (swapped) continue;
    }

    return next;
}

export function retreatWounded(state: GameState, playerId: string): GameState {
    if (!isAtWar(state, playerId)) return state;
    let next = state;

    const friendlyCities = next.cities.filter(c => c.ownerId === playerId);
    if (!friendlyCities.length) return next;

    // v2.0: Use enhanced retreat logic with combat evaluation
    const units = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        UNITS[u.type].domain !== "Civilian"
    );

    for (const unit of units) {
        const onCity = friendlyCities.some(c => hexEquals(c.coord, unit.coord));
        if (onCity) continue;

        // Use smart retreat evaluation instead of just HP check
        const needsRetreat = shouldRetreat(unit, next, playerId);
        if (!needsRetreat) continue;

        const targetCity = nearestByDistance(unit.coord, friendlyCities, c => c.coord);
        if (!targetCity) continue;

        // v2.0: Use danger-aware pathfinding to avoid retreating into enemies
        const safeTile = findSafeRetreatTile(next, playerId, unit, targetCity.coord);
        if (safeTile) {
            const moved = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: unit.id,
                to: safeTile
            });
            if (moved !== next) {
                aiInfo(`[AI RETREAT] ${playerId} ${unit.type} retreating safely toward ${targetCity.name}`);
                next = moved;
            }
        } else {
            // No safe retreat - stay and fortify or try original stepToward as fallback
            aiInfo(`[AI RETREAT] ${playerId} ${unit.type} has no safe retreat, holding position`);
        }
    }

    return next;
}

export function repositionRanged(state: GameState, playerId: string): GameState {
    if (!isAtWar(state, playerId)) return state;
    let next = state;
    const rangedUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].rng > 1 &&
        u.movesLeft > 0
    );

    for (const unit of rangedUnits) {
        const enemyAdj = enemiesWithin(next, playerId, unit.coord, 1);
        if (enemyAdj > 0) {
            // --- SKIRMISH LOGIC (v1.0) ---
            // Find nearest enemy
            const enemies = next.units.filter(u => u.ownerId !== playerId);
            const nearestEnemy = nearestByDistance(unit.coord, enemies, u => u.coord);

            if (nearestEnemy) {
                const bestPos = getBestSkirmishPosition(unit, nearestEnemy, next, playerId);
                if (bestPos && !hexEquals(bestPos, unit.coord)) {
                    const prevState = next;
                    const moved = tryAction(next, {
                        type: "MoveUnit",
                        playerId,
                        unitId: unit.id,
                        to: bestPos
                    });
                    if (moved !== prevState) {
                        next = moved;
                        continue;
                    }
                }
            }
            // -----------------------------
        }

        const crowd = friendlyAdjacencyCount(next, playerId, unit.coord);
        if (enemyAdj === 0 && crowd <= 2) continue;

        const candidates = getNeighbors(unit.coord)
            .map(coord => ({
                coord,
                enemyDist: enemiesWithin(next, playerId, coord, 1),
                crowd: friendlyAdjacencyCount(next, playerId, coord),
                distToEnemies: (() => {
                    const enemies = next.units.filter(u => u.ownerId !== playerId);
                    if (!enemies.length) return Number.POSITIVE_INFINITY;
                    return Math.min(...enemies.map(u => hexDistance(u.coord, coord)));
                })(),
                defense: tileDefenseScore(next, coord)
            }))
            .filter(c => c.enemyDist === 0);

        candidates.sort((a, b) => {
            if (a.crowd !== b.crowd) return a.crowd - b.crowd;
            if (a.distToEnemies !== b.distToEnemies) return b.distToEnemies - a.distToEnemies;
            return b.defense - a.defense;
        });

        for (const cand of candidates) {
            const moved = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: unit.id,
                to: cand.coord
            });
            if (moved !== next) {
                next = moved;
                break;
            }
        }
    }

    return next;
}

// --- AID VULNERABLE UNITS (v2.0) ---

/**
 * Find allied units that are in danger and lacking support.
 * Returns units that would benefit from nearby reinforcement.
 */
function findVulnerableAllies(
    state: GameState,
    playerId: string
): Array<{ unit: any; threatCount: number; friendCount: number; priority: number }> {
    const myUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian"
    );

    const vulnerableAllies: Array<{ unit: any; threatCount: number; friendCount: number; priority: number }> = [];

    for (const unit of myUnits) {
        const threatCount = enemiesWithin(state, playerId, unit.coord, 2);
        if (threatCount === 0) continue; // No threat

        const friendCount = friendlyAdjacencyCount(state, playerId, unit.coord);

        // Unit is vulnerable if: outnumbered, low HP, or overwhelmed
        const hpPercent = unit.hp / unit.maxHp;
        const isOutnumbered = threatCount > friendCount + 1;
        const isLowHp = hpPercent < 0.5;
        const isOverwhelmed = threatCount >= 3 && friendCount <= 1;

        if (isOutnumbered || isLowHp || isOverwhelmed) {
            // Calculate priority: higher = more urgent
            const priority = (threatCount * 10) + ((1 - hpPercent) * 20) + (isOverwhelmed ? 15 : 0);

            vulnerableAllies.push({
                unit,
                threatCount,
                friendCount,
                priority
            });
        }
    }

    return vulnerableAllies.sort((a, b) => b.priority - a.priority);
}

/**
 * Move healthy units toward vulnerable allies to provide support.
 * Called after city defense, before attacks.
 */
export function aidVulnerableUnits(state: GameState, playerId: string): GameState {
    if (!isAtWar(state, playerId)) return state;
    let next = state;

    const vulnerableAllies = findVulnerableAllies(next, playerId);
    if (vulnerableAllies.length === 0) return next;

    // Find healthy units that can help
    const helpers = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        UNITS[u.type].domain !== "Civilian" &&
        !isScoutType(u.type) &&
        u.hp > 5 && // Must be healthy enough to help
        (u.hp / u.maxHp) > 0.6 // At least 60% HP
    );

    const assigned = new Set<string>();

    for (const { unit: victim, threatCount, friendCount } of vulnerableAllies) {
        // How many helpers does this victim need?
        const helpersNeeded = Math.max(1, threatCount - friendCount);
        let helpersAssigned = 0;

        // Find nearby helpers
        for (const helper of helpers) {
            if (assigned.has(helper.id)) continue;
            if (helper.id === victim.id) continue;

            const dist = hexDistance(helper.coord, victim.coord);

            // Only consider helpers within 4 tiles
            if (dist > 4) continue;

            // If already adjacent, no need to move
            if (dist <= 1) {
                helpersAssigned++;
                continue;
            }

            // Move helper toward victim
            const moved = stepToward(next, playerId, helper.id, victim.coord);
            if (moved !== next) {
                aiInfo(`[AI AID ALLY] ${playerId} ${helper.type} moving to help ${victim.type} (${threatCount} threats, ${friendCount} friends)`);
                next = moved;
                assigned.add(helper.id);
                helpersAssigned++;

                if (helpersAssigned >= helpersNeeded) break;
            }
        }
    }

    return next;
}
