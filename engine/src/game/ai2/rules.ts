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
    /** Ratio needed to accept peace (higher = harder) */
    peacePowerThreshold: number;
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
        warDistanceMax: 15,
        peaceIfBelowRatio: 0.8,
        peacePowerThreshold: 1.1, // Default: slightly stronger to accept peace
        minStanceTurns: 10,
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
            warPowerRatio: 1.05, // v1.0.8: Bolder (was 1.2) - leverage production
            peaceIfBelowRatio: 0.75,
            peacePowerThreshold: 0.9, // v6.1: Harder to appease (was 1.1)
            minStanceTurns: 10, // v1.0.8: Reduced from 12 to 10
            minWarTurn: 15, // v1.0.8: Reduced from 20 to 15
            maxConcurrentWars: 2, // v1.0.8: Allow 2 wars (was 1)
            maxInitiatedWarsPer50Turns: 4, // v1.0.8: Increased from 2 to 4
            canInitiateWars: true,
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
                Conquest: [TechId.FormationTraining, TechId.StoneworkHalls, TechId.Fieldcraft, TechId.ScriptLore, TechId.DrilledRanks, TechId.TimberMills, TechId.ScholarCourts, TechId.SteamForges, TechId.CompositeArmor],
            },
        },
        build: {
            armyPerCity: 2.0,
            settlerCap: 2,
            desiredCities: 8, // v6.1: Wider industrial base (was 5)
            weights: {
                unit: {
                    [UnitType.SpearGuard]: 1.5, // Buffed: Need frontline
                    [UnitType.BowGuard]: 1.3,   // Reduced slightly: Support only
                    [UnitType.Riders]: 0.8,     // Buffed: Flanking
                    [UnitType.Settler]: 0.85,
                },
                building: {
                    [BuildingType.Forgeworks]: 1.6,
                    [BuildingType.StoneWorkshop]: 1.2,
                    [BuildingType.CityWard]: 0.35,
                    [BuildingType.TitansCore]: 2.0,
                },
                project: {
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
            // v8.6: TEST - Match Starborne exactly to isolate civ ability differences
            warPowerRatio: 1.2,
            warDistanceMax: 16,
            peaceIfBelowRatio: 0.85,
            minWarTurn: 40,
            maxConcurrentWars: 1,
            maxInitiatedWarsPer50Turns: 2,
            canInitiateWars: true,
            targetPreference: "Finishable",
        },
        tech: {
            // v1.0.8: Weights are deprecated, using pathsByGoal.
            // Explicitly added StoneworkHalls/CityWards to Progress path for defense.
            pathsByGoal: {
                Progress: [
                    TechId.ScriptLore,
                    TechId.StoneworkHalls, // Unlocks Bulwark (Scholar unique)
                    TechId.CityWards,      // Unlocks CityWard
                    TechId.ScholarCourts,
                    TechId.SignalRelay,
                    TechId.StarCharts
                ],
            },
        },
        build: {
            // v8.9: Buff expansion to match city count with Starborne
            armyPerCity: 1.5,
            settlerCap: 5,  // v8.9: Buffed from 4 - more expansion
            desiredCities: 8,  // v8.9: Buffed from 7 - want more cities
            weights: {
                unit: {
                    [UnitType.Settler]: 1.6,  // v8.9: Buffed from 1.4 - prioritize settlers
                    [UnitType.ArmyBowGuard]: 1.4,
                    [UnitType.ArmySpearGuard]: 1.1,
                    [UnitType.ArmyRiders]: 0.7,
                },
                building: {
                    [BuildingType.Bulwark]: 2.0,
                    [BuildingType.CityWard]: 1.6,
                    [BuildingType.Scriptorium]: 1.5,
                    [BuildingType.Academy]: 1.5,
                },
                project: {
                    [ProjectId.Observatory]: 2.5,  // v8.6: HIGH - replaces SpiritObservatory
                    [ProjectId.GrandAcademy]: 1.2,
                    [ProjectId.GrandExperiment]: 1.2,
                },
            },
        },
        tactics: { riskTolerance: 0.15, forceConcentration: 0.5, siegeCommitment: 0.4, retreatHpFrac: 0.6, rangedCaution: 0.9 },
        titan: { capitalHunt: 0.5, finisher: 0.6, momentum: 0.5 },
    }),

    RiverLeague: mergeProfile(baseProfile, {
        civName: "RiverLeague",
        diplomacy: {
            warPowerRatio: 0.85, // v1.8: Even more aggressive (was 0.95) - attack weaker enemies
            warDistanceMax: 18, // Rivers extend reach
            peaceIfBelowRatio: 0.55, // v1.8: Fight harder (was 0.65)
            minWarTurn: 8, // v1.8: Start wars earlier (was 10)
            maxConcurrentWars: 2,
            maxInitiatedWarsPer50Turns: 6, // v1.8: More wars (was 5)
            canInitiateWars: true,
            targetPreference: "Finishable", // v1.8: Pick off civs close to elimination
        },
        tech: {
            weights: {
                [TechId.FormationTraining]: 1.4, // v1.7: Military focus
                [TechId.DrilledRanks]: 1.4, // v1.7: Buffed for conquest
                [TechId.ArmyDoctrine]: 1.3, // v1.7: Late-game armies
                [TechId.TrailMaps]: 1.2,
                [TechId.Wellworks]: 1.15,
                [TechId.CompositeArmor]: 1.3, // v1.7: Landships for conquest
                // Reduced Progress focus
                [TechId.ScriptLore]: 1.0,
                [TechId.ScholarCourts]: 1.0,
                [TechId.SignalRelay]: 0.9, // v1.7: Lower priority
                [TechId.StarCharts]: 0.9, // v1.7: Lower priority - conquest focus
            }
        },
        build: {
            armyPerCity: 1.5, // v1.7: Increased for conquest (was 1.2)
            settlerCap: 4,
            desiredCities: 7,
            weights: {
                unit: { [UnitType.Skiff]: 1.2, [UnitType.Settler]: 1.2, [UnitType.SpearGuard]: 1.3, [UnitType.BowGuard]: 1.2 }, // v1.7: Military focus
                building: { [BuildingType.Reservoir]: 1.2 },
                project: {
                    [ProjectId.Observatory]: 1.0, // v1.7: Reduced from 1.3
                    [ProjectId.GrandAcademy]: 1.0,
                    [ProjectId.GrandExperiment]: 1.0,
                },
            },
        },
        tactics: { riskTolerance: 0.55, forceConcentration: 0.75, siegeCommitment: 0.75, retreatHpFrac: 0.35, rangedCaution: 0.6 }, // v1.7: Much more aggressive
        titan: { capitalHunt: 0.75, finisher: 0.9, momentum: 0.85 }, // v1.7: Close out games
    }),

    AetherianVanguard: mergeProfile(baseProfile, {
        civName: "AetherianVanguard",
        diplomacy: {
            warPowerRatio: 1.0, // v1.0.8: Aggressive (was 1.05)
            warDistanceMax: 20, // v1.0.8: Increased reach (was 18)
            peaceIfBelowRatio: 0.75,
            minWarTurn: 15, // PROPOSAL: Delay war so we don't suicide early
            maxConcurrentWars: 2, // v1.0.8: Allow 2 wars (was 1)
            maxInitiatedWarsPer50Turns: 4,
            canInitiateWars: true,
            targetPreference: "Nearest", // PROPOSAL: "Capital" rush was getting them flanked/killed. Fight standard war until Titan arrives.
        },
        tech: {
            weights: {
                // Phase 1: Beeline Titan's Core (SteamForges unlock)
                [TechId.StoneworkHalls]: 1.8, // v7.9: Buffed - core tech for Titan beeline
                [TechId.TimberMills]: 1.8, // v7.9: Buffed - production for Titan
                [TechId.SteamForges]: 2.0, // v7.9: HIGHEST - unlocks Titan's Core
                [TechId.DrilledRanks]: 1.1,
                [TechId.CompositeArmor]: 1.6, // Landships for Titan escort
                [TechId.Aerodynamics]: 1.5, // Airship support for Titan

                // Phase 2: Pivot to Progress after Titan dominance
                [TechId.ScriptLore]: 1.5, // v7.9: Buffed - foundation for Progress
                [TechId.ScholarCourts]: 1.5, // v7.9: Buffed - more science
                [TechId.SignalRelay]: 1.6, // v7.9: Buffed - StarCharts prereq
                [TechId.StarCharts]: 1.8, // v7.9: HIGH - Progress pivot after conquest
            },
            pathsByGoal: {
                Conquest: [TechId.FormationTraining, TechId.StoneworkHalls, TechId.Fieldcraft, TechId.ScriptLore, TechId.DrilledRanks, TechId.TimberMills, TechId.ScholarCourts, TechId.SteamForges, TechId.CompositeArmor],
                // v7.9: Add Progress path for late-game pivot
                Progress: [TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts],
            },
        },
        build: {
            armyPerCity: 1.6,
            settlerCap: 3, // v7.9: Buffed from 2 - expand after conquest
            desiredCities: 6, // v7.9: Buffed from 5 - more cities = more production for Progress
            weights: {
                building: {
                    [BuildingType.TitansCore]: 2.5, // v7.9: HIGHEST - beeline Titan
                    [BuildingType.StoneWorkshop]: 1.3,
                    [BuildingType.Scriptorium]: 1.5, // Science for Progress pivot
                    [BuildingType.Academy]: 1.5,
                },
                unit: { [UnitType.SpearGuard]: 1.1, [UnitType.BowGuard]: 1.1 },
                // v7.9: Buffed Progress Projects for late-game pivot
                project: {
                    [ProjectId.Observatory]: 1.6, // v7.9: Buffed from 1.2
                    [ProjectId.GrandAcademy]: 1.6, // v7.9: Buffed from 1.2
                    [ProjectId.GrandExperiment]: 1.8, // v7.9: HIGH - win condition
                },
            },
        },
        tactics: { riskTolerance: 0.55, forceConcentration: 0.75, siegeCommitment: 0.9, retreatHpFrac: 0.3, rangedCaution: 0.6 },
        titan: { capitalHunt: 0.9, finisher: 0.9, momentum: 0.75 },
    }),

    StarborneSeekers: mergeProfile(baseProfile, {
        civName: "StarborneSeekers",
        diplomacy: {
            // v8.4: Progress civs should be opportunistic, not pacifist
            // More cities = more SpiritObservatories = faster Progress
            warPowerRatio: 1.2,  // v8.4: Attack when 20% stronger (was 1.5 - too passive)
            warDistanceMax: 16,  // Longer reach for wide expansion
            peaceIfBelowRatio: 0.85,  // v8.4: Finish what you start
            minWarTurn: 40,  // v8.4: Still wait longer than conquest civs
            maxConcurrentWars: 1,
            maxInitiatedWarsPer50Turns: 2,  // v8.4: Can be opportunistic
            canInitiateWars: true,
            targetPreference: "Finishable",  // Focus on weak targets
        },
        tech: {
            pathsByGoal: {
                // v1.0.8: Aggressive Science Rush to SpiritObservatory
                // Starborne relies on rapid expansion, not turtling.
                Progress: [
                    TechId.ScriptLore,
                    TechId.StoneworkHalls, // Unlocks Bulwark (Unique) - Vital early defense
                    TechId.ScholarCourts,
                    TechId.SignalRelay,
                    TechId.StarCharts
                ],
            },
        },
        build: {
            armyPerCity: 1.5,  // v6.5: Lower than Scholar - spread focus
            settlerCap: 4,  // v6.5: HIGH - wide expansion
            desiredCities: 7,  // v6.5: WIDE - more cities for SpiritObservatory spread
            weights: {
                unit: {
                    [UnitType.Settler]: 1.4,  // v6.5: HIGH - expansion focus
                    [UnitType.ArmyBowGuard]: 1.4,
                    [UnitType.ArmySpearGuard]: 1.1,
                    [UnitType.ArmyRiders]: 0.7,
                },
                building: {
                    [BuildingType.Academy]: 1.5, // Replaces SpiritObservatory role
                    [BuildingType.Bulwark]: 2.0,  // v6.5: Lower than Scholar
                    [BuildingType.CityWard]: 1.6,
                },
                project: {
                    [ProjectId.Observatory]: 2.0,  // High priority now (standard path)
                    [ProjectId.GrandAcademy]: 1.2,
                    [ProjectId.GrandExperiment]: 1.2,
                },
            },
        },
        tactics: { riskTolerance: 0.15, forceConcentration: 0.5, siegeCommitment: 0.4, retreatHpFrac: 0.6, rangedCaution: 0.9 },
        titan: { capitalHunt: 0.5, finisher: 0.6, momentum: 0.5 },
    }),

    JadeCovenant: mergeProfile(baseProfile, {
        civName: "JadeCovenant",
        diplomacy: {
            // v8.11: Balanced settings - rely on pop bonus nerf instead
            warPowerRatio: 0.95, // v1.0.8: Attack even if slightly weaker (was 1.0)
            warDistanceMax: 16, // v1.0.8: Increased (was 14)
            peaceIfBelowRatio: 0.75,
            minWarTurn: 12, // v1.0.8: Reduced (was 15)
            maxConcurrentWars: 2, // v1.0.8: Allow 2 wars (was 2?)
            maxInitiatedWarsPer50Turns: 4, // v1.0.8: Increased from 3
            canInitiateWars: true,
            targetPreference: "Finishable",
        },
        tech: {
            weights: {
                [TechId.Wellworks]: 1.7,
                [TechId.Fieldcraft]: 1.3,
                [TechId.UrbanPlans]: 1.2,
                [TechId.DrilledRanks]: 1.3, // v1.6: Increased for military
                [TechId.ArmyDoctrine]: 1.3, // v1.6: Added for late-game armies
                [TechId.ScriptLore]: 1.2, // v1.6: Slightly higher for Progress path
                [TechId.ScholarCourts]: 1.2,
                [TechId.SignalRelay]: 1.2,
                [TechId.StarCharts]: 1.3, // v1.6: Higher priority for Progress backup
                [TechId.Aerodynamics]: 1.2,
                [TechId.CompositeArmor]: 1.2, // v1.6: Landships for late-game conquest
            }
        },
        build: {
            armyPerCity: 1.6, // v7.9: Buffed from 1.3 - need more military to survive early game
            settlerCap: 5, // v7.9: Highest settler cap - Jade is THE expansion civ
            desiredCities: 8, // v7.9: High city target - leverage +3 Food/city perk
            weights: {
                building: { [BuildingType.JadeGranary]: 2.0, [BuildingType.Farmstead]: 1.3 },
                unit: { [UnitType.Settler]: 1.8, [UnitType.SpearGuard]: 1.2, [UnitType.BowGuard]: 1.2 }, // v7.9: Highest Settler priority
                project: {
                    [ProjectId.Observatory]: 1.4, // v1.6: Higher for Progress path
                    [ProjectId.GrandAcademy]: 1.4,
                    [ProjectId.GrandExperiment]: 1.4,
                },
            },
        },
        tactics: {
            riskTolerance: 0.55, // v7.9: Buffed from 0.45 - fight harder like ForgeClans
            forceConcentration: 0.75, // v7.9: Buffed from 0.7
            siegeCommitment: 0.85, // v7.9: Buffed from 0.65 - close out sieges
            retreatHpFrac: 0.3, // v7.9: Buffed from 0.4 - stay in the fight longer
            rangedCaution: 0.55 // v7.9: Reduced from 0.6 - be more aggressive with ranged
        },
        titan: { capitalHunt: 0.8, finisher: 0.9, momentum: 0.85 }, // v7.9: Close out games faster
    }),
};

export function getAiProfileV2(state: GameState, playerId: string): CivAiProfileV2 {
    const player = state.players.find(p => p.id === playerId);
    const civ = player?.civName ?? "Default";
    return profiles[civ] ?? mergeProfile(baseProfile, { civName: civ });
}
