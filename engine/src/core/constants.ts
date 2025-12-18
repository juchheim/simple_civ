import {
    BuildingType,
    EraId,
    ProjectId,
    TechId,
    TerrainType,
    UnitDomain,
    UnitType,
    Yields,
    OverlayType,
    ProjectDefinition,
} from "./types.js";

export const GAME_VERSION = "1.0.1";
// v6.0: Aether Era Flag - Enabled by default, or controlled via env var in Node
// Check if process is defined (Node) to avoid ReferenceError in browser
const isNode = typeof process !== "undefined" && process.env;
export const ENABLE_AETHER_ERA = isNode && process.env.ENABLE_AETHER_ERA === "false"
    ? false
    : (isNode && process.env.ENABLE_AETHER_ERA === "true" ? true : true);

/** Maximum number of players allowed in a game session. */
export const MAX_PLAYERS = 6;

// Max civilizations per map size
/**
 * Maximum number of civilizations (players + AI) allowed for each map size.
 * Used to constrain the "Number of Civs" selector in the UI.
 */
export const MAX_CIVS_BY_MAP_SIZE: Record<string, number> = {
    Tiny: 2,
    Small: 3,
    Standard: 4,
    Large: 6,
    Huge: 6,
};

// Yields
// Yields
/** Base science yield for every city (before buildings/modifiers). */
export const BASE_CITY_SCIENCE = 1;
/** Minimum food yield for a city center tile. */
export const CITY_CENTER_MIN_FOOD = 2;
/** Minimum production yield for a city center tile. */
export const CITY_CENTER_MIN_PROD = 1;

// City Borders
// City Borders
/** Radius of tiles around a city that can be worked by citizens. */
export const CITY_WORK_RADIUS_RINGS = 2;

// HP / Combat
// HP / Combat
/** Base HP for standard units (Settler, Scout, etc.). */
export const BASE_UNIT_HP = 10;
/** Base HP for Army units (formed from projects). */
export const ARMY_UNIT_HP = 15;
/** Base HP for a City. */
export const BASE_CITY_HP = 25;  // Buffed from 15 to 25 to slow conquest
/** HP a city resets to after being captured. */
export const CAPTURED_CITY_HP_RESET = 8;  // Was 10 - proportional reduction
/** Minimum damage a unit can deal in combat. */
export const DAMAGE_MIN = 1;
/** Maximum damage a unit can deal in combat. */
export const DAMAGE_MAX = 7;

// Diplomacy Constants
export const MIN_WAR_DURATION = 15; // Minimum turns a war must last
export const MIN_PEACE_DURATION = 15; // Minimum turns peace must last before declaring war

// Damage Constants
export const ATTACK_RANDOM_BAND = [-1, 0, 1];

// Fortify / Healing
export const FORTIFY_DEF_BONUS = 1;
export const HEAL_FRIENDLY_TILE = 3;
export const HEAL_FRIENDLY_CITY = 5;
export const CITY_HEAL_PER_TURN = 2;  // Restored to 2 for faster city recovery

// Growth
// Growth
/** Base food cost for a city to grow from population 1 to 2. */
export const BASECOST_POP2 = 30;
/**
 * Growth cost multipliers for higher population levels.
 * @property min - Minimum population for this factor.
 * @property max - Maximum population for this factor.
 * @property f - Multiplier applied to the previous level's cost.
 */
export const GROWTH_FACTORS = [
    { min: 2, max: 4, f: 1.30 },
    { min: 5, max: 6, f: 1.40 },
    { min: 7, max: 8, f: 1.80 },  // Increased from 1.58 to slow growth for pop 7-8
    { min: 9, max: 10, f: 2.00 }, // Increased from 1.68 to slow growth for pop 9-10
    { min: 11, max: 999, f: 2.50 }, // Increased from 2.00 to align pop 10+ cities with turn 188 average victory
];
export const FARMSTEAD_GROWTH_MULT = 0.9;
export const JADE_GRANARY_GROWTH_MULT = 0.85;
// v0.97 balance: JadeCovenant passive "Verdant Growth" - 10% faster growth globally
export const JADE_COVENANT_GROWTH_MULT = 0.85; // Buffed to 15% discount (was 0.9)

