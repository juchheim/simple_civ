import { useEffect } from "react";
import { HexCoord } from "@simple-civ/engine";

type GlobalHotkeysParams = {
    selectedCoord: HexCoord | null;
    selectedUnitId: string | null;
    showTechTree: boolean;
    showGameMenu: boolean;
    clearSelection: () => void;
    closeTechTree: () => void;
    closeGameMenu: () => void;
    openGameMenu: () => void;
};

export function useGlobalHotkeys({
    selectedCoord,
    selectedUnitId,
    showTechTree,
    showGameMenu,
    clearSelection,
    closeTechTree,
    closeGameMenu,
    openGameMenu,
}: GlobalHotkeysParams) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (selectedUnitId || selectedCoord) {
                    clearSelection();
                } else if (showTechTree) {
                    closeTechTree();
                } else if (showGameMenu) {
                    closeGameMenu();
                } else {
                    openGameMenu();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        selectedCoord,
        selectedUnitId,
        showTechTree,
        showGameMenu,
        clearSelection,
        closeTechTree,
        closeGameMenu,
        openGameMenu
    ]);
}
