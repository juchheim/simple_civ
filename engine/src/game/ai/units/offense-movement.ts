import { aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals } from "../../../core/hex.js";
import { GameState, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { captureIfPossible } from "./siege-routing.js";
import {
    getWarTargets,
    isScoutType,
    shouldUseWarProsecutionMode,
    selectHeldGarrisons,
    selectPrimarySiegeCity,
    warGarrisonCap,
} from "./unit-helpers.js";
import { pickMovementTargetForUnit } from "./offense-movement-target-selection.js";
import { computePathToTarget } from "./offense-movement-pathing.js";
import { attemptMoveAlongPath } from "./offense-movement-threat-step.js";

export function moveMilitaryTowardTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const warTargets = getWarTargets(next, playerId);
    if (!warTargets.length) return next;

    const isInWarProsecutionMode = shouldUseWarProsecutionMode(next, playerId, warTargets);
    const targetCities = next.cities
        .filter(c => warTargets.some(w => w.id === c.ownerId))
        .sort((a, b) => a.hp - b.hp);

    // v2.2: Titan is excluded - it has dedicated logic in titanRampage
    const armyUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        !isScoutType(u.type) &&
        u.type !== UnitType.Titan
    );
    const garrisonCap = warGarrisonCap(next, playerId, isInWarProsecutionMode);
    const heldGarrisons = selectHeldGarrisons(next, playerId, warTargets, garrisonCap);

    const unitCounts = armyUnits.reduce((acc, u) => {
        acc[u.type] = (acc[u.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    if (targetCities.some(c => c.hp <= 0)) {
        aiInfo(`[AI SIEGE DEBUG] ${playerId} has units: ${JSON.stringify(unitCounts)}. Targets with <=0 HP: ${targetCities.filter(c => c.hp <= 0).map(c => c.name).join(", ")}`);
    }

    const rangedIds = new Set(armyUnits.filter(u => UNITS[u.type].rng > 1).map(u => u.id));
    const primaryCity = selectPrimarySiegeCity(
        next,
        playerId,
        armyUnits,
        targetCities,
        { forceRetarget: isInWarProsecutionMode, preferClosest: isInWarProsecutionMode }
    );
    const titan = next.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);
    const warTargetIds = warTargets.map(t => t.id);

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
                if (!otherGarrison) break;
            }

            const target = pickMovementTargetForUnit({
                state: next,
                playerId,
                unit: current,
                targetCities,
                primaryCity: primaryCity ?? undefined,
                titan,
            });
            if (!target) break;
            if (hexDistance(target.coord, current.coord) === 0) break;

            const path = computePathToTarget(next, current, target);
            const stepResult = attemptMoveAlongPath({
                state: next,
                playerId,
                unit: current,
                target,
                path,
                rangedIds,
                armyUnits,
                warTargetIds,
                isInWarProsecutionMode,
            });
            next = stepResult.state;
            if (!stepResult.moved) break;
        }
    }
    return next;
}
