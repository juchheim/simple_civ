export type HexCoord = {
    q: number;
    r: number;
};

export enum TerrainType {
    Plains = "Plains",
    Hills = "Hills",
    Forest = "Forest",
    Marsh = "Marsh",
    Desert = "Desert",
    Mountain = "Mountain",
    Coast = "Coast",
    DeepSea = "DeepSea",
}

export enum OverlayType {
    RiverEdge = "RiverEdge",
    RichSoil = "RichSoil",
    OreVein = "OreVein",
    SacredSite = "SacredSite",
}

export enum UnitType {
    Settler = "Settler",
    Scout = "Scout",
    SpearGuard = "SpearGuard",
    BowGuard = "BowGuard",
    Riders = "Riders",
    RiverBoat = "RiverBoat",
    ArmyScout = "ArmyScout",
    ArmySpearGuard = "ArmySpearGuard",
    ArmyBowGuard = "ArmyBowGuard",
    ArmyRiders = "ArmyRiders",
    Titan = "Titan",
}

export enum UnitDomain {
    Land = "Land",
    Naval = "Naval",
    Civilian = "Civilian",
}

export enum UnitState {
    Normal = "Normal",
    Fortified = "Fortified",
    Garrisoned = "Garrisoned",
    PendingSpawn = "PendingSpawn",
}

export enum BuildingType {
    Farmstead = "Farmstead",
    StoneWorkshop = "StoneWorkshop",
    Scriptorium = "Scriptorium",
    Reservoir = "Reservoir",
    LumberMill = "LumberMill",
    Academy = "Academy",
    CityWard = "CityWard",
    Forgeworks = "Forgeworks",
    CitySquare = "CitySquare",
    TitansCore = "TitansCore",
    SpiritObservatory = "SpiritObservatory",
    JadeGranary = "JadeGranary",
}

export type AiVictoryGoal = "Progress" | "Conquest" | "Balanced";

export enum TechId {
    // Hearth
    Fieldcraft = "Fieldcraft",
    StoneworkHalls = "StoneworkHalls",
    ScriptLore = "ScriptLore",
    FormationTraining = "FormationTraining",
    TrailMaps = "TrailMaps",
    // Banner
    Wellworks = "Wellworks",
    TimberMills = "TimberMills",
    ScholarCourts = "ScholarCourts",
    DrilledRanks = "DrilledRanks",
    CityWards = "CityWards",
    // Engine
    SteamForges = "SteamForges",
    SignalRelay = "SignalRelay",
    UrbanPlans = "UrbanPlans",
    ArmyDoctrine = "ArmyDoctrine",
    StarCharts = "StarCharts",
}

export enum EraId {
    Primitive = "Primitive",
    Hearth = "Hearth",
    Banner = "Banner",
    Engine = "Engine",
}

export enum ProjectId {
    Observatory = "Observatory",
    GrandAcademy = "GrandAcademy",
    GrandExperiment = "GrandExperiment",
    FormArmy_SpearGuard = "FormArmy_SpearGuard",
    FormArmy_BowGuard = "FormArmy_BowGuard",
    FormArmy_Riders = "FormArmy_Riders",
    // Filler Projects
    HarvestFestival = "HarvestFestival",
    AlchemicalExperiments = "AlchemicalExperiments",
    // Markers for unique wonder completions
    JadeGranaryComplete = "JadeGranaryComplete",
    TitansCoreComplete = "TitansCoreComplete",
}

export type Yields = {
    F: number; // Food
    P: number; // Production
    S: number; // Science
};

export type Tile = {
    coord: HexCoord;
    terrain: TerrainType;
    overlays: OverlayType[];
    ownerId?: string; // Player ID
    ownerCityId?: string; // City that owns this tile (no sharing)
    hasCityCenter?: boolean;
};

