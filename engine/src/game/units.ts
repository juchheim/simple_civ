import { UnitType } from "../core/types.js";
import { UNITS } from "../core/constants.js";

export function getUnitCost(unitType: UnitType, turn: number): number {
    const data = UNITS[unitType];
    if (!data) return 999;

    // v7.9b: Middle-ground cost scaling (between v7.9 and original)
    // Original: 1 + floor(Turn / 25) - too aggressive, no cap
    // v7.9: min(3, 1 + floor(Turn / 50)) - too lenient
    // v7.9b: min(4, 1 + floor(Turn / 35)) - balanced middle ground
    // Turn 0-34: 1x
    // Turn 35-69: 2x
    // Turn 70-104: 3x
    // Turn 105+: 4x (capped)
    const multiplier = Math.min(4, 1 + Math.floor(turn / 35));
    return data.cost * multiplier;
}
