import { City, GameState } from "../../../../core/types.js";
import { pickGarrisonReplenishmentBuild, pickWarEmergencyBuild } from "../emergency.js";
import { pickWarStagingProduction } from "../staging.js";
import { pickTrebuchetProduction } from "../war.js";
import type { BuildOption, ProductionContext } from "../../production.js";

function pickWarBuilds(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext
): BuildOption | null {
    return pickWarStagingProduction(state, playerId, city)
        ?? pickTrebuchetProduction(state, city, context)
        ?? pickGarrisonReplenishmentBuild(state, city, context)
        ?? pickWarEmergencyBuild(state, playerId, city, context);
}

function pickExpandPhaseWarBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext
): BuildOption | null {
    return pickWarBuilds(state, playerId, city, context);
}

function pickDevelopPhaseWarBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext
): BuildOption | null {
    return pickWarBuilds(state, playerId, city, context);
}

function pickExecutePhaseWarBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext
): BuildOption | null {
    return pickWarBuilds(state, playerId, city, context);
}

export function pickPhaseWarBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext
): BuildOption | null {
    switch (context.phase) {
        case "Expand":
            return pickExpandPhaseWarBuild(state, playerId, city, context);
        case "Develop":
            return pickDevelopPhaseWarBuild(state, playerId, city, context);
        case "Execute":
            return pickExecutePhaseWarBuild(state, playerId, city, context);
        default:
            return pickWarBuilds(state, playerId, city, context);
    }
}
