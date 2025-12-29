import { AiVictoryGoal, City, GameState } from "../../../../core/types.js";
import {
    pickDefensePriorityBuild,
    pickGarrisonBuild,
    pickTerritorialDefenderBuild,
    pickShieldGeneratorBuild,
    pickBulwarkBuild
} from "../defense-builds.js";
import type { DefenseDecision } from "../defense-priority.js";
import type { BuildOption, ProductionContext } from "../../production.js";

function pickDefensePriorityBuilds(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision,
    shouldBuildDefender: boolean
): BuildOption | null {
    return pickDefensePriorityBuild(state, city, context, defenseDecision, shouldBuildDefender);
}

function pickDefenseSupportBuilds(
    state: GameState,
    city: City,
    goal: AiVictoryGoal,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    return pickGarrisonBuild(state, city, context, defenseDecision)
        ?? pickTerritorialDefenderBuild(state, city, context, defenseDecision)
        ?? pickShieldGeneratorBuild(state, city, goal, context)
        ?? pickBulwarkBuild(state, city, context);
}

function pickExpandPhaseDefensePriorityBuild(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision,
    shouldBuildDefender: boolean
): BuildOption | null {
    return pickDefensePriorityBuilds(state, city, context, defenseDecision, shouldBuildDefender);
}

function pickDevelopPhaseDefensePriorityBuild(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision,
    shouldBuildDefender: boolean
): BuildOption | null {
    return pickDefensePriorityBuilds(state, city, context, defenseDecision, shouldBuildDefender);
}

function pickExecutePhaseDefensePriorityBuild(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision,
    shouldBuildDefender: boolean
): BuildOption | null {
    return pickDefensePriorityBuilds(state, city, context, defenseDecision, shouldBuildDefender);
}

export function pickPhaseDefensePriorityBuild(
    state: GameState,
    city: City,
    context: ProductionContext,
    defenseDecision: DefenseDecision,
    shouldBuildDefender: boolean
): BuildOption | null {
    switch (context.phase) {
        case "Expand":
            return pickExpandPhaseDefensePriorityBuild(state, city, context, defenseDecision, shouldBuildDefender);
        case "Develop":
            return pickDevelopPhaseDefensePriorityBuild(state, city, context, defenseDecision, shouldBuildDefender);
        case "Execute":
            return pickExecutePhaseDefensePriorityBuild(state, city, context, defenseDecision, shouldBuildDefender);
        default:
            return pickDefensePriorityBuilds(state, city, context, defenseDecision, shouldBuildDefender);
    }
}

function pickExpandPhaseDefenseSupportBuild(
    state: GameState,
    city: City,
    goal: AiVictoryGoal,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    return pickDefenseSupportBuilds(state, city, goal, context, defenseDecision);
}

function pickDevelopPhaseDefenseSupportBuild(
    state: GameState,
    city: City,
    goal: AiVictoryGoal,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    return pickDefenseSupportBuilds(state, city, goal, context, defenseDecision);
}

function pickExecutePhaseDefenseSupportBuild(
    state: GameState,
    city: City,
    goal: AiVictoryGoal,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    return pickDefenseSupportBuilds(state, city, goal, context, defenseDecision);
}

export function pickPhaseDefenseSupportBuild(
    state: GameState,
    city: City,
    goal: AiVictoryGoal,
    context: ProductionContext,
    defenseDecision: DefenseDecision
): BuildOption | null {
    switch (context.phase) {
        case "Expand":
            return pickExpandPhaseDefenseSupportBuild(state, city, goal, context, defenseDecision);
        case "Develop":
            return pickDevelopPhaseDefenseSupportBuild(state, city, goal, context, defenseDecision);
        case "Execute":
            return pickExecutePhaseDefenseSupportBuild(state, city, goal, context, defenseDecision);
        default:
            return pickDefenseSupportBuilds(state, city, goal, context, defenseDecision);
    }
}
