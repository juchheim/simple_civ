import { useCallback, useState } from "react";

type UseTitleFlowResult = {
    showTitleScreen: boolean;
    setShowTitleScreen: (show: boolean) => void;
    showTitle: () => void;
    hideTitle: () => void;
    handleSessionRestore: () => void;
};

export function useTitleFlow(): UseTitleFlowResult {
    const [showTitleScreen, setShowTitleScreenState] = useState(true);

    const setShowTitleScreen = useCallback((show: boolean) => {
        setShowTitleScreenState(show);
    }, []);

    const showTitle = useCallback(() => {
        setShowTitleScreenState(true);
    }, []);

    const hideTitle = useCallback(() => {
        setShowTitleScreenState(false);
    }, []);

    const handleSessionRestore = hideTitle;

    return {
        showTitleScreen,
        setShowTitleScreen,
        showTitle,
        hideTitle,
        handleSessionRestore,
    };
}
