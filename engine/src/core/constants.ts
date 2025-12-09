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

export const GAME_VERSION = "1.0";
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
export const BASE_CITY_HP = 15;  // Was 20 - easier to capture
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
export const JADE_COVENANT_GROWTH_MULT = 0.9;

// Tech Costs defined in TECHS object below
// Project Costs defined in PROJECTS object below

// v0.98: Civ-specific starting bonuses
export const AETHERIAN_EXTRA_STARTING_UNITS: UnitType[] = []; // v1.4: Removed extra SpearGuard (was too strong)
export const STARBORNE_EXTRA_STARTING_UNITS = []; // v0.99: Removed extra scout (was too strong)
// NOTE: JadeCovenant extra settler REMOVED - 80% win rate was too strong

// v0.98 Update 5: JadeCovenant Population Power - NERFED from 5 to 8, then to 10
// At 54 avg pop, this reduces bonus from +6/+6 (at 8) to +5/+5 (at 10)
export const JADE_COVENANT_POP_COMBAT_BONUS_PER = 8; // v1.5: Reverted to 8 (was 10)



// v1.9: REMOVED - Projects 20% faster perk (was never actually implemented in game logic)

// v0.98 Update 5: ForgeClans "Forged Arms" - combat bonus for hill production
export const FORGE_CLANS_HILL_COMBAT_THRESHOLD = 2; // Min worked hills for bonus
export const FORGE_CLANS_HILL_COMBAT_BONUS = 1; // +1 Attack for units from hill cities

// v0.98 Update 5: ForgeClans cheaper military production
export const FORGE_CLANS_MILITARY_DISCOUNT = 0.95; // v1.9: NERFED - 5% cheaper (was 10%)

// v0.98 Update 6: ForgeClans "Industrial Warfare" - attack bonus per Engine-era tech
// Engine-era techs: SteamForges, CityWards, UrbanPlans, SignalRelay, StarCharts (5 total)
export const FORGE_CLANS_ENGINE_ATTACK_BONUS = 1; // +1 Attack per Engine tech (max +5)

// v0.98 Update 5: StarborneSeekers "Celestial Guidance" - defense near capital
export const STARBORNE_CAPITAL_DEFENSE_RADIUS = 3; // Tiles from capital
export const STARBORNE_CAPITAL_DEFENSE_BONUS = 1; // +1 Defense

// v0.98 Update 8: ScholarKingdoms "Scholarly Retreat" - defense near any city
export const SCHOLAR_KINGDOMS_DEFENSE_RADIUS = 1; // Tiles from any city
export const SCHOLAR_KINGDOMS_DEFENSE_BONUS = 2; // +2 Defense

// Settler
export const SETTLER_COST = 20;
export const SETTLER_POP_LOSS_ON_BUILD = 1;

// City Defense
export const UNIT_BASE_DAMAGE = 6;
export const CITY_DEFENSE_BASE = 3;
export const CITY_WARD_DEFENSE_BONUS = 4;
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

// v2.0: Titan regeneration by location
export const TITAN_REGEN_BASE = 1;      // Enemy/neutral territory
export const TITAN_REGEN_TERRITORY = 3; // Friendly territory
export const TITAN_REGEN_CITY = 5;      // Friendly city

