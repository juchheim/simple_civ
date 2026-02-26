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

export const GAME_VERSION = "1.0.2";
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
/** Base gold yield for every city (before buildings/modifiers). */
export const BASE_CITY_GOLD = 0;
/** Minimum food yield for a city center tile. */
export const CITY_CENTER_MIN_FOOD = 2;
/** Minimum production yield for a city center tile. */
export const CITY_CENTER_MIN_PROD = 1;
/** Minimum gold yield for a city center tile. */
export const CITY_CENTER_MIN_GOLD = 1;
/** Starting treasury for each civilization in a new game. */
export const STARTING_TREASURY = 40;
/** Base military supply available regardless of city count. */
export const MILITARY_FREE_SUPPLY_BASE = 1;
/** Military supply provided by each owned city. */
export const MILITARY_FREE_SUPPLY_PER_CITY = 1;
/** ScholarKingdoms passive free military supply to ease early economy collapse. */
export const SCHOLAR_KINGDOMS_FREE_SUPPLY_BONUS = 1;
/** Gold upkeep charged per supply point above free military supply. */
export const MILITARY_UPKEEP_PER_EXCESS_SUPPLY = 3;
/** City administration upkeep applied per city beyond the capital. */
export const CITY_ADMIN_UPKEEP_PER_CITY = 1;
/** Extra administration upkeep applied for very wide empires (city 5+). */
export const CITY_ADMIN_UPKEEP_WIDE_SURCHARGE = 2;
/**
 * Extra free supply granted by completed economic buildings.
 * This makes sustained military scale partially dependent on economy infrastructure.
 */
export const ECONOMIC_BUILDING_SUPPLY_BONUS: Partial<Record<BuildingType, number>> = {
    // Basic economic infrastructure should support early military scaling.
    [BuildingType.TradingPost]: 1,
    [BuildingType.MarketHall]: 0,
    [BuildingType.Bank]: 1,
    [BuildingType.Exchange]: 2,
};
/** Production penalty while in austerity. */
export const AUSTERITY_PRODUCTION_MULTIPLIER = 0.9;
/** Science penalty while in austerity. */
export const AUSTERITY_SCIENCE_MULTIPLIER = 0.9;

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
export const BASE_CITY_HP = 35;  // v7.2: Buffed from 25 to 35 to slow conquest
/** HP a city resets to after being captured. */
export const CAPTURED_CITY_HP_RESET = 10;  // v7.2: Increased from 8 to 10
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
export const CITY_HEAL_PER_TURN = 3;  // v7.2: Increased from 2 to 3 for better city recovery

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
    { min: 2, max: 4, f: 1.35 },   // v1.6: Reverted from 1.45 to 1.35 (midpoint)
    { min: 5, max: 6, f: 1.45 },   // v1.6: Reverted from 1.55 to 1.45 (midpoint)
    { min: 7, max: 8, f: 1.85 },   // v1.6: Reverted from 2.00 to 1.85 (midpoint)
    { min: 9, max: 10, f: 2.10 },  // v1.6: Slightly reduced from 2.20 to 2.10
    { min: 11, max: 999, f: 2.60 }, // v1.6: Slightly reduced - target pop 10 at turn ~195
];
export const FARMSTEAD_GROWTH_MULT = 0.9;
export const JADE_GRANARY_GROWTH_MULT = 0.9;
// JadeCovenant passive global growth discount removed in targeted balance pass.
export const JADE_COVENANT_GROWTH_MULT = 1.0;

// Tech Costs defined in TECHS object below
// Project Costs defined in PROJECTS object below

// v0.98: Civ-specific starting bonuses
export const AETHERIAN_EXTRA_STARTING_UNITS: UnitType[] = []; // v1.4: Removed extra SpearGuard (was too strong)
export const STARBORNE_EXTRA_STARTING_UNITS = []; // v0.99: Removed extra scout (was too strong)
// NOTE: JadeCovenant extra settler REMOVED - 80% win rate was too strong

