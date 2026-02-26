import { aiInfo } from "../debug-logging.js";
import { hexDistance } from "../../../core/hex.js";
import { City, GameState, Unit, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { nearestByDistance } from "../shared/metrics.js";
import { cityIsCoastal } from "./unit-helpers.js";

export type MovementTarget = {
    coord: { q: number; r: number };
    name: string;
    hp?: number;
    maxHp?: number;
};

type PickMovementTargetParams = {
    state: GameState;
    playerId: string;
    unit: Unit;
    targetCities: City[];
    primaryCity?: City;
    titan?: Unit;
};

export function pickMovementTargetForUnit({
    state,
    playerId,
    unit,
    targetCities,
    primaryCity,
    titan,
}: PickMovementTargetParams): MovementTarget | null {
    const unitTargets = UNITS[unit.type].domain === "Naval"
        ? targetCities.filter(c => cityIsCoastal(state, c))
        : targetCities;

    let nearest: MovementTarget | null = null;
    if (UNITS[unit.type].canCaptureCity) {
        const capturable = unitTargets.filter(c => c.hp <= 0);
        if (capturable.length > 0) {
            nearest = nearestByDistance(unit.coord, capturable, city => city.coord) ?? null;
            if (nearest) {
                aiInfo(`[AI CAPTURE MOVE] ${playerId} ${unit.type} moving to capture ${nearest.name} (HP ${nearest.hp})`);
            }
        }
    }

    if (!nearest) {
        // v1.0.4: Trebuchet-Titan Synergy
        // Trebuchets can't keep up with Titan (move 1 vs move 3)
        // Instead of following Titan, go directly to Titan's target city
        if (titan && unit.type === UnitType.Trebuchet && primaryCity) {
            nearest = primaryCity;
            aiInfo(`[AI TREBUCHET TITAN] ${playerId} Trebuchet moving to Titan's target ${primaryCity.name}`);
        }
        // v1.1: Titan Deathball Override
        // If Titan exists, rally to it
        else if (titan && unit.id !== titan.id) {
            const distToTitan = hexDistance(unit.coord, titan.coord);
            if (distToTitan > 3) {
                nearest = { coord: titan.coord, name: "The Titan" };
                aiInfo(`[AI DEATHBALL] ${playerId} ${unit.type} rallying to Titan (dist ${distToTitan})`);
            } else {
                nearest = primaryCity ?? { coord: titan.coord, name: "The Titan" };
            }
        }

        if (!nearest) {
            nearest = nearestByDistance(
                unit.coord,
                primaryCity ? [primaryCity] : unitTargets,
                city => city.coord
            ) ?? null;
        }
    }

    return nearest;
}
