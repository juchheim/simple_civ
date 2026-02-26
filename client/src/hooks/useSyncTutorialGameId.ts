import { useEffect } from "react";
import { useTutorial } from "../contexts/TutorialContext";

export function useSyncTutorialGameId(gameId: string | null): void {
    const tutorial = useTutorial();

    useEffect(() => {
        tutorial.setGameId(gameId);
    }, [gameId, tutorial]);
}