// v2.7: Forge Clans "Unleashed" - Start with Riders to begin aggression immediately
export const FORGE_CLANS_EXTRA_STARTING_UNITS: UnitType[] = [];



// JadeCovenant "Swift Settlers" cost discount removed; movement identity remains.
export const JADE_COVENANT_SETTLER_DISCOUNT = 1.0;
export const JADE_COVENANT_SETTLER_MOVEMENT = 1;

// JadeCovenant "Population Power": +1 Atk/Def per X total population (capped).
export const JADE_COVENANT_POP_COMBAT_BONUS_PER = 29;
export const JADE_COVENANT_POP_COMBAT_BONUS_CAP = 2;





// v1.9: REMOVED - Projects 20% faster perk (was never actually implemented in game logic)

// v0.98 Update 5: ForgeClans "Forged Arms" - combat bonus for hill production
export const FORGE_CLANS_HILL_COMBAT_THRESHOLD = 2; // Min worked hills for bonus
export const FORGE_CLANS_HILL_COMBAT_BONUS = 2; // +2 Attack for units from hill cities (Buffed from 1)

// v0.98 Update 5: ForgeClans cheaper military production
export const FORGE_CLANS_MILITARY_DISCOUNT = 0.80; // v7.9: Nerfed to 20% (was 25%)

// v0.98 Update 6: ForgeClans "Industrial Warfare" - attack bonus per Engine-era tech
// Engine-era techs: SteamForges, CityWards, UrbanPlans, SignalRelay, StarCharts (5 total)
export const FORGE_CLANS_ENGINE_ATTACK_BONUS = 1; // +1 Attack per Engine tech (max +5)

// v1.7: ForgeClans "Forge Hardened" - flat attack bonus for all military units
export const FORGE_CLANS_FLAT_ATTACK_BONUS = 0; // v7.9: Removed (was +1)

// v1.8: RiverLeague "River Siege" - bonus when attacking cities
// v6.6k: Buffed from +1 to +2 to help RiverLeague win rate (was 18.1%)
export const RIVER_LEAGUE_SIEGE_BONUS = 2; // +2 Attack when attacking cities

// StarborneSeekers "Celestial Guidance" - global defense bonus
// v1.0.9: Simplified to flat +1 defense for all units (was radius-based around capital)
export const STARBORNE_CAPITAL_DEFENSE_RADIUS = 4; // DEPRECATED - no longer used
export const STARBORNE_CAPITAL_DEFENSE_BONUS = 1; // +1 Defense for all military units

// ScholarKingdoms "Scholarly Fortitude" - global defense bonus
// v1.0.9: Simplified to flat +1 defense for all units (was radius-based around cities)
export const SCHOLAR_KINGDOMS_DEFENSE_RADIUS = 99; // DEPRECATED - no longer used
export const SCHOLAR_KINGDOMS_DEFENSE_BONUS = 1; // +1 Defense for all military units



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

// v7.0: Lorekeeper "Fortified Knowledge" - +4 DEF in friendly territory or on city
export const LOREKEEPER_TERRITORY_DEFENSE_BONUS = 2; // v8.13: Nerfed from 4 to 2

// v1.0.3: Trebuchet siege bonuses
export const TREBUCHET_CITY_ATTACK_BONUS = 8;         // Extra ATK vs cities (18 total)
export const TREBUCHET_CITY_RETALIATION_REDUCTION = 0.5; // Takes 50% less damage from city retaliation

