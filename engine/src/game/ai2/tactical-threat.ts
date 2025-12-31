import { City, GameState, Unit, UnitType } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";
import { getUnitRole, isSiegeRole } from "./schema.js";
import { getAiProfileV2 } from "./rules.js";

export type UnitThreatProfile = {
    unitThreat: number;
    cityThreat: number;
    captureThreat: number;
    zoneThreat: number;
    retaliationThreat: number;
    strategicValue: number;
    totalThreat: number;
};

export type CityValueProfile = {
    baseValue: number;
    recaptureValue: number;
    capitalValue: number;
    finisherValue: number;
    zeroedValue: number;
    hpFrac: number;
    totalValue: number;
};

function unitStrategicValue(type: UnitType): number {
    if (String(type).startsWith("Army")) return 18;
    if (type === UnitType.Titan) return 50;
    if (type === UnitType.Riders) return 12;
    if (type === UnitType.BowGuard) return 11;
    if (type === UnitType.SpearGuard) return 10;
    if (type === UnitType.Scout || type === UnitType.ArmyScout) return 4;
    if (type === UnitType.Settler) return 30;
    return 8;
}

export function getUnitStrategicValue(unit: Unit): number {
    return unitStrategicValue(unit.type);
}

export function getUnitThreatLevel(unit: Unit): number {
    const stats = UNITS[unit.type];
    return stats.atk + (stats.rng > 1 ? 2 : 0);
}

export function getUnitThreatProfile(unit: Unit): UnitThreatProfile {
    const stats = UNITS[unit.type];
    const role = getUnitRole(unit.type);
    const unitThreat = getUnitThreatLevel(unit);
    const strategicValue = unitStrategicValue(unit.type);

    const zoneThreat = stats.rng > 1 ? 2 : 0;
    const captureThreat = stats.canCaptureCity ? 6 : 0;
    const cityThreat = unitThreat + (stats.canCaptureCity ? 1 : 0);
    const retaliationThreat = unitThreat;

    let totalThreat = (unitThreat * 4) + (strategicValue * 1.2);
    if (stats.rng > 1) totalThreat += 6;
    if (isSiegeRole(role)) totalThreat += 12;
    if (role === "capture") totalThreat += 6;
    if (unit.type === UnitType.Titan) totalThreat += 40;

    return {
        unitThreat,
        cityThreat,
        captureThreat,
        zoneThreat,
        retaliationThreat,
        strategicValue,
        totalThreat
    };
}

export function getCityValueProfile(
    state: GameState,
    playerId: string,
    city: City,
    hpOverride?: number
): CityValueProfile {
    const profile = getAiProfileV2(state, playerId);
    const currentHp = hpOverride ?? city.hp;
    const hpFrac = city.maxHp ? currentHp / city.maxHp : 1;

    const baseValue = 20;
    let recaptureValue = 0;
    if (city.originalOwnerId === playerId && city.ownerId !== playerId) {
        recaptureValue += 500;
        if (city.isCapital) recaptureValue += 1000;
    }

    let capitalValue = 0;
    if (city.isCapital && city.ownerId === playerId && city.originalOwnerId !== playerId) {
        capitalValue += 100;
    }
    if (city.isCapital) {
        capitalValue += 120 + (120 * profile.titan.capitalHunt);
    }

    const finisherValue = (1 - hpFrac) * 18 * profile.titan.finisher;
    const zeroedValue = currentHp <= 0 ? 40 : 0;
    const totalValue = baseValue + recaptureValue + capitalValue + finisherValue + zeroedValue;

    return {
        baseValue,
        recaptureValue,
        capitalValue,
        finisherValue,
        zeroedValue,
        hpFrac,
        totalValue
    };
}
