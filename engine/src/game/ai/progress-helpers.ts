/**
 * Shared Progress Victory Helpers
 * v1.9: Consolidated from duplicated logic across goals.ts and cities.ts
 */
import { GameState, ProjectId, TechId } from "../../core/types.js";
import { getProgressVictoryCityRequirement, getProgressVictoryCityShortfall, meetsProgressVictoryCityRequirement } from "../rules.js";

export type ProgressChainStatus = {
    hasStarCharts: boolean;
    hasObservatory: boolean;
    hasGrandAcademy: boolean;
    hasGrandExperiment: boolean;
    requiredCities: number;
    cityShortfall: number;
    canWinProgress: boolean;
    isBuildingProgressProject: boolean;
    buildingProjectId: ProjectId | null;
    buildProgress: number;
    buildCost: number;
    progressPercent: number;
    nextProject: ProjectId | null;
    isNearVictory: boolean;
    canStartChain: boolean;
};

export function getProgressEndgameTurn(map?: Pick<GameState["map"], "width" | "height">): number {
    if (!map) return 225;
    if (map.width >= 40 || map.height >= 30) return 230;
    if (map.width >= 35 || map.height >= 25) return 215;
    if (map.width >= 30 || map.height >= 22) return 190;
    if (map.width >= 25 || map.height >= 20) return 175;
    return 165;
}

/**
 * Get complete Progress victory chain status for a player.
 * Consolidates all Progress chain checks into one function.
 */
export function getProgressChainStatus(state: GameState, playerId: string): ProgressChainStatus {
    const player = state.players.find(p => p.id === playerId);

    const techs = player?.techs ?? [];
    const completedProjects = player?.completedProjects ?? [];

    const hasStarCharts = techs.includes(TechId.StarCharts);
    const hasObservatory = completedProjects.includes(ProjectId.Observatory);
    const hasGrandAcademy = completedProjects.includes(ProjectId.GrandAcademy);
    const hasGrandExperiment = completedProjects.includes(ProjectId.GrandExperiment);
    const requiredCities = getProgressVictoryCityRequirement(state.map);
    const cityShortfall = getProgressVictoryCityShortfall(state, playerId);
    const canWinProgress = meetsProgressVictoryCityRequirement(state, playerId);

    // Check if currently building a Progress project
    const progressCity = state.cities.find(c =>
        c.ownerId === playerId &&
        c.currentBuild?.type === "Project" &&
        (c.currentBuild.id === ProjectId.Observatory ||
            c.currentBuild.id === ProjectId.GrandAcademy ||
            c.currentBuild.id === ProjectId.GrandExperiment)
    );

    const isBuildingProgressProject = !!progressCity;
    const buildingProjectId = progressCity?.currentBuild?.id as ProjectId | null ?? null;
    const buildProgress = progressCity?.buildProgress ?? 0;
    const buildCost = progressCity?.currentBuild?.cost ?? 1;
    const progressPercent = buildCost > 0 ? (buildProgress / buildCost) * 100 : 0;

    // Determine next project in chain
    let nextProject: ProjectId | null = null;
    if (hasStarCharts && !hasObservatory) {
        nextProject = ProjectId.Observatory;
    } else if (hasObservatory && !hasGrandAcademy) {
        nextProject = ProjectId.GrandAcademy;
    } else if (hasGrandAcademy && !hasGrandExperiment) {
        nextProject = ProjectId.GrandExperiment;
    }

    // Near victory: GrandAcademy done OR building GrandExperiment with >50%
    const isNearVictory = cityShortfall <= 1 && (
        hasGrandAcademy ||
        hasGrandExperiment ||
        (isBuildingProgressProject && buildingProjectId === ProjectId.GrandExperiment && progressPercent > 50)
    );

    // Can start chain: has StarCharts
    const canStartChain = hasStarCharts;

    return {
        hasStarCharts,
        hasObservatory,
        hasGrandAcademy,
        hasGrandExperiment,
        requiredCities,
        cityShortfall,
        canWinProgress,
        isBuildingProgressProject,
        buildingProjectId,
        buildProgress,
        buildCost,
        progressPercent,
        nextProject,
        isNearVictory,
        canStartChain,
    };
}

/**
 * Check if any enemy is close to Progress victory.
 */
export function hasEnemyProgressThreat(state: GameState, playerId: string): boolean {
    const enemies = state.players.filter(p => p.id !== playerId && !p.isEliminated);

    return enemies.some(p => {
        const status = getProgressChainStatus(state, p.id);
        return (status.canWinProgress && status.hasGrandExperiment) ||
            (status.cityShortfall <= 1 && (status.hasGrandAcademy || status.hasGrandExperiment)) ||
            (status.isBuildingProgressProject &&
                (status.buildingProjectId === ProjectId.GrandAcademy ||
                    status.buildingProjectId === ProjectId.GrandExperiment));
    });
}