// Tech Costs defined in TECHS object below
// Project Costs defined in PROJECTS object below

// v0.98: Civ-specific starting bonuses
export const AETHERIAN_EXTRA_STARTING_UNITS: UnitType[] = []; // v1.4: Removed extra SpearGuard (was too strong)
export const STARBORNE_EXTRA_STARTING_UNITS = []; // v0.99: Removed extra scout (was too strong)
// NOTE: JadeCovenant extra settler REMOVED - 80% win rate was too strong

// v2.7: Forge Clans "Unleashed" - Start with Riders to begin aggression immediately
export const FORGE_CLANS_EXTRA_STARTING_UNITS: UnitType[] = [];

// v0.98 Update 5: JadeCovenant Population Power - NERFED from 5 to 8, then to 10
// At 54 avg pop, this reduces bonus from +6/+6 (at 8) to +5/+5 (at 10)
export const JADE_COVENANT_POP_COMBAT_BONUS_PER = 6; // v5.9: Buffed to 6 (was 8)



// v1.9: REMOVED - Projects 20% faster perk (was never actually implemented in game logic)

// v0.98 Update 5: ForgeClans "Forged Arms" - combat bonus for hill production
export const FORGE_CLANS_HILL_COMBAT_THRESHOLD = 2; // Min worked hills for bonus
export const FORGE_CLANS_HILL_COMBAT_BONUS = 2; // +2 Attack for units from hill cities (Buffed from 1)

// v0.98 Update 5: ForgeClans cheaper military production
export const FORGE_CLANS_MILITARY_DISCOUNT = 0.75; // v5.7: Buffed to 25% (was 15%)

// v0.98 Update 6: ForgeClans "Industrial Warfare" - attack bonus per Engine-era tech
// Engine-era techs: SteamForges, CityWards, UrbanPlans, SignalRelay, StarCharts (5 total)
export const FORGE_CLANS_ENGINE_ATTACK_BONUS = 1; // +1 Attack per Engine tech (max +5)

// v0.98 Update 5: StarborneSeekers "Celestial Guidance" - defense near capital
// v2.6: Starborne Buff - increased defense radius (3 -> 4)
export const STARBORNE_CAPITAL_DEFENSE_RADIUS = 4; // Tiles from capital
export const STARBORNE_CAPITAL_DEFENSE_BONUS = 2; // v2.8: Buffed from +1 to +2

// v0.98 Update 8: ScholarKingdoms "Scholarly Retreat" - defense near any city
export const SCHOLAR_KINGDOMS_DEFENSE_RADIUS = 1; // Tiles from any city
export const SCHOLAR_KINGDOMS_DEFENSE_BONUS = 8; // +8 Defense (Was 2)

// Settler
export const SETTLER_COST = 20;
export const SETTLER_POP_LOSS_ON_BUILD = 1;

// City Defense
export const UNIT_BASE_DAMAGE = 6;
export const CITY_DEFENSE_BASE = 3; // Nerfed from 4 to 3 (Reduce stalls)
export const CITY_WARD_DEFENSE_BONUS = 3; // Nerfed from 5 to 3
export const CITY_ATTACK_BASE = 3;
export const FORTIFY_DEFENSE_BONUS = 1;
export const DAMAGE_BASE = 4;
export const CITY_WARD_ATTACK_BONUS = 1;
export const CITY_ATTACK_RANGE = 2;

// v1.0: Garrison System Redesign
// Garrisons provide combat bonuses rather than being attackable HP barriers
export const GARRISON_MELEE_DEFENSE_BONUS = 2;  // SpearGuard, Riders
export const GARRISON_MELEE_ATTACK_BONUS = 1;
export const GARRISON_MELEE_RETALIATION_RANGE = 1; // Adjacent only

export const GARRISON_RANGED_DEFENSE_BONUS = 1;  // BowGuard
export const GARRISON_RANGED_ATTACK_BONUS = 3;
export const GARRISON_RANGED_RETALIATION_RANGE = 2; // Can hit back at range

// v2.0: Civ 6-style damage formula constants
export const CIV6_DAMAGE_BASE = 5;
export const CIV6_DAMAGE_DIVISOR = 25;
export const CIV6_DAMAGE_RANDOM_MIN = 0.9;
export const CIV6_DAMAGE_RANDOM_MAX = 1.1;
export const CIV6_DAMAGE_MIN = 1;
export const CIV6_DAMAGE_MAX = 15;