export type Unit = {
    id: string;
    type: UnitType;
    ownerId: string;
    coord: HexCoord;
    hp: number;
    maxHp: number;
    movesLeft: number;
    state: UnitState;
    hasAttacked: boolean;
    linkedUnitId?: string;
    capturedOnTurn?: number; // Turn when unit was captured (for healing prevention)
    autoMoveTarget?: HexCoord;
    isAutoExploring?: boolean;
    retaliatedAgainstThisTurn?: boolean; // v1.0: Track if unit was hit by city retaliation this turn
    failedAutoMoveTargets?: HexCoord[]; // Track targets that were unreachable to prevent loops
    statusEffects?: string[]; // Active status effects (e.g. "NaturesWrath")
};

export type City = {
    id: string;
    name: string;
    ownerId: string;
    coord: HexCoord; // City Center
    pop: number;
    storedFood: number;
    storedProduction: number;
    buildings: BuildingType[];
    workedTiles: HexCoord[]; // Includes center
    manualWorkedTiles?: HexCoord[]; // Player-pinned choices that override auto-optimization
    manualExcludedTiles?: HexCoord[]; // Player explicitly unselected tiles (skip during auto-fill unless re-selected)
    currentBuild: { type: "Unit" | "Building" | "Project"; id: string; cost: number } | null;
    buildProgress: number;
    hp: number;
    maxHp: number;
    isCapital: boolean;
    hasFiredThisTurn: boolean;
    milestones: ProjectId[];
    lastDamagedOnTurn?: number; // Turn when city was last damaged (for healing prevention)
    savedProduction?: Record<string, number>; // Key: "Type:Id", Value: progress
};

export type Player = {
    id: string;
    civName: string;
    color: string;
    isAI?: boolean;
    aiGoal?: AiVictoryGoal;
    techs: TechId[];
    currentTech: { id: TechId; progress: number; cost: number } | null;
    completedProjects: ProjectId[];
    isEliminated: boolean;
    warPreparation?: WarPreparationState;
    researchHistory?: Record<string, number>; // TechId -> progress
    hasFoundedFirstCity?: boolean;
    currentEra: EraId;
};

export type ProjectDefinition = {
    cost: number;
    prereqTechs?: TechId[];
    prereqMilestone?: ProjectId;
    prereqBuilding?: BuildingType;
    oncePerCiv: boolean;
    oneCityAtATime: boolean;
    scalesWithTurn?: boolean;
    onComplete: { type: "Milestone" | "Victory" | "Transform" | "GrantYield"; payload: any };
};

export type ProjectData = {
    id: ProjectId;
    name: string;
    description: string;
} & ProjectDefinition;

export enum PlayerPhase {
    StartOfTurn = "StartOfTurn",
    Planning = "Planning",
    Action = "Action",
    EndOfTurn = "EndOfTurn",
}

export enum DiplomacyState {
    Peace = "Peace",
    War = "War",
}

export type WarPreparationState = {
    targetId: string;
    state: "Buildup" | "Gathering" | "Positioning" | "Ready";
    startedTurn: number;
};

export type DiplomacyOffer = { from: string; to: string; type: "Peace" | "Vision" };

export type SharedVisionState = Record<string, Record<string, boolean>>;

export type ContactState = Record<string, Record<string, boolean>>;

export type RiverPoint = { x: number; y: number };
export type RiverSegmentDescriptor = {
    tile: HexCoord;
    cornerA: number;
    cornerB: number;
    start: RiverPoint;
    end: RiverPoint;
    isMouth?: boolean;
};

export type HiddenRiverTile = {
    coord: HexCoord;
};

