import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "showCombatPreview";

type UseCombatPreviewPreferenceResult = {
    showCombatPreview: boolean;
    setShowCombatPreview: (show: boolean) => void;
    toggleCombatPreview: () => void;
    disableCombatPreview: () => void;
};

function readInitialPreference(): boolean {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored !== null ? stored === "true" : true;
    } catch {
        return true;
    }
}

export function useCombatPreviewPreference(): UseCombatPreviewPreferenceResult {
    const [showCombatPreview, setShowCombatPreviewState] = useState<boolean>(readInitialPreference);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(showCombatPreview));
        } catch {
            // Ignore storage failures and keep runtime behavior.
        }
    }, [showCombatPreview]);

    const setShowCombatPreview = useCallback((show: boolean) => {
        setShowCombatPreviewState(show);
    }, []);

    const toggleCombatPreview = useCallback(() => {
        setShowCombatPreviewState(prev => !prev);
    }, []);

    const disableCombatPreview = useCallback(() => {
        setShowCombatPreviewState(false);
    }, []);

    return {
        showCombatPreview,
        setShowCombatPreview,
        toggleCombatPreview,
        disableCombatPreview,
    };
}