// v7.1: Territorial Defense System - units that stay in friendly territory
export const TERRITORIAL_DEFENDERS_PER_CITY = 1;       // Base defenders per city (in addition to garrison)
export const DEFENSIVE_CIV_DEFENDER_MULTIPLIER = 1.5;  // Multiplier for defensive civs

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
// v2.1: Increased all sizes by ~20-30% area for "Healthy Turtle" experiment
export const MAP_DIMS = {
    Tiny: { width: 20, height: 15 },     // Was 17x12
    Small: { width: 25, height: 20 },    // Was 21x17
    Standard: { width: 30, height: 22 }, // Was 25x19
    Large: { width: 35, height: 25 },    // Was 28x21
    Huge: { width: 40, height: 30 },     // Was 37x28
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
    [TerrainType.Plains]: { yields: { F: 1, P: 1, S: 0, G: 0 }, moveCostLand: 1, defenseMod: 0, blocksLoS: false, workable: true, domain: "Any" },
    [TerrainType.Hills]: { yields: { F: 0, P: 2, S: 0, G: 0 }, moveCostLand: 2, defenseMod: 2, blocksLoS: true, workable: true, domain: "Any" },
    [TerrainType.Forest]: { yields: { F: 1, P: 1, S: 0, G: 0 }, moveCostLand: 2, defenseMod: 1, blocksLoS: true, workable: true, domain: "Any" },
    [TerrainType.Marsh]: { yields: { F: 2, P: 0, S: 0, G: 0 }, moveCostLand: 2, defenseMod: -1, blocksLoS: false, workable: true, domain: "Any" },
    [TerrainType.Desert]: { yields: { F: 0, P: 1, S: 0, G: 1 }, moveCostLand: 1, defenseMod: -1, blocksLoS: false, workable: true, domain: "Any" },
    [TerrainType.Mountain]: { yields: { F: 0, P: 0, S: 0, G: 0 }, moveCostLand: undefined, defenseMod: 0, blocksLoS: true, workable: false, domain: "Any" },
    [TerrainType.Coast]: { yields: { F: 1, P: 0, S: 0, G: 1 }, moveCostNaval: 1, defenseMod: 0, blocksLoS: false, workable: true, domain: UnitDomain.Naval },
    [TerrainType.DeepSea]: { yields: { F: 1, P: 0, S: 0, G: 1 }, moveCostNaval: 1, defenseMod: 0, blocksLoS: false, workable: true, domain: UnitDomain.Naval },
};

export type OverlayData = {
    yieldBonus?: Partial<Yields>;
    riverEdge?: boolean;
};

