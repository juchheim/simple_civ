import { useCallback, useEffect, useMemo, useState } from "react";
import { detect3DCapability } from "../components/GameMap3D/capability";

export type BoardMode = "2d" | "3d";

const STORAGE_KEY = "boardMode";

function readInitialPreference(): BoardMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "2d" || stored === "3d") return stored;
    } catch {
        // Ignore storage failures and keep runtime behavior.
    }

    return "2d";
}

export function useBoardModePreference() {
    const [boardMode, setBoardModeState] = useState<BoardMode>(readInitialPreference);
    const supports3D = useMemo(() => detect3DCapability(), []);
    const effectiveMode: BoardMode = boardMode === "3d" && !supports3D ? "2d" : boardMode;

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, boardMode);
        } catch {
            // Ignore storage failures and keep runtime behavior.
        }
    }, [boardMode]);

    const setBoardMode = useCallback((mode: BoardMode) => {
        setBoardModeState(mode);
    }, []);

    return {
        boardMode,
        effectiveMode,
        supports3D,
        setBoardMode,
    };
}
