import { BuildingType, GameState, ProjectId, TechId } from "../../core/types.js";

type AggressionProfile = {
    warPowerThreshold: number;
    warPowerThresholdLate?: number;
    warDistanceMax: number;
    peacePowerThreshold: number;
    aggressionSpikeTrigger?: "TitanBuilt" | "ProgressLead";
};

type SettleBias = {
    hills?: number;
    rivers?: number;
};

type UnitBias = {
    navalWeight?: number;
    hillHold?: boolean;
    rangedSafety?: number;
};

type RushTarget =
    | { type: "Building"; id: BuildingType }
    | { type: "Project"; id: ProjectId };

export type AiPersonality = {
    aggression: AggressionProfile;
    settleBias: SettleBias;
    expansionDesire: number;
    desiredCities?: number;
    techWeights: Partial<Record<TechId, number>>;
    projectRush?: RushTarget;
    unitBias: UnitBias;
    declareAfterContactTurns?: number;
};

type CivName =
    | "ForgeClans"
    | "ScholarKingdoms"
    | "RiverLeague"
    | "AetherianVanguard"
    | "StarborneSeekers"
    | "JadeCovenant";

const defaultPersonality: AiPersonality = {
    aggression: {
        warPowerThreshold: 0.8,
        warDistanceMax: 14,
        peacePowerThreshold: 0.9,
    },
    settleBias: {},
    expansionDesire: 1.3,
    desiredCities: 5,
    techWeights: {},
    unitBias: {},
    declareAfterContactTurns: 2,
};

const personalities: Record<CivName, AiPersonality> = {
    ForgeClans: {
        aggression: {
            warPowerThreshold: 0.45,  // Very aggressive - warmonger civ
            warDistanceMax: 14,
            peacePowerThreshold: 0.85,
        },
        settleBias: { hills: 0.75 },
        expansionDesire: 1.4,
        desiredCities: 5,
        techWeights: { [TechId.DrilledRanks]: 1.1, [TechId.SteamForges]: 1.05 },
        unitBias: { hillHold: true },
        declareAfterContactTurns: 1,
    },
    ScholarKingdoms: {
        aggression: {
            warPowerThreshold: 0.75,  // Defensive - focus on progress victory
            warDistanceMax: 12,
            peacePowerThreshold: 1.0,
        },
        settleBias: {},
        expansionDesire: 1.25,
        desiredCities: 4,
        techWeights: { [TechId.ScriptLore]: 1.2, [TechId.ScholarCourts]: 1.2, [TechId.StarCharts]: 1.1 },
        projectRush: { type: "Project", id: ProjectId.Observatory },
        unitBias: { rangedSafety: 1 },
        declareAfterContactTurns: 2,
    },
    RiverLeague: {
        aggression: {
            warPowerThreshold: 0.55,  // Moderately aggressive - expansionist
            warDistanceMax: 14,
            peacePowerThreshold: 0.9,
        },
        settleBias: { rivers: 0.75 },
        expansionDesire: 1.55,
        desiredCities: 6,
        techWeights: { [TechId.TrailMaps]: 1.15, [TechId.Wellworks]: 1.1 },
        unitBias: { navalWeight: 1 },
        declareAfterContactTurns: 2,
    },
    AetherianVanguard: {
        aggression: {
            warPowerThreshold: 0.6,  // Balanced, spikes with titan
            warPowerThresholdLate: 0.45,  // Very aggressive with titan
            warDistanceMax: 14,
            peacePowerThreshold: 0.9,
            aggressionSpikeTrigger: "TitanBuilt",
        },
        settleBias: {},
        expansionDesire: 1.3,
        desiredCities: 5,
        techWeights: { [TechId.SteamForges]: 1.5 },
        projectRush: { type: "Building", id: BuildingType.TitansCore },
        unitBias: {},
        declareAfterContactTurns: 2,
    },
    StarborneSeekers: {
        aggression: {
            warPowerThreshold: 0.7,  // Defensive - focus on progress
            warDistanceMax: 12,
            peacePowerThreshold: 1.0,
        },
        settleBias: {},
        expansionDesire: 1.3,
        desiredCities: 4,
        techWeights: { [TechId.ScriptLore]: 1.2, [TechId.ScholarCourts]: 1.2, [TechId.StarCharts]: 1.5 },
        projectRush: { type: "Building", id: BuildingType.SpiritObservatory },
        unitBias: { rangedSafety: 1 },
        declareAfterContactTurns: 3,
    },
    JadeCovenant: {
        aggression: {
            warPowerThreshold: 0.55,  // Moderately aggressive
            warDistanceMax: 14,
            peacePowerThreshold: 0.95,
        },
        settleBias: {},
        expansionDesire: 1.75,
        desiredCities: 6,
        techWeights: { [TechId.Wellworks]: 1.5, [TechId.UrbanPlans]: 1.05 },
        projectRush: { type: "Building", id: BuildingType.JadeGranary },
        unitBias: {},
        declareAfterContactTurns: 2,
    },
};

export function getPersonality(civName?: string | null): AiPersonality {
    if (!civName) return defaultPersonality;
    const key = civName as CivName;
    return personalities[key] ?? defaultPersonality;
}

export function getPersonalityForPlayer(state: GameState, playerId: string): AiPersonality {
    const civ = state.players.find(p => p.id === playerId)?.civName;
    return getPersonality(civ);
}
