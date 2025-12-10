import { useEffect, useRef, useState, useCallback } from "react";
import { GameState, HistoryEventType, BuildingType, ProjectId, EraId } from "@simple-civ/engine";
import { Toast } from "../../Toast";

/**
 * Detects important game events from history and current state to notify the player via toasts.
 * 
 * Events detected:
 * - Capital captures (with running total)
 * - Unique building starts/completions (TitansCore, SpiritObservatory, JadeGranary)
 * - Era transitions
 * - City razing
 * - Civ defeated
 * 
 * All players are notified of these events regardless of their own progress.
 * These are informational toasts that don't require user interaction.
 */
export function useGameEventToasts(gameState: GameState | null, playerId: string) {
    const [toasts, setToasts] = useState<Toast[]>([]);
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
            if (gameState) {
                gameState.players.forEach(p => {
                    prevErasRef.current[p.id] = p.currentEra;
                    prevBuildingStatesRef.current[p.id] = {
                        buildingTitansCore: gameState.cities.some(
                            c => c.ownerId === p.id && c.currentBuild?.type === "Building" && c.currentBuild.id === BuildingType.TitansCore
                        ),
                        buildingSpiritObservatory: gameState.cities.some(
                            c => c.ownerId === p.id && c.currentBuild?.type === "Building" && c.currentBuild.id === BuildingType.SpiritObservatory
                        ),
                        buildingJadeGranary: gameState.cities.some(
                            c => c.ownerId === p.id && c.currentBuild?.type === "Building" && c.currentBuild.id === BuildingType.JadeGranary
                        ),
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
            }
            return;
        }

        const newToasts: Toast[] = [];

        if (!gameState) return;

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
                    const count = capitalCountsRef.current[event.playerId];
                    newToasts.push({
                        id: `capital-capture-${event.playerId}-${event.data.cityId}-${Date.now()}`,
                        message: `${otherPlayer.civName} captured ${event.data.cityName || "a capital"}! (${count} capital${count !== 1 ? "s" : ""})`,
                        icon: "🏛️",
                        duration: 5000,
                    });
                }

                // City razing
                if (event.type === HistoryEventType.CityRazed) {
                    newToasts.push({
                        id: `city-razed-${event.playerId}-${event.data.cityId}-${Date.now()}`,
                        message: `${otherPlayer.civName} razed ${event.data.cityName || "a city"}!`,
                        icon: "🔥",
                        duration: 5000,
                    });
                }

                // Era transition
                if (event.type === HistoryEventType.EraEntered) {
                    const eraName = event.data.era === "Banner" ? "Banner" : event.data.era === "Engine" ? "Engine" : "Hearth";
                    newToasts.push({
                        id: `era-${event.playerId}-${event.data.era}-${Date.now()}`,
                        message: `${otherPlayer.civName} entered the ${eraName} Era`,
                        icon: "📜",
                        duration: 4000,
                    });
                }

                // Wonder built (unique buildings)
                if (event.type === HistoryEventType.WonderBuilt) {
                    const buildId = event.data.buildId;
                    if (buildId === BuildingType.TitansCore) {
                        newToasts.push({
                            id: `titans-core-complete-${event.playerId}-${Date.now()}`,
                            message: `${otherPlayer.civName} completed Titan's Core! The Titan has been summoned!`,
                            icon: "⚙️",
                            duration: 5000,
                        });
                    } else if (buildId === BuildingType.SpiritObservatory) {
                        newToasts.push({
                            id: `spirit-observatory-complete-${event.playerId}-${Date.now()}`,
                            message: `${otherPlayer.civName} completed Spirit Observatory!`,
                            icon: "🔭",
                            duration: 5000,
                        });
                    } else if (buildId === BuildingType.JadeGranary) {
                        newToasts.push({
                            id: `jade-granary-complete-${event.playerId}-${Date.now()}`,
                            message: `${otherPlayer.civName} completed Jade Granary!`,
                            icon: "🌾",
                            duration: 5000,
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
                newToasts.push({
                    id: `titans-core-start-${otherPlayer.id}-${Date.now()}`,
                    message: `${otherPlayer.civName} has begun construction of Titan's Core`,
                    icon: "⚙️",
                    duration: 5000,
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
                newToasts.push({
                    id: `spirit-observatory-start-${otherPlayer.id}-${Date.now()}`,
                    message: `${otherPlayer.civName} has begun construction of Spirit Observatory`,
                    icon: "🔭",
                    duration: 5000,
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
                newToasts.push({
                    id: `jade-granary-start-${otherPlayer.id}-${Date.now()}`,
                    message: `${otherPlayer.civName} has begun construction of Jade Granary`,
                    icon: "🌾",
                    duration: 5000,
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
                    const eraName = currentEra === EraId.Banner ? "Banner" : "Engine";
                    newToasts.push({
                        id: `era-transition-${otherPlayer.id}-${currentEra}-${Date.now()}`,
                        message: `${otherPlayer.civName} entered the ${eraName} Era`,
                        icon: "📜",
                        duration: 4000,
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
                newToasts.push({
                    id: `civ-defeated-${otherPlayer.id}-${Date.now()}`,
                    message: `${otherPlayer.civName} has been eliminated!`,
                    icon: "💀",
                    duration: 5000,
                });
            }

            prevEliminatedRef.current[otherPlayer.id] = isNowEliminated;
        }

        if (newToasts.length > 0) {
            setToasts(prev => [...prev, ...newToasts]);
        }

    }, [gameState, playerId]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, dismissToast };
}
