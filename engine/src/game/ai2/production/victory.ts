import { canBuild } from "../../rules.js";
import { AiVictoryGoal, City, GameState, ProjectId, TechId } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { evaluateBestVictoryPath } from "../../ai/victory-evaluator.js";
import { getAiMemoryV2 } from "../memory.js";
import type { BuildOption } from "../production.js";
import type { CivAiProfileV2 } from "../rules.js";

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

    // Primary Progress / science civ path
    if (goal === "Progress" || profile.civName === "ScholarKingdoms" || profile.civName === "StarborneSeekers") {
        const progressProjects = [ProjectId.GrandExperiment, ProjectId.GrandAcademy, ProjectId.Observatory];
        for (const pid of progressProjects) {
            if (canBuild(city, "Project", pid, state)) {
                aiInfo(`[AI Build] ${profile.civName} PRIORITY: ${pid} (Victory)`);
                return { type: "Project", id: pid };
            }
        }
    }

    // Hybrid/pivot path: consider building Observatory/GrandAcademy when Progress is competitive.
    const hasStarCharts = player.techs.includes(TechId.StarCharts);
    const hasObservatory = player.completedProjects.includes(ProjectId.Observatory);
    const hasGrandAcademy = player.completedProjects.includes(ProjectId.GrandAcademy);
    const hasInvestedInProgress = hasObservatory || hasGrandAcademy;

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
            const progressProjects = [ProjectId.GrandExperiment, ProjectId.GrandAcademy, ProjectId.Observatory];
            for (const pid of progressProjects) {
                if (canBuild(city, "Project", pid, state)) {
                    const milestone = hasCompositeArmor ? "CompositeArmor" : hasArmyDoctrine ? "ArmyDoctrine" : "DrilledRanks";
                    const reason = forceProgressFinish ? "STALL PREVENTION" :
                        progressRecommended ? `PIVOT at ${milestone}` : "has StarCharts";
                    aiInfo(`[AI Build] ${profile.civName} PROGRESS: ${pid} (${reason})`);
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
            const progressProjects = [ProjectId.GrandExperiment, ProjectId.GrandAcademy, ProjectId.Observatory];
            for (const pid of progressProjects) {
                if (canBuild(city, "Project", pid, state)) {
                    aiInfo(`[AI Build] ScholarKingdoms SUPPORT: ${pid} (Focus city ${focusCity.name})`);
                    return { type: "Project", id: pid };
                }
            }
        }
    }

    return null;
}
