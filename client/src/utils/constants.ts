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
} from "./engine-types";

export const GAME_VERSION = "0.91";
export const MAX_PLAYERS = 4;

// Yields
export const BASE_CITY_SCIENCE = 1;
export const CITY_CENTER_MIN_FOOD = 2;
export const CITY_CENTER_MIN_PROD = 1;

// City Borders
export const CITY_WORK_RADIUS_RINGS = 2;

// HP / Combat
export const BASE_UNIT_HP = 10;
export const ARMY_UNIT_HP = 15;
export const BASE_CITY_HP = 20;
export const CAPTURED_CITY_HP_RESET = 10;
export const DAMAGE_MIN = 1;
export const DAMAGE_MAX = 7;
export const DAMAGE_BASE = 3;
export const ATTACK_RANDOM_BAND = [-1, 0, 1];

// Fortify / Healing
export const FORTIFY_DEF_BONUS = 1;
export const HEAL_FRIENDLY_TILE = 3;
export const HEAL_FRIENDLY_CITY = 5;
export const CITY_HEAL_PER_TURN = 2;

// Growth
export const BASECOST_POP2 = 20;
export const GROWTH_FACTORS = [
    { min: 2, max: 4, f: 1.20 },
    { min: 5, max: 6, f: 1.27 },
    { min: 7, max: 8, f: 1.32 },
    { min: 9, max: 10, f: 1.37 },
    { min: 11, max: 999, f: 1.42 },
];
export const FARMSTEAD_GROWTH_MULT = 0.9;

// Tech Costs
export const TECH_COST_HEARTH = 20;
export const TECH_COST_BANNER = 50;
export const TECH_COST_ENGINE = 85;

// Projects
export const OBSERVATORY_COST = 120;
export const GRAND_ACADEMY_COST = 165;
export const GRAND_EXPERIMENT_COST = 210;

// Settler
export const SETTLER_COST = 70;
export const SETTLER_POP_LOSS_ON_BUILD = 1;

// City Defense
export const CITY_DEFENSE_BASE = 5;
export const CITY_WARD_DEFENSE_BONUS = 4;
export const CITY_ATTACK_BASE = 3;
export const CITY_WARD_ATTACK_BONUS = 1;
export const CITY_ATTACK_RANGE = 2;

// Map Sizes
export const MAP_DIMS = {
    Small: { w: 16, h: 12 },
    Standard: { w: 20, h: 14 },
    Large: { w: 24, h: 18 },
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
    [UnitType.Settler]: { atk: 0, def: 0, rng: 1, move: 1, hp: 1, cost: 70, domain: UnitDomain.Civilian, canCaptureCity: false, vision: 2 },
    [UnitType.Scout]: { atk: 1, def: 1, rng: 1, move: 2, hp: 10, cost: 25, domain: UnitDomain.Land, canCaptureCity: false, vision: 3 },
    [UnitType.SpearGuard]: { atk: 2, def: 2, rng: 1, move: 1, hp: 10, cost: 30, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.BowGuard]: { atk: 2, def: 1, rng: 2, move: 1, hp: 10, cost: 30, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    [UnitType.Riders]: { atk: 2, def: 2, rng: 1, move: 2, hp: 10, cost: 40, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.RiverBoat]: { atk: 2, def: 2, rng: 1, move: 3, hp: 10, cost: 35, domain: UnitDomain.Naval, canCaptureCity: false, vision: 2 },
    [UnitType.ArmyScout]: { atk: 3, def: 3, rng: 1, move: 2, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 3 },
    [UnitType.ArmySpearGuard]: { atk: 4, def: 4, rng: 1, move: 1, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
    [UnitType.ArmyBowGuard]: { atk: 4, def: 3, rng: 2, move: 1, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    [UnitType.ArmyRiders]: { atk: 4, def: 4, rng: 1, move: 2, hp: 15, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 },
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
    [TechId.FormationTraining]: { era: EraId.Hearth, cost: 20, prereqTechs: [], unlock: { type: "Passive", key: "+1 Def to Melee" } },
    [TechId.TrailMaps]: { era: EraId.Hearth, cost: 20, prereqTechs: [], unlock: { type: "Unit", id: UnitType.RiverBoat } },
    [TechId.Wellworks]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.Fieldcraft], unlock: { type: "Building", id: BuildingType.Reservoir } },
    [TechId.TimberMills]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.StoneworkHalls], unlock: { type: "Building", id: BuildingType.LumberMill } },
    [TechId.ScholarCourts]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.ScriptLore], unlock: { type: "Building", id: BuildingType.Academy } },
    [TechId.DrilledRanks]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.FormationTraining], unlock: { type: "Passive", key: "+1 Atk to Melee & Ranged" } },
    [TechId.CityWards]: { era: EraId.Banner, cost: 50, prereqTechs: [TechId.StoneworkHalls], unlock: { type: "Building", id: BuildingType.CityWard } },
    [TechId.SteamForges]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.TimberMills], unlock: { type: "Building", id: BuildingType.Forgeworks } },
    [TechId.SignalRelay]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.ScholarCourts], unlock: { type: "Passive", key: "+1 Science per city" } },
    [TechId.UrbanPlans]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.Wellworks], unlock: { type: "Building", id: BuildingType.CitySquare } },
    [TechId.ArmyDoctrine]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.DrilledRanks], unlock: { type: "Passive", key: "Enable Form Army projects" } },
    [TechId.StarCharts]: { era: EraId.Engine, cost: 85, prereqTechs: [TechId.ScriptLore, TechId.ScholarCourts], unlock: { type: "Project", id: ProjectId.Observatory } },
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
        cost: 120,
        prereqTechs: [TechId.StarCharts],
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusCity: 1, unlock: ProjectId.GrandAcademy } },
    },
    [ProjectId.GrandAcademy]: {
        cost: 165,
        prereqMilestone: ProjectId.Observatory,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusPerCity: 1, unlock: ProjectId.GrandExperiment } },
    },
    [ProjectId.GrandExperiment]: {
        cost: 210,
        prereqMilestone: ProjectId.GrandAcademy,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Victory", payload: { victory: "Progress" } },
    },
    [ProjectId.FormArmy_SpearGuard]: {
        cost: 15,
        oncePerCiv: false,
        oneCityAtATime: false,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.SpearGuard, armyUnit: UnitType.ArmySpearGuard } },
    },
    [ProjectId.FormArmy_BowGuard]: {
        cost: 15,
        oncePerCiv: false,
        oneCityAtATime: false,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.BowGuard, armyUnit: UnitType.ArmyBowGuard } },
    },
    [ProjectId.FormArmy_Riders]: {
        cost: 20,
        oncePerCiv: false,
        oneCityAtATime: false,
        onComplete: { type: "Transform", payload: { baseUnit: UnitType.Riders, armyUnit: UnitType.ArmyRiders } },
    },
};
