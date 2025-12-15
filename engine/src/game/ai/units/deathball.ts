import { aiInfo } from "../debug-logging.js";
import { getNextTargetCity } from "./titan.js";
import { hexDistance, hexEquals } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType, UnitState, BuildingType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { findPath } from "../../helpers/pathfinding.js";

/**
 * Move military units toward the Titan's target to form a deathball.
 * Called after titanRampage to coordinate army support.
 */
export function moveTroopsTowardTitan(state: GameState, playerId: string): GameState {
    let next = state;

    // Find the Titan
    const titan = next.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);

    // Find Titan's target city
    let targetCity = null;
    let rallyPoint: { q: number; r: number } | null = null;
    let isPreSpawn = false;

    if (titan) {
        targetCity = getNextTargetCity(next, playerId, titan.coord);
        if (targetCity) rallyPoint = targetCity.coord;
        else rallyPoint = titan.coord;
    } else {
        // v2.2: Pre-Spawn Rally Logic
        // If Titan is being built, rally to the city building it
        const builderCity = next.cities.find(c =>
            c.ownerId === playerId &&
            c.currentBuild?.type === "Building" &&
            c.currentBuild.id === BuildingType.TitansCore
        );

        if (builderCity) {
            rallyPoint = builderCity.coord;
            isPreSpawn = true;
            aiInfo(`[AI Deathball] ${playerId} PRE-RALLYING army to ${builderCity.name} (Building Titan's Core)`);
        }
    }

    if (!rallyPoint) return next;


    // Get military units that can support (not garrisoned, not Titan, have moves)
    const supportUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        u.type !== UnitType.Titan &&
        u.type !== UnitType.Settler &&
        u.state !== UnitState.Garrisoned &&
        UNITS[u.type].domain !== "Civilian"
    );

    // Only consider units within reasonable range (10 hexes of Titan or target)
    // v2.2: If pre-spawn, check global capable units (to pull them from anywhere)
    const nearbyUnits = supportUnits.filter(u => {
        if (isPreSpawn) return true; // Pull everyone for pre-rally
        if (!titan || !targetCity) return false;

        const distToTitan = hexDistance(u.coord, titan.coord);
        const distToTarget = hexDistance(u.coord, targetCity.coord);
        return distToTitan <= 12 || distToTarget <= 12;
    });

    let movedCount = 0;
    const MAX_MOVES = 50; // Increased from 5 to allow full army support

    for (const unit of nearbyUnits) {
        if (movedCount >= MAX_MOVES) break;

        let liveUnit = next.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.movesLeft <= 0) continue;

        // Already adjacent to target or Titan? Stay
        if (targetCity && hexDistance(liveUnit.coord, targetCity.coord) <= 2) continue;
        if (titan && hexDistance(liveUnit.coord, titan.coord) <= 1) continue;
        if (isPreSpawn && hexDistance(liveUnit.coord, rallyPoint) <= 1) continue;

        // Move toward target city (same destination as Titan) or Rally Point
        const path = findPath(liveUnit.coord, rallyPoint, liveUnit, next);
        if (path && path.length > 0) {
            const moveResult = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: liveUnit.id,
                to: path[0]
            });
            if (moveResult !== next) {
                const targetName = targetCity ? targetCity.name : (isPreSpawn ? "Rally Point" : "Titan");
                aiInfo(`[AI Deathball] ${playerId} ${liveUnit.type} moving to support ${targetName}`);
                next = moveResult;
                movedCount++;
            }
        }
    }

    if (movedCount > 0) {
        aiInfo(`[AI Deathball] ${playerId} moved ${movedCount} units toward Titan's target`);
    }

    return next;
}