export const OVERLAY: Record<OverlayType, OverlayData> = {
    [OverlayType.RiverEdge]: { riverEdge: true },
    [OverlayType.RichSoil]: { yieldBonus: { F: 1 } },
    [OverlayType.OreVein]: { yieldBonus: { P: 1, G: 1 } },
    [OverlayType.SacredSite]: { yieldBonus: { S: 1, G: 1 } },
    [OverlayType.GoodieHut]: {}, // No permanent bonus - one-time discovery reward
    [OverlayType.NativeCamp]: {}, // No yield bonus - presence of natives
    [OverlayType.ClearedSettlement]: { yieldBonus: { F: 1, G: 1 } }, // +1 Food/+1 Gold bonus when camp cleared
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
    [UnitType.ArmyScout]: { atk: 3, def: 3, rng: 1, move: 2, hp: 15, cost: 70, domain: UnitDomain.Land, canCaptureCity: false, vision: 3 },
    [UnitType.ArmySpearGuard]: { atk: 8, def: 4, rng: 1, move: 1, hp: 15, cost: 70, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 }, // v6.6o: Cost 80->70
    [UnitType.ArmyBowGuard]: { atk: 6, def: 3, rng: 2, move: 1, hp: 15, cost: 65, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 }, // v6.6o: Cost 75->65
    [UnitType.ArmyRiders]: { atk: 8, def: 4, rng: 1, move: 2, hp: 15, cost: 85, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 }, // v6.6o: Cost 95->85
    [UnitType.Titan]: { atk: 15, def: 15, rng: 1, move: 2, hp: 40, cost: 0, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 }, // v9.15: HP 30→40, DEF 12→15 (survivability buff)
    // Native units (non-player controlled)
    [UnitType.NativeChampion]: { atk: 4, def: 4, rng: 1, move: 1, hp: 18, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    [UnitType.NativeArcher]: { atk: 3, def: 2, rng: 2, move: 1, hp: 12, cost: 0, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
    // v6.0: Aether Era Units
    // Airship: Untargetable support unit. High vision.
    [UnitType.Airship]: { atk: 0, def: 10, rng: 0, move: 4, hp: 20, cost: 75, domain: UnitDomain.Air, canCaptureCity: false, vision: 4 }, // v6.1: Cost 150 -> 75 (Much cheaper)
    // Landship: Late game siege breaker.
    [UnitType.Landship]: { atk: 14, def: 10, rng: 1, move: 3, hp: 25, cost: 120, domain: UnitDomain.Land, canCaptureCity: true, vision: 2 }, // v6.2: Cost 220 -> 120 (more attainable)
    // v7.0: Lorekeeper - Defensive ranged unit for ScholarKingdoms/StarborneSeekers
    [UnitType.Lorekeeper]: { atk: 4, def: 6, rng: 2, move: 1, hp: 15, cost: 65, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 }, // v8.14: cost 50→65 (more expensive)
    // v1.0.3: Trebuchet - Siege unit, cannot attack units, bonus vs cities
    [UnitType.Trebuchet]: { atk: 10, def: 2, rng: 2, move: 1, hp: 15, cost: 50, domain: UnitDomain.Land, canCaptureCity: false, vision: 2 },
};

export type BuildingData = {
    era: EraId;
    techReq: TechId;
    cost: number;
    yieldFlat?: Partial<Yields>;
    maintenance?: number;
    rushBuyDiscountPct?: number;
    requiresBuilding?: BuildingType;
    growthMult?: number;
    defenseBonus?: number;
    cityAttackBonus?: number;
    conditional?: string;
};

export const BUILDINGS: Record<BuildingType, BuildingData> = {
    [BuildingType.Farmstead]: { era: EraId.Hearth, techReq: TechId.Fieldcraft, cost: 40, yieldFlat: { F: 1 }, maintenance: 2, growthMult: 0.9 },
    [BuildingType.StoneWorkshop]: { era: EraId.Hearth, techReq: TechId.StoneworkHalls, cost: 40, yieldFlat: { P: 1 }, maintenance: 2 },
    [BuildingType.Scriptorium]: { era: EraId.Hearth, techReq: TechId.ScriptLore, cost: 40, yieldFlat: { S: 1 }, maintenance: 2 },
    [BuildingType.TradingPost]: { era: EraId.Hearth, techReq: TechId.Fieldcraft, cost: 40, yieldFlat: { G: 4 }, maintenance: 2, rushBuyDiscountPct: 5, conditional: "+1 Gold if city is river-adjacent or coastal" },
    [BuildingType.Reservoir]: { era: EraId.Hearth, techReq: TechId.Wellworks, cost: 50, yieldFlat: { F: 2 }, maintenance: 2, conditional: "+1 Food per water tile" }, // v4.1: +2 Food base
    [BuildingType.MarketHall]: { era: EraId.Banner, techReq: TechId.Wellworks, cost: 56, yieldFlat: { G: 6 }, maintenance: 3, rushBuyDiscountPct: 10, conditional: "+1 Gold if city population is 5+" },
    [BuildingType.LumberMill]: { era: EraId.Banner, techReq: TechId.TimberMills, cost: 60, yieldFlat: { P: 1 }, maintenance: 2, conditional: "+1P more if any Forest worked" },
    [BuildingType.Academy]: { era: EraId.Banner, techReq: TechId.ScholarCourts, cost: 50, yieldFlat: { S: 3 }, maintenance: 3 }, // v4.2: S:3, Cost 50
    [BuildingType.CityWard]: { era: EraId.Banner, techReq: TechId.CityWards, cost: 60, maintenance: 3, defenseBonus: 2, cityAttackBonus: 1 }, // v8.13: Nerfed Defense 3→2
    [BuildingType.Forgeworks]: { era: EraId.Engine, techReq: TechId.SteamForges, cost: 80, yieldFlat: { P: 4 }, maintenance: 3 }, // v5.0: Buffed from P:2 to P:4
    [BuildingType.Bank]: { era: EraId.Engine, techReq: TechId.UrbanPlans, cost: 72, yieldFlat: { G: 8 }, maintenance: 4, rushBuyDiscountPct: 15, conditional: "+1 Gold if any worked Ore Vein" },
    [BuildingType.CitySquare]: { era: EraId.Engine, techReq: TechId.UrbanPlans, cost: 80, yieldFlat: { F: 2, P: 2 }, maintenance: 3 }, // v5.0: Buffed from F:1/P:1 to F:2/P:2
    [BuildingType.TitansCore]: { era: EraId.Engine, techReq: TechId.SteamForges, cost: 60, conditional: "Summons The Titan upon completion" }, // v9.10: Buffed to 60 (was 120)

    [BuildingType.JadeGranary]: { era: EraId.Hearth, techReq: TechId.Fieldcraft, cost: 50, yieldFlat: { F: 2, P: 1 }, maintenance: 3, conditional: "The Great Harvest: +2 Food, +1 Prod." }, // v5.8: Buffed Cost 50, +1 Prod
    // v5.5: Bulwark converted to Building (Scholar/Starborne only)
    [BuildingType.Bulwark]: {
        era: EraId.Hearth,
        techReq: TechId.StoneworkHalls,
        cost: 70,
        maintenance: 4,
        defenseBonus: 3, // v9.10: Nerfed Defense 5→3
        cityAttackBonus: 1, // v9.10: Nerfed Attack 2→1
        conditional: "Scholar/Starborne Only. Once per civ. City CANNOT form Armies."
    },
    // v6.0: Aether Era
    [BuildingType.AetherReactor]: { era: EraId.Aether, techReq: TechId.ZeroPointEnergy, cost: 200, yieldFlat: { F: 5, P: 5, S: 5 }, maintenance: 5 },
    [BuildingType.Exchange]: { era: EraId.Engine, techReq: TechId.SignalRelay, cost: 108, yieldFlat: { G: 10 }, maintenance: 5, rushBuyDiscountPct: 20, requiresBuilding: BuildingType.Bank },
    [BuildingType.ShieldGenerator]: { era: EraId.Aether, techReq: TechId.PlasmaShields, cost: 250, maintenance: 6, defenseBonus: 15, conditional: "Grants 50 Shield HP (regenerating)" },
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
    // v9.12: Major tech cost increases to extend game length
    // Base techs: +50% cost increase
    // Progress chain: +100% cost increase (ScriptLore, ScholarCourts, SignalRelay, StarCharts)
    [TechId.Fieldcraft]: { era: EraId.Hearth, cost: 30, prereqTechs: [], unlock: { type: "Building", id: BuildingType.Farmstead } }, // 20 → 30
    [TechId.StoneworkHalls]: { era: EraId.Hearth, cost: 30, prereqTechs: [], unlock: { type: "Building", id: BuildingType.StoneWorkshop } }, // 20 → 30
    [TechId.ScriptLore]: { era: EraId.Hearth, cost: 40, prereqTechs: [], unlock: { type: "Building", id: BuildingType.Scriptorium } }, // 25 → 50 -> 40 (PROGRESS)
    [TechId.FormationTraining]: { era: EraId.Hearth, cost: 30, prereqTechs: [], unlock: { type: "Unit", id: UnitType.Trebuchet } }, // 20 → 30
    [TechId.TrailMaps]: { era: EraId.Hearth, cost: 30, prereqTechs: [], unlock: { type: "Unit", id: UnitType.Skiff } }, // 20 → 30
    [TechId.Wellworks]: { era: EraId.Banner, cost: 75, prereqTechs: [TechId.Fieldcraft], unlock: { type: "Building", id: BuildingType.Reservoir } }, // 50 → 75
    [TechId.TimberMills]: { era: EraId.Banner, cost: 75, prereqTechs: [TechId.StoneworkHalls], unlock: { type: "Passive", key: "+1/+1 to Melee & Ranged" } }, // 50 → 75
    [TechId.ScholarCourts]: { era: EraId.Banner, cost: 100, prereqTechs: [TechId.ScriptLore], unlock: { type: "Building", id: BuildingType.Academy } }, // 60 → 120 -> 100 (PROGRESS)
    [TechId.DrilledRanks]: { era: EraId.Banner, cost: 75, prereqTechs: [TechId.FormationTraining], unlock: { type: "Passive", key: "Enable Form Army projects" } }, // 50 → 75
    [TechId.CityWards]: { era: EraId.Banner, cost: 75, prereqTechs: [TechId.StoneworkHalls], unlock: { type: "Building", id: BuildingType.CityWard } }, // 50 → 75
    [TechId.SteamForges]: { era: EraId.Engine, cost: 150, prereqTechs: [TechId.TimberMills], unlock: { type: "Building", id: BuildingType.Forgeworks } }, // 100 → 150
    [TechId.SignalRelay]: { era: EraId.Engine, cost: 200, prereqTechs: [TechId.ScholarCourts], unlock: { type: "Passive", key: "+2 Science per city" } }, // 120 → 240 -> 200 (PROGRESS)
    [TechId.UrbanPlans]: { era: EraId.Engine, cost: 150, prereqTechs: [TechId.Wellworks], unlock: { type: "Building", id: BuildingType.CitySquare } }, // 100 → 150
    [TechId.ArmyDoctrine]: { era: EraId.Engine, cost: 150, prereqTechs: [TechId.DrilledRanks], unlock: { type: "Passive", key: "+1/+1 to Armies" } }, // 100 → 150
    [TechId.StarCharts]: { era: EraId.Engine, cost: 200, prereqTechs: [TechId.SignalRelay], unlock: { type: "Project", id: ProjectId.Observatory } }, // 120 → 240 -> 200 (PROGRESS)
    // Aether Era
    [TechId.Aerodynamics]: { era: EraId.Aether, cost: 300, prereqTechs: [TechId.SteamForges], unlock: { type: "Unit", id: UnitType.Airship } }, // 200 → 300
    [TechId.ZeroPointEnergy]: { era: EraId.Aether, cost: 300, prereqTechs: [TechId.UrbanPlans], unlock: { type: "Building", id: BuildingType.AetherReactor } }, // 200 → 300
    [TechId.CompositeArmor]: { era: EraId.Aether, cost: 300, prereqTechs: [TechId.ArmyDoctrine], unlock: { type: "Unit", id: UnitType.Landship } }, // 200 → 300
    [TechId.PlasmaShields]: { era: EraId.Aether, cost: 300, prereqTechs: [TechId.SignalRelay], unlock: { type: "Building", id: BuildingType.ShieldGenerator } }, // 200 → 300
    [TechId.DimensionalGate]: { era: EraId.Aether, cost: 300, prereqTechs: [TechId.StarCharts], unlock: { type: "Passive", key: "Global Mobility: +1 Move to all units" } }, // 200 → 300
};



export const PROJECTS: Record<ProjectId, ProjectDefinition> = {
    // v9.12: Major project cost increases to slow Progress victory
    [ProjectId.Observatory]: {
        cost: 400,  // v9.12: 330→500 -> 400 (-20%) - Extended Progress chain
        prereqTechs: [TechId.StarCharts],
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusCity: 1, unlock: ProjectId.GrandAcademy } },
    },
    [ProjectId.GrandAcademy]: {
        cost: 550,  // v9.12: 450→700 -> 550 (-21%)
        prereqMilestone: ProjectId.Observatory,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Milestone", payload: { scienceBonusPerCity: 1, unlock: ProjectId.GrandExperiment } },
    },
    [ProjectId.GrandExperiment]: {
        cost: 700,  // v9.12: 600→900 -> 700 (-22%)
        prereqMilestone: ProjectId.GrandAcademy,
        oncePerCiv: true,
        oneCityAtATime: true,
        onComplete: { type: "Victory", payload: { victory: "Progress" } },
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
    // v8.14: Marker project for tracking Bulwark completion (once per civ wonder)
    [ProjectId.BulwarkComplete]: {
        cost: 0,
        oncePerCiv: true,
        oneCityAtATime: false,
        onComplete: { type: "Milestone", payload: { marker: "Bulwark" } },
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
