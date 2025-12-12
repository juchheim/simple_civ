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
    /** v2.0: Chance (0-1) that this civ will attempt an early military rush */
    earlyRushChance?: number;
    /** v2.0: Set by RNG at game start if this civ is rushing - triggers immediate war prep on contact */
    isEarlyRushing?: boolean;
    /** v2.0: Force immediate war prep on first contact (used by early rushers) */
    forceEarlyWarPrep?: boolean;
    /** v2.0: Faster war prep transitions (fewer turns per phase) */
    acceleratedWarPrep?: boolean;
    /** v2.1: Multiplier for desired army size. ForgeClans uses 1.5 for larger standing armies. Default 1.0 */
    armySizeMultiplier?: number;
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
            // v2.5: "The War Machine" - relentless aggression
            // v2.6 Fix: Raised to 0.75 (from 0.6) - 0.6 was suicidal.
            // v2.7: Lowered to 0.65 to ensure they declare war instantly (User Request: "fight everybody all through the game")
            warPowerThreshold: 0.65,
            warDistanceMax: 14,       // Good range
            peacePowerThreshold: 0.15, // Fight to the death - almost never surrender
        },
        settleBias: { hills: 0.75 },
        expansionDesire: 1.15,
        desiredCities: 5,
        techWeights: {
            // v2.5: Hard rush for Army Doctrine (Form Army)
            [TechId.DrilledRanks]: 2.0,   // REQUIRED for armies
            [TechId.ArmyDoctrine]: 2.5,   // TOP PRIORITY - Form Army
            [TechId.SteamForges]: 1.5,
            [TechId.CityWards]: 0.5,      // Ignore defense - offense only
        },
        unitBias: { hillHold: true },
        declareAfterContactTurns: 1,  // v2.7: Declare war immediately (User Request: "start war from the beginning")
        earlyRushChance: 1.0,   // v2.7: ALWAYS rush (User Request: "fight everybody all through the game")
        armySizeMultiplier: 2.5,  // v2.5: The Swarm - 2.5x unit count
        acceleratedWarPrep: true,
    },
    ScholarKingdoms: {
        aggression: {
            // v2.2: True Pacifist - almost never start wars
            warPowerThreshold: 10.0,  // Only attack if 10x stronger (effectively never)
            warDistanceMax: 5,       // Only fight immediate neighbors
            peacePowerThreshold: 100.0,  // Always accept peace
        },
        settleBias: {},
        expansionDesire: 1.1,
        desiredCities: 3,
        techWeights: {
            [TechId.ScriptLore]: 1.2,
            [TechId.ScholarCourts]: 1.2,
            [TechId.StarCharts]: 1.1,
            [TechId.StoneworkHalls]: 1.5,
            [TechId.CityWards]: 1.8,
        },
        projectRush: { type: "Project", id: ProjectId.Observatory },
        unitBias: { rangedSafety: 1 },
        declareAfterContactTurns: 0,
        armySizeMultiplier: 1.5,     // v2.2: 50% more units (Standing Army)
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
        earlyRushChance: 0.30,  // v2.0: 30% chance to rush from game start
    },
    StarborneSeekers: {
        aggression: {
            // v2.1: Extremely defensive - almost never start wars
            warPowerThreshold: 2.5,  // Only attack if 2.5x stronger (almost never)
            warDistanceMax: 8,       // Very short range - purely defensive
            peacePowerThreshold: 1.5,  // Very eager to accept peace
        },
        settleBias: {},
        expansionDesire: 1.2,  // Slightly less expansion focus
        desiredCities: 3,      // Focus on fewer, high-quality cities
        techWeights: { [TechId.ScriptLore]: 1.2, [TechId.ScholarCourts]: 1.2, [TechId.StarCharts]: 1.5 },
        projectRush: { type: "Building", id: BuildingType.SpiritObservatory },
        unitBias: { rangedSafety: 1 },
        declareAfterContactTurns: 0,  // v1.9: Never force-declare war - purely defensive
        armySizeMultiplier: 1.25,     // v2.1: 25% more units for defense
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

    // v2.0: Early Rush Check
    // Some aggressive civs have a chance to rush from the very start of the game
    // Uses seeded RNG based on player ID + game seed for determinism
    if (basePersonality.earlyRushChance && state.turn <= 25) {
        // Generate a deterministic "roll" for this player based on game state
        const rushSeed = hashCode(`${state.seed}_${playerId}_earlyRush`);
        const rushRoll = (rushSeed & 0x7fffffff) / 0x7fffffff; // 0-1 range

        if (rushRoll < basePersonality.earlyRushChance) {
            // This civ is rushing! Immediately start war prep on contact
            // They use normal war prep phases but accelerated, then attack aggressively
            return {
                ...basePersonality,
                isEarlyRushing: true,
                forceEarlyWarPrep: true,       // Triggers war prep immediately on contact
                acceleratedWarPrep: true,       // Faster prep phase transitions
                aggression: {
                    ...basePersonality.aggression,
                    warPowerThreshold: 0.5,     // Attack even at half power
                    warDistanceMax: 999,        // No distance limit
                    peacePowerThreshold: 0.3,   // Don't accept peace easily
                },
            };
        }
    }

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

/**
 * Simple string hash for deterministic RNG from seed strings
 */
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}
