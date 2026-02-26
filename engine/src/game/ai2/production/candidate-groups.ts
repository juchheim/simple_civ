import type { AiVictoryGoal, City, GameState } from "../../../core/types.js";
import type { BuildOption, ProductionContext } from "../production.js";
import type { EconomySnapshot } from "../economy/budget.js";
import type { DefenseDecision } from "./defense-priority.js";
import {
    pickCityUnderAttackBuild,
    pickGarrisonReplenishmentBuild,
    pickWarEmergencyBuild
} from "./emergency.js";
import { pickVictoryProject } from "./victory.js";
import { pickEconomyBuilding } from "./economy.js";
import {
    pickAetherianVanguardBuild,
    pickDefensiveArmyBuild,
    pickDefensiveEarlyMilitaryBuild,
    pickDefensiveLorekeeperBuild,
    pickRiverLeagueEarlyBoost
} from "./civ-builds.js";
import { pickTechUnlockBuild } from "./tech-unlocks.js";
import { pickPhaseDefensePriorityBuild, pickPhaseDefenseSupportBuild } from "./phases/defense.js";
import { pickPhaseEarlyExpansionBuild, pickPhaseExpansionBuild } from "./phases/expansion.js";
import { pickProactiveReinforcementBuild } from "./proactive.js";
import { pickWarStagingProduction } from "./staging.js";
import { pickTrebuchetProduction } from "./war.js";
import { pickCapabilityGapBuild } from "./capability-gaps.js";
import { PRODUCTION_BASE_SCORES } from "./scoring.js";
import {
    getEarlyExpansionSupplyPenalty,
    getEconomyMilitaryPressureBoost,
    getExpansionSupplyPenalty
} from "./constants.js";

export type ProductionCandidateAddInput = {
    option: BuildOption | null;
    reason: string;
    base: number;
    components?: Record<string, number>;
    notes?: string[];
};

export type ProductionCandidateAdder = (input: ProductionCandidateAddInput) => void;

export type ProductionCandidateGroupParams = {
    addCandidate: ProductionCandidateAdder;
    state: GameState;
    playerId: string;
    city: City;
    goal: AiVictoryGoal;
    context: ProductionContext;
    profile: ProductionContext["profile"];
    myCities: City[];
    economy: EconomySnapshot;
    warEmergency: boolean;
    isEconomyRecoveryState: boolean;
    isCrisis: boolean;
    defenseDecision: DefenseDecision;
    shouldBuildDefender: boolean;
    theaterBias: number;
    threatMod: number;
    frontMod: number;
    pressureMod: number;
    safetyMod: number;
    expansionMod: number;
    gapMod: number;
    supplyGap: number;
    supplyNearCap: boolean;
};

function addWarCandidates(params: ProductionCandidateGroupParams): void {
    const {
        addCandidate,
        state,
        playerId,
        city,
        context,
        theaterBias,
        threatMod,
        frontMod,
        pressureMod,
    } = params;

    addCandidate({
        option: pickCityUnderAttackBuild(state, city, context),
        reason: "city-under-attack",
        base: PRODUCTION_BASE_SCORES.cityUnderAttack,
        components: { threat: threatMod },
    });

    addCandidate({
        option: pickWarStagingProduction(state, playerId, city, context),
        reason: "war-staging",
        base: PRODUCTION_BASE_SCORES.warStaging,
        components: { theater: theaterBias, front: frontMod, pressure: pressureMod },
    });

    addCandidate({
        option: pickTrebuchetProduction(state, city, context),
        reason: "war-siege",
        base: PRODUCTION_BASE_SCORES.warTrebuchet,
        components: { theater: theaterBias * 0.8, front: frontMod * 0.6 },
    });

    addCandidate({
        option: pickGarrisonReplenishmentBuild(state, city, context),
        reason: "war-garrison",
        base: PRODUCTION_BASE_SCORES.warGarrison,
        components: { threat: threatMod },
    });

    addCandidate({
        option: pickWarEmergencyBuild(state, playerId, city, context),
        reason: "war-emergency",
        base: PRODUCTION_BASE_SCORES.warEmergency,
        components: { threat: threatMod },
    });

    addCandidate({
        option: pickAetherianVanguardBuild(state, city, context),
        reason: "aetherian-titan",
        base: PRODUCTION_BASE_SCORES.aetherianRush,
    });
}