// v2.1: Titan regeneration by location (Buffed from 0/2/4 to 1/2/4)
export const TITAN_REGEN_BASE = 1;      // Enemy/neutral territory (Was 0)
export const TITAN_REGEN_TERRITORY = 2; // Friendly territory
export const TITAN_REGEN_CITY = 4;      // Friendly city

// Native Camp System Constants
export const NATIVE_CAMP_TERRITORY_RADIUS = 3;   // Tiles around camp considered territory
export const NATIVE_CAMP_AGGRO_DURATION = 3;     // Turns natives stay aggro'd
export const NATIVE_CAMP_CHASE_DISTANCE = 2;     // How far outside territory natives will chase
export const NATIVE_CHAMPION_CAMP_BONUS_ATK = 2; // +ATK when near camp
export const NATIVE_CHAMPION_CAMP_BONUS_DEF = 2; // +DEF when near camp
export const NATIVE_CHAMPION_CAMP_BONUS_RADIUS = 2; // Tiles from camp for bonus to apply
export const NATIVE_HEAL_TERRITORY = 2;          // HP/turn in camp territory
export const NATIVE_HEAL_CAMP_TILE = 2;          // HP/turn on camp tile itself
export const NATIVE_CAMP_MIN_DISTANCE_FROM_START = 8; // Min tiles from starting positions
export const NATIVE_CAMP_MIN_DISTANCE_BETWEEN = 6;    // Min tiles between camps
export const NATIVE_CAMP_CLEAR_PRODUCTION_REWARD = 20; // Production granted to the captured camp city
export const NATIVE_CAMP_COUNTS: Record<string, [number, number]> = {
    Tiny: [1, 2],
    Small: [2, 3],
    Standard: [3, 4],
    Large: [5, 6],
    Huge: [8, 10],
};

// Map Dimensions (Width x Height)
// v2.1: Increased all sizes by 10% for more room for coastal features
export const MAP_DIMS = {
    Tiny: { width: 17, height: 12 },     // Was 15x11 -> +13%
    Small: { width: 21, height: 17 },    // Was 19x15 -> +16%
    Standard: { width: 25, height: 19 }, // Was 23x17 -> +14%
    Large: { width: 28, height: 21 },    // Was 25x19 -> +16%
    Huge: { width: 37, height: 28 },     // Was 34x25 -> +15%
};

// Data Tables
export type TerrainData = {
    yields: Yields;
    moveCostLand?: number;
    moveCostNaval?: number;
    defenseMod: number;
    blocksLoS: boolean;
    workable: boolean;
    domain: UnitDomain | "Any";
};

export const TERRAIN: Record<TerrainType, TerrainData> = {
    [TerrainType.Plains]: { yields: { F: 1, P: 1, S: 0 }, moveCostLand: 1, defenseMod: 0, blocksLoS: false, workable: true, domain: "Any" },
    [TerrainType.Hills]: { yields: { F: 0, P: 2, S: 0 }, moveCostLand: 2, defenseMod: 2, blocksLoS: true, workable: true, domain: "Any" },
    [TerrainType.Forest]: { yields: { F: 1, P: 1, S: 0 }, moveCostLand: 2, defenseMod: 1, blocksLoS: true, workable: true, domain: "Any" },
    [TerrainType.Marsh]: { yields: { F: 2, P: 0, S: 0 }, moveCostLand: 2, defenseMod: -1, blocksLoS: false, workable: true, domain: "Any" },
    [TerrainType.Desert]: { yields: { F: 0, P: 1, S: 0 }, moveCostLand: 1, defenseMod: -1, blocksLoS: false, workable: true, domain: "Any" },
    [TerrainType.Mountain]: { yields: { F: 0, P: 0, S: 0 }, moveCostLand: undefined, defenseMod: 0, blocksLoS: true, workable: false, domain: "Any" },
    [TerrainType.Coast]: { yields: { F: 1, P: 0, S: 0 }, moveCostNaval: 1, defenseMod: 0, blocksLoS: false, workable: true, domain: UnitDomain.Naval },
    [TerrainType.DeepSea]: { yields: { F: 1, P: 0, S: 0 }, moveCostNaval: 1, defenseMod: 0, blocksLoS: false, workable: true, domain: UnitDomain.Naval },
};

