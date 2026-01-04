import { GameState, Unit, UnitType } from "../../core/types.js";
import { hexDistance, getNeighbors, hexEquals } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { isMilitary, isGarrisoned } from "./attack-order/shared.js";
import { getTacticalPriorityTargets, TacticalPriorityTarget } from "./offense/advanced-tactics.js";
import { MilitaryDoctrine } from "./military-doctrine.js";
import { createMoveContext } from "../helpers/movement.js";
import { getUnitStrategicValue } from "./tactical-threat.js";

// Reusing types from tactical-planner for compatibility
type MoveAction = { type: "MoveUnit"; playerId: string; unitId: string; to: { q: number; r: number } };

export type SiegePlan = {
    cycleMoves: MoveAction[];
    breachAttacks: { attackerId: string; targetId: string }[];
};

/**
 * Identify if a unit is "wounded" enough to be cycled out
 */
function isWounded(unit: Unit, doctrine: MilitaryDoctrine): boolean {
    const maxHp = UNITS[unit.type].hp;
    const threshold = doctrine.unitCycleAggression > 0.7 ? 0.6 : 0.4; // Aggressive doctrine cycles earlier (at 60% HP)
    return unit.hp < maxHp * threshold;
}

/**
 * Identify if a unit is "fresh" enough to cycle in
 */
function isFresh(unit: Unit): boolean {
    const maxHp = UNITS[unit.type].hp;
    return unit.hp > maxHp * 0.8;
}

/**
 * Plan to cycle wounded units away from the front line and replace them with fresh units
 */
function planUnitCycling(
    state: GameState,
    playerId: string,
    focusCityId: string | undefined,
    reservedUnitIds: Set<string>,
    doctrine: MilitaryDoctrine
): MoveAction[] {
    if (!focusCityId || doctrine.unitCycleAggression < 0.1) return [];

    const city = state.cities.find(c => c.id === focusCityId);
    if (!city) return [];

    const moves: MoveAction[] = [];
    const usedUnits = new Set<string>();

    // 1. Identify "Frontline" spots (adjacent to enemy city)
    const frontlineSpots = getNeighbors(city.coord);

    for (const spot of frontlineSpots) {
        // Find our unit at this spot
        const woundedUnit = state.units.find(u =>
            u.ownerId === playerId &&
            hexEquals(u.coord, spot) &&
            !reservedUnitIds.has(u.id) &&
            !usedUnits.has(u.id) &&
            u.movesLeft > 0 &&
            isMilitary(u)
        );

        if (!woundedUnit || !isWounded(woundedUnit, doctrine)) continue;

        // 2. Find a "Rear" spot behind the frontline unit
        // Ideally directly away from the city, or just any safe adjacent spot
        const rearSpots = getNeighbors(spot).filter(rearSpot => {
            // Not the city itself
            if (hexEquals(rearSpot, city.coord)) return false;
            // Not another frontline spot (too crowded usually, but maybe ok)
            return true;
        });

        // 3. Find a FRESH unit in a rear spot
        for (const rearSpot of rearSpots) {
            const freshUnit = state.units.find(u =>
                u.ownerId === playerId &&
                hexEquals(u.coord, rearSpot) &&
                !reservedUnitIds.has(u.id) &&
                !usedUnits.has(u.id) &&
                u.movesLeft > 0 &&
                isFresh(u) &&
                isMilitary(u)
            );

            if (freshUnit) {
                // FOUND A PAIR! Execute the switch.
                // Note: The game doesn't support simultaneous swap. 
                // We need an empty tile to rotate via. 
                // OR: Using MoveUnit, we can move the wounded guy OUT first, then fresh guy IN.

                // Find an empty retreat tile for the wounded unit
                const retreatOptions = getNeighbors(spot).filter(n => {
                    const tile = state.map.tiles.find(t => t.coord.q === n.q && t.coord.r === n.r);
                    if (!tile) return false;
                    // Not occupied
                    if (state.units.some(u => hexEquals(u.coord, n))) return false;
                    // Not the city
                    if (hexEquals(n, city.coord)) return false;
                    return true;
                });

                if (retreatOptions.length > 0) {
                    const retreatTile = retreatOptions[0]; // Just pick first valid retreat

                    // Move 1: Wounded retreats
                    moves.push({
                        type: "MoveUnit",
                        playerId,
                        unitId: woundedUnit.id,
                        to: retreatTile
                    });

                    // Move 2: Fresh takes the spot
                    moves.push({
                        type: "MoveUnit",
                        playerId,
                        unitId: freshUnit.id,
                        to: spot
                    });

                    usedUnits.add(woundedUnit.id);
                    usedUnits.add(freshUnit.id);
                    reservedUnitIds.add(woundedUnit.id);
                    reservedUnitIds.add(freshUnit.id);
                    break; // Done with this frontline spot
                }
            }
        }
    }

    return moves;
}

/**
 * Identify breach targets (cities) that should be attacked regardless of safety
 */
export function getBreachTargets(
    state: GameState,
    playerId: string,
    focusCityId: string | undefined,
    doctrine: MilitaryDoctrine
): string[] {
    if (!focusCityId) return [];

    // If we're SiegeBreakers, the focus city IS a breach target
    if (doctrine.type === "SiegeBreaker") {
        return [focusCityId];
    }

    return [];
}

/**
 * Main Siege Manager Logic
 */
export function planSiegeOperations(
    state: GameState,
    playerId: string,
    focusCityId: string | undefined,
    reservedUnitIds: Set<string>,
    doctrine: MilitaryDoctrine
): SiegePlan {
    const moves = planUnitCycling(state, playerId, focusCityId, reservedUnitIds, doctrine);

    // Attacker logic handled via scoring boost in attack-plan.ts based on Doctrine
    // but we can return specific forced attacks here if needed.
    // For now, relies on the scoring boost.

    return {
        cycleMoves: moves,
        breachAttacks: []
    };
}
