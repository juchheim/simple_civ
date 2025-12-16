import { useState, useCallback, useMemo } from "react";

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
 * - Progress resets each new game (stored in React state)
 * - Opt-out persists permanently (stored in localStorage)
 */
export function useTutorialProgress() {
    const [progress, setProgress] = useState<TutorialProgress>(initialProgress);
    const [optedOut, setOptedOutState] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === "true";
        } catch {
            return false;
        }
    });

    const markComplete = useCallback((milestone: TutorialMilestone): string | null => {
        if (optedOut) return null;

        let hint: string | null = null;
        setProgress(prev => {
            if (prev[milestone]) return prev; // Already complete
            hint = MILESTONE_HINTS[milestone] ?? null;
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
    }, []);

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
    }), [progress, markComplete, isComplete, shouldPulse, optedOut, setOptedOut, resetProgress, getTooltip]);
}

export type TutorialProgressAPI = ReturnType<typeof useTutorialProgress>;
