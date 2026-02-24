import { canBuild } from "../../rules.js";
import { City, GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { settlersInFlight } from "./analysis.js";
import type { BuildOption, ProductionContext } from "../production.js";

function shouldPauseJadeSettlers(context: ProductionContext): boolean {
    if (context.profile.civName !== "JadeCovenant") return false;

    // Jade should only freeze expansion under severe pressure, not mild upkeep strain.
    const severeUpkeepPressure = context.economy.upkeepRatio > (context.profile.economy.upkeepRatioLimit + 0.14);
    const shortDeficitRunway = context.economy.netGold < 0 && context.economy.deficitRiskTurns <= 3;
    return context.economy.economyState === "Strained" && (severeUpkeepPressure || shortDeficitRunway);
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
    if (context.phase !== "Expand") return null;
    const economyState = context.economy.economyState;
    if (economyState === "Crisis") {
        const eliminationRisk = context.myCities.length <= 1 &&
            (context.thisCityThreat === "raid" || context.thisCityThreat === "assault");
        if (!eliminationRisk) return null;
    }
    if (shouldPauseJadeSettlers(context)) {
        return null;
    }

    const { settlerCap, desiredCities } = context.profile.build;
    if (context.myCities.length < desiredCities && settlersInFlight(state, playerId) < settlerCap) {
        if (context.capabilities.garrison >= context.myCities.length || defenseDecision === "expand") {
            if (canBuild(city, "Unit", UnitType.Settler, state)) {
                aiInfo(`[AI Build] ${context.profile.civName} EXPAND: Settler`);
                return { type: "Unit", id: UnitType.Settler };
            }
        }
    }

    return null;
}
