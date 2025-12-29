import { GameState, Unit, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";

export function isMilitary(u: Unit): boolean {
    return UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Scout && u.type !== UnitType.ArmyScout;
}

export function isGarrisoned(unit: Unit, state: GameState, playerId: string): boolean {
    return state.cities.some(c =>
        c.ownerId === playerId &&
        c.coord.q === unit.coord.q &&
        c.coord.r === unit.coord.r
    );
}

export function unitValue(u: Unit): number {
    if (String(u.type).startsWith("Army")) return 18;
    if (u.type === UnitType.Titan) return 50;
    if (u.type === UnitType.Riders) return 12;
    if (u.type === UnitType.BowGuard) return 11;
    if (u.type === UnitType.SpearGuard) return 10;
    if (u.type === UnitType.Scout || u.type === UnitType.ArmyScout) return 4;
    if (u.type === UnitType.Settler) return 30;
    return 8;
}

export function getThreatLevel(u: Unit): number {
    // Higher threat for units that can deal more damage
    const stats = UNITS[u.type];
    return stats.atk + (stats.rng > 1 ? 2 : 0);
}
