import { EraId, GameState } from "@simple-civ/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ERA_MUSIC_STORAGE_KEYS, getEraMusicTrack } from "../audio/era-music";

type UseEraMusicOptions = {
    gameState: GameState | null;
    playerId: string;
    isInGame: boolean;
};

type EraAudioCache = Partial<Record<EraId, HTMLAudioElement>>;

export type EraMusicState = {
    activeEra: EraId | null;
    musicEnabled: boolean;
    setMusicEnabled: (enabled: boolean) => void;
    musicVolume: number;
    setMusicVolume: (volume: number) => void;
    readyForPlayback: boolean;
    playbackError: string | null;
};

function clampVolume(value: number): number {
    if (!Number.isFinite(value)) return 0.35;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

function readInitialEnabled(): boolean {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(ERA_MUSIC_STORAGE_KEYS.enabled);
    return raw !== "false";
}

function readInitialVolume(): number {
    if (typeof window === "undefined") return 0.35;
    const raw = window.localStorage.getItem(ERA_MUSIC_STORAGE_KEYS.volume);
    if (!raw) return 0.35;
    return clampVolume(Number(raw));
}

function resolveActiveEra(gameState: GameState | null, playerId: string, isInGame: boolean): EraId | null {
    if (!gameState || !isInGame) return null;
    const player = gameState.players.find(p => p.id === playerId);
    return player?.currentEra ?? null;
}

export function useEraMusic({ gameState, playerId, isInGame }: UseEraMusicOptions): EraMusicState {
    const audioCacheRef = useRef<EraAudioCache>({});
    const currentTrackEraRef = useRef<EraId | null>(null);
    const [musicEnabledState, setMusicEnabledState] = useState<boolean>(() => readInitialEnabled());
    const [musicVolumeState, setMusicVolumeState] = useState<number>(() => readInitialVolume());
    const [hasUserInteraction, setHasUserInteraction] = useState(false);
    const [playbackError, setPlaybackError] = useState<string | null>(null);

    const activeEra = useMemo(
        () => resolveActiveEra(gameState, playerId, isInGame),
        [gameState, isInGame, playerId],
    );

    const setMusicEnabled = useCallback((enabled: boolean) => {
        setMusicEnabledState(Boolean(enabled));
    }, []);

    const setMusicVolume = useCallback((volume: number) => {
        setMusicVolumeState(clampVolume(volume));
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(ERA_MUSIC_STORAGE_KEYS.enabled, String(musicEnabledState));
    }, [musicEnabledState]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(ERA_MUSIC_STORAGE_KEYS.volume, String(musicVolumeState));
    }, [musicVolumeState]);

    useEffect(() => {
        const unlock = () => setHasUserInteraction(true);
        window.addEventListener("pointerdown", unlock, { once: true, passive: true });
        window.addEventListener("keydown", unlock, { once: true });
        return () => {
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };
    }, []);

    useEffect(() => {
        Object.values(audioCacheRef.current).forEach(audio => {
            if (!audio) return;
            audio.volume = musicVolumeState;
        });
    }, [musicVolumeState]);

    useEffect(() => {
        const track = getEraMusicTrack(activeEra);
        if (!track || !musicEnabledState || !isInGame) {
            if (currentTrackEraRef.current) {
                const currentAudio = audioCacheRef.current[currentTrackEraRef.current];
                currentAudio?.pause();
            }
            currentTrackEraRef.current = null;
            return;
        }

        if (!hasUserInteraction) return;
        if (currentTrackEraRef.current === track.era) return;

        const previousEra = currentTrackEraRef.current;
        if (previousEra) {
            const previousAudio = audioCacheRef.current[previousEra];
            if (previousAudio) {
                previousAudio.pause();
                previousAudio.currentTime = 0;
            }
        }

        const cached = audioCacheRef.current[track.era];
        const nextAudio = cached ?? (() => {
            const audio = new Audio(track.src);
            audio.loop = true;
            audio.preload = "auto";
            audio.volume = musicVolumeState;
            audioCacheRef.current[track.era] = audio;
            return audio;
        })();

        currentTrackEraRef.current = track.era;

        let cancelled = false;
        void nextAudio.play().then(() => {
            if (!cancelled) setPlaybackError(null);
        }).catch(() => {
            if (cancelled) return;
            setPlaybackError(`Unable to play era music track: ${track.src}`);
        });

        return () => {
            cancelled = true;
        };
    }, [activeEra, hasUserInteraction, isInGame, musicEnabledState, musicVolumeState]);

    useEffect(() => {
        return () => {
            Object.values(audioCacheRef.current).forEach(audio => {
                if (!audio) return;
                audio.pause();
                audio.src = "";
            });
            audioCacheRef.current = {};
            currentTrackEraRef.current = null;
        };
    }, []);

    return {
        activeEra,
        musicEnabled: musicEnabledState,
        setMusicEnabled,
        musicVolume: musicVolumeState,
        setMusicVolume,
        readyForPlayback: hasUserInteraction,
        playbackError,
    };
}

