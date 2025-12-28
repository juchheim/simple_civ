import { Unit, UnitType } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";

export function isMilitary(u: { type: UnitType }): boolean {
    return UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Scout && u.type !== UnitType.ArmyScout;
}

export function isCapturer(u: Unit): boolean {
    return u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard || u.type === UnitType.Titan;
}

export function isSiege(u: Unit): boolean {
    return u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard;
}

export function isRider(u: Unit): boolean {
    return u.type === UnitType.Riders || u.type === UnitType.ArmyRiders;
}

export function isRanged(u: Unit): boolean {
    return UNITS[u.type].rng > 1;
}
