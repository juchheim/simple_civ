import { aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType, UnitState } from "../../../core/types.js";
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
    if (!titan) return next; // No Titan, no deathball

    // Find Titan's target city (same logic as titan.ts)
    const warEnemies = next.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );

    if (warEnemies.length === 0) return next;

    const enemyCities = next.cities
        .filter(c => warEnemies.some(e => e.id === c.ownerId))
        .sort((a, b) => {
            if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
            return a.hp - b.hp;
        });

    const targetCity = enemyCities.find(c => c.isCapital) ?? enemyCities[0];
    if (!targetCity) return next;

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
    const nearbyUnits = supportUnits.filter(u => {
        const distToTitan = hexDistance(u.coord, titan.coord);
        const distToTarget = hexDistance(u.coord, targetCity.coord);
        return distToTitan <= 12 || distToTarget <= 12;
    });

    let movedCount = 0;
    const MAX_MOVES = 5; // Limit to avoid excessive pathfinding

    for (const unit of nearbyUnits) {
        if (movedCount >= MAX_MOVES) break;

        let liveUnit = next.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.movesLeft <= 0) continue;

        // Already adjacent to target or Titan? Stay
        if (hexDistance(liveUnit.coord, targetCity.coord) <= 2) continue;
        if (hexDistance(liveUnit.coord, titan.coord) <= 1) continue;

        // Move toward target city (same destination as Titan)
        const path = findPath(liveUnit.coord, targetCity.coord, liveUnit, next);
        if (path && path.length > 0) {
            const moveResult = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: liveUnit.id,
                to: path[0]
            });
            if (moveResult !== next) {
                aiInfo(`[AI Deathball] ${playerId} ${liveUnit.type} moving to support Titan attack on ${targetCity.name}`);
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
