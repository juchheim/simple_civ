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
} from "./types.js";

export const GAME_VERSION = "0.98";
export const MAX_PLAYERS = 6;

// Max civilizations per map size
export const MAX_CIVS_BY_MAP_SIZE: Record<string, number> = {
    Tiny: 2,
    Small: 3,
    Standard: 4,
    Large: 6,
    Huge: 6,
};

// Yields
export const BASE_CITY_SCIENCE = 1;
export const CITY_CENTER_MIN_FOOD = 2;
export const CITY_CENTER_MIN_PROD = 1;

// City Borders
export const CITY_WORK_RADIUS_RINGS = 2;

// HP / Combat
export const BASE_UNIT_HP = 10;
export const ARMY_UNIT_HP = 15;
export const BASE_CITY_HP = 15;  // Was 20 - easier to capture
export const CAPTURED_CITY_HP_RESET = 8;  // Was 10 - proportional reduction
export const DAMAGE_MIN = 1;
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
export const CITY_HEAL_PER_TURN = 1;  // Was 2 - slower regen

// Growth
export const BASECOST_POP2 = 30;
export const GROWTH_FACTORS = [
    { min: 2, max: 4, f: 1.30 },
    { min: 5, max: 6, f: 1.40 },
    { min: 7, max: 8, f: 1.58 },  // Increased from 1.50 (+5.3%) to slow growth for pop 7-8
    { min: 9, max: 10, f: 1.68 }, // Increased from 1.60 (+5.0%) to slow growth for pop 9-10
    { min: 11, max: 999, f: 2.00 },
];
export const FARMSTEAD_GROWTH_MULT = 0.9;
export const JADE_GRANARY_GROWTH_MULT = 0.85;
// v0.97 balance: JadeCovenant passive "Verdant Growth" - 10% faster growth globally
export const JADE_COVENANT_GROWTH_MULT = 0.9;

// Tech Costs
export const TECH_COST_HEARTH = 20;
export const TECH_COST_BANNER = 40;
export const TECH_COST_ENGINE = 65;

// Projects (v0.98: Increased costs to slow down Progress victories)
export const OBSERVATORY_COST = 80;         // Was 60 - 33% increase
export const GRAND_ACADEMY_COST = 110;      // Was 85 - 29% increase
export const GRAND_EXPERIMENT_COST = 140;   // Was 105 - 33% increase

// v0.98: Civ-specific starting bonuses
export const AETHERIAN_EXTRA_STARTING_UNITS = [UnitType.SpearGuard]; // Extra military at start
export const STARBORNE_EXTRA_STARTING_UNITS = [UnitType.Scout]; // Extra scout for exploration
// NOTE: JadeCovenant extra settler REMOVED - 80% win rate was too strong

// v0.98 Update 5: JadeCovenant Population Power - NERFED from 5 to 8
// At 54 avg pop, this reduces bonus from +10/+10 to +6/+6
export const JADE_COVENANT_POP_COMBAT_BONUS_PER = 8; // +1 combat strength per 8 pop

// v0.98: AetherianVanguard military production bonus
export const AETHERIAN_MILITARY_PRODUCTION_MULT = 0.75; // 25% faster military production

// v0.98 Update 4: ForgeClans "Master Craftsmen" - 25% faster project completion
export const FORGE_CLANS_PROJECT_SPEED_MULT = 0.80; // Projects cost 20% less effective production

// v0.98 Update 5: ForgeClans "Forged Arms" - combat bonus for hill production
export const FORGE_CLANS_HILL_COMBAT_THRESHOLD = 2; // Min worked hills for bonus
export const FORGE_CLANS_HILL_COMBAT_BONUS = 1; // +1 Attack for units from hill cities

// v0.98 Update 5: ForgeClans cheaper military production
export const FORGE_CLANS_MILITARY_DISCOUNT = 0.80; // 20% cheaper military units

// v0.98 Update 6: ForgeClans "Industrial Warfare" - attack bonus per Engine-era tech
// Engine-era techs: SteamForges, CityWards, UrbanPlans, SignalRelay, StarCharts (5 total)
export const FORGE_CLANS_ENGINE_ATTACK_BONUS = 1; // +1 Attack per Engine tech (max +5)

// v0.98 Update 5: StarborneSeekers "Celestial Guidance" - defense near capital
export const STARBORNE_CAPITAL_DEFENSE_RADIUS = 3; // Tiles from capital
export const STARBORNE_CAPITAL_DEFENSE_BONUS = 1; // +1 Defense

// v0.98 Update 8: ScholarKingdoms "Scholarly Retreat" - defense near science buildings
export const SCHOLAR_KINGDOMS_DEFENSE_RADIUS = 2; // Tiles from Scriptorium/Academy city
export const SCHOLAR_KINGDOMS_DEFENSE_BONUS = 2; // +2 Defense (stronger than Starborne to help them survive)

// Settler
export const SETTLER_COST = 20;
export const SETTLER_POP_LOSS_ON_BUILD = 1;

// City Defense
export const CITY_DEFENSE_BASE = 3;
export const CITY_WARD_DEFENSE_BONUS = 4;
export const CITY_ATTACK_BASE = 3;
export const FORTIFY_DEFENSE_BONUS = 2;
export const DAMAGE_BASE = 4;
export const CITY_WARD_ATTACK_BONUS = 1;
export const CITY_ATTACK_RANGE = 2;

