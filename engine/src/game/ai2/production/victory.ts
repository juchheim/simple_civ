import { canBuild, getProgressVictoryCityRequirement } from "../../rules.js";
import { AiVictoryGoal, City, GameState, ProjectId, TechId } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { getProgressEndgameTurn } from "../../ai/progress-helpers.js";
import { evaluateBestVictoryPath } from "../../ai/victory-evaluator.js";
import { getAiMemoryV2 } from "../memory.js";
import { settlersInFlight } from "./analysis.js";
import type { BuildOption } from "../production.js";
import type { CivAiProfileV2 } from "../rules.js";

function getProjectedProgressCityPlan(state: GameState, playerId: string): {
    ownedCities: number;
    plannedCities: number;
    requiredCities: number;
    cityShortfall: number;
} {
    const ownedCities = state.cities.filter(c => c.ownerId === playerId).length;
    const plannedCities = ownedCities + settlersInFlight(state, playerId);
    const requiredCities = getProgressVictoryCityRequirement(state.map);
    const cityShortfall = Math.max(0, requiredCities - plannedCities);

    return {
        ownedCities,
        plannedCities,
        requiredCities,
        cityShortfall,
    };
}

function getEligibleProgressProjects(state: GameState, playerId: string, player: GameState["players"][number]): ProjectId[] {
    const { cityShortfall } = getProjectedProgressCityPlan(state, playerId);
    const projectOrder = [ProjectId.GrandExperiment, ProjectId.GrandAcademy, ProjectId.Observatory];

    if (cityShortfall <= 0) return projectOrder;
    if (!player.completedProjects.includes(ProjectId.Observatory)) {
        return [ProjectId.Observatory];
    }

    return [];
}

function getProgressCityGateReason(state: GameState, playerId: string): string | null {
    const { ownedCities, plannedCities, requiredCities, cityShortfall } = getProjectedProgressCityPlan(state, playerId);
    if (requiredCities <= 1) return null;
    if (cityShortfall <= 0) return null;
    if (plannedCities > ownedCities) {
        return `need-${cityShortfall}-more-cities planned (${plannedCities}/${requiredCities})`;
    }
    return `need-${cityShortfall}-more-cities (${ownedCities}/${requiredCities})`;
}

/**
 * Selects a Progress victory project if appropriate for the player's goal/civ.
 * Returns null if no victory project should be built this turn.
 */
