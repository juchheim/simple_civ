import { GameState, Unit, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { getEffectiveUnitStats } from "../../helpers/combat.js";

// Helper to check if unit is military
export function isMilitary(u: Unit): boolean {
    const domain = UNITS[u.type]?.domain;
    return domain !== "Civilian";
}

// Helper to check if unit is ranged
function isRanged(u: Unit): boolean {
    return UNITS[u.type]?.rng > 1;
}

// Estimate unit threat based on stats
export function estimateUnitThreat(unit: Unit, state: GameState): number {
    const stats = getEffectiveUnitStats(unit, state);
    // Ranged units are more threatening to cities
    const rangeMult = isRanged(unit) ? 1.5 : 1.0;
    // Army units are more threatening
    const armyMult = unit.type.startsWith("Army") ? 1.5 : 1.0;
    // Titan is extremely threatening
    const titanMult = unit.type === UnitType.Titan ? 3.0 : 1.0;

    return (stats.atk + stats.def * 0.5) * rangeMult * armyMult * titanMult * (unit.hp / UNITS[unit.type].hp);
}

// Estimate unit defensive value
export function estimateDefenseValue(unit: Unit, state: GameState): number {
    const stats = getEffectiveUnitStats(unit, state);
    const hpFrac = unit.hp / UNITS[unit.type].hp;
    return (stats.def + stats.atk * 0.3) * hpFrac;
}