// Map Dimensions (Width x Height)
// v0.98 Update 8: Increased all sizes by ~5% (approx 10% more tiles) to encourage expansion
export const MAP_DIMS = {
    Tiny: { width: 15, height: 11 },     // Was 14x10 (140) -> 165 (+18%)
    Small: { width: 19, height: 15 },    // Was 18x14 (252) -> 285 (+13%)
    Standard: { width: 23, height: 17 }, // Was 22x16 (352) -> 391 (+11%)
    Large: { width: 25, height: 19 },    // Was 24x18 (432) -> 475 (+10%)
    Huge: { width: 34, height: 25 },     // Was 32x24 (768) -> 850 (+10%)
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
    [UnitType.Titan]: { atk: 30, def: 8, rng: 1, move: 2, hp: 30, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 3 },
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
    [BuildingType.Reservoir]: { era: EraId.Banner, techReq: TechId.Wellworks, cost: 60, yieldFlat: { F: 1 }, conditional: "+1F more if river city" },
    [BuildingType.LumberMill]: { era: EraId.Banner, techReq: TechId.TimberMills, cost: 60, yieldFlat: { P: 1 }, conditional: "+1P more if any Forest worked" },
    [BuildingType.Academy]: { era: EraId.Banner, techReq: TechId.ScholarCourts, cost: 60, yieldFlat: { S: 2 } },
    [BuildingType.CityWard]: { era: EraId.Banner, techReq: TechId.CityWards, cost: 60, defenseBonus: 4, cityAttackBonus: 1 },
    [BuildingType.Forgeworks]: { era: EraId.Engine, techReq: TechId.SteamForges, cost: 80, yieldFlat: { P: 2 } },
    [BuildingType.CitySquare]: { era: EraId.Engine, techReq: TechId.UrbanPlans, cost: 80, yieldFlat: { F: 1, P: 1 } },
    [BuildingType.TitansCore]: { era: EraId.Engine, techReq: TechId.SteamForges, cost: 80, conditional: "Summons The Titan upon completion" }, // v1.9: Buffed to 80 (was 100)
    [BuildingType.SpiritObservatory]: { era: EraId.Engine, techReq: TechId.StarCharts, cost: 220, conditional: "The Revelation: +1 Science per city, counts as Observatory milestone" }, // v1.6: Reduced from 300 to match Observatory cost
    [BuildingType.JadeGranary]: { era: EraId.Hearth, techReq: TechId.Fieldcraft, cost: 30, conditional: "The Great Harvest: +1 Pop per city, 15% cheaper growth, +1 Food per city, Spawns Free Settler" }, // v0.99 BUFF: Cost 30, Free Settler
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
    [TechId.SteamForges]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.TimberMills], unlock: { type: "Building", id: BuildingType.Forgeworks } },
    [TechId.SignalRelay]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.ScholarCourts], unlock: { type: "Passive", key: "+1 Science per city" } },
    [TechId.UrbanPlans]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.Wellworks], unlock: { type: "Building", id: BuildingType.CitySquare } },
    [TechId.ArmyDoctrine]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.DrilledRanks], unlock: { type: "Passive", key: "+1/+1 to Armies" } },
    [TechId.StarCharts]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.ScholarCourts], unlock: { type: "Project", id: ProjectId.Observatory } },
};



export const PROJECTS: Record<ProjectId, ProjectDefinition> = {
    [ProjectId.Observatory]: {
        cost: 220,  // v1.3: Increased from 190
        prereqTechs: [TechId.StarCharts],
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusCity: 1, unlock: ProjectId.GrandAcademy } },
    },
    [ProjectId.GrandAcademy]: {
        cost: 265,
        prereqMilestone: ProjectId.Observatory,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusPerCity: 1, unlock: ProjectId.GrandExperiment } },
    },
    [ProjectId.GrandExperiment]: {
        cost: 350,
        prereqMilestone: ProjectId.GrandAcademy,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Victory", payload: { victory: "Progress" } },
    },
    [ProjectId.FormArmy_SpearGuard]: {
        cost: 10,
        oncePerCiv: false,
        oneCityAtATime: false,
        scalesWithTurn: true,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.SpearGuard, armyUnit: UnitType.ArmySpearGuard } },
    },
    [ProjectId.FormArmy_BowGuard]: {
        cost: 10,
        oncePerCiv: false,
        oneCityAtATime: false,
        scalesWithTurn: true,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.BowGuard, armyUnit: UnitType.ArmyBowGuard } },
    },
    [ProjectId.FormArmy_Riders]: {
        cost: 10,
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
