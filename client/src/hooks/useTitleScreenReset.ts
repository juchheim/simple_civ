import { useCallback } from "react";

type UseTitleScreenResetParams = {
    clearSelection: () => void;
    resetUiOverlays: () => void;
    resetMapNavigation: () => void;
    showTitle: () => void;
};

export function useTitleScreenReset({
    clearSelection,
    resetUiOverlays,
    resetMapNavigation,
    showTitle,
}: UseTitleScreenResetParams): () => void {
    return useCallback(() => {
        clearSelection();
        resetUiOverlays();
        resetMapNavigation();
        showTitle();
    }, [clearSelection, resetMapNavigation, resetUiOverlays, showTitle]);
}
