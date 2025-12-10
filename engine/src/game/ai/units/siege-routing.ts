import { aiLog, aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { GameState, UnitType } from "../../../core/types.js";
import { TERRAIN, UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { nearestByDistance } from "../shared/metrics.js";
import { findPath } from "../../helpers/pathfinding.js";
import { getWarTargets, stepToward } from "./unit-helpers.js";

export function captureIfPossible(state: GameState, playerId: string, unitId: string): GameState {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || !canCapture(unit)) return state;

    const adjCities = getAdjacentCapturableCities(state, playerId, unit);
    if (adjCities.length > 0) {
        aiInfo(`[AI CAPTURE ATTEMPT] ${playerId} ${unit.type} attempting to capture ${adjCities.length} cities at HP <=0`);
    }
    for (const city of adjCities) {
        logCaptureAttempt(playerId, unit, city, state.units);
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
        UNITS[u.type as UnitType].canCaptureCity
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
            const { updatedState, movedCaptureUnit } = resolveBlockingAndMove(next, playerId, unit, city, step);
            next = updatedState;
            if (movedCaptureUnit) {
                assigned.add(unit.id);
                continue;
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

const canCapture = (unit: any) => {
    const stats = UNITS[unit.type];
    return stats.canCaptureCity && stats.domain !== "Civilian";
};

const getAdjacentCapturableCities = (state: GameState, playerId: string, unit: any) => {
    return state.cities.filter(
        c => c.ownerId !== playerId && hexDistance(c.coord, unit.coord) === 1 && c.hp <= 0
    );
};

const logCaptureAttempt = (playerId: string, unit: any, city: any, units: any[]) => {
    const unitsOnCity = units.filter(u => hexEquals(u.coord, city.coord));
    aiInfo(`[AI CAPTURE] ${playerId} ${unit.type} capturing ${city.name} (${city.ownerId}) at ${city.hp} HP. Units on city: ${unitsOnCity.map(u => u.type).join(", ") || "None"}`);
};

const resolveBlockingAndMove = (state: GameState, playerId: string, unit: any, city: any, step: { q: number; r: number }) => {
    let next = state;
    const blockingUnit = next.units.find(u => hexEquals(u.coord, step) && u.ownerId === playerId && u.id !== unit.id);
    if (!blockingUnit) {
        return { updatedState: next, movedCaptureUnit: false };
    }

    let cleared = false;
    if (blockingUnit.movesLeft > 0) {
        const escape = findEscapeHex(next, blockingUnit, unit, city);
        if (escape) {
            aiInfo(`[AI CAPTURE] Moving blocking unit ${blockingUnit.type} to make way for ${unit.type}`);
            const movedBlocker = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: blockingUnit.id,
                to: escape
            });
            if (movedBlocker !== next) {
                next = movedBlocker;
                cleared = true;
            }
        }
    }

    if (!cleared) {
        if (hexDistance(unit.coord, blockingUnit.coord) === 1) {
            aiInfo(`[AI CAPTURE] Blocking unit ${blockingUnit.type} cannot move aside. Attempting SWAP with ${unit.type}`);
            const swapped = tryAction(next, {
                type: "SwapUnits",
                playerId,
                unitId: unit.id,
                targetUnitId: blockingUnit.id
            });
            if (swapped !== next) {
                return { updatedState: swapped, movedCaptureUnit: true };
            }
        } else {
            console.warn(`[AI CAPTURE] Cannot swap: Units not adjacent (${hexDistance(unit.coord, blockingUnit.coord)})`);
        }
    }

    return { updatedState: next, movedCaptureUnit: false };
};

const findEscapeHex = (state: GameState, blockingUnit: any, captureUnit: any, city: any) => {
    const neighbors = getNeighbors(blockingUnit.coord);
    return neighbors.find(n => {
        if (hexEquals(n, city.coord) || hexEquals(n, captureUnit.coord)) return false;
        if (state.units.some(u => hexEquals(u.coord, n))) return false;
        const tile = state.map.tiles.find(t => hexEquals(t.coord, n));
        const blocksLos = tile ? TERRAIN[tile.terrain]?.blocksLoS : false;
        return !blocksLos;
    });
};

const getNearbySiegeUnits = (state: GameState, playerId: string, targetCity: any, radiusToConsider: number) => {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        hexDistance(u.coord, targetCity.coord) <= radiusToConsider
    );
};

const findAvailableCaptureUnits = (state: GameState, playerId: string) => {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        UNITS[u.type].canCaptureCity
    );
};

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
    const nearbyUnits = getNearbySiegeUnits(state, playerId, targetCity, radiusToConsider);

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

            aiInfo(`[AI SIEGE COMPOSITION] ${playerId} siege at ${city.name} (HP ${city.hp}) needs capture unit! ${siegeStatus.siegeUnits.length} units sieging.`);
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

    const captureUnits = findAvailableCaptureUnits(next, playerId);

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
        aiInfo(`[AI SIEGE SUPPORT] ${playerId} routing ${nearest.type} to siege at ${city.name} (dist ${distance})`);
        next = stepToward(next, playerId, nearest.id, city.coord);
    }

    return next;
}