export type OverlayData = {
    yieldBonus?: Partial<Yields>;
    riverEdge?: boolean;
};

export const OVERLAY: Record<OverlayType, OverlayData> = {
    [OverlayType.RiverEdge]: { riverEdge: true },
    [OverlayType.RichSoil]: { yieldBonus: { F: 1 } },
    [OverlayType.OreVein]: { yieldBonus: { P: 1 } },
    [OverlayType.SacredSite]: { yieldBonus: { S: 1 } },
    [OverlayType.GoodieHut]: {}, // No permanent bonus - one-time discovery reward
    [OverlayType.NativeCamp]: {}, // No yield bonus - presence of natives
    [OverlayType.ClearedSettlement]: { yieldBonus: { F: 1 } }, // +1 Food bonus when camp cleared
};

export type UnitStats = {
    atk: number;
    def: number;
    rng: number;
    move: number;
    hp: number;
    cost: number;
    domain: UnitDomain;
    canCaptureCity: boolean;
    vision: number;
};

export const UNITS: Record<UnitType, UnitStats> = {
    // v1.0: Unit costs reduced ~10% to encourage more production
    [UnitType.Settler]: { atk: 0, def: 2, rng: 1, move: 1, hp: 1, cost: 18, domain: UnitDomain.Civilian, canCaptureCity: false, vision: 2 },
    [UnitType.Scout]: { atk: 1, def: 1, rng: 1, move: 2, hp: 10, cost: 23, domain: UnitDomain.Land, canCaptureCity: false, vision: 3 },
    [UnitType.SpearGuard]: { atk: 2, def: 2, rng: 1, move: 1, hp: 10, cost: 27, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.BowGuard]: { atk: 2, def: 1, rng: 2, move: 1, hp: 10, cost: 27, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    [UnitType.Riders]: { atk: 2, def: 2, rng: 1, move: 2, hp: 10, cost: 32, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.Skiff]: { atk: 2, def: 2, rng: 1, move: 3, hp: 10, cost: 32, domain: UnitDomain.Naval, canCaptureCity: false, vision: 2 },
    [UnitType.ArmyScout]: { atk: 3, def: 3, rng: 1, move: 2, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 3 },
    [UnitType.ArmySpearGuard]: { atk: 8, def: 4, rng: 1, move: 1, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.ArmyBowGuard]: { atk: 6, def: 3, rng: 2, move: 1, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    [UnitType.ArmyRiders]: { atk: 8, def: 4, rng: 1, move: 2, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.Titan]: { atk: 22, def: 6, rng: 1, move: 2, hp: 25, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    // Native units (non-player controlled)
    [UnitType.NativeChampion]: { atk: 4, def: 4, rng: 1, move: 1, hp: 18, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    [UnitType.NativeArcher]: { atk: 3, def: 2, rng: 2, move: 1, hp: 12, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    // v6.0: Aether Era Units
    // Airship: Untargetable support unit. High vision.
    [UnitType.Airship]: { atk: 0, def: 10, rng: 0, move: 4, hp: 20, cost: 120, domain: UnitDomain.Air, canCaptureCity: false, vision: 4 },
    // Landship: Late game siege breaker.
    [UnitType.Landship]: { atk: 14, def: 10, rng: 1, move: 3, hp: 25, cost: 300, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
};

export type BuildingData = {
    era: EraId;
    techReq: TechId;
    cost: number;
    yieldFlat?: Partial<Yields>;
    growthMult?: number;
    defenseBonus?: number;
    cityAttackBonus?: number;
    conditional?: string;
};

export const BUILDINGS: Record<BuildingType, BuildingData> = {
    [BuildingType.Farmstead]: { era: EraId.Hearth, techReq: TechId.Fieldcraft, cost: 40, yieldFlat: { F: 1 }, growthMult: 0.9 },
    [BuildingType.StoneWorkshop]: { era: EraId.Hearth, techReq: TechId.StoneworkHalls, cost: 40, yieldFlat: { P: 1 } },
    [BuildingType.Scriptorium]: { era: EraId.Hearth, techReq: TechId.ScriptLore, cost: 40, yieldFlat: { S: 1 } },
    [BuildingType.Reservoir]: { era: EraId.Hearth, techReq: TechId.Wellworks, cost: 50, yieldFlat: { F: 2 }, conditional: "+1 Food per water tile" }, // v4.1: +2 Food base
    [BuildingType.LumberMill]: { era: EraId.Banner, techReq: TechId.TimberMills, cost: 60, yieldFlat: { P: 1 }, conditional: "+1P more if any Forest worked" },
    [BuildingType.Academy]: { era: EraId.Banner, techReq: TechId.ScholarCourts, cost: 50, yieldFlat: { S: 3 } }, // v4.2: S:3, Cost 50
    [BuildingType.CityWard]: { era: EraId.Banner, techReq: TechId.CityWards, cost: 40, defenseBonus: 3, cityAttackBonus: 1 }, // v6.1: Nerfed Defense 4->3
    [BuildingType.Forgeworks]: { era: EraId.Engine, techReq: TechId.SteamForges, cost: 80, yieldFlat: { P: 4 } }, // v5.0: Buffed from P:2 to P:4
    [BuildingType.CitySquare]: { era: EraId.Engine, techReq: TechId.UrbanPlans, cost: 80, yieldFlat: { F: 2, P: 2 } }, // v5.0: Buffed from F:1/P:1 to F:2/P:2
    [BuildingType.TitansCore]: { era: EraId.Engine, techReq: TechId.SteamForges, cost: 180, conditional: "Summons The Titan upon completion" }, // v2.6: Nerfed to 180 (was 80) to delay Titan
    [BuildingType.SpiritObservatory]: { era: EraId.Engine, techReq: TechId.StarCharts, cost: 160, yieldFlat: { S: 5, F: 4 }, conditional: "The Revelation: +4 Science, +4 Food, counts as Observatory milestone" }, // v4.1: S:5
    [BuildingType.JadeGranary]: { era: EraId.Hearth, techReq: TechId.Fieldcraft, cost: 50, yieldFlat: { F: 2, P: 1 }, conditional: "The Great Harvest: +2 Food, +1 Prod." }, // v5.8: Buffed Cost 50, +1 Prod
    // v5.5: Bulwark converted to Building (Scholar/Starborne only)
    [BuildingType.Bulwark]: {
        era: EraId.Hearth,
        techReq: TechId.StoneworkHalls,
        cost: 60,
        defenseBonus: 8, // v6.1: Nerfed Defense 12->8
        cityAttackBonus: 3,
        yieldFlat: { S: 1 },
        conditional: "Scholar/Starborne Only. City CANNOT form Armies."
    },
    // v6.0: Aether Era
    [BuildingType.AetherReactor]: { era: EraId.Aether, techReq: TechId.ZeroPointEnergy, cost: 200, yieldFlat: { F: 5, P: 5, S: 5 } },
    [BuildingType.ShieldGenerator]: { era: EraId.Aether, techReq: TechId.PlasmaShields, cost: 250, defenseBonus: 15, conditional: "Grants 50 Shield HP (regenerating)" },
};

export type TechData = {
    era: EraId;
    cost: number;
    prereqTechs: TechId[];
    unlock:
    | { type: "Building"; id: BuildingType }
    | { type: "Unit"; id: UnitType }
    | { type: "Passive"; key: string }
    | { type: "Project"; id: ProjectId };
};

export const TECHS: Record<TechId, TechData> = {
    [TechId.Fieldcraft]: { era: EraId.Hearth, cost: 20, prereqTechs: [], unlock: { type: "Building", id: BuildingType.Farmstead } },
    [TechId.StoneworkHalls]: { era: EraId.Hearth, cost: 20, prereqTechs: [], unlock: { type: "Building", id: BuildingType.StoneWorkshop } },
    [TechId.ScriptLore]: { era: EraId.Hearth, cost: 20, prereqTechs: [], unlock: { type: "Building", id: BuildingType.Scriptorium } },
    [TechId.FormationTraining]: { era: EraId.Hearth, cost: 20, prereqTechs: [], unlock: { type: "Passive", key: "+1/+1 to Melee & Ranged" } },
    [TechId.TrailMaps]: { era: EraId.Hearth, cost: 20, prereqTechs: [], unlock: { type: "Unit", id: UnitType.Skiff } },
    [TechId.Wellworks]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.Fieldcraft], unlock: { type: "Building", id: BuildingType.Reservoir } },
    [TechId.TimberMills]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.StoneworkHalls], unlock: { type: "Building", id: BuildingType.LumberMill } },
    [TechId.ScholarCourts]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.ScriptLore], unlock: { type: "Building", id: BuildingType.Academy } },
    [TechId.DrilledRanks]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.FormationTraining], unlock: { type: "Passive", key: "Enable Form Army projects" } },
    [TechId.CityWards]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.StoneworkHalls], unlock: { type: "Building", id: BuildingType.CityWard } },
    // v5.0: Engine Era tech costs increased (85 -> 100/120), rewards buffed
    [TechId.SteamForges]: { era: EraId.Engine, cost: 100, prereqTechs: [TechId.TimberMills], unlock: { type: "Building", id: BuildingType.Forgeworks } },
    [TechId.SignalRelay]: { era: EraId.Engine, cost: 100, prereqTechs: [TechId.ScholarCourts], unlock: { type: "Passive", key: "+2 Science per city" } }, // v5.0: Buffed from +1 to +2
    [TechId.UrbanPlans]: { era: EraId.Engine, cost: 100, prereqTechs: [TechId.Wellworks], unlock: { type: "Building", id: BuildingType.CitySquare } },
    [TechId.ArmyDoctrine]: { era: EraId.Engine, cost: 100, prereqTechs: [TechId.DrilledRanks], unlock: { type: "Passive", key: "+1/+1 to Armies" } },
    [TechId.StarCharts]: { era: EraId.Engine, cost: 120, prereqTechs: [TechId.SignalRelay], unlock: { type: "Project", id: ProjectId.Observatory } }, // v5.0: Gatekeeper tech, also enables Bulwark awakening

    // v6.0: Aether Era
    // High costs (200) representing end-game investment
    [TechId.Aerodynamics]: { era: EraId.Aether, cost: 200, prereqTechs: [TechId.SteamForges], unlock: { type: "Unit", id: UnitType.Airship } },
    [TechId.ZeroPointEnergy]: { era: EraId.Aether, cost: 200, prereqTechs: [TechId.UrbanPlans], unlock: { type: "Building", id: BuildingType.AetherReactor } },
    [TechId.CompositeArmor]: { era: EraId.Aether, cost: 200, prereqTechs: [TechId.ArmyDoctrine], unlock: { type: "Unit", id: UnitType.Landship } },
    [TechId.PlasmaShields]: { era: EraId.Aether, cost: 200, prereqTechs: [TechId.SignalRelay], unlock: { type: "Building", id: BuildingType.ShieldGenerator } },
    [TechId.DimensionalGate]: { era: EraId.Aether, cost: 200, prereqTechs: [TechId.StarCharts], unlock: { type: "Passive", key: "Global Mobility: +1 Move to all units" } },
};



