import { aiLog, aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals, getNeighbors, hexToString } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType, City, HexCoord, Unit } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { findPath } from "../../helpers/pathfinding.js";

/**
 * Get war enemies for a player
 */
function getWarEnemies(state: GameState, playerId: string) {
    return state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

/**
 * Helper to find a path to ENGAGE a target (move to adjacent tile)
 * Used when direct path pathing fails (e.g. target is occupied unit/city)
 */
function findEngagementPath(start: HexCoord, target: HexCoord, unit: Unit, state: GameState): HexCoord[] | null {
    // 1. Try direct path first (best case)
    const directPath = findPath(start, target, unit, state);
    if (directPath && directPath.length > 0) return directPath;

    // 2. If direct path blocked/invalid, try pathing to any neighbor
    const neighbors = getNeighbors(target);
    // Sort neighbors by distance to me (try closest first)
    neighbors.sort((a, b) => hexDistance(a, start) - hexDistance(b, start));

    for (const n of neighbors) {
        // Skip if neighbor is same as start (we are already there)
        if (hexEquals(n, start)) return [];

        // Try pathing to neighbor
        // Note: findPath internally checks passability of 'n'
        const path = findPath(start, n, unit, state);
        if (path && path.length > 0) {
            return path;
        }
    }
    return null;
}

/**
 * Dynamic target selection - prioritizes NEAREST city for fast captures
 */
export function getNextTargetCity(state: GameState, playerId: string, titanCoord: { q: number; r: number }): City | null {
    let targets = getWarEnemies(state, playerId);

    // If no active wars, Titan acts as Vanguard: Target ANYONE (except self)
    if (targets.length === 0) {
        targets = state.players.filter(p => p.id !== playerId && !p.isEliminated);
    }

    if (targets.length === 0) return null; // Everyone dead?

    const enemyCities = state.cities
        .filter(c => targets.some(e => e.id === c.ownerId))
        .sort((a, b) => {
            // Priority 1: DISTANCE - attack nearest city first for fast captures
            const distA = hexDistance(titanCoord, a.coord);
            const distB = hexDistance(titanCoord, b.coord);
            if (distA !== distB) return distA - distB;
            // Priority 2: Lower HP (easier to capture)
            if (a.hp !== b.hp) return a.hp - b.hp;
            // Priority 3: Capitals (tie-breaker for conquest victory)
            if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
            // Priority 4: Stable ID Sort (prevent oscillation)
            return a.id.localeCompare(b.id);
        });

    if (enemyCities.length === 0) {
        // aiInfo(`[TITAN DEBUG] getNextTargetCity FAILED. Targets=${targets.length} (IDs: ${targets.map(t => t.id).join(',')}). TotalCities=${state.cities.length}. EnemyCities=0`);
    }

    return enemyCities[0] ?? null;
}

/**
 * Find nearest friendly city for healing
 */
function findNearestFriendlyCity(state: GameState, playerId: string, coord: { q: number; r: number }): City | null {
    const friendlyCities = state.cities.filter(c => c.ownerId === playerId);
    if (friendlyCities.length === 0) return null;

    return friendlyCities.reduce((nearest, city) => {
        const dist = hexDistance(coord, city.coord);
        const nearestDist = nearest ? hexDistance(coord, nearest.coord) : Infinity;
        return dist < nearestDist ? city : nearest;
    }, null as City | null);
}

export function titanRampage(state: GameState, playerId: string): GameState {
    let next = state;

    const titans = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Titan);
    if (titans.length === 0) return next;

    const player = next.players.find(p => p.id === playerId);
    if (!player) return next;

    for (const titan of titans) {
        let liveTitan = next.units.find(u => u.id === titan.id);
        if (!liveTitan) continue;

        const warEnemies = getWarEnemies(next, playerId);
        aiLog(`[TITAN LOG] Turn ${next.turn} | HP: ${liveTitan.hp}/${UNITS[UnitType.Titan].hp} | Moves: ${liveTitan.movesLeft} | At: (${liveTitan.coord.q},${liveTitan.coord.r}) | Wars: ${warEnemies.length} enemies`);

        let safety = 0;
        while (safety < 10 && liveTitan && liveTitan.movesLeft > 0) {
            safety++;

            // Calculate HP for retreat check only (no healing pause)
            const maxHp = UNITS[UnitType.Titan].hp;
            const hpPercent = liveTitan.hp / maxHp;

            // Only retreat if critically wounded (<15% HP) and NOT on a friendly city
            const onFriendlyCity = next.cities.some(c =>
                c.ownerId === playerId && hexEquals(c.coord, liveTitan!.coord)
            );
            if (hpPercent < 0.15 && !onFriendlyCity) {
                const safeCity = findNearestFriendlyCity(next, playerId, liveTitan.coord);
                if (safeCity) {
                    const path = findPath(liveTitan.coord, safeCity.coord, liveTitan, next);
                    if (path && path.length > 0) {
                        const moveResult = tryAction(next, {
                            type: "MoveUnit",
                            playerId,
                            unitId: liveTitan.id,
                            to: path[0]
                        });
                        if (moveResult !== next) {
                            aiLog(`[TITAN LOG] RETREATING - critically wounded (${Math.floor(hpPercent * 100)}% HP)`);
                            next = moveResult;
                            liveTitan = next.units.find(u => u.id === titan.id);
                            continue;
                        }
                    }
                }
            }

            // DYNAMIC RETARGETING: Get fresh target each iteration
            const targetCity = getNextTargetCity(next, playerId, liveTitan.coord);

            if (!targetCity) {
                // FALLBACK: Hunt Units or Explore
                let targets = getWarEnemies(next, playerId);
                if (targets.length === 0) targets = next.players.filter(p => p.id !== playerId && !p.isEliminated);

                // 1. Hunt Units
                const nearestEnemy = next.units.find(u =>
                    targets.some(e => e.id === u.ownerId) &&
                    hexDistance(u.coord, liveTitan!.coord) < 15
                );

                if (nearestEnemy) {
                    const unitPath = findEngagementPath(liveTitan.coord, nearestEnemy.coord, liveTitan, next);
                    if (unitPath && unitPath.length > 0) {
                        const moveResult = tryAction(next, { type: "MoveUnit", playerId, unitId: liveTitan.id, to: unitPath[0] });
                        if (moveResult !== next) {
                            aiLog(`[TITAN LOG] HUNTING UNIT - Moving to engage ${nearestEnemy.type} at dist ${hexDistance(liveTitan.coord, nearestEnemy.coord)}`);
                            next = moveResult;
                            liveTitan = next.units.find(u => u.id === titan.id);
                            continue;
                        }
                    }
                }

                // 2. Explore
                aiLog(`[TITAN LOG] NO TARGETS - Exploring unknown lands`);
                const revealed = new Set(next.revealed[playerId] ?? []);
                let bestTile = null;
                let minStartDist = Infinity;

                // Find nearest tile not in 'revealed'
                for (const t of next.map.tiles) {
                    if (revealed.has(hexToString(t.coord))) continue;
                    const d = hexDistance(liveTitan.coord, t.coord);
                    if (d < minStartDist) {
                        minStartDist = d;
                        bestTile = t;
                    }
                }

                if (bestTile) {
                    const path = findPath(liveTitan.coord, bestTile.coord, liveTitan, next);
                    if (path && path.length > 0) {
                        const moveResult = tryAction(next, { type: "MoveUnit", playerId, unitId: liveTitan.id, to: path[0] });
                        if (moveResult !== next) {
                            aiInfo(`[TITAN LOG] EXPLORING - Moving to fog at (${bestTile.coord.q},${bestTile.coord.r})`);
                            next = moveResult;
                            liveTitan = next.units.find(u => u.id === titan.id);
                            continue;
                        }
                    }
                }

                aiInfo(`[TITAN LOG] IDLING - no targets and exploration failed`);
                break;
            }

            const distToTarget = hexDistance(liveTitan.coord, targetCity.coord);
            aiInfo(`[TITAN LOG] Target: ${targetCity.name} (HP:${targetCity.hp}) at dist ${distToTarget}`);

            // 1. Check for immediate capture
            const canCaptureNow = targetCity.hp <= 0 && distToTarget === 1;

            // v2.2: Titan Leash - Wait for support if army is left behind
            // Only effective if we are NOT about to capture a city
            if (!canCaptureNow && distToTarget > 2) { // Allow moving if very close to target
                const myUnits = next.units.filter(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Titan);
                const totalMilitary = myUnits.length;

                // If army is depleted, don't wait forever. Wait for up to 4, or everyone if < 4.
                const requiredSupport = Math.min(4, totalMilitary);

                // Count units within support range (radius 5)
                const nearbySupport = myUnits.filter(u => hexDistance(u.coord, liveTitan!.coord) <= 5).length;

                // aiLog(`[TITAN DEBUG] Leash Check: Total=${totalMilitary}, Required=${requiredSupport}, Nearby=${nearbySupport}`);

                // NOTE: TitanStep events are expensive (event volume + JSON size). 
                // They are tracked in parallel-analysis.ts when SIM_LOG_TITAN_STEPS=true.
                // Removed unconditional emission here to improve simulation performance.

                if (nearbySupport < requiredSupport) {
                    aiInfo(`[TITAN LOG] WAITING FOR ARMY (Support: ${nearbySupport}/${requiredSupport} nearby) - Leashed`);
                    // End turn (break loop) to let army catch up
                    break;
                }
            }

            if (canCaptureNow) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: liveTitan.id,
                    to: targetCity.coord
                });
                if (moveResult !== next) {
                    aiInfo(`[TITAN LOG] CAPTURING ${targetCity.name}!`);
                    next = moveResult;
                    liveTitan = next.units.find(u => u.id === titan.id);
                    continue;
                } else {
                    aiInfo(`[TITAN LOG] CAPTURE FAILED - move to city blocked!`);
                }
            }

            // 2. Move towards target
            let moveFailed = false;
            // v2.2: Ensure we don't try pathing if we can capture now (already handled above but safe check)
            if (!canCaptureNow && distToTarget > UNITS[UnitType.Titan].rng) {
                const path = findEngagementPath(liveTitan.coord, targetCity.coord, liveTitan, next);
                if (path && path.length > 0) {
                    const moveResult = tryAction(next, {
                        type: "MoveUnit",
                        playerId,
                        unitId: liveTitan.id,
                        to: path[0]
                    });
                    if (moveResult !== next) {
                        const newDist = hexDistance(path[0], targetCity.coord);
                        aiInfo(`[TITAN LOG] MOVING toward ${targetCity.name} (dist ${distToTarget} -> ${newDist})`);
                        next = moveResult;
                        liveTitan = next.units.find(u => u.id === titan.id);
                        continue;
                    } else {
                        aiInfo(`[TITAN LOG] MOVE FAILED - path blocked at (${path[0].q},${path[0].r})`);
                        moveFailed = true;
                    }
                } else {
                    aiInfo(`[TITAN LOG] NO PATH to ${targetCity.name}!`);
                    moveFailed = true;
                }
            }

            if (!liveTitan || liveTitan.movesLeft <= 0) {
                aiInfo(`[TITAN LOG] OUT OF MOVES`);
                break;
            }

            if (!liveTitan.hasAttacked) {
                // 3. Attack Logic - CITIES ONLY
                if (targetCity.hp > 0 && distToTarget <= UNITS[UnitType.Titan].rng) {
                    const attackResult = tryAction(next, {
                        type: "Attack",
                        playerId,
                        attackerId: liveTitan.id,
                        targetId: targetCity.id,
                        targetType: "City"
                    });
                    if (attackResult !== next) {
                        aiLog(`[TITAN LOG] ATTACKING ${targetCity.name} (HP: ${targetCity.hp})`);
                        next = attackResult;
                        liveTitan = next.units.find(u => u.id === titan.id);
                        continue;
                    } else {
                        aiLog(`[TITAN LOG] ATTACK FAILED on ${targetCity.name}!`);
                    }
                } else if (distToTarget > UNITS[UnitType.Titan].rng && moveFailed) {
                    // PATH CLEARING: If we couldn't move because we are blocked, attack the blocker!
                    aiLog(`[TITAN LOG] PATH BLOCKED - attempting to clear the way`);
                    // Attack ANY non-friendly unit that is blocking us (including neutrals)
                    const blockingUnit = next.units.find(u =>
                        u.ownerId !== playerId &&
                        hexDistance(u.coord, liveTitan!.coord) <= UNITS[UnitType.Titan].rng
                    );

                    if (blockingUnit) {
                        const attackResult = tryAction(next, {
                            type: "Attack",
                            playerId,
                            attackerId: liveTitan.id,
                            targetId: blockingUnit.id,
                            targetType: "Unit"
                        });
                        if (attackResult !== next) {
                            aiLog(`[TITAN LOG] CLEARING PATH - Attacking blocking unit ${blockingUnit.type} (HP: ${blockingUnit.hp})`);
                            next = attackResult;
                            liveTitan = next.units.find(u => u.id === titan.id);
                            continue;
                        } else {
                            aiLog(`[TITAN LOG] CLEARING FAILED - attack rejected`);
                        }
                    } else {
                        aiLog(`[TITAN LOG] BLOCKED and no adjacent unit - hunting nearest enemy`);
                        // Find nearest enemy unit ANYWHERE and move to it
                        const warEnemies = getWarEnemies(next, playerId);
                        const nearestEnemy = next.units.find(u =>
                            warEnemies.some(e => e.id === u.ownerId) &&
                            hexDistance(u.coord, liveTitan!.coord) < 20 // Reasonable search radius
                        );
                        if (nearestEnemy) {
                            const unitPath = findEngagementPath(liveTitan.coord, nearestEnemy.coord, liveTitan, next);
                            if (unitPath && unitPath.length > 0) {
                                const moveResult = tryAction(next, {
                                    type: "MoveUnit",
                                    playerId,
                                    unitId: liveTitan.id,
                                    to: unitPath[0]
                                });
                                if (moveResult !== next) {
                                    aiLog(`[TITAN LOG] HUNTING UNIT - Moving to engage ${nearestEnemy.type}`);
                                    next = moveResult;
                                    liveTitan = next.units.find(u => u.id === titan.id);
                                    continue;
                                } else {
                                    aiLog(`[TITAN LOG] HUNTING MOVE FAILED - blocked at (${unitPath[0].q},${unitPath[0].r})`);
                                }
                            } else {
                                aiLog(`[TITAN LOG] HUNTING FAILED - no path to nearest enemy`);
                            }
                        }
                    }
                } else if (distToTarget > UNITS[UnitType.Titan].rng) {
                    aiLog(`[TITAN LOG] CITY OUT OF RANGE (dist ${distToTarget} > rng ${UNITS[UnitType.Titan].rng}) - ending turn`);
                }
                break;
            }

            aiLog(`[TITAN LOG] ALREADY ATTACKED this turn`);
            break;
        }

        aiLog(`[TITAN LOG] Turn ${next.turn} END - safety=${safety}`);
    }

    return next;
}
