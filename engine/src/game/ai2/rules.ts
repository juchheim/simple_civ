import { BuildingType, GameState, ProjectId, TechId, UnitType } from "../../core/types.js";
import { TacticalTuning } from "./tuning-types.js";

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
    /** Multiplier for power ratio when considering war against humans (e.g. 1.2 = treat as 20% stronger). */
    humanBias?: number;
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

export type AiEconomyProfileV2 = {
    /** Reserve multiplier applied to the base reserve formula. */
    reserveMultiplier: number;
    /** Optional reserve multiplier override after Titan's Core completion. */
    reserveMultiplierPostTitan?: number;
    /** How long deficits are tolerated before hard corrective behavior. */
    deficitToleranceTurns: number;
    /** Preference multiplier for gold-producing buildings. */
    goldBuildBias: number;
    /** Aggression multiplier for opportunistic rush-buy spending. */
    rushBuyAggression: number;
    /** Upkeep-to-gross ratio where expansion should be curtailed. */
    upkeepRatioLimit: number;
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
    economy: AiEconomyProfileV2;
    tactics: AiTacticsProfileV2;
    titan: AiTitanProfileV2;
    tacticalTuning?: TacticalTuning; // Optional override for low-level constants
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
        humanBias: 1.2, // Default: Bias against humans (treat self as stronger)
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
        armyPerCity: 2.5,
        settlerCap: 2,
        desiredCities: 5,
    },
    economy: {
        reserveMultiplier: 0.95,
        deficitToleranceTurns: 3,
        goldBuildBias: 1.65,
        rushBuyAggression: 1.2,
        upkeepRatioLimit: 0.4,
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
    // tacticalTuning default is handled by getTacticalTuning merging with DEFAULT_TUNING
};

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
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
    economy?: Partial<AiEconomyProfileV2>;
    tactics?: Partial<AiTacticsProfileV2>;
    titan?: Partial<AiTitanProfileV2>;
    tacticalTuning?: DeepPartial<TacticalTuning>;
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
        economy: { ...base.economy, ...(patch.economy ?? {}) },
        tactics: { ...base.tactics, ...(patch.tactics ?? {}) },
        titan: { ...base.titan, ...(patch.titan ?? {}) },
        tacticalTuning: mergeTacticalTuning(base.tacticalTuning, patch.tacticalTuning),
    };
}

function mergeTacticalTuning(base: TacticalTuning | undefined, patch: DeepPartial<TacticalTuning> | undefined): TacticalTuning | undefined {
    if (!patch) return base;
    if (!base) {
        // If no base, we can't fully form a TacticalTuning unless patch is complete.
        // But here we return undefined because the consumer (getTacticalTuning) uses DEFAULT_TUNING as the real base.
        // So we interpret this as "partial overrides to be applied later". 
        // Effectively, we just return the patch casted? 
        // Actually, CivAiProfileV2.tacticalTuning is optional.
        // If we store it as optional, we can just return the merged partial.
        // We'll treat the stored profile.tacticalTuning as "overrides" rather than "complete tuning".
        // Typescript expects TacticalTuning. Let's make the profile field optional. (Done above).
        return patch as any;
    }

    // Deep merge known sections
    return {
        ...base,
        ...patch,
        army: { ...base.army, ...(patch.army ?? {}) },
        wait: { ...base.wait, ...(patch.wait ?? {}) },
        defense: { ...base.defense, ...(patch.defense ?? {}) },
        ring: { ...base.ring, ...(patch.ring ?? {}) },
        moveAttack: { ...base.moveAttack, ...(patch.moveAttack ?? {}) },
    } as TacticalTuning;
}

