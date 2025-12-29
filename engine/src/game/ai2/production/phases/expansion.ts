import { City, GameState } from "../../../../core/types.js";
import { pickEarlyExpansionBuild, pickExpansionBuild } from "../expansion.js";
import type { DefenseDecision } from "../defense-priority.js";
import type { BuildOption, ProductionContext } from "../../production.js";

function pickExpandPhaseEarlyExpansionBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    return pickEarlyExpansionBuild(state, playerId, city, context, defenseDecision);
}

function pickDevelopPhaseEarlyExpansionBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    return pickEarlyExpansionBuild(state, playerId, city, context, defenseDecision);
}

function pickExecutePhaseEarlyExpansionBuild(
    _state: GameState,
    _playerId: string,
    _city: City,
    _context: ProductionContext,
    _defenseDecision: DefenseDecision
): BuildOption | null {
    return null;
}

export function pickPhaseEarlyExpansionBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    switch (context.phase) {
        case "Expand":
            return pickExpandPhaseEarlyExpansionBuild(state, playerId, city, context, defenseDecision);
        case "Develop":
            return pickDevelopPhaseEarlyExpansionBuild(state, playerId, city, context, defenseDecision);
        case "Execute":
            return pickExecutePhaseEarlyExpansionBuild(state, playerId, city, context, defenseDecision);
        default:
            return pickEarlyExpansionBuild(state, playerId, city, context, defenseDecision);
    }
}

function pickExpandPhaseExpansionBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    return pickExpansionBuild(state, playerId, city, context, defenseDecision);
}

function pickDevelopPhaseExpansionBuild(
    _state: GameState,
    _playerId: string,
    _city: City,
    _context: ProductionContext,
    _defenseDecision: DefenseDecision
): BuildOption | null {
    return null;
}

function pickExecutePhaseExpansionBuild(
    _state: GameState,
    _playerId: string,
    _city: City,
    _context: ProductionContext,
    _defenseDecision: DefenseDecision
): BuildOption | null {
    return null;
}

export function pickPhaseExpansionBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    switch (context.phase) {
        case "Expand":
            return pickExpandPhaseExpansionBuild(state, playerId, city, context, defenseDecision);
        case "Develop":
            return pickDevelopPhaseExpansionBuild(state, playerId, city, context, defenseDecision);
        case "Execute":
            return pickExecutePhaseExpansionBuild(state, playerId, city, context, defenseDecision);
        default:
            return pickExpansionBuild(state, playerId, city, context, defenseDecision);
    }
}