function addProgressAndDefenseCandidates(params: ProductionCandidateGroupParams): void {
    const {
        addCandidate,
        state,
        playerId,
        city,
        goal,
        context,
        profile,
        myCities,
        economy,
        warEmergency,
        isEconomyRecoveryState,
        defenseDecision,
        shouldBuildDefender,
        threatMod,
        pressureMod,
        safetyMod,
        expansionMod,
        supplyGap,
    } = params;

    if (!warEmergency && !isEconomyRecoveryState) {
        addCandidate({
            option: pickVictoryProject(state, playerId, city, goal, profile, myCities),
            reason: "victory-project",
            base: PRODUCTION_BASE_SCORES.victoryProject,
            components: { progress: goal === "Progress" ? 0.01 : 0 },
        });
    }

    addCandidate({
        option: pickPhaseDefensePriorityBuild(state, city, context, defenseDecision, shouldBuildDefender),
        reason: "defense-priority",
        base: PRODUCTION_BASE_SCORES.defensePriority,
        components: { threat: threatMod, pressure: pressureMod },
        notes: [`decision:${defenseDecision}`],
    });

    addCandidate({
        option: pickRiverLeagueEarlyBoost(state, city, context),
        reason: "riverleague-boost",
        base: PRODUCTION_BASE_SCORES.riverLeagueBoost,
    });

    addCandidate({
        option: pickDefensiveEarlyMilitaryBuild(state, city, context),
        reason: "defensive-early-military",
        base: PRODUCTION_BASE_SCORES.defensiveEarly,
        components: { threat: threatMod },
    });

    addCandidate({
        option: pickPhaseEarlyExpansionBuild(state, playerId, city, context, defenseDecision),
        reason: "early-expansion",
        base: PRODUCTION_BASE_SCORES.earlyExpansion,
        components: {
            safety: safetyMod,
            expansion: expansionMod,
            recoveryPenalty: isEconomyRecoveryState ? -0.03 : 0,
            supplyPressurePenalty: getEarlyExpansionSupplyPenalty(supplyGap, economy.atWar),
        },
    });

    addCandidate({
        option: pickDefensiveLorekeeperBuild(state, city, context),
        reason: "defensive-lorekeeper",
        base: PRODUCTION_BASE_SCORES.defensiveLorekeeper,
        components: { threat: threatMod },
    });

    if (!isEconomyRecoveryState) {
        addCandidate({
            option: pickDefensiveArmyBuild(state, city, context),
            reason: "defensive-army",
            base: PRODUCTION_BASE_SCORES.defensiveArmy,
            components: { threat: threatMod },
        });
    }
}

function addStrategicCandidates(params: ProductionCandidateGroupParams): void {
    const {
        addCandidate,
        state,
        playerId,
        city,
        goal,
        context,
        defenseDecision,
        theaterBias,
        frontMod,
        threatMod,
        pressureMod,
        gapMod,
        safetyMod,
        expansionMod,
        isEconomyRecoveryState,
        supplyGap,
        economy,
    } = params;

    addCandidate({
        option: pickTechUnlockBuild(state, city, context),
        reason: "tech-unlock",
        base: PRODUCTION_BASE_SCORES.techUnlock,
    });

    addCandidate({
        option: pickProactiveReinforcementBuild(state, playerId, city, context),
        reason: "proactive-reinforcement",
        base: PRODUCTION_BASE_SCORES.proactiveReinforcement,
        components: { theater: theaterBias * 0.6, front: frontMod * 0.4 },
    });

    addCandidate({
        option: pickPhaseDefenseSupportBuild(state, city, goal, context, defenseDecision),
        reason: "defense-support",
        base: PRODUCTION_BASE_SCORES.defenseSupport,
        components: { threat: threatMod, pressure: pressureMod * 0.7 },
    });

    addCandidate({
        option: pickCapabilityGapBuild(state, city, context),
        reason: "capability-gap",
        base: PRODUCTION_BASE_SCORES.capabilityGap,
        components: { gap: gapMod },
    });

    addCandidate({
        option: pickPhaseExpansionBuild(state, playerId, city, context, defenseDecision),
        reason: "expansion",
        base: PRODUCTION_BASE_SCORES.expansion,
        components: {
            safety: safetyMod,
            expansion: expansionMod,
            pressure: -pressureMod,
            recoveryPenalty: isEconomyRecoveryState ? -0.04 : 0,
            supplyPressurePenalty: getExpansionSupplyPenalty(supplyGap, economy.atWar),
        },
    });
}

function addEconomyCandidates(params: ProductionCandidateGroupParams): void {
    const {
        addCandidate,
        state,
        playerId,
        city,
        profile,
        economy,
        isCrisis,
        isEconomyRecoveryState,
        safetyMod,
        supplyGap,
        supplyNearCap,
    } = params;

    addCandidate({
        option: pickEconomyBuilding(state, playerId, city, profile.civName, economy, profile.economy.goldBuildBias),
        reason: "economy",
        base: PRODUCTION_BASE_SCORES.economy,
        components: {
            safety: safetyMod,
            recoveryBoost: isCrisis ? 0.20 : (isEconomyRecoveryState ? 0.10 : 0),
            upkeepPressureBoost: economy.upkeepRatio > profile.economy.upkeepRatioLimit ? 0.10 : 0,
            militaryPressureBoost: getEconomyMilitaryPressureBoost(supplyGap, supplyNearCap, economy.atWar),
        },
        notes: [`economy:${economy.economyState}`],
    });
}

export function addPrimaryProductionCandidates(params: ProductionCandidateGroupParams): void {
    addWarCandidates(params);
    addProgressAndDefenseCandidates(params);
    addStrategicCandidates(params);
    addEconomyCandidates(params);
}
