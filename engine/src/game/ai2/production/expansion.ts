import { canBuild, getProgressVictoryCityRequirement } from "../../rules.js";
import { City, GameState, ProjectId, UnitType } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { settlersInFlight } from "./analysis.js";
import type { BuildOption, ProductionContext } from "../production.js";
import {
    hasHostileMilitaryNearCity,
    isSafeSettlerStagingCity,
    isSettlerEscortCombatUnit,
} from "../../ai/shared/settler-production-gates.js";

function shouldPauseJadeSettlers(context: ProductionContext): boolean {
    if (context.profile.civName !== "JadeCovenant") return false;

    // Jade should freeze expansion before treasury runaway to preserve pressure.
    const severeUpkeepPressure = context.economy.upkeepRatio > (context.profile.economy.upkeepRatioLimit + 0.08);
    const shortDeficitRunway = context.economy.netGold < 0 && context.economy.deficitRiskTurns <= 6;
    return context.economy.economyState === "Strained" && severeUpkeepPressure && shortDeficitRunway;
}

function shouldPauseSettlersBySafety(
    state: GameState,
    playerId: string,
    context: ProductionContext,
    city: City
): boolean {
    if (!context.atWar || isSafeSettlerStagingCity(state, playerId, city.id)) return false;

    if (city.isCapital) {
        aiInfo(`[AI Build] ${context.profile.civName} settler gate active: unsafe-war-city`);
    }

    return true;
}

function shouldPauseSettlersForLocalThreat(
    state: GameState,
    playerId: string,
    context: ProductionContext,
    city: City
): boolean {
    if (hasHostileMilitaryNearCity(state, playerId, city.coord, 4, false)) {
        if (city.isCapital) {
            aiInfo(`[AI Build] ${context.profile.civName} local settler gate active: hostile-near-city`);
        }
        return true;
    }

    const nearbyNativeCamp = (state.nativeCamps ?? []).some(camp => hexDistance(camp.coord, city.coord) <= 4);
    if (!nearbyNativeCamp || state.turn > 80) return false;

    const escortUnits = context.myMilitaryUnits.filter(unit => isSettlerEscortCombatUnit(unit.type));
    if (escortUnits.length < 1) {
        if (city.isCapital) {
            aiInfo(`[AI Build] ${context.profile.civName} local settler gate active: nearby-native-camp-no-escort`);
        }
        return true;
    }

    return false;
}

export type ProgressVictoryExpansionNeed = {
    ownedCities: number;
    plannedCities: number;
    requiredCities: number;
    cityShortfall: number;
};

export function getProgressVictoryExpansionNeed(
    state: GameState,
    playerId: string,
    context: ProductionContext
): ProgressVictoryExpansionNeed | null {
    const ownedCities = context.myCities.length;
    const plannedCities = ownedCities + settlersInFlight(state, playerId);
    const requiredCities = getProgressVictoryCityRequirement(state.map);
    const cityShortfall = Math.max(0, requiredCities - plannedCities);
    if (cityShortfall <= 0) return null;

    const completedProjects = context.player.completedProjects ?? [];
    const hasProgressInvestment =
        completedProjects.includes(ProjectId.Observatory) ||
        completedProjects.includes(ProjectId.GrandAcademy) ||
        completedProjects.includes(ProjectId.GrandExperiment);
    if (!hasProgressInvestment) return null;

    return {
        ownedCities,
        plannedCities,
        requiredCities,
        cityShortfall,
    };
}

export function shouldExpandForProgressVictoryGate(
    state: GameState,
    playerId: string,
    context: ProductionContext
): boolean {
    return getProgressVictoryExpansionNeed(state, playerId, context) !== null;
}

export function pickEarlyExpansionBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext,
    defenseDecision: "defend" | "expand" | "interleave"
): BuildOption | null {
    if (state.turn >= 80 && context.phase !== "Expand") return null;
    const economyState = context.economy.economyState;
    if (economyState === "Crisis") {
        const eliminationRisk = context.myCities.length <= 1 &&
            (context.thisCityThreat === "raid" || context.thisCityThreat === "assault");
        if (!eliminationRisk) return null;
    }
    if (shouldPauseJadeSettlers(context)) {
        return null;
    }
    if (shouldPauseSettlersBySafety(state, playerId, context, city)) {
        return null;
    }
    if (shouldPauseSettlersForLocalThreat(state, playerId, context, city)) {
        return null;
    }

    const { settlerCap, desiredCities } = context.profile.build;
    if (context.myCities.length < desiredCities && settlersInFlight(state, playerId) < settlerCap) {
        const currentMilitary = context.myMilitaryUnits.length;
        const expansionSafe = defenseDecision === "expand" || currentMilitary >= 2;
        if (expansionSafe && canBuild(city, "Unit", UnitType.Settler, state)) {
            aiInfo(`[AI Build] ${context.profile.civName} EARLY EXPANSION: Settler (${context.myCities.length}/${desiredCities} cities)`);
            return { type: "Unit", id: UnitType.Settler };
        }
    }

    return null;
}

export function pickExpansionBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext,
    defenseDecision: "defend" | "expand" | "interleave"
): BuildOption | null {
    const progressVictoryExpansionNeed = getProgressVictoryExpansionNeed(state, playerId, context);
    if (context.phase !== "Expand" && !progressVictoryExpansionNeed) return null;
    const economyState = context.economy.economyState;
    if (economyState === "Crisis") {
        const eliminationRisk = context.myCities.length <= 1 &&
            (context.thisCityThreat === "raid" || context.thisCityThreat === "assault");
        if (!eliminationRisk) return null;
    }
    if (shouldPauseJadeSettlers(context)) {
        return null;
    }
    if (shouldPauseSettlersBySafety(state, playerId, context, city)) {
        return null;
    }
    if (shouldPauseSettlersForLocalThreat(state, playerId, context, city)) {
        return null;
    }

    const { settlerCap, desiredCities } = context.profile.build;
    const targetCities = Math.max(desiredCities, progressVictoryExpansionNeed?.requiredCities ?? desiredCities);
    if (context.myCities.length < targetCities && settlersInFlight(state, playerId) < settlerCap) {
        const expansionAllowed = progressVictoryExpansionNeed
            ? defenseDecision !== "defend"
            : (context.capabilities.garrison >= context.myCities.length || defenseDecision === "expand");
        if (expansionAllowed) {
            if (canBuild(city, "Unit", UnitType.Settler, state)) {
                if (progressVictoryExpansionNeed) {
                    aiInfo(
                        `[AI Build] ${context.profile.civName} PROGRESS GATE EXPAND: Settler ` +
                        `(${progressVictoryExpansionNeed.ownedCities}/${progressVictoryExpansionNeed.requiredCities} cities)`
                    );
                } else {
                    aiInfo(`[AI Build] ${context.profile.civName} EXPAND: Settler`);
                }
                return { type: "Unit", id: UnitType.Settler };
            }
        }
    }

    return null;
}