export type GameState = {
    id: string;
    turn: number; // Global turn number
    players: Player[];
    currentPlayerId: string;
    phase: PlayerPhase;
    map: {
        width: number;
        height: number;
        tiles: Tile[];
        rivers?: { a: HexCoord; b: HexCoord }[];
        riverPolylines?: RiverSegmentDescriptor[][];
    };
    units: Unit[];
    cities: City[];
    seed: number;
    visibility: Record<string, string[]>;
    revealed: Record<string, string[]>;
    diplomacy: Record<string, Record<string, DiplomacyState>>;
    diplomacyChangeTurn?: Record<string, Record<string, number>>; // Tracks when war/peace started
    sharedVision: SharedVisionState;
    contacts: ContactState;
    diplomacyOffers: DiplomacyOffer[];
    winnerId?: string;
    victoryType?: "Progress" | "Conquest" | "Resignation";
    endTurn?: number;
    usedCityNames?: string[]; // Track all city names ever used in this game
    history?: GameHistory;
};

export enum HistoryEventType {
    CityFounded = "CityFounded",
    CityCaptured = "CityCaptured",
    CityRazed = "CityRazed",
    WonderBuilt = "WonderBuilt",
    EraEntered = "EraEntered",
    TechResearched = "TechResearched",
    WarDeclared = "WarDeclared",
    PeaceMade = "PeaceMade",
    CivContact = "CivContact",
    UnitPromoted = "UnitPromoted",
    VictoryAchieved = "VictoryAchieved",
}

export interface HistoryEvent {
    turn: number;
    type: HistoryEventType;
    playerId: string;
    data: any;
}

export interface TurnStats {
    turn: number;
    playerId: string;
    stats: {
        science: number;
        production: number;
        military: number;
        gold?: number;
        territory: number;
        score: number;
    };
}

export interface GameHistory {
    events: HistoryEvent[];
    playerStats: Record<string, TurnStats[]>;
    // Optimization: Store deltas (lists of newly revealed coords) rather than full sets
    playerFog: Record<string, Record<number, HexCoord[]>>;
}

export type MapSize = "Tiny" | "Small" | "Standard" | "Large" | "Huge";

export type Action =
    | { type: "MoveUnit"; playerId: string; unitId: string; to: HexCoord; isAuto?: boolean }
    | { type: "Attack"; playerId: string; attackerId: string; targetId: string; targetType: "Unit" | "City" }
    | { type: "LinkUnits"; playerId: string; unitId: string; partnerId: string }
    | { type: "UnlinkUnits"; playerId: string; unitId: string; partnerId?: string }
    | { type: "FoundCity"; playerId: string; unitId: string; name: string }
    | { type: "ChooseTech"; playerId: string; techId: TechId }
    | { type: "SetCityBuild"; playerId: string; cityId: string; buildType: "Unit" | "Building" | "Project"; buildId: string }
    | { type: "RazeCity"; playerId: string; cityId: string }
    // | { type: "CityAttack"; playerId: string; cityId: string; targetUnitId: string }
    | { type: "SetWorkedTiles"; playerId: string; cityId: string; tiles: HexCoord[] }
    | { type: "SetDiplomacy"; playerId: string; targetPlayerId: string; state: DiplomacyState }
    | { type: "ProposePeace"; playerId: string; targetPlayerId: string }
    | { type: "AcceptPeace"; playerId: string; targetPlayerId: string }
    | { type: "ProposeVisionShare"; playerId: string; targetPlayerId: string }
    | { type: "AcceptVisionShare"; playerId: string; targetPlayerId: string }
    | { type: "RevokeVisionShare"; playerId: string; targetPlayerId: string }
    | { type: "SetAutoMoveTarget"; playerId: string; unitId: string; target: HexCoord }
    | { type: "ClearAutoMoveTarget"; playerId: string; unitId: string }
    | { type: "SetAutoExplore"; playerId: string; unitId: string }
    | { type: "ClearAutoExplore"; playerId: string; unitId: string }
    | { type: "FortifyUnit"; playerId: string; unitId: string }
    | { type: "SwapUnits"; playerId: string; unitId: string; targetUnitId: string }
    | { type: "Resign"; playerId: string }
    | { type: "EndTurn"; playerId: string };