export const PROJECTS: Record<ProjectId, ProjectDefinition> = {
    [ProjectId.Observatory]: {
        cost: 180,  // v1.4: Reduced from 220 to enable Progress victory before turn 300
        prereqTechs: [TechId.StarCharts],
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusCity: 1, unlock: ProjectId.GrandAcademy } },
    },
    [ProjectId.GrandAcademy]: {
        cost: 220,  // v1.4: Reduced from 265
        prereqMilestone: ProjectId.Observatory,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusPerCity: 1, unlock: ProjectId.GrandExperiment } },
    },
    [ProjectId.GrandExperiment]: {
        cost: 280,  // v1.4: Reduced from 350
        prereqMilestone: ProjectId.GrandAcademy,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Victory", payload: { victory: "Progress" } },
    },
    [ProjectId.FormArmy_SpearGuard]: {
        cost: 30,
        oncePerCiv: false,
        oneCityAtATime: false,
        scalesWithTurn: true,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.SpearGuard, armyUnit: UnitType.ArmySpearGuard } },
    },
    [ProjectId.FormArmy_BowGuard]: {
        cost: 30,
        oncePerCiv: false,
        oneCityAtATime: false,
        scalesWithTurn: true,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.BowGuard, armyUnit: UnitType.ArmyBowGuard } },
    },
    [ProjectId.FormArmy_Riders]: {
        cost: 30,
        oncePerCiv: false,
        oneCityAtATime: false,
        scalesWithTurn: true,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.Riders, armyUnit: UnitType.ArmyRiders } },
    },
    // Marker project for tracking Jade Granary completion (not buildable directly)
    [ProjectId.JadeGranaryComplete]: {
        cost: 0,
        oncePerCiv: true,
        oneCityAtATime: false,
        onComplete: { type: "Milestone", payload: { marker: "JadeGranary" } },
    },
    // Marker project for tracking Titan's Core completion (not buildable directly)
    [ProjectId.TitansCoreComplete]: {
        cost: 0,
        oncePerCiv: true,
        oneCityAtATime: false,
        onComplete: { type: "Milestone", payload: { marker: "TitansCore" } },
    },
    [ProjectId.HarvestFestival]: {
        cost: 100,
        prereqBuilding: BuildingType.Farmstead,
        oncePerCiv: false,
        oneCityAtATime: false,
        scalesWithTurn: true,
        onComplete: { type: "GrantYield", payload: { F: 25 } },
    },
    [ProjectId.AlchemicalExperiments]: {
        cost: 100,
        prereqBuilding: BuildingType.Scriptorium,
        oncePerCiv: false,
        oneCityAtATime: false,
        scalesWithTurn: true,
        onComplete: { type: "GrantYield", payload: { S: 25 } },
    },
};

