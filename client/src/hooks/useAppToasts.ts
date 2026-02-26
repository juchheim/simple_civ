import { useCallback, useMemo } from "react";
import { GameState } from "@simple-civ/engine";
import { useGoodieHutAlerts } from "./useGoodieHutAlerts";
import { useGameEventToasts } from "../components/HUD/hooks/use-game-event-toasts";
import { useTutorialToasts } from "../components/HUD/hooks/use-tutorial-toasts";

const EMPTY_GAME_STATE = {
    map: { tiles: [] },
    units: [],
    players: [],
} as unknown as GameState;

type UseAppToastsResult = {
    toasts: ReturnType<typeof useGoodieHutAlerts>["toasts"];
    dismissToast: (id: string) => void;
};

export function useAppToasts(gameState: GameState | null, playerId: string): UseAppToastsResult {
    const { toasts: goodieHutToasts, dismissToast: dismissGoodieHutToast } = useGoodieHutAlerts(
        gameState ?? EMPTY_GAME_STATE,
        playerId
    );
    const { toasts: gameEventToasts, dismissToast: dismissGameEventToast } = useGameEventToasts(
        gameState,
        playerId
    );
    const { toasts: tutorialToasts, dismissToast: dismissTutorialToast } = useTutorialToasts(
        gameState,
        playerId
    );

    const toasts = useMemo(
        () => [...goodieHutToasts, ...gameEventToasts, ...tutorialToasts],
        [goodieHutToasts, gameEventToasts, tutorialToasts]
    );

    const dismissToast = useCallback((id: string) => {
        dismissGoodieHutToast(id);
        dismissGameEventToast(id);
        dismissTutorialToast(id);
    }, [dismissGoodieHutToast, dismissGameEventToast, dismissTutorialToast]);

    return { toasts, dismissToast };
}
