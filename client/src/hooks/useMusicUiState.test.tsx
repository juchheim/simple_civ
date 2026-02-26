import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMusicUiState } from "./useMusicUiState";

describe("useMusicUiState", () => {
    it("shows unlock prompt when playback is not ready", () => {
        const { result } = renderHook(() => useMusicUiState({
            activeEra: null,
            readyForPlayback: false,
            playbackError: null,
            musicEnabled: true,
            setMusicEnabled: vi.fn(),
        }));

        expect(result.current.musicStatusLabel).toBe("Music starts after your next click or key press.");
    });

    it("prioritizes playback errors when ready", () => {
        const { result } = renderHook(() => useMusicUiState({
            activeEra: "Banner",
            readyForPlayback: true,
            playbackError: "Audio device unavailable",
            musicEnabled: true,
            setMusicEnabled: vi.fn(),
        }));

        expect(result.current.musicStatusLabel).toBe("Audio device unavailable");
    });

    it("shows active era label when music is playing", () => {
        const { result } = renderHook(() => useMusicUiState({
            activeEra: "Engine",
            readyForPlayback: true,
            playbackError: null,
            musicEnabled: true,
            setMusicEnabled: vi.fn(),
        }));

        expect(result.current.musicStatusLabel).toBe("Now playing: Engine era loop");
    });

    it("shows idle label when ready without era or errors", () => {
        const { result } = renderHook(() => useMusicUiState({
            activeEra: null,
            readyForPlayback: true,
            playbackError: null,
            musicEnabled: true,
            setMusicEnabled: vi.fn(),
        }));

        expect(result.current.musicStatusLabel).toBe("Music is idle.");
    });

    it("toggles music enabled state", () => {
        const setMusicEnabled = vi.fn();
        const { result } = renderHook(() => useMusicUiState({
            activeEra: null,
            readyForPlayback: true,
            playbackError: null,
            musicEnabled: true,
            setMusicEnabled,
        }));

        act(() => {
            result.current.toggleMusic();
        });

        expect(setMusicEnabled).toHaveBeenCalledWith(false);
    });
});
