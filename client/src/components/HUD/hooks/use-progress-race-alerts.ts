import { useEffect, useRef, useState } from "react";
import { GameState, ProjectId } from "@simple-civ/engine";
import { DiplomacyAlert } from "./use-diplomacy-alerts";

/**
 * Detects when other civilizations reach Progress victory milestones
 * and alerts the player so they can respond appropriately.
 * 
 * Alerts are shown when:
 * - An enemy completes Observatory
 * - An enemy completes GrandAcademy
 * - An enemy completes GrandExperiment
 * - An enemy starts building GrandExperiment (if we can see it)
 * 
 * Note: No requirement for player to have Observatory - all players should be aware of Progress race threats.
 */
export function useProgressRaceAlerts(gameState: GameState, playerId: string) {
    const [alerts, setAlerts] = useState<DiplomacyAlert[]>([]);
    const prevCompletedProjectsRef = useRef<Record<string, ProjectId[]>>({});
    const prevBuildingProjectsRef = useRef<Record<string, { cityId: string; projectId: ProjectId } | null>>({});
    const isFirstRunRef = useRef(true);

    useEffect(() => {
        // Skip the first run - we don't want to alert on pre-existing milestones
        if (isFirstRunRef.current) {
            isFirstRunRef.current = false;
            // Initialize tracking for all players
            gameState.players.forEach(p => {
                prevCompletedProjectsRef.current[p.id] = [...p.completedProjects];
                const buildingCity = gameState.cities.find(c =>
                    c.ownerId === p.id &&
                    c.currentBuild?.type === "Project" &&
                    (c.currentBuild.id === ProjectId.Observatory ||
                        c.currentBuild.id === ProjectId.GrandAcademy ||
                        c.currentBuild.id === ProjectId.GrandExperiment)
                );
                prevBuildingProjectsRef.current[p.id] = buildingCity ? {
                    cityId: buildingCity.id,
                    projectId: buildingCity.currentBuild!.id as ProjectId
                } : null;
            });
            return;
        }

        const newAlerts: DiplomacyAlert[] = [];

        // Check all other players for Progress milestones
        for (const otherPlayer of gameState.players) {
            if (otherPlayer.id === playerId || otherPlayer.isEliminated) continue;

            const prevProjects = prevCompletedProjectsRef.current[otherPlayer.id] || [];
            const currentProjects = otherPlayer.completedProjects;

            // Check for Observatory completion
            if (!prevProjects.includes(ProjectId.Observatory) && currentProjects.includes(ProjectId.Observatory)) {
                newAlerts.push({
                    id: `progress-observatory-${otherPlayer.id}-${Date.now()}`,
                    type: "ProgressRace",
                    otherPlayerId: otherPlayer.id,
                    civName: otherPlayer.civName,
                    progressMilestone: "Observatory",
                });
            }

            // Check for GrandAcademy completion
            if (!prevProjects.includes(ProjectId.GrandAcademy) && currentProjects.includes(ProjectId.GrandAcademy)) {
                newAlerts.push({
                    id: `progress-academy-${otherPlayer.id}-${Date.now()}`,
                    type: "ProgressRace",
                    otherPlayerId: otherPlayer.id,
                    civName: otherPlayer.civName,
                    progressMilestone: "GrandAcademy",
                });
            }

            // NOTE: GrandExperiment completion alert is intentionally omitted
            // because the game ends immediately with a Progress Victory when completed

            // Check for GrandExperiment being built (if we can see it)
            const buildingCity = gameState.cities.find(c =>
                c.ownerId === otherPlayer.id &&
                c.currentBuild?.type === "Project" &&
                c.currentBuild.id === ProjectId.GrandExperiment
            );
            const prevBuilding = prevBuildingProjectsRef.current[otherPlayer.id];
            const isNewlyBuilding = buildingCity && (!prevBuilding || prevBuilding.projectId !== ProjectId.GrandExperiment);

            if (isNewlyBuilding) {
                newAlerts.push({
                    id: `progress-building-experiment-${otherPlayer.id}-${Date.now()}`,
                    type: "ProgressRace",
                    otherPlayerId: otherPlayer.id,
                    civName: otherPlayer.civName,
                    progressMilestone: "GrandExperiment",
                });
            }

            // Update tracking
            prevCompletedProjectsRef.current[otherPlayer.id] = [...currentProjects];
            prevBuildingProjectsRef.current[otherPlayer.id] = buildingCity ? {
                cityId: buildingCity.id,
                projectId: buildingCity.currentBuild!.id as ProjectId
            } : null;
        }

        if (newAlerts.length > 0) {
            setAlerts(prev => [...prev, ...newAlerts]);
        }

    }, [gameState, playerId]);

    const dismissAlert = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    return {
        activeAlert: alerts.length > 0 ? alerts[0] : null,
        dismissAlert
    };
}