export const CITY_NAMES: Record<string, string[]> = {
    ForgeClans: [
        "Ironhold", "Blackanvil", "Deepforge", "Stonehearth", "Grimpeak",
        "Moltenrock", "Steelgard", "Hammerfall", "Ashvein", "Emberpit",
        "Craghome", "Orebreach", "Slagdepths", "Bronzegate", "Coalheart",
        "Smelter's Rise", "Granitekeep", "Ironroot", "Bellowsbreath", "Sparkcleft"
    ],
    ScholarKingdoms: [
        "Savantia", "Lumina", "Scribesrest", "Wisdom's Port", "Celestia",
        "Scrollhaven", "Inkwell", "Prismara", "Lexicon", "Thoughtspire",
        "Clarity", "Epiphany", "Sagefield", "Mindreach", "Veritas",
        "Quillpoint", "Archive's End", "Logic's Bay", "Reason's Peak", "Thesis"
    ],
    RiverLeague: [
        "Verdantia", "Greenfield", "Fairhaven", "Bountiful", "Tradewind",
        "Harvest Home", "Meadowford", "Prospera", "Fertile Crescent", "Bloom",
        "Grainhold", "Marketcross", "Abundance", "Richfield", "Goldenleaf",
        "Sunvalley", "Growthpoint", "Vitalis", "Plenty", "Everspring"
    ],
    AetherianVanguard: [
        "Xylos", "Zenthor", "Vexia", "Aethelos", "Nyxara",
        "Kryos", "Onyxia", "Voidreach", "Starfall", "Nebula",
        "Zenith", "Vortex", "Quasar", "Eclipse", "Horizon's Edge",
        "Umbra", "Solara", "Lunaris", "Astral", "Cosmos"
    ],
    StarborneSeekers: [
        "Skywhisper", "Starhollow", "Moondance", "Dreamwalk", "Spiritsong",
        "Thundercloud", "Eaglereach", "Ghostwind", "Starfire", "Sunblaze",
        "Ravenstone", "Wolfhowl", "Dawnwatch", "Nightsky", "Spiritcall",
        "Stormveil", "Visionheart", "Cloudrest", "Whisperwind", "Starpath"
    ],
    JadeCovenant: [
        "Jadehall", "Silkveil", "Serene Dawn", "Golden Crane", "Moonlit Shrine",
        "Pearlfold", "Harmony", "Goldenwish", "Ancestor's Keep", "Lantern Gate",
        "Tranquil Heart", "Phoenix Rise", "Crimson Pavilion", "Jade Throne", "Eternal Gate",
        "Pagoda Heights", "Porcelain Court", "Dragon's Rest", "Silken Path", "Blessed Fortune"
    ],
};
