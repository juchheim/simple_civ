import { BuildingType, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";

export type CivName =
    | "ForgeClans"
    | "ScholarKingdoms"
    | "RiverLeague"
    | "AetherianVanguard"
    | "StarborneSeekers"
    | "JadeCovenant"
    | string;

export type AiDiplomacyProfileV2 = {
    /** Minimum power ratio (myPower/enemyPower) to consider declaring war */
    warPowerRatio: number;
    /** Max city-to-city distance to consider war (before late-game loosening) */
    warDistanceMax: number;
    /** If losing below this ratio, prefer peace */
    peaceIfBelowRatio: number;
    /** Minimum turns between switching Peace <-> War (prevents thrash) */
    minStanceTurns: number;
    /** Don't start wars before this turn unless already at war. */
    minWarTurn: number;
    /** Cap simultaneous wars to avoid global dogpiles/thrash. */
    maxConcurrentWars: number;
    /** Cap self-initiated wars in a sliding window (prevents serial opportunism). */
    maxInitiatedWarsPer50Turns: number;
    /** Whether this civ ever initiates wars (some civs are strictly reactive). */
    canInitiateWars: boolean;
    /** Prefer nearest opponent vs capital-first targeting */
    targetPreference: "Nearest" | "Capital" | "Finishable";
    /** Optional: RNG chance (0-1) for early military rush before turn 25. Only ForgeClans uses this. */
    earlyRushChance?: number;
};

export type AiTechProfileV2 = {
    weights: Partial<Record<TechId, number>>;
    /**
     * Hard beelines by goal, used as a tie-breaker and to keep civ identity.
     * (Utility scoring is still applied on top.)
     */
    pathsByGoal: Partial<Record<"Progress" | "Conquest" | "Balanced", TechId[]>>;
};

export type AiBuildProfileV2 = {
    weights: {
        unit: Partial<Record<UnitType, number>>;
        building: Partial<Record<BuildingType, number>>;
        project: Partial<Record<ProjectId, number>>;
    };
    /** Desired standing army size relative to cities (e.g. 1.5 => ~1.5 military per city) */
    armyPerCity: number;
    /** Global cap on settlers in flight (active settlers + queued settlers) */
    settlerCap: number;
    /** Soft target for number of cities before settlers are deprioritized. */
    desiredCities: number;
};

export type AiTacticsProfileV2 = {
    /** 0..1. Lower => retreat earlier, avoid unfavorable trades. */
    riskTolerance: number;
    /** 0..1. Higher => prefer concentrating before attacking. */
    forceConcentration: number;
    /** 0..1. Higher => finish sieges aggressively once started. */
    siegeCommitment: number;
    /** Retreat when HP fraction is below this and threatened. */
    retreatHpFrac: number;
    /** Prefer holding ranged at max range when possible. */
    rangedCaution: number;
};

export type AiTitanProfileV2 = {
    /** 0..1: prefer capitals */
    capitalHunt: number;
    /** 0..1: prefer finishing low HP cities */
    finisher: number;
    /** 0..1: prefer nearest target to keep momentum */
    momentum: number;
};

export type CivAiProfileV2 = {
    civName: CivName;
    diplomacy: AiDiplomacyProfileV2;
    tech: AiTechProfileV2;
    build: AiBuildProfileV2;
    tactics: AiTacticsProfileV2;
    titan: AiTitanProfileV2;
};

const baseProfile: CivAiProfileV2 = {
    civName: "Default",
    diplomacy: {
        warPowerRatio: 1.15,
        warDistanceMax: 14,
        peaceIfBelowRatio: 0.85,
        minStanceTurns: 12,
        minWarTurn: 20,
        maxConcurrentWars: 1,
        maxInitiatedWarsPer50Turns: 2,
        canInitiateWars: true,
        targetPreference: "Nearest",
    },
    tech: {
        weights: {},
        pathsByGoal: {
            Progress: [TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts],
            Conquest: [TechId.FormationTraining, TechId.DrilledRanks, TechId.ArmyDoctrine],
            Balanced: [],
        },
    },
    build: {
        weights: {
            unit: {
                [UnitType.SpearGuard]: 1.0,
                [UnitType.BowGuard]: 1.0,
                [UnitType.Riders]: 0.9,
                [UnitType.Settler]: 0.9,
                [UnitType.Scout]: 0.4,
                [UnitType.Skiff]: 0.3,
            },
            building: {
                [BuildingType.Farmstead]: 0.9,
                [BuildingType.StoneWorkshop]: 1.1,
                [BuildingType.LumberMill]: 0.7,
                [BuildingType.CitySquare]: 0.8,
                [BuildingType.Scriptorium]: 0.8,
                [BuildingType.Academy]: 0.8,
                [BuildingType.CityWard]: 0.6,
                [BuildingType.Forgeworks]: 0.7,
            },
            project: {
                [ProjectId.Observatory]: 0.6,
                [ProjectId.GrandAcademy]: 0.4,
                [ProjectId.GrandExperiment]: 0.3,
                [ProjectId.FormArmy_SpearGuard]: 0.5,
                [ProjectId.FormArmy_BowGuard]: 0.5,
                [ProjectId.FormArmy_Riders]: 0.45,
                [ProjectId.HarvestFestival]: 0.2,
                [ProjectId.AlchemicalExperiments]: 0.2,
            },
        },
        armyPerCity: 1.25,
        settlerCap: 2,
        desiredCities: 5,
    },
    tactics: {
        riskTolerance: 0.35,
        forceConcentration: 0.55,
        siegeCommitment: 0.55,
        retreatHpFrac: 0.45,
        rangedCaution: 0.65,
    },
    titan: {
        capitalHunt: 0.7,
        finisher: 0.7,
        momentum: 0.65,
    },
};

type CivAiProfilePatch = {
    civName?: CivName;
    diplomacy?: Partial<AiDiplomacyProfileV2>;
    tech?: {
        weights?: Partial<Record<TechId, number>>;
        pathsByGoal?: Partial<Record<"Progress" | "Conquest" | "Balanced", TechId[]>>;
    };
    build?: {
        weights?: {
            unit?: Partial<Record<UnitType, number>>;
            building?: Partial<Record<BuildingType, number>>;
            project?: Partial<Record<ProjectId, number>>;
        };
        armyPerCity?: number;
        settlerCap?: number;
        desiredCities?: number;
    };
    tactics?: Partial<AiTacticsProfileV2>;
    titan?: Partial<AiTitanProfileV2>;
};

function mergeProfile(base: CivAiProfileV2, patch: CivAiProfilePatch): CivAiProfileV2 {
    return {
        ...base,
        ...patch,
        diplomacy: { ...base.diplomacy, ...(patch.diplomacy ?? {}) },
        tech: {
            ...base.tech,
            ...(patch.tech ?? {}),
            weights: { ...base.tech.weights, ...(patch.tech?.weights ?? {}) },
            pathsByGoal: { ...base.tech.pathsByGoal, ...(patch.tech?.pathsByGoal ?? {}) },
        },
        build: {
            ...base.build,
            ...(patch.build ?? {}),
            weights: {
                unit: { ...base.build.weights.unit, ...(patch.build?.weights?.unit ?? {}) },
                building: { ...base.build.weights.building, ...(patch.build?.weights?.building ?? {}) },
                project: { ...base.build.weights.project, ...(patch.build?.weights?.project ?? {}) },
            },
        },
        tactics: { ...base.tactics, ...(patch.tactics ?? {}) },
        titan: { ...base.titan, ...(patch.titan ?? {}) },
    };
}

const profiles: Record<string, CivAiProfileV2> = {
    ForgeClans: mergeProfile(baseProfile, {
        civName: "ForgeClans",
        diplomacy: {
            warPowerRatio: 1.05, // leverage production to press advantages, but not suicide
            peaceIfBelowRatio: 0.75,
            minWarTurn: 12,
            maxConcurrentWars: 1,
            maxInitiatedWarsPer50Turns: 3,
            targetPreference: "Nearest",
            earlyRushChance: 0.7, // 70% chance to attempt early rush - leverages production advantage
        },
        tech: {
            weights: {
                [TechId.DrilledRanks]: 1.4,
                [TechId.ArmyDoctrine]: 1.5,
                [TechId.SteamForges]: 1.2,
                [TechId.CompositeArmor]: 2.0,
                [TechId.Aerodynamics]: 1.5, // v6.4: Enable Airship research
                // Secondary Progress Path
                [TechId.ScriptLore]: 1.1,
                [TechId.ScholarCourts]: 1.1,
                [TechId.SignalRelay]: 1.1,
                [TechId.StarCharts]: 1.1,
            },
            pathsByGoal: {
                Conquest: [TechId.FormationTraining, TechId.DrilledRanks, TechId.ArmyDoctrine, TechId.SteamForges, TechId.CompositeArmor],
            },
        },
        build: {
            armyPerCity: 1.6, // Re-Buffed (was 1.5)
            settlerCap: 2,
            desiredCities: 5,
            weights: {
                unit: {
                    [UnitType.SpearGuard]: 1.5, // Buffed: Need frontline
                    [UnitType.BowGuard]: 1.3,   // Reduced slightly: Support only
                    [UnitType.Riders]: 0.8,     // Buffed: Flanking
                    [UnitType.Settler]: 0.85,
                },
                building: {
                    [BuildingType.Forgeworks]: 1.6,
                    [BuildingType.StoneWorkshop]: 1.5,
                    [BuildingType.CityWard]: 0.35,
                },
                project: {
                    [ProjectId.FormArmy_BowGuard]: 1.2,
                    [ProjectId.FormArmy_SpearGuard]: 1.05,
                    // Secondary Progress Projects
                    [ProjectId.Observatory]: 1.2,
                    [ProjectId.GrandAcademy]: 1.2,
                    [ProjectId.GrandExperiment]: 1.2,
                },
            },
        },
        tactics: {
            riskTolerance: 0.55, // v6.4: Fight harder (was 0.35)
            forceConcentration: 0.9,
            siegeCommitment: 0.85,
            retreatHpFrac: 0.25, // v6.4: Stay in the fight (was 0.45)
            rangedCaution: 0.7,
        },
        titan: { capitalHunt: 0.5, finisher: 0.7, momentum: 0.9 },
    }),

    ScholarKingdoms: mergeProfile(baseProfile, {
        civName: "ScholarKingdoms",
        diplomacy: {
            // v5.0: Ultra-defensive - never initiate wars
            warPowerRatio: 100.0,  // Effectively never attack
            warDistanceMax: 3,
            peaceIfBelowRatio: 100.0,  // Always accept peace
            minWarTurn: 9999,
            maxConcurrentWars: 0,
            maxInitiatedWarsPer50Turns: 0,
            canInitiateWars: false,
            targetPreference: "Nearest",
        },
        tech: {
            weights: {
                [TechId.ScriptLore]: 1.4,
                [TechId.ScholarCourts]: 1.4,
                [TechId.SignalRelay]: 1.4,
                [TechId.StarCharts]: 1.5,
                [TechId.CityWards]: 2.0,   // v5.0: HIGH priority - unlocks Bulwark
                [TechId.DrilledRanks]: 1.15,
            },
        },
        build: {
            armyPerCity: 2.0,
            settlerCap: 2,
            desiredCities: 4,
            weights: {
                unit: {
                    [UnitType.SpearGuard]: 1.4,
                    [UnitType.BowGuard]: 1.2,
                    [UnitType.Settler]: 1.2,

                },
                building: {
                    [BuildingType.Bulwark]: 2.5,  // v5.0: HIGH priority - core defense
                    [BuildingType.CityWard]: 1.8,  // v5.0: Buffed - enables Bulwark
                    [BuildingType.Scriptorium]: 1.3,
                    [BuildingType.Academy]: 1.3,
                },
                project: {
                    [ProjectId.Observatory]: 1.2,
                    [ProjectId.GrandAcademy]: 1.1,
                    [ProjectId.GrandExperiment]: 1.0,
                    [ProjectId.FormArmy_SpearGuard]: 1.2,
                    [ProjectId.FormArmy_BowGuard]: 1.2,
                },
            },
        },
        tactics: { riskTolerance: 0.2, forceConcentration: 0.55, siegeCommitment: 0.45, retreatHpFrac: 0.55, rangedCaution: 0.85 },
        titan: { capitalHunt: 0.7, finisher: 0.7, momentum: 0.5 },
    }),

    RiverLeague: mergeProfile(baseProfile, {
        civName: "RiverLeague",
        diplomacy: {
            warPowerRatio: 1.2,
            warDistanceMax: 16,
            peaceIfBelowRatio: 0.8,
            minWarTurn: 14,
            maxConcurrentWars: 1,
            maxInitiatedWarsPer50Turns: 3,
            canInitiateWars: true,
            targetPreference: "Finishable",
        },
        tech: {
            weights: {
                [TechId.TrailMaps]: 1.3,
                [TechId.Wellworks]: 1.15,
                [TechId.DrilledRanks]: 1.25,
                // Secondary Progress Path
                [TechId.ScriptLore]: 1.1,
                [TechId.ScholarCourts]: 1.1,
                [TechId.SignalRelay]: 1.1,
                [TechId.StarCharts]: 1.1,
                [TechId.Aerodynamics]: 1.2, // v6.4: Enable Airship research
            }
        },
        build: {
            armyPerCity: 1.25,
            settlerCap: 3,
            desiredCities: 6,
            weights: {
                unit: { [UnitType.Skiff]: 1.2, [UnitType.Settler]: 1.2 },
                building: { [BuildingType.Reservoir]: 1.1 },
                // Secondary Progress Projects
                project: {
                    [ProjectId.Observatory]: 1.2,
                    [ProjectId.GrandAcademy]: 1.2,
                    [ProjectId.GrandExperiment]: 1.2,
                },
            },
        },
        tactics: { riskTolerance: 0.35, forceConcentration: 0.6, siegeCommitment: 0.55, retreatHpFrac: 0.5, rangedCaution: 0.7 },
        titan: { capitalHunt: 0.6, finisher: 0.7, momentum: 0.7 },
    }),

    AetherianVanguard: mergeProfile(baseProfile, {
        civName: "AetherianVanguard",
        diplomacy: {
            warPowerRatio: 1.05,
            warDistanceMax: 18,
            peaceIfBelowRatio: 0.75,
            minWarTurn: 15, // PROPOSAL: Delay war so we don't suicide early
            maxConcurrentWars: 1,
            maxInitiatedWarsPer50Turns: 4,
            canInitiateWars: true,
            targetPreference: "Nearest", // PROPOSAL: "Capital" rush was getting them flanked/killed. Fight standard war until Titan arrives.
        },
        tech: {
            weights: {
                [TechId.StoneworkHalls]: 1.5,
                [TechId.TimberMills]: 1.6,
                [TechId.SteamForges]: 1.8,
                [TechId.DrilledRanks]: 1.1,
                [TechId.CompositeArmor]: 1.8,
                // NEW: Science priorities to reach Engine Era faster (Titan rush)
                [TechId.ScriptLore]: 1.4,
                [TechId.ScholarCourts]: 1.3,
                // Secondary Progress Path
                [TechId.SignalRelay]: 1.2,
                [TechId.StarCharts]: 1.2,
                [TechId.Aerodynamics]: 1.8, // v6.4: Airship support for Titan
            },
            pathsByGoal: {
                Conquest: [TechId.FormationTraining, TechId.StoneworkHalls, TechId.Fieldcraft, TechId.ScriptLore, TechId.DrilledRanks, TechId.TimberMills, TechId.ScholarCourts, TechId.SteamForges, TechId.CompositeArmor],
            },
        },
        build: {
            armyPerCity: 1.6,
            settlerCap: 2,
            desiredCities: 5,
            weights: {
                building: {
                    [BuildingType.TitansCore]: 2.0,
                    [BuildingType.StoneWorkshop]: 1.2,
                    // NEW: Build science to fuel the rush
                    [BuildingType.Scriptorium]: 1.5,
                    [BuildingType.Academy]: 1.4,
                },
                unit: { [UnitType.SpearGuard]: 1.1, [UnitType.BowGuard]: 1.1 },
                // Secondary Progress Projects
                project: {
                    [ProjectId.Observatory]: 1.2,
                    [ProjectId.GrandAcademy]: 1.2,
                    [ProjectId.GrandExperiment]: 1.2,
                },
            },
        },
        tactics: { riskTolerance: 0.55, forceConcentration: 0.75, siegeCommitment: 0.9, retreatHpFrac: 0.3, rangedCaution: 0.6 },
        titan: { capitalHunt: 0.9, finisher: 0.9, momentum: 0.75 },
    }),

    StarborneSeekers: mergeProfile(baseProfile, {
        civName: "StarborneSeekers",
        diplomacy: {
            // v5.0: Ultra-defensive - never initiate wars
            warPowerRatio: 100.0,  // Effectively never attack
            warDistanceMax: 3,
            peaceIfBelowRatio: 100.0,  // Always accept peace
            minWarTurn: 9999,
            maxConcurrentWars: 0,
            maxInitiatedWarsPer50Turns: 0,
            canInitiateWars: false,
            targetPreference: "Finishable",
        },
        tech: {
            weights: {
                [TechId.ScriptLore]: 1.4,
                [TechId.ScholarCourts]: 1.4,
                [TechId.SignalRelay]: 1.2,
                [TechId.StarCharts]: 2.0,  // v5.0: High priority - awakening + SpiritObservatory
                [TechId.CityWards]: 2.0,   // v5.0: HIGH priority - unlocks Bulwark
                [TechId.DrilledRanks]: 1.15,
            },
        },
        build: {
            armyPerCity: 1.8,
            settlerCap: 1,
            desiredCities: 4,
            weights: {
                unit: {

                },
                building: {
                    [BuildingType.Bulwark]: 2.5,  // v5.0: HIGH priority - core defense
                    [BuildingType.SpiritObservatory]: 2.0,
                    [BuildingType.CityWard]: 1.8,  // v5.0: Buffed - enables Bulwark
                },
                project: {
                    [ProjectId.Observatory]: 1.2,
                    [ProjectId.GrandAcademy]: 1.1,
                    [ProjectId.GrandExperiment]: 1.0,
                },
            },
        },
        tactics: { riskTolerance: 0.2, forceConcentration: 0.55, siegeCommitment: 0.5, retreatHpFrac: 0.6, rangedCaution: 0.9 },
        titan: { capitalHunt: 0.6, finisher: 0.7, momentum: 0.6 },
    }),

    JadeCovenant: mergeProfile(baseProfile, {
        civName: "JadeCovenant",
        diplomacy: {
            warPowerRatio: 1.1, // v6.4: Fight more readily (was 1.2)
            warDistanceMax: 14,
            peaceIfBelowRatio: 0.85,
            minWarTurn: 12, // v6.4: Start wars earlier (was 14)
            maxConcurrentWars: 1,
            maxInitiatedWarsPer50Turns: 3,
            canInitiateWars: true,
            targetPreference: "Finishable",
        },
        tech: {
            weights: {
                [TechId.Wellworks]: 1.7,
                [TechId.Fieldcraft]: 1.3,
                [TechId.UrbanPlans]: 1.2,
                [TechId.DrilledRanks]: 1.2,
                [TechId.ScriptLore]: 1.1,
                [TechId.ScholarCourts]: 1.1,
                [TechId.SignalRelay]: 1.1,
                [TechId.StarCharts]: 1.1,
                [TechId.Aerodynamics]: 1.2, // v6.4: Enable Airship research
            }
        },
        build: {
            armyPerCity: 1.35,
            settlerCap: 3,
            desiredCities: 8,
            weights: {
                building: { [BuildingType.JadeGranary]: 2.0, [BuildingType.Farmstead]: 1.2 },
                unit: { [UnitType.Settler]: 1.4, [UnitType.SpearGuard]: 1.2, [UnitType.BowGuard]: 1.2 },
                project: {
                    [ProjectId.Observatory]: 1.2,
                    [ProjectId.GrandAcademy]: 1.2,
                    [ProjectId.GrandExperiment]: 1.2,
                    [ProjectId.FormArmy_SpearGuard]: 1.1,
                    [ProjectId.FormArmy_BowGuard]: 1.1,
                },
            },
        },
        tactics: { riskTolerance: 0.35, forceConcentration: 0.6, siegeCommitment: 0.55, retreatHpFrac: 0.5, rangedCaution: 0.7 },
        titan: { capitalHunt: 0.6, finisher: 0.7, momentum: 0.7 },
    }),
};

export function getAiProfileV2(state: GameState, playerId: string): CivAiProfileV2 {
    const player = state.players.find(p => p.id === playerId);
    const civ = player?.civName ?? "Default";
    return profiles[civ] ?? mergeProfile(baseProfile, { civName: civ });
}
