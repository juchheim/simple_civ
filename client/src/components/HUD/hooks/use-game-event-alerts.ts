import { useEffect, useRef, useState } from "react";
import { GameState, HistoryEventType, BuildingType, ProjectId, EraId } from "@simple-civ/engine";
import { DiplomacyAlert } from "./use-diplomacy-alerts";

/**
 * Detects important game events from history and current state to notify the player.
 * 
 * Events detected:
 * - Capital captures (with running total)
 * - Unique building starts/completions (TitansCore, SpiritObservatory, JadeGranary)
 * - Era transitions
 * - City razing
 * - Progress race events (delegated to useProgressRaceAlerts)
 * 
 * All players are notified of these events regardless of their own progress.
 */
export function useGameEventAlerts(gameState: GameState, playerId: string) {
    const [alerts, setAlerts] = useState<DiplomacyAlert[]>([]);
    const prevHistoryEventsRef = useRef<Set<string>>(new Set());
    const prevBuildingStatesRef = useRef<Record<string, {
        buildingTitansCore: boolean;
        buildingSpiritObservatory: boolean;
        buildingJadeGranary: boolean;
        completedTitansCore: boolean;
        completedSpiritObservatory: boolean;
        completedJadeGranary: boolean;
    }>>({});
    const prevErasRef = useRef<Record<string, EraId>>({});
    const capitalCountsRef = useRef<Record<string, number>>({});
    const prevEliminatedRef = useRef<Record<string, boolean>>({});
    const isFirstRunRef = useRef(true);

    useEffect(() => {
        // Initialize tracking
        if (isFirstRunRef.current) {
            isFirstRunRef.current = false;
            gameState.players.forEach(p => {
                prevErasRef.current[p.id] = p.currentEra;
                prevBuildingStatesRef.current[p.id] = {
                    buildingTitansCore: false,
                    buildingSpiritObservatory: false,
                    buildingJadeGranary: false,
                    completedTitansCore: p.completedProjects.includes(ProjectId.TitansCoreComplete),
                    completedSpiritObservatory: p.completedProjects.includes(ProjectId.Observatory) && p.civName === "StarborneSeekers",
                    completedJadeGranary: p.completedProjects.includes(ProjectId.JadeGranaryComplete),
                };
                // Count initial capitals owned by each civ
                capitalCountsRef.current[p.id] = gameState.cities.filter(c =>
                    c.ownerId === p.id && c.isCapital
                ).length;
                // Track elimination status
                prevEliminatedRef.current[p.id] = p.isEliminated;
            });
            // Track initial history events
            if (gameState.history?.events) {
                gameState.history.events.forEach(e => {
                    prevHistoryEventsRef.current.add(`${e.turn}-${e.type}-${e.playerId}-${JSON.stringify(e.data)}`);
                });
            }
            return;
        }

        const newAlerts: DiplomacyAlert[] = [];

        // 1. Check history events for new occurrences
        if (gameState.history?.events) {
            for (const event of gameState.history.events) {
                const eventKey = `${event.turn}-${event.type}-${event.playerId}-${JSON.stringify(event.data)}`;
                if (prevHistoryEventsRef.current.has(eventKey)) continue;
                prevHistoryEventsRef.current.add(eventKey);

                const otherPlayer = gameState.players.find(p => p.id === event.playerId);
                if (!otherPlayer || otherPlayer.id === playerId || otherPlayer.isEliminated) continue;

                // Capital capture
                if (event.type === HistoryEventType.CityCaptured && event.data.isCapital) {
                    capitalCountsRef.current[event.playerId] = (capitalCountsRef.current[event.playerId] || 0) + 1;
                    newAlerts.push({
                        id: `capital-capture-${event.playerId}-${event.data.cityId}-${Date.now()}`,
                        type: "CapitalCaptured",
                        otherPlayerId: event.playerId,
                        civName: otherPlayer.civName,
                        cityName: event.data.cityName,
                        capitalCount: capitalCountsRef.current[event.playerId],
                    });
                }

                // City razing
                if (event.type === HistoryEventType.CityRazed) {
                    newAlerts.push({
                        id: `city-razed-${event.playerId}-${event.data.cityId}-${Date.now()}`,
                        type: "CityRazed",
                        otherPlayerId: event.playerId,
                        civName: otherPlayer.civName,
                        cityName: event.data.cityName,
                    });
                }

                // Era transition
                if (event.type === HistoryEventType.EraEntered) {
                    newAlerts.push({
                        id: `era-${event.playerId}-${event.data.era}-${Date.now()}`,
                        type: "EraTransition",
                        otherPlayerId: event.playerId,
                        civName: otherPlayer.civName,
                        era: event.data.era,
                    });
                }

                // Wonder built (unique buildings)
                if (event.type === HistoryEventType.WonderBuilt) {
                    const buildId = event.data.buildId;
                    if (buildId === BuildingType.TitansCore) {
                        newAlerts.push({
                            id: `titans-core-complete-${event.playerId}-${Date.now()}`,
                            type: "UniqueBuilding",
                            otherPlayerId: event.playerId,
                            civName: otherPlayer.civName,
                            buildingType: "TitansCore",
                            buildingStatus: "Completed",
                        });
                    } else if (buildId === BuildingType.SpiritObservatory) {
                        newAlerts.push({
                            id: `spirit-observatory-complete-${event.playerId}-${Date.now()}`,
                            type: "UniqueBuilding",
                            otherPlayerId: event.playerId,
                            civName: otherPlayer.civName,
                            buildingType: "SpiritObservatory",
                            buildingStatus: "Completed",
                        });
                    } else if (buildId === BuildingType.JadeGranary) {
                        newAlerts.push({
                            id: `jade-granary-complete-${event.playerId}-${Date.now()}`,
                            type: "UniqueBuilding",
                            otherPlayerId: event.playerId,
                            civName: otherPlayer.civName,
                            buildingType: "JadeGranary",
                            buildingStatus: "Completed",
                        });
                    }
                }
            }
        }

        // 2. Check for unique buildings being STARTED (not just completed)
        for (const otherPlayer of gameState.players) {
            if (otherPlayer.id === playerId || otherPlayer.isEliminated) continue;

            const prevState = prevBuildingStatesRef.current[otherPlayer.id] || {
                buildingTitansCore: false,
                buildingSpiritObservatory: false,
                buildingJadeGranary: false,
                completedTitansCore: false,
                completedSpiritObservatory: false,
                completedJadeGranary: false,
            };

            // Check if building TitansCore
            const buildingTitansCore = gameState.cities.some(c =>
                c.ownerId === otherPlayer.id &&
                c.currentBuild?.type === "Building" &&
                c.currentBuild.id === BuildingType.TitansCore
            );
            const completedTitansCore = otherPlayer.completedProjects.includes(ProjectId.TitansCoreComplete);

            if (buildingTitansCore && !prevState.buildingTitansCore && !completedTitansCore) {
                newAlerts.push({
                    id: `titans-core-start-${otherPlayer.id}-${Date.now()}`,
                    type: "UniqueBuilding",
                    otherPlayerId: otherPlayer.id,
                    civName: otherPlayer.civName,
                    buildingType: "TitansCore",
                    buildingStatus: "Started",
                });
            }

            // Check if building SpiritObservatory
            const buildingSpiritObservatory = gameState.cities.some(c =>
                c.ownerId === otherPlayer.id &&
                c.currentBuild?.type === "Building" &&
                c.currentBuild.id === BuildingType.SpiritObservatory
            );
            const completedSpiritObservatory = otherPlayer.completedProjects.includes(ProjectId.Observatory) &&
                otherPlayer.civName === "StarborneSeekers";

            if (buildingSpiritObservatory && !prevState.buildingSpiritObservatory && !completedSpiritObservatory) {
                newAlerts.push({
                    id: `spirit-observatory-start-${otherPlayer.id}-${Date.now()}`,
                    type: "UniqueBuilding",
                    otherPlayerId: otherPlayer.id,
                    civName: otherPlayer.civName,
                    buildingType: "SpiritObservatory",
                    buildingStatus: "Started",
                });
            }

            // Check if building JadeGranary
            const buildingJadeGranary = gameState.cities.some(c =>
                c.ownerId === otherPlayer.id &&
                c.currentBuild?.type === "Building" &&
                c.currentBuild.id === BuildingType.JadeGranary
            );
            const completedJadeGranary = otherPlayer.completedProjects.includes(ProjectId.JadeGranaryComplete);

            if (buildingJadeGranary && !prevState.buildingJadeGranary && !completedJadeGranary) {
                newAlerts.push({
                    id: `jade-granary-start-${otherPlayer.id}-${Date.now()}`,
                    type: "UniqueBuilding",
                    otherPlayerId: otherPlayer.id,
                    civName: otherPlayer.civName,
                    buildingType: "JadeGranary",
                    buildingStatus: "Started",
                });
            }

            // Update tracking
            prevBuildingStatesRef.current[otherPlayer.id] = {
                buildingTitansCore,
                buildingSpiritObservatory,
                buildingJadeGranary,
                completedTitansCore,
                completedSpiritObservatory,
                completedJadeGranary,
            };

            // Update capital counts (in case of ownership changes)
            const currentCapitalCount = gameState.cities.filter(c =>
                c.ownerId === otherPlayer.id && c.isCapital
            ).length;
            capitalCountsRef.current[otherPlayer.id] = currentCapitalCount;
        }

        // 3. Check for era transitions (from current state, not just history)
        for (const otherPlayer of gameState.players) {
            if (otherPlayer.id === playerId || otherPlayer.isEliminated) continue;

            const prevEra = prevErasRef.current[otherPlayer.id];
            const currentEra = otherPlayer.currentEra;

            if (prevEra && prevEra !== currentEra) {
                // Only alert for significant era transitions (Hearth -> Banner, Banner -> Engine)
                if ((prevEra === EraId.Hearth && currentEra === EraId.Banner) ||
                    (prevEra === EraId.Banner && currentEra === EraId.Engine)) {
                    newAlerts.push({
                        id: `era-transition-${otherPlayer.id}-${currentEra}-${Date.now()}`,
                        type: "EraTransition",
                        otherPlayerId: otherPlayer.id,
                        civName: otherPlayer.civName,
                        era: currentEra,
                    });
                }
            }

            prevErasRef.current[otherPlayer.id] = currentEra;
        }

        // 4. Check for newly defeated civs
        for (const otherPlayer of gameState.players) {
            if (otherPlayer.id === playerId) continue;

            const wasEliminated = prevEliminatedRef.current[otherPlayer.id] ?? false;
            const isNowEliminated = otherPlayer.isEliminated;

            if (isNowEliminated && !wasEliminated) {
                newAlerts.push({
                    id: `civ-defeated-${otherPlayer.id}-${Date.now()}`,
                    type: "CivDefeated",
                    otherPlayerId: otherPlayer.id,
                    civName: otherPlayer.civName,
                });
            }

            prevEliminatedRef.current[otherPlayer.id] = isNowEliminated;
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