const profiles: Record<string, CivAiProfileV2> = {
    ForgeClans: mergeProfile(baseProfile, {
        civName: "ForgeClans",
        diplomacy: {
            warPowerRatio: 0.9, // v9.4: Aggressive Swarm (was 1.05) - leverage production
            peaceIfBelowRatio: 0.75,
            peacePowerThreshold: 0.9, // v6.1: Harder to appease (was 1.1)
            minStanceTurns: 10, // v1.0.8: Reduced from 12 to 10
            minWarTurn: 10, // v9.4: Start earlier (was 15)
            maxConcurrentWars: 2, // v1.0.8: Allow 2 wars (was 1)
            maxInitiatedWarsPer50Turns: 6, // v9.4: Constant pressure (was 4)
            canInitiateWars: true,
            targetPreference: "Finishable", // v9.8: Kill the weak to close out games (was Nearest)
            earlyRushChance: 0.8, // v9.4: Even higher rush chance (was 0.7)
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
                Conquest: [
                    TechId.FormationTraining,
                    TechId.StoneworkHalls,
                    TechId.Fieldcraft,
                    TechId.ScriptLore,
                    TechId.DrilledRanks,
                    TechId.TimberMills,
                    TechId.ScholarCourts,
                    TechId.SteamForges,
                    TechId.CompositeArmor,
                    // v9.8: Add StarCharts to enable late-game Hybrid Pivot (Progress Win)
                    TechId.StarCharts
                ],
            },
        },
        build: {
            armyPerCity: 2.1, // v1.4: Slightly lower standing army to reduce runaway upkeep spikes.
            settlerCap: 4, // v9.5: Increased from 2 to allows rapid expansion waves.
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
                    [BuildingType.Scriptorium]: 1.1, // v9.6: Reduce Tech Lag
                    [BuildingType.Academy]: 1.1,     // v9.6: Reduce Tech Lag
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
        economy: {
            reserveMultiplier: 0.9,
            deficitToleranceTurns: 4,
            goldBuildBias: 1.65,
            rushBuyAggression: 1.2,
            upkeepRatioLimit: 0.44,
        },
        tactics: {
            riskTolerance: 0.55, // v6.4: Fight harder (was 0.35)
            forceConcentration: 0.75, // v9.8: Swarm behavior - don't wait for perfect groups (was 0.9)
            siegeCommitment: 0.85,
            retreatHpFrac: 0.25, // v6.4: Stay in the fight (was 0.45)
            rangedCaution: 0.7,
        },
        titan: { capitalHunt: 0.7, finisher: 0.8, momentum: 0.9 }, // v9.8: Hunt capitals (was 0.5/0.7)
    }),

    ScholarKingdoms: mergeProfile(baseProfile, {
        civName: "ScholarKingdoms",
        diplomacy: {
            // v8.6: TEST - Match Starborne exactly to isolate civ ability differences
            warPowerRatio: 1.2,
            warDistanceMax: 16,
            peaceIfBelowRatio: 0.95,
            minWarTurn: 60,
            maxConcurrentWars: 1,
            maxInitiatedWarsPer50Turns: 0,
            canInitiateWars: false,
            targetPreference: "Finishable",
        },
        tech: {
            weights: {
                [TechId.Fieldcraft]: 1.9,
                [TechId.Wellworks]: 1.7,
                [TechId.UrbanPlans]: 1.35,
                [TechId.ScriptLore]: 1.45,
                [TechId.ScholarCourts]: 1.45,
            },
            pathsByGoal: {
                // Scholar targeted pass: front-load economic techs to reduce austerity traps.
                Progress: [
                    TechId.Fieldcraft,
                    TechId.ScriptLore,
                    TechId.Wellworks,
                    TechId.ScholarCourts,
                    TechId.StoneworkHalls,
                    TechId.CityWards,
                    TechId.SignalRelay,
                    TechId.StarCharts
                ],
            },
        },
        build: {
            // v9.9: Nerf expansion defense to make them vulnerable to conquest
            armyPerCity: 1.6, // Scholar targeted pass: lower upkeep pressure while expanding.
            settlerCap: 7,  // Targeted expansion pass.
            desiredCities: 9,  // Targeted expansion pass.
            weights: {
                unit: {
                    [UnitType.Settler]: 1.9,
                    [UnitType.ArmyBowGuard]: 1.0,
                    [UnitType.ArmySpearGuard]: 0.8,
                    [UnitType.ArmyRiders]: 0.7,
                },
                building: {
                    [BuildingType.TradingPost]: 1.85,
                    [BuildingType.MarketHall]: 1.65,
                    [BuildingType.Bank]: 1.35,
                    [BuildingType.Exchange]: 1.2,
                    [BuildingType.Bulwark]: 0.6,
                    [BuildingType.CityWard]: 0.8,
                    [BuildingType.Scriptorium]: 1.3,
                    [BuildingType.Academy]: 1.3,
                },
                project: {
                    [ProjectId.Observatory]: 2.0,  // v9.9: Nerfed from 2.5 - Slow down the runaway leader
                    [ProjectId.GrandAcademy]: 1.2,
                    [ProjectId.GrandExperiment]: 1.2,
                },
            },
        },
        economy: {
            reserveMultiplier: 1.0,
            deficitToleranceTurns: 4,
            goldBuildBias: 2.4,
            rushBuyAggression: 1.0,
            upkeepRatioLimit: 0.34,
        },
        tactics: { riskTolerance: 0.15, forceConcentration: 0.5, siegeCommitment: 0.4, retreatHpFrac: 0.6, rangedCaution: 0.9 },
        titan: { capitalHunt: 0.5, finisher: 0.6, momentum: 0.5 },
    }),

    RiverLeague: mergeProfile(baseProfile, {
        civName: "RiverLeague",
        diplomacy: {
            warPowerRatio: 0.9, // v9.9: Stabilized from 0.85 (Suicidal) to 0.9 (Aggressive but safe)
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
            armyPerCity: 2.3, // v1.4: Trim military saturation to slow runaway conquest snowball.
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
        economy: {
            reserveMultiplier: 1.0,
            deficitToleranceTurns: 4,
            goldBuildBias: 1.9,
            rushBuyAggression: 1.0,
            upkeepRatioLimit: 0.36,
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
            minWarTurn: 50, // v9.10: Increased from 30 to allow more expansion
            maxConcurrentWars: 2, // v1.0.8: Allow 2 wars (was 1)
            maxInitiatedWarsPer50Turns: 4,
            canInitiateWars: true,
            targetPreference: "Nearest", // PROPOSAL: "Capital" rush was getting them flanked/killed. Fight standard war until Titan arrives.
        },
        tech: {
            weights: {
                // v9.10: Science-first Titan Rush (faster by ~8 turns)
                // Build Scriptorium (+1 S) and Academy (+3 S) to accelerate research
                [TechId.ScriptLore]: 2.5,      // HIGHEST - enables Scriptorium
                [TechId.StoneworkHalls]: 2.3,  // Second - prereq for TimberMills
                [TechId.FormationTraining]: 2.1, // Third - unlocks Banner era
                [TechId.ScholarCourts]: 2.4,   // Banner priority - enables Academy (+3 S)
                [TechId.TimberMills]: 2.2,     // Prereq for SteamForges
                [TechId.SteamForges]: 3.0,     // Unlocks Titan's Core

                // Support Techs (Post-Titan)
                [TechId.DrilledRanks]: 1.1,
                [TechId.CompositeArmor]: 1.6,
                [TechId.Aerodynamics]: 1.5,

                // Late-game Progress pivot
                [TechId.SignalRelay]: 1.2,
                [TechId.StarCharts]: 1.5,
            },
            pathsByGoal: {
                Conquest: [
                    // v9.10: Optimized Science-First Titan Path with ArmyRiders
                    TechId.ScriptLore,        // 1. Enables Scriptorium (+1 S)
                    TechId.StoneworkHalls,    // 2. Prereq for TimberMills
                    TechId.FormationTraining, // 3. Third Hearth tech (unlocks Banner)
                    TechId.ScholarCourts,     // 4. Enables Academy (+3 S) - research boost!
                    TechId.ArmyDoctrine,      // 5. Unlocks ArmyRiders for deathball escorts
                    TechId.TimberMills,       // 6. Prereq for SteamForges (unlocks Engine)
                    TechId.SteamForges,       // 7. Unlocks Titan's Core
                    TechId.DrilledRanks,
                    TechId.CompositeArmor
                ],
                Progress: [TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts],
            },
        },
        build: {
            // v9.10: Prioritize expansion to reach 4+ cities for Titan economy
            armyPerCity: 2.0, // Reduced from 2.8 - fewer units, more settlers
            settlerCap: 5,    // Increased from 3 - more expansion
            desiredCities: 5, // Reduced from 7 - realistic target (avg was 3.1)
            weights: {
                building: {
                    // v9.10: Science buildings HIGHEST priority to accelerate Titan research
                    [BuildingType.Scriptorium]: 2.5, // Build IMMEDIATELY after ScriptLore
                    [BuildingType.Academy]: 2.5,     // Build IMMEDIATELY after ScholarCourts
                    [BuildingType.TitansCore]: 2.8,  // Then Titan's Core
                    [BuildingType.StoneWorkshop]: 1.3,
                },
                unit: { [UnitType.SpearGuard]: 1.1, [UnitType.BowGuard]: 1.1 },
                project: {
                    [ProjectId.Observatory]: 1.6,
                    [ProjectId.GrandAcademy]: 1.6,
                    [ProjectId.GrandExperiment]: 1.8,
                },
            },
        },
        economy: {
            reserveMultiplier: 1.15,
            reserveMultiplierPostTitan: 1.0,
            deficitToleranceTurns: 3,
            goldBuildBias: 1.6,
            rushBuyAggression: 1.15,
            upkeepRatioLimit: 0.44,
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
                // v9.13: Re-enabled StoneworkHalls/Bulwark for win rate testing
                Progress: [
                    TechId.StoneworkHalls,
                    TechId.CityWards,
                    TechId.ScriptLore,
                    TechId.ScholarCourts,
                    TechId.SignalRelay,
                    TechId.StarCharts
                ],
            },
        },
        build: {
            armyPerCity: 2.5,  // v6.5: Lower than Scholar - spread focus
            settlerCap: 4,  // v6.5: HIGH - wide expansion
            desiredCities: 5,  // v9.10: Reduced from 7 - more focused expansion
            weights: {
                unit: {
                    [UnitType.Settler]: 1.4,  // v6.5: HIGH - expansion focus
                    [UnitType.ArmyBowGuard]: 1.4,
                    [UnitType.ArmySpearGuard]: 1.1,
                    [UnitType.ArmyRiders]: 0.7,
                },
                building: {
                    // v9.13: Re-enabled Bulwark for win rate testing
                    [BuildingType.Bulwark]: 2.0,
                    [BuildingType.CityWard]: 1.5,
                    [BuildingType.Academy]: 1.5,
                },
                project: {
                    [ProjectId.Observatory]: 2.0,  // High priority now (standard path)
                    [ProjectId.GrandAcademy]: 1.2,
                    [ProjectId.GrandExperiment]: 1.2,
                },
            },
        },
        economy: {
            reserveMultiplier: 1.45,
            deficitToleranceTurns: 2,
            goldBuildBias: 1.7,
            rushBuyAggression: 0.7,
            upkeepRatioLimit: 0.35,
        },
        tactics: { riskTolerance: 0.15, forceConcentration: 0.5, siegeCommitment: 0.4, retreatHpFrac: 0.5, rangedCaution: 0.9 },
        titan: { capitalHunt: 0.5, finisher: 0.6, momentum: 0.5 },
    }),

    JadeCovenant: mergeProfile(baseProfile, {
        civName: "JadeCovenant",
        diplomacy: {
            // v8.11: Balanced settings - rely on pop bonus nerf instead
            warPowerRatio: 1.1,
            warDistanceMax: 16, // v1.0.8: Increased (was 14)
            peaceIfBelowRatio: 0.85,
            minWarTurn: 24,
            maxConcurrentWars: 1,
            maxInitiatedWarsPer50Turns: 1,
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
            armyPerCity: 2.3,
            settlerCap: 3,
            desiredCities: 6,
            weights: {
                building: { [BuildingType.JadeGranary]: 1.35, [BuildingType.Farmstead]: 1.0 },
                unit: { [UnitType.Settler]: 1.45, [UnitType.SpearGuard]: 1.0, [UnitType.BowGuard]: 1.0 },
                project: {
                    [ProjectId.Observatory]: 1.4, // v1.6: Higher for Progress path
                    [ProjectId.GrandAcademy]: 1.4,
                    [ProjectId.GrandExperiment]: 1.4,
                },
            },
        },
        economy: {
            reserveMultiplier: 0.98,
            deficitToleranceTurns: 2,
            goldBuildBias: 1.45,
            rushBuyAggression: 0.78,
            upkeepRatioLimit: 0.32,
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
