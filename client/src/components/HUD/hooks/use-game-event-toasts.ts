import { useEffect, useRef, useState, useCallback } from "react";
import { GameState, HistoryEventType, BuildingType, ProjectId } from "@simple-civ/engine";
import { Toast } from "../../Toast";

/**
 * Converts camelCase civ names to readable format with spaces.
 * e.g., "JadeCovenant" → "Jade Covenant", "AetherianVanguard" → "Aetherian Vanguard"
 */
function formatCivName(civName: string): string {
    return civName.replace(/([a-z])([A-Z])/g, "$1 $2");
}

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
        buildingJadeGranary: boolean;
        completedTitansCore: boolean;

        completedJadeGranary: boolean;
    }>>({});
    const capitalCountsRef = useRef<Record<string, number>>({});
    const prevEliminatedRef = useRef<Record<string, boolean>>({});
    const lastGameIdRef = useRef<string | null>(null);

    useEffect(() => {
        // DO NOT REMOVE: This reset logic is crucial for preventing notification floods when loading saves.
        // We use lastGameIdRef to detect when the game instance has changed (e.g. loading a save or starting new game).
        // When this happens, we must re-hydrate our tracking refs with the *current* state of the new game
        // so that we don't treat existing history as "new" events.
        if (gameState && gameState.id !== lastGameIdRef.current) {
            lastGameIdRef.current = gameState.id;
            setToasts([]); // Clear any existing toasts from previous game state

            // Re-initialize all tracking for the new game state
            gameState.players.forEach(p => {
                prevBuildingStatesRef.current[p.id] = {
                    buildingTitansCore: gameState.cities.some(
                        c => c.ownerId === p.id && c.currentBuild?.type === "Building" && c.currentBuild.id === BuildingType.TitansCore
                    ),

                    buildingJadeGranary: gameState.cities.some(
                        c => c.ownerId === p.id && c.currentBuild?.type === "Building" && c.currentBuild.id === BuildingType.JadeGranary
                    ),
                    completedTitansCore: p.completedProjects.includes(ProjectId.TitansCoreComplete),

                    completedJadeGranary: p.completedProjects.includes(ProjectId.JadeGranaryComplete),
                };
                // Count initial capitals owned by each civ
                capitalCountsRef.current[p.id] = gameState.cities.filter(c =>
                    c.ownerId === p.id && c.isCapital
                ).length;
                // Track elimination status
                prevEliminatedRef.current[p.id] = p.isEliminated;
            });

            // Reset and track history events
            prevHistoryEventsRef.current = new Set();
            if (gameState.history?.events) {
                gameState.history.events.forEach(e => {
                    prevHistoryEventsRef.current.add(`${e.turn}-${e.type}-${e.playerId}-${JSON.stringify(e.data)}`);
                });
            }

            // Return early to skip processing "new" events for this render
            return;
        }
        if (!gameState) return;

        const newToasts: Toast[] = [];

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
                        message: `${formatCivName(otherPlayer.civName)} captured ${event.data.cityName || "a capital"}! (${count} capital${count !== 1 ? "s" : ""})`,
                        icon: "🏛️",
                        duration: 5000,
                    });
                }

                // City razing
                if (event.type === HistoryEventType.CityRazed) {
                    newToasts.push({
                        id: `city-razed-${event.playerId}-${event.data.cityId}-${Date.now()}`,
                        message: `${formatCivName(otherPlayer.civName)} razed ${event.data.cityName || "a city"}!`,
                        icon: "🔥",
                        duration: 5000,
                    });
                }

                // Era transition
                if (event.type === HistoryEventType.EraEntered) {
                    const eraName = event.data.era === "Banner" ? "Banner" : event.data.era === "Engine" ? "Engine" : "Hearth";
                    newToasts.push({
                        id: `era-${event.playerId}-${event.data.era}-${Date.now()}`,
                        message: `${formatCivName(otherPlayer.civName)} entered the ${eraName} Era`,
                        icon: "📜",
                        duration: 4000,
                    });
                }

                // Peace accepted - AI accepted player's peace offer
                if (event.type === HistoryEventType.PeaceMade && event.data.targetId === playerId) {
                    newToasts.push({
                        id: `peace-accepted-${event.playerId}-${Date.now()}`,
                        message: `${formatCivName(otherPlayer.civName)} accepted your peace offer!`,
                        icon: "🕊️",
                        duration: 5000,
                    });
                }

                // Wonder built (unique buildings)
                if (event.type === HistoryEventType.WonderBuilt) {
                    const buildId = event.data.buildId;
                    if (buildId === BuildingType.TitansCore) {
                        newToasts.push({
                            id: `titans-core-complete-${event.playerId}-${Date.now()}`,
                            message: `${formatCivName(otherPlayer.civName)} completed Titan's Core! The Titan has been summoned!`,
                            icon: "⚙️",
                            duration: 5000,
                        });

                    } else if (buildId === BuildingType.JadeGranary) {
                        newToasts.push({
                            id: `jade-granary-complete-${event.playerId}-${Date.now()}`,
                            message: `${formatCivName(otherPlayer.civName)} completed Jade Granary!`,
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
                    message: `${formatCivName(otherPlayer.civName)} has begun construction of Titan's Core`,
                    icon: "⚙️",
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
                    message: `${formatCivName(otherPlayer.civName)} has begun construction of Jade Granary`,
                    icon: "🌾",
                    duration: 5000,
                });
            }

            // Update tracking
            prevBuildingStatesRef.current[otherPlayer.id] = {
                buildingTitansCore,
                buildingJadeGranary,
                completedTitansCore,

                completedJadeGranary,
            };

            // Update capital counts (in case of ownership changes)
            const currentCapitalCount = gameState.cities.filter(c =>
                c.ownerId === otherPlayer.id && c.isCapital
            ).length;
            capitalCountsRef.current[otherPlayer.id] = currentCapitalCount;
        }



        // 4. Check for newly defeated civs
        for (const otherPlayer of gameState.players) {
            if (otherPlayer.id === playerId) continue;

            const wasEliminated = prevEliminatedRef.current[otherPlayer.id] ?? false;
            const isNowEliminated = otherPlayer.isEliminated;

            if (isNowEliminated && !wasEliminated) {
                newToasts.push({
                    id: `civ-defeated-${otherPlayer.id}-${Date.now()}`,
                    message: `${formatCivName(otherPlayer.civName)} has been eliminated!`,
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
