import { useEffect, useRef, useCallback, useState } from "react";
import { GameState, GoodieHutRewardInfo } from "@simple-civ/engine";
import { Toast } from "../components/Toast";

/**
 * Hook to detect when a player's unit collects a goodie hut
 * by watching gameState.lastGoodieHutReward.
 */
export function useGoodieHutAlerts(gameState: GameState, playerId: string) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const lastRewardRef = useRef<GoodieHutRewardInfo | undefined>(undefined);
    const lastGameIdRef = useRef<string | null>(null);

    useEffect(() => {
        // DEBUG: Log every time this effect runs
        console.log('[GoodieHut] Effect running', {
            hasGameState: !!gameState,
            gameId: gameState?.id,
            lastGameIdRef: lastGameIdRef.current,
            currentReward: gameState?.lastGoodieHutReward,
            lastRewardRef: lastRewardRef.current,
            rewardTimestampMatch: gameState?.lastGoodieHutReward?.timestamp === lastRewardRef.current?.timestamp,
        });

        // Reset state when loading a new game to prevent re-alerting old rewards
        // DO NOT REMOVE: This logic ensures initialized state (lastGameId, lastReward) prevents
        // "recent" notifications from the save file being displayed as new alerts on load.
        // FIX: Only reset if there's actually an existing reward from the save file,
        // otherwise leave lastRewardRef undefined so the first reward of a new game shows a toast.
        if (gameState && gameState.id !== lastGameIdRef.current) {
            console.log('[GoodieHut] New game detected, resetting refs');
            lastGameIdRef.current = gameState.id;
            // Only skip showing toast for rewards that existed in the save file (old timestamp)
            // A fresh new game won't have lastGoodieHutReward, so this will be undefined
            lastRewardRef.current = gameState.lastGoodieHutReward;
            setToasts([]);
            // Don't return early - check if there's a NEW reward to show
            // (This handles edge case where reward happens on the same frame as game load)
        }

        const currentReward = gameState.lastGoodieHutReward;

        // Detect new reward (different from last one we processed via timestamp)
        if (currentReward && currentReward.timestamp !== lastRewardRef.current?.timestamp) {
            if (currentReward.playerId !== playerId) {
                lastRewardRef.current = currentReward;
                return;
            }

            const { message, icon } = formatRewardMessage(currentReward);
            console.log(`[GoodieHut] Toast created: ${currentReward.type}`, { message, icon, reward: currentReward });
            setToasts(prev => [...prev, {
                id: `goodie-${currentReward.timestamp}`,
                message,
                icon,
                duration: 4000,
            }]);
        }

        lastRewardRef.current = currentReward;
    }, [gameState?.id, gameState?.lastGoodieHutReward, playerId]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, dismissToast };
}

function formatRewardMessage(reward: GoodieHutRewardInfo): { message: string; icon: string } {
    switch (reward.type) {
        case "food":
            return {
                message: reward.cityName
                    ? `Ancient granary discovered! +${reward.amount} Food to ${reward.cityName}`
                    : `Food supplies found! +${reward.amount} Food`,
                icon: "🌾",
            };
        case "production":
            return {
                message: reward.cityName
                    ? `Tool cache discovered! +${reward.amount} Production to ${reward.cityName}`
                    : `Tools found! +${reward.amount} Production`,
                icon: "⚒️",
            };
        case "research":
            if (reward.amount === 0) {
                return {
                    message: "Ancient scrolls found, but no research is active!",
                    icon: "📜",
                };
            }
            return {
                message: `Ancient scrolls discovered! +${reward.percent}% research progress`,
                icon: "📜",
            };
        case "scout":
            return {
                message: "A friendly scout joins your expedition!",
                icon: "🏃",
            };
        default: {
            // Exhaustive check - this should never happen if types are correct
            const exhaustiveCheck: never = reward.type;
            console.error("Unknown goodie hut reward type:", exhaustiveCheck);
            return {
                message: `Discovered ancient treasure! (${String(reward.type)})`,
                icon: "🎁",
            };
        }
    }
}
