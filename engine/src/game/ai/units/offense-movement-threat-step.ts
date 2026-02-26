import { aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { DiplomacyState, GameState, Unit, UnitType } from "../../../core/types.js";
import { TERRAIN, UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { evaluateTileDanger, getNearbyThreats } from "./unit-helpers.js";
import type { MovementTarget } from "./offense-movement-target-selection.js";

type AttemptMoveAlongPathParams = {
    state: GameState;
    playerId: string;
    unit: Unit;
    target: MovementTarget;
    path: { q: number; r: number }[];
    rangedIds: Set<string>;
    armyUnits: Unit[];
    warTargetIds: string[];
    isInWarProsecutionMode: boolean;
};

export function attemptMoveAlongPath({
    state,
    playerId,
    unit,
    target,
    path,
    rangedIds,
    armyUnits,
    warTargetIds,
    isInWarProsecutionMode,
}: AttemptMoveAlongPathParams): { state: GameState; moved: boolean } {
    let next = state;
    let moved = false;
    if (path.length === 0) {
        return { state: next, moved };
    }

    const step = path[0];
    const desiredRange = UNITS[unit.type].rng;
    const currentDist = hexDistance(unit.coord, target.coord);

    // Dynamic siege group size: Min 1, Max 3, but never more than 50% of our total army
    const totalArmySize = armyUnits.length;
    const dynamicGroupSize = Math.max(1, Math.min(3, Math.ceil(totalArmySize / 2)));
    const requiredSiegeGroup = isInWarProsecutionMode ? Math.max(1, dynamicGroupSize - 1) : dynamicGroupSize;

    const friendliesNearTarget = armyUnits.filter(u =>
        hexDistance(u.coord, target.coord) <= 5
    ).length;

    // --- GROUPING LOGIC (v1.0) ---
    if (currentDist <= 5 && friendliesNearTarget < requiredSiegeGroup) {
        // Exception: If the city is weak (HP < 50%), charge anyway
        if ((target.hp ?? 1) > (target.maxHp ?? 1) * 0.5) {
            aiInfo(`[AI GROUPING] ${playerId} ${unit.type} waiting for reinforcements at dist ${currentDist} (${friendliesNearTarget}/${requiredSiegeGroup})`);
            moved = true; // "Moved" means we took an action (waiting), so stop loop
        }
    }
    // -----------------------------

    // --- v1.0.4: TREBUCHET SIEGE POSITIONING ---
    if (!moved && unit.type === UnitType.Trebuchet) {
        // Count friendlies between Trebuchet and city (protection check)
        const friendlyMeleeBetween = armyUnits.filter(u =>
            u.id !== unit.id &&
            UNITS[u.type].rng === 1 && // Melee only
            hexDistance(u.coord, target.coord) < currentDist // Closer to city than us
        ).length;

        // Optimal position: range 2 from city with melee in front
        const inFiringRange = currentDist <= 2;
        const hasProtection = friendlyMeleeBetween >= 1;

        // Danger check: enemies within 2 tiles of Trebuchet
        const enemiesNearTrebuchet = next.units.filter(u =>
            warTargetIds.includes(u.ownerId) &&
            UNITS[u.type].domain !== "Civilian" &&
            hexDistance(u.coord, unit.coord) <= 2
        ).length;

        // RETREAT if enemies closing in and no protection
        if (enemiesNearTrebuchet > 0 && !hasProtection && unit.movesLeft > 0) {
            // Find safe retreat tile (away from enemies, toward friendlies)
            const retreatNeighbors = getNeighbors(unit.coord)
                .filter(n => {
                    const tile = next.map.tiles.find(t => hexEquals(t.coord, n));
                    if (!tile || !TERRAIN[tile.terrain].moveCostLand) return false;
                    const hasUnit = next.units.some(u => hexEquals(u.coord, n) && UNITS[u.type].domain !== "Civilian");
                    if (hasUnit) return false;
                    const closestEnemy = next.units
                        .filter(u => warTargetIds.includes(u.ownerId) && UNITS[u.type].domain !== "Civilian")
                        .reduce((min, u) => Math.min(min, hexDistance(u.coord, n)), Infinity);
                    const currentClosest = next.units
                        .filter(u => warTargetIds.includes(u.ownerId) && UNITS[u.type].domain !== "Civilian")
                        .reduce((min, u) => Math.min(min, hexDistance(u.coord, unit.coord)), Infinity);
                    return closestEnemy > currentClosest;
                })
                .sort((a, b) => {
                    const aFriendly = armyUnits.filter(u => u.id !== unit.id).reduce((min, u) => Math.min(min, hexDistance(u.coord, a)), Infinity);
                    const bFriendly = armyUnits.filter(u => u.id !== unit.id).reduce((min, u) => Math.min(min, hexDistance(u.coord, b)), Infinity);
                    return aFriendly - bFriendly;
                });

            if (retreatNeighbors.length > 0) {
                const retreatTile = retreatNeighbors[0];
                const retreated = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: retreatTile });
                if (retreated !== next) {
                    aiInfo(`[AI TREBUCHET RETREAT] ${playerId} Trebuchet retreating from ${enemiesNearTrebuchet} enemies (no melee protection)`);
                    next = retreated;
                    moved = true;
                }
            }
        }

        // Count enemy units near the target city
        const enemyUnitsNearCity = next.units.filter(u =>
            warTargetIds.includes(u.ownerId) &&
            UNITS[u.type].domain !== "Civilian" &&
            u.type !== UnitType.Scout &&
            hexDistance(u.coord, target.coord) <= 3
        ).length;

        // HOLD at firing range - this is where we want to be
        if (!moved && inFiringRange) {
            aiInfo(`[AI TREBUCHET POSITION] ${playerId} Trebuchet holding at firing range ${currentDist} (melee escorts: ${friendlyMeleeBetween})`);
            moved = true;
        }

        // ADVANCE if: has melee protection OR no enemies near city
        if (!moved && (hasProtection || enemyUnitsNearCity === 0)) {
            moved = false;
        }
        // WAIT for escort - only block if close enough that advancing would be dangerous
        else if (!moved && !hasProtection && enemyUnitsNearCity > 0 && currentDist <= 4) {
            aiInfo(`[AI TREBUCHET WAIT] ${playerId} Trebuchet waiting for melee escort at dist ${currentDist} (escorts: ${friendlyMeleeBetween}, enemies: ${enemyUnitsNearCity})`);
            moved = true;
        }
    }
    // -----------------------------

    if (!moved) {
        // If we are at range, check if we should hold for reinforcements
        if (rangedIds.has(unit.id) && currentDist <= desiredRange && currentDist >= 2) {
            if (friendliesNearTarget >= requiredSiegeGroup) {
                aiInfo(`[AI SIEGE] ${playerId} ${unit.type} holding at range ${currentDist} from ${target.name} (Supported by ${friendliesNearTarget} units)`);
                moved = true;
            } else {
                aiInfo(`[AI SIEGE] ${playerId} ${unit.type} at range ${currentDist} from ${target.name}, waiting for group (${friendliesNearTarget}/${requiredSiegeGroup} units)`);
                moved = true;
            }
        } else {
            // Not at range, or melee unit. Move closer.
            const stepDist = hexDistance(step, target.coord);

            // Ranged units shouldn't move closer than their max range unless necessary
            if (rangedIds.has(unit.id) && desiredRange > 1 && stepDist < 2 && currentDist <= desiredRange) {
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
                        const stepDanger = evaluateTileDanger(next, playerId, step);
                        const currentDanger = evaluateTileDanger(next, playerId, unit.coord);

                        const rangedThreatsAtStep = getNearbyThreats(next, playerId, step, 3)
                            .filter(t => {
                                const tRng = UNITS[t.unit.type as UnitType].rng;
                                return tRng > 1 && t.distance <= tRng;
                            });

                        const friendliesNear = armyUnits.filter(u =>
                            u.id !== unit.id && hexDistance(u.coord, step) <= 2
                        ).length;

                        // If stepping into ranged danger and we're alone, look for safer path
                        let shouldTakeSaferPath = false;
                        if (rangedThreatsAtStep.length > 0 && friendliesNear < 2 && stepDanger > currentDanger + 3) {
                            const saferNeighbors = getNeighbors(unit.coord)
                                .filter(n => {
                                    const nDist = hexDistance(n, target.coord);
                                    if (nDist >= currentDist) return false; // Must make progress

                                    const nDanger = evaluateTileDanger(next, playerId, n);
                                    if (nDanger >= stepDanger - 2) return false; // Must be meaningfully safer

                                    const nTile = next.map.tiles.find(t => hexEquals(t.coord, n));
                                    if (!nTile) return false;
                                    if (nTile.ownerId && nTile.ownerId !== playerId) {
                                        const diplomacy = next.diplomacy[playerId]?.[nTile.ownerId];
                                        const isCity = next.cities.some(c => hexEquals(c.coord, n));
                                        if (!isCity && diplomacy !== DiplomacyState.War) return false;
                                    }

                                    const nUnits = next.units.filter(u => hexEquals(u.coord, n));
                                    const nFriendlyMil = nUnits.some(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");
                                    if (nFriendlyMil) return false;

                                    return true;
                                })
                                .sort((a, b) => {
                                    const aDanger = evaluateTileDanger(next, playerId, a);
                                    const bDanger = evaluateTileDanger(next, playerId, b);
                                    if (aDanger !== bDanger) return aDanger - bDanger;
                                    return hexDistance(a, target.coord) - hexDistance(b, target.coord);
                                });

                            if (saferNeighbors.length > 0) {
                                const saferStep = saferNeighbors[0];
                                const saferAttempt = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: saferStep });
                                if (saferAttempt !== next) {
                                    aiInfo(`[AI RANGED AVOIDANCE] ${playerId} ${unit.type} avoiding ranged fire, taking safer path`);
                                    next = saferAttempt;
                                    moved = true;
                                    shouldTakeSaferPath = true;
                                }
                            }
                        }

                        if (!shouldTakeSaferPath) {
                            const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: step });
                            if (attempt !== next) {
                                next = attempt;
                                moved = true;
                            }
                        }
                    }
                }

                if (!moved) {
                    // Try neighbors - also with ranged threat awareness
                    const neighbors = getNeighbors(unit.coord);
                    const orderedByDangerAndDist = neighbors
                        .map(n => ({
                            coord: n,
                            dist: hexDistance(n, target.coord),
                            danger: evaluateTileDanger(next, playerId, n)
                        }))
                        .filter(n => n.dist <= currentDist) // Only candidates that make progress or hold
                        .sort((a, b) => {
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

                        const altAttempt = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: n });
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

    return { state: next, moved };
}
