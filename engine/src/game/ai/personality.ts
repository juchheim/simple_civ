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
            // v0.98 Update 8: Slightly more defensive early (nerf)
            // Build up Engine techs first, then steamroll with +5 attack bonus
            warPowerThreshold: 0.75,  // Increased from 0.7 - wait longer before attacking
            warDistanceMax: 12,  // Reduced from 14 - less aggressive reach
            peacePowerThreshold: 0.8,  // Increased from 0.75 - slightly more willing to accept peace
        },
        settleBias: { hills: 0.75 },
        expansionDesire: 1.15,  // Reduced from 1.3 - was averaging 6.6 cities (highest)
        desiredCities: 4,  // Reduced from 5 - focus on quality over quantity
        // v0.98 Update 6: Prioritize Engine-era techs for Industrial Warfare bonus
        techWeights: { 
            [TechId.DrilledRanks]: 1.3,      // Attack bonus
            [TechId.ArmyDoctrine]: 1.4,      // Armies
            [TechId.SteamForges]: 1.5,       // Engine tech (+1 attack)
            [TechId.CityWards]: 1.3,         // Engine tech (+1 attack)
            [TechId.UrbanPlans]: 1.2,        // Engine tech (+1 attack)
            [TechId.SignalRelay]: 1.2,       // Engine tech (+1 attack)
        },
        unitBias: { hillHold: true },
        declareAfterContactTurns: 4,  // v0.98 Update 6: Build up before attacking
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
            warPowerThreshold: 0.55,  // Slightly more aggressive early (was 0.6) - they need military momentum
            warPowerThresholdLate: 0.40,  // Even more aggressive with titan (was 0.45)
            warDistanceMax: 16,  // Increased from 14 - Titans can project power far
            peacePowerThreshold: 0.85,  // Less willing to accept peace (was 0.9)
            aggressionSpikeTrigger: "TitanBuilt",
        },
        settleBias: {},
        expansionDesire: 1.4,  // Increased from 1.3 - need more production base for Titan
        desiredCities: 5,
        // v0.98 Update 8: Added production tech priority for faster Titan
        techWeights: { [TechId.SteamForges]: 1.5, [TechId.StoneworkHalls]: 1.2 },
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
            // v0.98 Update 8: More defensive early, aggressive late
            // JadeCovenant's population power trait means they get stronger over time
            // Be more cautious early (0.65 threshold), then dominate once pop is high
            warPowerThreshold: 0.65,  // More defensive early (was 0.55)
            warPowerThresholdLate: 0.45,  // Very aggressive once pop advantage kicks in
            warDistanceMax: 14,  // Standard projection
            peacePowerThreshold: 0.85,  // More willing to peace early (was 0.9)
            aggressionSpikeTrigger: "ProgressLead",  // Gets aggressive when pop advantage
        },
        settleBias: {},
        expansionDesire: 1.5,  // Reduced from 1.75 - don't overextend
        desiredCities: 5,  // Reduced from 6 - focus on quality over quantity
        // v0.98 Update 8: Increased Wellworks priority (was 1.5) - JadeGranary only built 14% of games
        techWeights: { [TechId.Wellworks]: 2.0, [TechId.Fieldcraft]: 1.3, [TechId.UrbanPlans]: 1.05 },
        projectRush: { type: "Building", id: BuildingType.JadeGranary },
        unitBias: {},
        declareAfterContactTurns: 3,  // More patience - build up first (was 2)
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
