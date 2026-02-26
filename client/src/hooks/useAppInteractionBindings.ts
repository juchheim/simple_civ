import { useCallback } from "react";
import { Action, GameState, HexCoord } from "@simple-civ/engine";
import { useGlobalHotkeys } from "./useGlobalHotkeys";
import { useInteractionController } from "./useInteractionController";

type UseAppInteractionBindingsParams = {
    gameState: GameState | null;
    playerId: string;
    runActions: (actions: Action[]) => void;
    showCombatPreview: boolean;
    showTechTree: boolean;
    showGameMenu: boolean;
    closeTechTree: () => void;
    closeGameMenu: () => void;
    openGameMenu: () => void;
};

type UseAppInteractionBindingsResult = ReturnType<typeof useInteractionController> & {
    clearSelection: () => void;
};

export function useAppInteractionBindings({
    gameState,
    playerId,
    runActions,
    showCombatPreview,
    showTechTree,
    showGameMenu,
    closeTechTree,
    closeGameMenu,
    openGameMenu,
}: UseAppInteractionBindingsParams): UseAppInteractionBindingsResult {
    const dispatchAction = useCallback((action: Action) => {
        runActions([action]);
    }, [runActions]);

    const interaction = useInteractionController({
        gameState,
        playerId,
        dispatchAction,
        runActions,
        showCombatPreview,
    });
    const {
        selectedCoord,
        selectedUnitId,
        setSelectedCoord,
        setSelectedUnitId,
    } = interaction;

    const clearSelection = useCallback(() => {
        setSelectedCoord(null);
        setSelectedUnitId(null);
    }, [setSelectedCoord, setSelectedUnitId]);

    useGlobalHotkeys({
        selectedCoord: selectedCoord as HexCoord | null,
        selectedUnitId,
        showTechTree,
        showGameMenu,
        clearSelection,
        closeTechTree,
        closeGameMenu,
        openGameMenu,
    });

    return {
        ...interaction,
        clearSelection,
    };
}
