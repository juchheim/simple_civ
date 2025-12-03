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
            [TechId.SteamForges]: 2.0, // v0.99: Hard focus on Titan
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

    // v1.2: Late Game Aggression Override (Fight to the Death)
    if (state.turn >= 200 && player?.aiGoal === "Conquest") {
        const aggressiveCivs = ["AetherianVanguard", "ForgeClans", "JadeCovenant", "RiverLeague"];
        if (civ && aggressiveCivs.includes(civ)) {
            // Check if we are NOT nearing progress victory (double check to be safe, though goal should reflect it)
            // Actually, if goal is Conquest at turn 200+, we assume the goal logic did its job.
            // But let's be safe and ensure we don't suicide if we are actually winning science.
            const nearingProgress = player.completedProjects.includes(ProjectId.GrandAcademy) ||
                player.completedProjects.includes(ProjectId.GrandExperiment);

            if (!nearingProgress) {
                return {
                    ...basePersonality,
                    aggression: {
                        warPowerThreshold: 0.1, // Attack anyone, even if much stronger
                        warDistanceMax: 999,    // Attack anywhere
                        // peacePowerThreshold usage in diplomacy.ts:
                        // if (myPower < theirPower * personality.aggression.peacePowerThreshold) -> Consider Peace
                        // So to NEVER accept peace, we want this to be very low?
                        // If peacePowerThreshold is 0.1, we only accept peace if we are super weak (myPower < 0.1 * theirPower).
                        // If we want to "fight to the death", we should only accept peace if we are absolutely crushed.
                        // OR, if the user meant "never accept peace", we might need to look at diplomacy.ts.
                        // But usually "fight to the death" means you don't care about odds.
                        // Let's set it to 0.1 (only surrender if 10x weaker).
                        // Wait, if I want to be aggressive, I shouldn't accept peace when I'm winning.
                        // The logic usually is: "I'm losing, I want peace."
                        // If I want to fight to the death, I should NOT want peace even if losing.
                        // So peacePowerThreshold should be extremely low (e.g. 0.01).
                        // Let's verify usage in diplomacy.ts first.
                        peacePowerThreshold: 0.05,
                    }
                };
            }
        }
    }

    return basePersonality;
}