// Map Sizes (v0.96 balance: Increased smaller map sizes to reduce stalls)
export const MAP_DIMS = {
    Tiny: { w: 14, h: 10 },      // Was 12×8 (96 tiles), now 140 tiles (+46%)
    Small: { w: 18, h: 14 },     // Was 16×12 (192 tiles), now 252 tiles (+31%)
    Standard: { w: 22, h: 16 },  // Was 20×14 (280 tiles), now 352 tiles (+26%)
    Large: { w: 24, h: 18 },     // Unchanged (432 tiles)
    Huge: { w: 32, h: 24 },      // Unchanged (768 tiles)
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
    // v0.98 Update 3: Settler HP set to 1 for testing
    [UnitType.Settler]: { atk: 0, def: 2, rng: 1, move: 1, hp: 1, cost: 20, domain: UnitDomain.Civilian, canCaptureCity: false, vision: 2 },
    [UnitType.Scout]: { atk: 1, def: 1, rng: 1, move: 2, hp: 10, cost: 25, domain: UnitDomain.Land, canCaptureCity: false, vision: 3 },
    [UnitType.SpearGuard]: { atk: 2, def: 2, rng: 1, move: 1, hp: 10, cost: 30, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.BowGuard]: { atk: 2, def: 1, rng: 2, move: 1, hp: 10, cost: 30, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    [UnitType.Riders]: { atk: 2, def: 2, rng: 1, move: 2, hp: 10, cost: 35, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.RiverBoat]: { atk: 2, def: 2, rng: 1, move: 3, hp: 10, cost: 35, domain: UnitDomain.Naval, canCaptureCity: false, vision: 2 },
    [UnitType.ArmyScout]: { atk: 3, def: 3, rng: 1, move: 2, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 3 },
    [UnitType.ArmySpearGuard]: { atk: 8, def: 4, rng: 1, move: 1, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.ArmyBowGuard]: { atk: 6, def: 3, rng: 2, move: 1, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    [UnitType.ArmyRiders]: { atk: 8, def: 4, rng: 1, move: 2, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.Titan]: { atk: 25, def: 10, rng: 1, move: 3, hp: 50, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 3 },
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
    [BuildingType.TitansCore]: { era: EraId.Engine, techReq: TechId.SteamForges, cost: 150, conditional: "Summons The Titan upon completion" }, // v0.98: Reduced from 200
    [BuildingType.SpiritObservatory]: { era: EraId.Engine, techReq: TechId.StarCharts, cost: 275, conditional: "The Revelation: completes current tech, grants free tech, +2 Science per city, counts as Observatory milestone" }, // v0.98 Update 6: Increased from 200 to nerf Progress rush
    [BuildingType.JadeGranary]: { era: EraId.Banner, techReq: TechId.Wellworks, cost: 100, conditional: "The Great Harvest: +1 Pop per city, 15% cheaper growth, +1 Food per city" }, // v0.98 Update 8: Reduced from 150 - was only built 14% of games
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
    [TechId.TrailMaps]: { era: EraId.Hearth, cost: 20, prereqTechs: [], unlock: { type: "Unit", id: UnitType.RiverBoat } },
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

export type ProjectData = {
    cost: number;
    prereqTechs?: TechId[];
    prereqMilestone?: ProjectId;
    oncePerCiv: boolean;
    oneCityAtATime: boolean;
    onComplete: { type: "Milestone" | "Victory" | "Transform"; payload: any };
};

export const PROJECTS: Record<ProjectId, ProjectData> = {
    [ProjectId.Observatory]: {
        cost: 160,  // v0.98: Increased from 120 (33% increase)
        prereqTechs: [TechId.StarCharts],
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusCity: 1, unlock: ProjectId.GrandAcademy } },
    },
    [ProjectId.GrandAcademy]: {
        cost: 210,  // v0.98: Increased from 165 (27% increase)
        prereqMilestone: ProjectId.Observatory,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusPerCity: 1, unlock: ProjectId.GrandExperiment } },
    },
    [ProjectId.GrandExperiment]: {
        cost: 280,  // v0.98: Increased from 210 (33% increase)
        prereqMilestone: ProjectId.GrandAcademy,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Victory", payload: { victory: "Progress" } },
    },
    [ProjectId.FormArmy_SpearGuard]: {
        cost: 10,  // v0.98 Update 5: Reduced from 15 to make armies more accessible
        oncePerCiv: false,
        oneCityAtATime: false,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.SpearGuard, armyUnit: UnitType.ArmySpearGuard } },
    },
    [ProjectId.FormArmy_BowGuard]: {
        cost: 10,  // v0.98 Update 5: Reduced from 15 to make armies more accessible
        oncePerCiv: false,
        oneCityAtATime: false,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.BowGuard, armyUnit: UnitType.ArmyBowGuard } },
    },
    [ProjectId.FormArmy_Riders]: {
        cost: 10,  // v0.98 Update 6: Reduced from 15 (was 20) - 0 formations in 50 games!
        oncePerCiv: false,
        oneCityAtATime: false,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.Riders, armyUnit: UnitType.ArmyRiders } },
    },
    // Marker project for tracking Jade Granary completion (not buildable directly)
    [ProjectId.JadeGranaryComplete]: {
        cost: 0,
        oncePerCiv: true,
        oneCityAtATime: false,
        onComplete: { type: "Milestone", payload: { marker: "JadeGranary" } },
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