export function pickVictoryProject(
    state: GameState,
    playerId: string,
    city: City,
    goal: AiVictoryGoal,
    profile: CivAiProfileV2,
    myCities: City[]
): BuildOption | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;
    const progressProjects = getEligibleProgressProjects(state, playerId, player);
    const cityGateReason = getProgressCityGateReason(state, playerId);

    // Primary Progress / science civ path
    if (goal === "Progress" || profile.civName === "ScholarKingdoms" || profile.civName === "StarborneSeekers") {
        for (const pid of progressProjects) {
            if (canBuild(city, "Project", pid, state)) {
                const reason = cityGateReason ? `Victory, ${cityGateReason}` : "Victory";
                aiInfo(`[AI Build] ${profile.civName} PRIORITY: ${pid} (${reason})`);
                return { type: "Project", id: pid };
            }
        }
    }

    // Hybrid/pivot path: consider building Observatory/GrandAcademy when Progress is competitive.
    const hasStarCharts = player.techs.includes(TechId.StarCharts);
    const hasObservatory = player.completedProjects.includes(ProjectId.Observatory);
    const hasGrandAcademy = player.completedProjects.includes(ProjectId.GrandAcademy);
    const hasInvestedInProgress = hasObservatory || hasGrandAcademy;

    // Shared late-game stall breaker: once a map is in its endgame window, any
    // civ with StarCharts should consider converting science into an actual win.
    const isLateGame = state.turn >= getProgressEndgameTurn(state.map);
    if (isLateGame && hasStarCharts) {
        for (const pid of progressProjects) {
            if (canBuild(city, "Project", pid, state)) {
                const reason = cityGateReason ? `stall breaker, ${cityGateReason}` : `stall breaker, turn ${state.turn}`;
                aiInfo(`[AI Build] ${profile.civName} LATE-GAME PROGRESS: ${pid} (${reason})`);
                return { type: "Project", id: pid };
            }
        }
    }

    const hasDrilledRanks = player.techs.includes(TechId.DrilledRanks);
    const hasArmyDoctrine = player.techs.includes(TechId.ArmyDoctrine);
    const hasCompositeArmor = player.techs.includes(TechId.CompositeArmor);
    const atMilitaryMilestone = hasDrilledRanks || hasArmyDoctrine || hasCompositeArmor;

    // Evaluate at key milestones whether Progress is viable enough to justify building toward it.
    let progressRecommended = false;
    if (atMilitaryMilestone && !hasStarCharts) {
        const victoryEval = evaluateBestVictoryPath(state, playerId);
        const progressWithinRange = victoryEval.turnsToProgress <= victoryEval.turnsToConquest + 40;
        const lastChancePivot = hasCompositeArmor && victoryEval.turnsToProgress <= victoryEval.turnsToConquest + 50;
        progressRecommended = victoryEval.progressFaster || progressWithinRange || lastChancePivot;
    }

    const hasMonsterEmpire = myCities.length >= 8 && hasStarCharts;
    const FULL_TECH_TREE_SIZE = 20;
    const techTreeComplete = player.techs.length >= FULL_TECH_TREE_SIZE;
    const hasIncompleteProgressChain = hasObservatory && !player.completedProjects.includes(ProjectId.GrandExperiment);
    const forceProgressFinish = techTreeComplete && hasIncompleteProgressChain;

    const shouldPushProgress = hasStarCharts && (hasInvestedInProgress || progressRecommended || hasMonsterEmpire || forceProgressFinish);
    if (shouldPushProgress) {
        const anyBuildingProgress = myCities.some(c =>
            c.currentBuild?.type === "Project" &&
            [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment].includes(c.currentBuild.id as ProjectId)
        );
        const allowMultipleCities = forceProgressFinish || progressRecommended || hasMonsterEmpire;

        if (!anyBuildingProgress || allowMultipleCities) {
            for (const pid of progressProjects) {
                if (canBuild(city, "Project", pid, state)) {
                    const milestone = hasCompositeArmor ? "CompositeArmor" : hasArmyDoctrine ? "ArmyDoctrine" : "DrilledRanks";
                    const reason = forceProgressFinish ? "STALL PREVENTION" :
                        progressRecommended ? `PIVOT at ${milestone}` : "has StarCharts";
                    const fullReason = cityGateReason ? `${reason}, ${cityGateReason}` : reason;
                    aiInfo(`[AI Build] ${profile.civName} PROGRESS: ${pid} (${fullReason})`);
                    return { type: "Project", id: pid };
                }
            }
        }
    }

    // ScholarKingdoms fallback: if war prep in place and a city is building a project, other cities help
    const memory = getAiMemoryV2(state, playerId);
    const focusCityId = memory.focusCityId;
    if (profile.civName === "ScholarKingdoms" && focusCityId && hasStarCharts) {
        const focusCity = state.cities.find(c => c.id === focusCityId);
        if (focusCity && focusCity.ownerId === playerId && focusCity.id !== city.id) {
            for (const pid of progressProjects) {
                if (canBuild(city, "Project", pid, state)) {
                    const reason = cityGateReason ? `Focus city ${focusCity.name}, ${cityGateReason}` : `Focus city ${focusCity.name}`;
                    aiInfo(`[AI Build] ScholarKingdoms SUPPORT: ${pid} (${reason})`);
                    return { type: "Project", id: pid };
                }
            }
        }
    }

    return null;
}
