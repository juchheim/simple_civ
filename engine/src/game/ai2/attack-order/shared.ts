import { GameState, Unit } from "../../../core/types.js";
import { isCombatUnitType } from "../schema.js";
import { getUnitStrategicValue, getUnitThreatLevel } from "../tactical-threat.js";

export function isMilitary(u: Unit): boolean {
    return isCombatUnitType(u.type);
}

export function isGarrisoned(unit: Unit, state: GameState, playerId: string): boolean {
    return state.cities.some(c =>
        c.ownerId === playerId &&
        c.coord.q === unit.coord.q &&
        c.coord.r === unit.coord.r
    );
}

export function unitValue(u: Unit): number {
    return getUnitStrategicValue(u);
}

export function getThreatLevel(u: Unit): number {
    return getUnitThreatLevel(u);
}

import { canPlanAttack as canPlanAttackPure } from "../../ai/shared/validation.js";

// Re-export or wrapper
export function canPlanAttack(
    state: GameState,
    attacker: Unit,
    targetType: "Unit" | "City",
    targetId: string,
    fromCoord = attacker.coord
): boolean {
    return canPlanAttackPure(state, attacker.ownerId, attacker, targetId, targetType, fromCoord);
}
