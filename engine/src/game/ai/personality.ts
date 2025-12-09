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
            // v1.9: Made MORE aggressive - ForgeClans should win Conquest, not Progress
            warPowerThreshold: 0.9,   // Attacks even when slightly weaker
            warDistanceMax: 14,       // Increased range
            peacePowerThreshold: 0.75, // Stays in war longer
        },
        settleBias: { hills: 0.75 },
        expansionDesire: 1.15,
        desiredCities: 4,
        techWeights: {
            // v1.9: Removed Progress-adjacent techs (SignalRelay, UrbanPlans)
            [TechId.DrilledRanks]: 1.5,   // Army focus
            [TechId.ArmyDoctrine]: 1.6,   // Army focus++
            [TechId.SteamForges]: 1.5,    // Production for more units
            [TechId.CityWards]: 1.3,      // Defense
        },
        unitBias: { hillHold: true },
        declareAfterContactTurns: 3,  // Faster war declaration
    },
    ScholarKingdoms: {
        aggression: {
            warPowerThreshold: 1.3,  // Defensive - only fight if clearly stronger
            warDistanceMax: 12,
            peacePowerThreshold: 1.0,
        },
        settleBias: {},
        expansionDesire: 1.1,  // v1.9: Reduced - focus on 3 cities
        desiredCities: 3,      // v1.9: Reduced from 4 for tall play
        // v1.9: Added StoneworkHalls/CityWards for \"Fortified Knowledge\" bonus
        techWeights: {
            [TechId.ScriptLore]: 1.2,
            [TechId.ScholarCourts]: 1.2,
            [TechId.StarCharts]: 1.1,
            [TechId.StoneworkHalls]: 1.5,  // Unlocks CityWards tech
            [TechId.CityWards]: 1.8,       // Unlocks CityWard building
        },
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
            // v1.9: Very aggressive - Titan rarely dies, so attack more
            warPowerThreshold: 0.75,  // Will attack when weaker - Titan is worth it
            warPowerThresholdLate: 0.6,  // With Titan built, hyper-aggressive
            warDistanceMax: 18,  // Titan can travel far
            peacePowerThreshold: 0.7,  // Only accept peace when losing badly
            aggressionSpikeTrigger: "TitanBuilt",
        },
        settleBias: {},
        expansionDesire: 1.4,
        desiredCities: 5,
        techWeights: {
            // v1.9: Complete Titan rush path - priortize ALL prereqs
            [TechId.StoneworkHalls]: 2.0, // Step 1: Unlocks TimberMills
            [TechId.TimberMills]: 2.5,    // Step 2: CRITICAL - unlocks SteamForges
            [TechId.SteamForges]: 3.0,    // Step 3: Unlocks Titan's Core (highest priority)
            [TechId.DrilledRanks]: 1.2,   // Lower priority - armies are backup
            [TechId.ArmyDoctrine]: 1.2,
        },
        projectRush: { type: "Building", id: BuildingType.TitansCore },
        unitBias: {},
        declareAfterContactTurns: 2,
    },
    StarborneSeekers: {
        aggression: {
            // v1.9: Even more defensive - only attack when significantly stronger
            warPowerThreshold: 1.5,  // Very defensive - needs big advantage
            warDistanceMax: 12,
            peacePowerThreshold: 1.2,  // Very willing to accept peace
        },
        settleBias: {},
        expansionDesire: 1.2,  // Slightly less expansion focus
        desiredCities: 3,      // Focus on fewer, high-quality cities
        techWeights: { [TechId.ScriptLore]: 1.2, [TechId.ScholarCourts]: 1.2, [TechId.StarCharts]: 1.5 },
        projectRush: { type: "Building", id: BuildingType.SpiritObservatory },
        unitBias: { rangedSafety: 1 },
        declareAfterContactTurns: 5,  // Wait longer before declaring war
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
        expansionDesire: 2.0, // v0.99: Massive expansion focus
        desiredCities: 10, // v0.99: Increased to support "Awakened Giant" strategy
        techWeights: {
            [TechId.Wellworks]: 2.0,
            [TechId.Fieldcraft]: 1.5, // Growth (Farmstead)
            [TechId.StoneworkHalls]: 1.3, // Production (Stone Workshop)
            [TechId.UrbanPlans]: 1.2, // Growth/Production (City Square)
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
    const player = state.players.find(p => p.id === playerId);
    const civ = player?.civName;
    const basePersonality = getPersonality(civ);

    // v1.9: Late Game Aggression Override
    // When goal is Conquest at turn 200+, aggressive civs get ultra-aggressive settings
    if (state.turn >= 200 && player?.aiGoal === "Conquest") {
        const aggressiveCivs = ["AetherianVanguard", "ForgeClans", "JadeCovenant", "RiverLeague"];
        const nearingProgress = player.completedProjects.includes(ProjectId.GrandAcademy) ||
            player.completedProjects.includes(ProjectId.GrandExperiment);

        if (civ && aggressiveCivs.includes(civ) && !nearingProgress) {
            return {
                ...basePersonality,
                aggression: {
                    warPowerThreshold: 0.1,      // Attack even if weaker
                    warDistanceMax: 999,          // No distance limit
                    peacePowerThreshold: 0.05,    // Only surrender if crushed
                }
            };
        }
    }

    return basePersonality;
}
