import { useCallback } from "react";

type UseMusicUiStateParams = {
    activeEra: string | null;
    readyForPlayback: boolean;
    playbackError: string | null;
    musicEnabled: boolean;
    setMusicEnabled: (enabled: boolean) => void;
};

type UseMusicUiStateResult = {
    musicStatusLabel: string;
    toggleMusic: () => void;
};

export function useMusicUiState({
    activeEra,
    readyForPlayback,
    playbackError,
    musicEnabled,
    setMusicEnabled,
}: UseMusicUiStateParams): UseMusicUiStateResult {
    const musicStatusLabel = !readyForPlayback
        ? "Music starts after your next click or key press."
        : playbackError
            ? playbackError
            : activeEra
                ? `Now playing: ${activeEra} era loop`
                : "Music is idle.";

    const toggleMusic = useCallback(() => {
        setMusicEnabled(!musicEnabled);
    }, [musicEnabled, setMusicEnabled]);

    return { musicStatusLabel, toggleMusic };
}
