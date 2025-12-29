import { canBuild } from "../../rules.js";
import { City, GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { settlersInFlight } from "./analysis.js";
import type { BuildOption, ProductionContext } from "../production.js";

export function pickEarlyExpansionBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext,
    defenseDecision: "defend" | "expand" | "interleave"
): BuildOption | null {
    if (state.turn >= 80 && context.phase !== "Expand") return null;

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
