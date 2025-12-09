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

    useEffect(() => {
        const currentReward = gameState.lastGoodieHutReward;

        // Detect new reward (different from last one we processed)
        if (currentReward && currentReward !== lastRewardRef.current) {
            // Check if this is really a new reward (not just a reload)
            if (!lastRewardRef.current ||
                currentReward.type !== lastRewardRef.current.type ||
                currentReward.amount !== lastRewardRef.current.amount ||
                currentReward.cityName !== lastRewardRef.current.cityName) {

                if (currentReward.playerId !== playerId) {
                    lastRewardRef.current = currentReward;
                    return;
                }

                const { message, icon } = formatRewardMessage(currentReward);
                setToasts(prev => [...prev, {
                    id: `goodie-${Date.now()}`,
                    message,
                    icon,
                    duration: 4000,
                }]);
            }
        }

        lastRewardRef.current = currentReward;
    }, [gameState.lastGoodieHutReward, playerId]);

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
    }
}
