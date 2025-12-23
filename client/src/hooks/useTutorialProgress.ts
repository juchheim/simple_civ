import { useState, useCallback, useMemo, useEffect, useRef } from "react";

/**
 * All tutorial milestones tracked by the Progressive Discovery System.
 */
export type TutorialMilestone =
    // Core Mechanics
    | "selectedSettler"
    | "foundedFirstCity"
    | "selectedFirstCity"
    | "startedProduction"
    | "selectedResearch"
    | "viewedTechTree"
    | "movedUnit"
    | "grewFirstCity"
    | "builtFirstSettler"
    | "researchedTech"
    | "endedFirstTurn"
    // Combat & Units
    | "fortifiedUnit"
    | "wonFirstCombat"
    | "linkedUnits"
    | "usedAutoExplore"
    | "capturedCity"
    | "discoveredNatives"
    | "clearedNativeCamp"
    // Buildings & Economy
    | "builtFirstBuilding"
    | "assignedWorkedTile"
    | "collectedGoodieHut"
    | "startedProject"
    // Diplomacy & Social
    | "contactedOtherCiv"
    | "declaredWar"
    | "acceptedPeace"
    | "sharedVision"
    | "openedCodex";

export type TutorialProgress = Record<TutorialMilestone, boolean>;

const STORAGE_KEY = "simple-civ-tutorial-optout";
const GAME_PROGRESS_KEY_PREFIX = "simple-civ-tutorial-progress-";

/**
 * Hint messages shown when milestones are first triggered.
 * Only milestones with special warnings/tips are included.
 */
export const MILESTONE_HINTS: Partial<Record<TutorialMilestone, string>> = {
    grewFirstCity: "🎉 Population 2! You can now build Settlers to expand your empire.",
    discoveredNatives: "⚠️ Natives defend fiercely! Champions get +2/+2 near camp. Archers have range 2 and can fire after moving!",
};

/**
 * Tooltip hints for pulsing buttons.
 */
export const BUTTON_TOOLTIPS: Partial<Record<TutorialMilestone, string>> = {
    selectedSettler: "Click to establish a new city here!",
    fortifiedUnit: "Units in fortified stance gain +50% defense",
    linkedUnits: "Pair units to move and attack together",
    usedAutoExplore: "Scout will automatically explore the map",
    viewedTechTree: "Choose what technology to research",
    startedProduction: "Select what this city should build",
    contactedOtherCiv: "View diplomatic relations with other civilizations",
    openedCodex: "Browse the game rules and unit stats",
};

const initialProgress: TutorialProgress = {
    selectedSettler: false,
    foundedFirstCity: false,
    selectedFirstCity: false,
    startedProduction: false,
    selectedResearch: false,
    viewedTechTree: false,
    movedUnit: false,
    grewFirstCity: false,
    builtFirstSettler: false,
    researchedTech: false,
    endedFirstTurn: false,
    fortifiedUnit: false,
    wonFirstCombat: false,
    linkedUnits: false,
    usedAutoExplore: false,
    capturedCity: false,
    discoveredNatives: false,
    clearedNativeCamp: false,
    builtFirstBuilding: false,
    assignedWorkedTile: false,
    collectedGoodieHut: false,
    startedProject: false,
    contactedOtherCiv: false,
    declaredWar: false,
    acceptedPeace: false,
    sharedVision: false,
    openedCodex: false,
};

/**
 * Hook to manage tutorial progress for the Progressive Discovery System.
 * 
 * - Progress is persisted per-game using the gameId (stored in localStorage)
 * - When loading a saved game, milestones already completed are restored
 * - Opt-out persists permanently (stored in localStorage)
 */
