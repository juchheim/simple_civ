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
            // v0.99: Increased threshold to ensure winning advantage (was 0.75)
            // We want them to build up to 1.1x power before attacking
            warPowerThreshold: 1.1,
            warDistanceMax: 12,
            peacePowerThreshold: 0.8,
        },
        settleBias: { hills: 0.75 },
        expansionDesire: 1.15,
        desiredCities: 4,
        techWeights: {
            [TechId.DrilledRanks]: 1.3,
            [TechId.ArmyDoctrine]: 1.4,
            [TechId.SteamForges]: 1.5,
            [TechId.CityWards]: 1.3,
            [TechId.UrbanPlans]: 1.2,
            [TechId.SignalRelay]: 1.2,
        },
        unitBias: { hillHold: true },
        declareAfterContactTurns: 4,
    },
    ScholarKingdoms: {
        aggression: {
            warPowerThreshold: 1.3,  // Defensive - only fight if clearly stronger
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
            warPowerThreshold: 1.15,  // Opportunistic but needs advantage
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
            warPowerThreshold: 1.1,  // Aggressive but smart
            warPowerThresholdLate: 0.9,  // With Titan, can be riskier
            warDistanceMax: 16,
            peacePowerThreshold: 0.85,
            aggressionSpikeTrigger: "TitanBuilt",
        },
        settleBias: {},
        expansionDesire: 1.4,
        desiredCities: 5,
        techWeights: {
            [TechId.SteamForges]: 1.5,
            [TechId.StoneworkHalls]: 1.2,
            [TechId.DrilledRanks]: 1.4, // Prioritize armies
            [TechId.ArmyDoctrine]: 1.4, // Prioritize armies
        },
        projectRush: { type: "Building", id: BuildingType.TitansCore },
        unitBias: {},
        declareAfterContactTurns: 2,
    },
    StarborneSeekers: {
        aggression: {
            warPowerThreshold: 1.25,  // Defensive
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
            warPowerThreshold: 1.2,  // Cautious early
            warPowerThresholdLate: 0.8,  // Swarm late
            warDistanceMax: 14,
            peacePowerThreshold: 0.85,
            aggressionSpikeTrigger: "ProgressLead",
        },
        settleBias: {},
        expansionDesire: 1.5,
        desiredCities: 5,
        techWeights: {
            [TechId.Wellworks]: 2.0,
            [TechId.Fieldcraft]: 1.3,
            [TechId.UrbanPlans]: 1.05,
            [TechId.DrilledRanks]: 1.3, // Prioritize armies late game
            [TechId.ArmyDoctrine]: 1.3,
        },
        projectRush: { type: "Building", id: BuildingType.JadeGranary },
        unitBias: {},
        declareAfterContactTurns: 3,
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
