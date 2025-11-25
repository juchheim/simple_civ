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
    // Markers for unique wonder completions
    JadeGranaryComplete = "JadeGranaryComplete",
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
    features?: OverlayType[]; // alias for overlays for spec parity
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
    currentBuild: { type: "Unit" | "Building" | "Project"; id: string; cost: number } | null;
    buildProgress: number;
    hp: number;
    maxHp: number;
    isCapital: boolean;
    hasFiredThisTurn: boolean;
    milestones: ProjectId[];
    lastDamagedOnTurn?: number; // Turn when city was last damaged (for healing prevention)
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
};

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
    sharedVision: SharedVisionState;
    contacts: ContactState;
    diplomacyOffers: DiplomacyOffer[];
    winnerId?: string;
};

export type MapSize = "Tiny" | "Small" | "Standard" | "Large" | "Huge";

export type Action =
    | { type: "MoveUnit"; playerId: string; unitId: string; to: HexCoord }
    | { type: "Attack"; playerId: string; attackerId: string; targetId: string; targetType: "Unit" | "City" }
    | { type: "LinkUnits"; playerId: string; unitId: string; partnerId: string }
    | { type: "UnlinkUnits"; playerId: string; unitId: string; partnerId?: string }
    | { type: "FoundCity"; playerId: string; unitId: string; name: string }
    | { type: "ChooseTech"; playerId: string; techId: TechId }
    | { type: "SetCityBuild"; playerId: string; cityId: string; buildType: "Unit" | "Building" | "Project"; buildId: string }
    | { type: "RazeCity"; playerId: string; cityId: string }
    | { type: "CityAttack"; playerId: string; cityId: string; targetUnitId: string }
    | { type: "SetWorkedTiles"; playerId: string; cityId: string; tiles: HexCoord[] }
    | { type: "SetDiplomacy"; playerId: string; targetPlayerId: string; state: DiplomacyState }
    | { type: "ProposePeace"; playerId: string; targetPlayerId: string }
    | { type: "AcceptPeace"; playerId: string; targetPlayerId: string }
    | { type: "ProposeVisionShare"; playerId: string; targetPlayerId: string }
    | { type: "AcceptVisionShare"; playerId: string; targetPlayerId: string }
    | { type: "RevokeVisionShare"; playerId: string; targetPlayerId: string }
    | { type: "SetAutoMoveTarget"; playerId: string; unitId: string; target: HexCoord }
    | { type: "ClearAutoMoveTarget"; playerId: string; unitId: string }
    | { type: "EndTurn"; playerId: string };