export function useTutorialProgress() {
    const [progress, setProgress] = useState<TutorialProgress>(initialProgress);
    const [gameId, setGameIdState] = useState<string | null>(null);
    const [optedOut, setOptedOutState] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === "true";
        } catch {
            return false;
        }
    });
    const lastGameIdRef = useRef<string | null>(null);

    // Load progress from localStorage when gameId changes
    useEffect(() => {
        if (!gameId) {
            // No gameId - reset to initial progress
            if (lastGameIdRef.current !== null) {
                setProgress(initialProgress);
                lastGameIdRef.current = null;
            }
            return;
        }

        // Same gameId - don't reload
        if (gameId === lastGameIdRef.current) {
            return;
        }

        lastGameIdRef.current = gameId;

        try {
            const saved = localStorage.getItem(GAME_PROGRESS_KEY_PREFIX + gameId);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with initialProgress to handle any new milestones added over time
                setProgress({ ...initialProgress, ...parsed });
            } else {
                setProgress(initialProgress);
            }
        } catch {
            setProgress(initialProgress);
        }
    }, [gameId]);

    // Save progress to localStorage whenever it changes
    useEffect(() => {
        if (!gameId) return;
        try {
            localStorage.setItem(GAME_PROGRESS_KEY_PREFIX + gameId, JSON.stringify(progress));
        } catch {
            // localStorage not available or full
        }
    }, [gameId, progress]);

    const setGameId = useCallback((id: string | null) => {
        setGameIdState(id);
    }, []);

    // Track milestones that have been marked (synchronously) to prevent race conditions
    const completedMilestonesRef = useRef<Set<TutorialMilestone>>(new Set());

    // Reset completed milestones tracking when gameId changes
    useEffect(() => {
        completedMilestonesRef.current = new Set(
            Object.entries(progress)
                .filter(([, completed]) => completed)
                .map(([milestone]) => milestone as TutorialMilestone)
        );
    }, [gameId]); // Only reset on gameId change, not on every progress change

    const markComplete = useCallback((milestone: TutorialMilestone): string | null => {
        if (optedOut) return null;

        // Check synchronously if already completed (prevents race conditions)
        if (completedMilestonesRef.current.has(milestone)) {
            return null;
        }

        // Mark as completed synchronously
        completedMilestonesRef.current.add(milestone);

        const hint = MILESTONE_HINTS[milestone] ?? null;
        setProgress(prev => {
            if (prev[milestone]) return prev; // Already complete in state too
            return { ...prev, [milestone]: true };
        });
        return hint;
    }, [optedOut]);

    const isComplete = useCallback((milestone: TutorialMilestone): boolean => {
        if (optedOut) return true; // If opted out, treat all as complete (no pulses)
        return progress[milestone];
    }, [progress, optedOut]);

    const shouldPulse = useCallback((milestone: TutorialMilestone): boolean => {
        return !isComplete(milestone);
    }, [isComplete]);

    const setOptedOut = useCallback((value: boolean) => {
        setOptedOutState(value);
        try {
            if (value) {
                localStorage.setItem(STORAGE_KEY, "true");
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // localStorage not available
        }
    }, []);

    const resetProgress = useCallback(() => {
        setProgress(initialProgress);
        // Also clear from localStorage if we have a gameId
        if (gameId) {
            try {
                localStorage.removeItem(GAME_PROGRESS_KEY_PREFIX + gameId);
            } catch {
                // ignore
            }
        }
    }, [gameId]);

    const getTooltip = useCallback((milestone: TutorialMilestone): string | undefined => {
        if (optedOut || progress[milestone]) return undefined;
        return BUTTON_TOOLTIPS[milestone];
    }, [optedOut, progress]);

    return useMemo(() => ({
        progress,
        markComplete,
        isComplete,
        shouldPulse,
        optedOut,
        setOptedOut,
        resetProgress,
        getTooltip,
        setGameId,
    }), [progress, markComplete, isComplete, shouldPulse, optedOut, setOptedOut, resetProgress, getTooltip, setGameId]);
}

export type TutorialProgressAPI = ReturnType<typeof useTutorialProgress>;
