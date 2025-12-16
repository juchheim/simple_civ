import React, { createContext, useContext } from "react";
import { useTutorialProgress, TutorialProgressAPI } from "../hooks/useTutorialProgress";

const TutorialContext = createContext<TutorialProgressAPI | null>(null);

/**
 * Provider component that wraps the app to provide tutorial progress state.
 */
export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const tutorialAPI = useTutorialProgress();
    return (
        <TutorialContext.Provider value={tutorialAPI}>
            {children}
        </TutorialContext.Provider>
    );
};

/**
 * Hook to access tutorial progress API from any component.
 * Must be used within a TutorialProvider.
 */
export function useTutorial(): TutorialProgressAPI {
    const ctx = useContext(TutorialContext);
    if (!ctx) {
        throw new Error("useTutorial must be used within a TutorialProvider");
    }
    return ctx;
}
