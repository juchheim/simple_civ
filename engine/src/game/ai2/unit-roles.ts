import { Unit, UnitType } from "../../core/types.js";
import { getUnitCapabilityProfile, isCombatUnitType } from "./schema.js";

export function isMilitary(u: { type: UnitType }): boolean {
    return isCombatUnitType(u.type);
}

export function isCapturer(u: Unit): boolean {
    return getUnitCapabilityProfile(u.type).canCaptureCities;
}

export function isSiege(u: Unit): boolean {
    return getUnitCapabilityProfile(u.type).isSiege;
}

export function isRider(u: Unit): boolean {
    return u.type === UnitType.Riders || u.type === UnitType.ArmyRiders;
}

export function isRanged(u: Unit): boolean {
    return getUnitCapabilityProfile(u.type).isRanged;
}
