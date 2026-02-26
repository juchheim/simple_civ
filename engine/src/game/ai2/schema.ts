import { DiplomacyState, GameState, UnitDomain, UnitType } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";

export type UnitRole = "siege" | "capture" | "defense" | "vision" | "civilian";

export const UNIT_ROLE_MAP: Record<UnitType, UnitRole> = {
    // Siege: Ranged damage to cities AND units
    [UnitType.BowGuard]: "siege",
    [UnitType.ArmyBowGuard]: "siege",

    // City-only siege: Can only attack cities
    [UnitType.Trebuchet]: "siege",

    // Capture: Take cities at 0 HP
    [UnitType.SpearGuard]: "capture",
    [UnitType.ArmySpearGuard]: "capture",
    [UnitType.Riders]: "capture",
    [UnitType.ArmyRiders]: "capture",
    [UnitType.Landship]: "capture",
    [UnitType.Titan]: "capture",

    // Defense: Defensive units
    [UnitType.Lorekeeper]: "defense",

    // Vision: Scouts / exploration
    [UnitType.Scout]: "vision",
    [UnitType.ArmyScout]: "vision",
    [UnitType.Airship]: "vision",
    [UnitType.Skiff]: "vision",

    // Civilian
    [UnitType.Settler]: "civilian",

    // Natives (not buildable)
    [UnitType.NativeChampion]: "capture",
    [UnitType.NativeArcher]: "siege",
};

export function getUnitRole(type: UnitType): UnitRole {
    return UNIT_ROLE_MAP[type] ?? "capture";
}

export function isCivilianRole(role: UnitRole): boolean {
    return role === "civilian";
}

export function isVisionRole(role: UnitRole): boolean {
    return role === "vision";
}

export function isCombatRole(role: UnitRole): boolean {
    return !isCivilianRole(role) && !isVisionRole(role);
}

export function isMilitaryRole(role: UnitRole): boolean {
    return !isCivilianRole(role);
}

export function isCombatUnitType(type: UnitType): boolean {
    return isCombatRole(getUnitRole(type));
}

export function isMilitaryUnitType(type: UnitType): boolean {
    return isMilitaryRole(getUnitRole(type));
}

export function isSiegeRole(role: UnitRole): boolean {
    return role === "siege";
}

export function isSiegeUnitType(type: UnitType): boolean {
    return isSiegeRole(getUnitRole(type));
}

export function isRangedUnitType(type: UnitType): boolean {
    return UNITS[type].rng > 1;
}

export type UnitCapabilityProfile = {
    role: UnitRole;
    canAttackUnits: boolean;
    canAttackCities: boolean;
    canCaptureCities: boolean;
    range: number;
    mobility: number;
    isRanged: boolean;
    isArmy: boolean;
    isTitan: boolean;
    isSiege: boolean;
    isCityOnlySiege: boolean;
    garrisonEligible: boolean;
    tags: {
        frontline: boolean;
        skirmisher: boolean;
        siege_specialist: boolean;
        capturer: boolean;
        support: boolean;
    };
};

export function canAttackUnits(type: UnitType): boolean {
    const stats = UNITS[type];
    if (stats.domain === UnitDomain.Civilian || stats.domain === UnitDomain.Air) return false;
    if (type === UnitType.Trebuchet) return false;
    return stats.atk > 0 && stats.rng > 0;
}

export function canAttackCities(type: UnitType): boolean {
    const stats = UNITS[type];
    if (stats.domain === UnitDomain.Civilian || stats.domain === UnitDomain.Air) return false;
    return stats.atk > 0 && stats.rng > 0;
}

export function isCityOnlySiegeUnitType(type: UnitType): boolean {
    return isSiegeUnitType(type) && canAttackCities(type) && !canAttackUnits(type);
}

export function canCaptureCities(type: UnitType): boolean {
    return UNITS[type].canCaptureCity === true;
}

export function getUnitCapabilityProfile(type: UnitType): UnitCapabilityProfile {
    const role = getUnitRole(type);
    const stats = UNITS[type];
    const isArmy = String(type).startsWith("Army");
    const isTitan = type === UnitType.Titan;
    const isSiege = isSiegeRole(role);
    const isCityOnlySiege = isCityOnlySiegeUnitType(type);
    const canHitUnits = canAttackUnits(type);
    const canHitCities = canAttackCities(type);
    const canCapture = canCaptureCities(type);
    const isRanged = isRangedUnitType(type);
    const frontline = stats.rng === 1 && canHitUnits && role !== "vision" && role !== "civilian";
    const skirmisher = isRanged && canHitUnits && !isCityOnlySiege;
    const support = role === "defense" || stats.atk === 0 || stats.domain === UnitDomain.Air;

    const garrisonEligible = isCombatRole(role) &&
        type !== UnitType.Scout &&
        type !== UnitType.ArmyScout &&
        type !== UnitType.Trebuchet;

    return {
        role,
        canAttackUnits: canHitUnits,
        canAttackCities: canHitCities,
        canCaptureCities: canCapture,
        range: stats.rng,
        mobility: stats.move,
        isRanged,
        isArmy,
        isTitan,
        isSiege,
        isCityOnlySiege,
        garrisonEligible,
        tags: {
            frontline,
            skirmisher,
            siege_specialist: isCityOnlySiege,
            capturer: canCapture,
            support,
        },
    };
}

export function getUnitCapabilities(type: UnitType): {
    role: UnitRole;
    canAttackUnits: boolean;
    canAttackCities: boolean;
    canCaptureCities: boolean;
    isRanged: boolean;
    isSiege: boolean;
    isCitySiege: boolean;
} {
    const profile = getUnitCapabilityProfile(type);
    return {
        role: profile.role,
        canAttackUnits: profile.canAttackUnits,
        canAttackCities: profile.canAttackCities,
        canCaptureCities: profile.canCaptureCities,
        isRanged: profile.isRanged,
        isSiege: profile.isSiege,
        isCitySiege: profile.isCityOnlySiege,
    };
}

export function getWarEnemyIds(state: GameState, playerId: string): Set<string> {
    const ids = new Set<string>();
    for (const p of state.players) {
        if (p.id === playerId || p.isEliminated) continue;
        if (state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War) {
            ids.add(p.id);
        }
    }

    for (const cityState of state.cityStates ?? []) {
        if (cityState.warByPlayer[playerId]) {
            ids.add(cityState.ownerId);
        }
    }

    return ids;
}

export function isWarEnemyUnit(state: GameState, playerId: string, unit: { ownerId: string }): boolean {
    return getWarEnemyIds(state, playerId).has(unit.ownerId);
}
