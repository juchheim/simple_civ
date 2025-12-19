/**
 * capabilities.ts - Goal-Driven AI: Unit Roles and Tech Chains
 * 
 * This is the single source of truth for:
 * 1. What each unit DOES (role)
 * 2. What each tech UNLOCKS
 * 3. Full prerequisite chains for key targets
 */

import { TechId, UnitType, BuildingType } from "../../core/types.js";

// =============================================================================
// UNIT ROLES
// =============================================================================

export type UnitRole = "siege" | "capture" | "defense" | "vision" | "civilian";

export const UNIT_ROLES: Record<UnitType, UnitRole> = {
    // Siege: Ranged damage to cities
    [UnitType.BowGuard]: "siege",
    [UnitType.ArmyBowGuard]: "siege",

    // Capture: Take cities at 0 HP
    [UnitType.SpearGuard]: "capture",
    [UnitType.ArmySpearGuard]: "capture",
    [UnitType.Riders]: "capture",
    [UnitType.ArmyRiders]: "capture",
    [UnitType.Landship]: "capture",
    [UnitType.Titan]: "capture",

    // Defense: Defensive units (Lorekeeper for Scholar/Starborne civs)
    [UnitType.Lorekeeper]: "defense",

    // Vision: Scout enemy positions
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

// =============================================================================
// TECH UNLOCKS
// =============================================================================

export type TechUnlock = {
    units?: UnitType[];
    buildings?: BuildingType[];
};

export const TECH_UNLOCKS: Partial<Record<TechId, TechUnlock>> = {
    // Hearth Era
    [TechId.FormationTraining]: { units: [UnitType.SpearGuard, UnitType.BowGuard] },
    [TechId.StoneworkHalls]: { buildings: [BuildingType.StoneWorkshop] },
    [TechId.ScriptLore]: { buildings: [BuildingType.Scriptorium] },

    // Banner Era
    [TechId.DrilledRanks]: { units: [UnitType.ArmySpearGuard, UnitType.ArmyBowGuard] },
    [TechId.TrailMaps]: { units: [UnitType.Riders] },
    [TechId.CityWards]: { buildings: [BuildingType.CityWard, BuildingType.Bulwark] },
    [TechId.ScholarCourts]: { buildings: [BuildingType.Academy] },

    // Engine Era
    [TechId.SteamForges]: { buildings: [BuildingType.TitansCore, BuildingType.Forgeworks] },
    [TechId.ArmyDoctrine]: { units: [UnitType.ArmyRiders] },
    [TechId.StarCharts]: { buildings: [BuildingType.SpiritObservatory] },

    // Aether Era  
    [TechId.CompositeArmor]: { units: [UnitType.Landship] },
    [TechId.Aerodynamics]: { units: [UnitType.Airship] },
};

// =============================================================================
// TECH CHAINS (Full Paths)
// =============================================================================

/**
 * Full prerequisite chains to reach key units/buildings.
 * Order: Research these in sequence.
 */
export const TECH_CHAINS: Record<string, TechId[]> = {
    // Late-game units
    Landship: [TechId.FormationTraining, TechId.DrilledRanks, TechId.ArmyDoctrine, TechId.CompositeArmor],
    Airship: [TechId.ScriptLore, TechId.ScholarCourts, TechId.TimberMills, TechId.SteamForges, TechId.Aerodynamics],
    ArmyRiders: [TechId.Fieldcraft, TechId.TrailMaps, TechId.DrilledRanks, TechId.ArmyDoctrine],

    // Unique buildings
    Titan: [TechId.StoneworkHalls, TechId.TimberMills, TechId.SteamForges],
    Bulwark: [TechId.StoneworkHalls, TechId.CityWards], // CityWards requires StoneworkHalls

    // ShieldGenerator path (late game): SignalRelay → PlasmaShields
    ShieldGenerator: [TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.PlasmaShields],

    // Victory projects - standard Progress path
    Progress: [TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts],

    // SpiritObservatory for StarborneSeekers: CityWards FIRST (early defense), then Progress path, then PlasmaShields (late game)
    SpiritObservatory: [TechId.StoneworkHalls, TechId.CityWards, TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts, TechId.PlasmaShields],

    // Defensive civs (Scholar/Starborne): CityWards FIRST for early protection, then Progress path, then PlasmaShields (late game bulking)
    // Order: StoneworkHalls → CityWards (early defense), then ScriptLore → ScholarCourts → SignalRelay → StarCharts (victory), then PlasmaShields (ShieldGenerator)
    Defensive: [TechId.StoneworkHalls, TechId.CityWards, TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts, TechId.PlasmaShields],
};

// =============================================================================
// UNIT QUERIES
// =============================================================================

export function getUnitsWithRole(role: UnitRole): UnitType[] {
    return Object.entries(UNIT_ROLES)
        .filter(([_, r]) => r === role)
        .map(([u]) => u as UnitType);
}

export function getTechForUnit(unit: UnitType): TechId | null {
    for (const [techId, unlock] of Object.entries(TECH_UNLOCKS)) {
        if (unlock.units?.includes(unit)) {
            return techId as TechId;
        }
    }
    return null;
}

export function getChainForTarget(target: string): TechId[] {
    return TECH_CHAINS[target] ?? [];
}
