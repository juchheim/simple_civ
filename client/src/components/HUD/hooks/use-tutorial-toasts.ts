import { useEffect, useRef, useCallback, useState } from "react";
import { GameState, UnitType } from "@simple-civ/engine";
import { Toast } from "../../Toast";
import { useTutorial } from "../../../contexts/TutorialContext";

/**
 * Detects tutorial-relevant events and shows contextual toasts.
 * 
 * Events detected:
 * - City growth to pop 2+ (first time): "You can now build Settlers!"
 * - Native camp/unit discovery (first time): Warning about native perks
 */
export function useTutorialToasts(gameState: GameState | null, playerId: string) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const tutorial = useTutorial();
    const prevCityPopsRef = useRef<Record<string, number>>({});
    const prevSeenNativesRef = useRef<boolean>(false);
    const lastGameIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!gameState || tutorial.optedOut) return;

        // Reset tracking on new game
        if (gameState.id !== lastGameIdRef.current) {
            lastGameIdRef.current = gameState.id;
            prevCityPopsRef.current = {};
            prevSeenNativesRef.current = false;

            // Initialize with current city populations
            gameState.cities
                .filter(c => c.ownerId === playerId)
                .forEach(c => {
                    prevCityPopsRef.current[c.id] = c.pop;
                });
            return;
        }

        const newToasts: Toast[] = [];

        // 1. Check for city growth to pop 2+
        if (!tutorial.isComplete("grewFirstCity")) {
            for (const city of gameState.cities) {
                if (city.ownerId !== playerId) continue;

                const prevPop = prevCityPopsRef.current[city.id] ?? 1;
                const currentPop = city.pop;

                // Detect growth to 2+
                if (prevPop < 2 && currentPop >= 2) {
                    const hint = tutorial.markComplete("grewFirstCity");
                    if (hint) {
                        newToasts.push({
                            id: `grew-first-city-${Date.now()}`,
                            message: hint,
                            icon: "🎉",
                            duration: 6000,
                        });
                    }
                    break; // Only trigger once
                }

                prevCityPopsRef.current[city.id] = currentPop;
            }
        }

        // Update all city pops for tracking
        gameState.cities
            .filter(c => c.ownerId === playerId)
            .forEach(c => {
                prevCityPopsRef.current[c.id] = c.pop;
            });

        // 2. Check for native unit/camp discovery
        if (!tutorial.isComplete("discoveredNatives") && !prevSeenNativesRef.current) {
            const player = gameState.players.find(p => p.id === playerId);
            if (player) {
                // Get visible tile keys for this player
                const visibleTileKeys = new Set(gameState.visibility?.[playerId] ?? []);

                // Check if any native units are on visible tiles
                const seenNativeUnit = gameState.units.some(u => {
                    if (u.ownerId !== "natives") return false;
                    if (u.type !== UnitType.NativeChampion && u.type !== UnitType.NativeArcher) return false;
                    const tileKey = `${u.coord.q},${u.coord.r}`;
                    return visibleTileKeys.has(tileKey);
                });

                // Check if player can see a tile with a native camp
                const seenNativeCamp = gameState.map.tiles.some(tile => {
                    if (!tile.overlays?.includes("NativeCamp" as any)) return false;
                    const tileKey = `${tile.coord.q},${tile.coord.r}`;
                    return visibleTileKeys.has(tileKey);
                });

                if (seenNativeUnit || seenNativeCamp) {
                    prevSeenNativesRef.current = true;
                    const hint = tutorial.markComplete("discoveredNatives");
                    if (hint) {
                        newToasts.push({
                            id: `discovered-natives-${Date.now()}`,
                            message: hint,
                            icon: "⚠️",
                            duration: 8000,
                        });
                    }
                }
            }
        }

        if (newToasts.length > 0) {
            setToasts(prev => [...prev, ...newToasts]);
        }
    }, [gameState, playerId, tutorial]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, dismissToast };
}
