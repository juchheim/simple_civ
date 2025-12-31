import { GameState, Unit } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { getUnitRole, isCombatUnitType } from "../schema.js";
import { getUnitThreatProfile } from "../tactical-threat.js";

// Helper to check if unit is military
export function isMilitary(u: Unit): boolean {
    return isCombatUnitType(u.type);
}

// Estimate unit threat based on stats
export function estimateUnitThreat(unit: Unit, state: GameState): number {
    const hpFrac = unit.hp / UNITS[unit.type].hp;
    const profile = getUnitThreatProfile(unit);
    return profile.totalThreat * hpFrac;
}

// Estimate unit defensive value
export function estimateDefenseValue(unit: Unit, state: GameState): number {
    const hpFrac = unit.hp / UNITS[unit.type].hp;
    const role = getUnitRole(unit.type);
    const profile = getUnitThreatProfile(unit);

    let defense = (profile.strategicValue * 1.1) + (profile.unitThreat * 0.6);
    if (UNITS[unit.type].rng > 1) defense += 3;
    if (role === "defense") defense += 6;

    return defense * hpFrac;
}
