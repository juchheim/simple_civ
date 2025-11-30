import { UnitType } from "../core/types.js";
import { UNITS } from "../core/constants.js";

export function getUnitCost(unitType: UnitType, turn: number): number {
    const data = UNITS[unitType];
    if (!data) return 999;

    // Scale cost by turn number: Base * (1 + floor(Turn / 25))
    // Turn 0-24: 1x
    // Turn 25-49: 2x
    // Turn 50-74: 3x
    // ...
    const multiplier = 1 + Math.floor(turn / 25);
    return data.cost * multiplier;
}
