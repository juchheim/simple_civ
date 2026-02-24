import { EraId } from "@simple-civ/engine";

export type EraMusicTrack = {
    era: EraId;
    label: string;
    src: string;
    prompt: string;
    durationSeconds: number;
};

const LOOP_DURATION_SECONDS = 24;

export const ERA_MUSIC_TRACKS: Record<EraId, EraMusicTrack> = {
    [EraId.Primitive]: {
        era: EraId.Primitive,
        label: "Primitive",
        src: "/audio/eras/primitive-loop.ogg",
        durationSeconds: LOOP_DURATION_SECONDS,
        prompt: "Primitive era soundtrack loop, sparse and ancient mood, modal harmony, gentle pulse, mostly pizzicato upright bass with light felt piano motifs and plucked acoustic guitar harmonics, minimal hand percussion, exploratory and calm.",
    },
    [EraId.Hearth]: {
        era: EraId.Hearth,
        label: "Hearth",
        src: "/audio/eras/hearth-loop.ogg",
        durationSeconds: LOOP_DURATION_SECONDS,
        prompt: "Hearth era soundtrack loop, warm pastoral folk style, lyrical felt piano melody with fingerstyle acoustic guitar and soft upright bass, cozy village atmosphere, hopeful and steady tempo.",
    },
    [EraId.Banner]: {
        era: EraId.Banner,
        label: "Banner",
        src: "/audio/eras/banner-loop.ogg",
        durationSeconds: LOOP_DURATION_SECONDS,
        prompt: "Banner era soundtrack loop, confident frontier march feel, rhythmic piano ostinato, strummed acoustic guitar, upright bass driving pulse, noble and adventurous tone, medium tempo, no aggression.",
    },
    [EraId.Engine]: {
        era: EraId.Engine,
        label: "Engine",
        src: "/audio/eras/engine-loop.ogg",
        durationSeconds: LOOP_DURATION_SECONDS,
        prompt: "Engine era soundtrack loop, early industrial jazz-folk hybrid, punchy piano chords, muted acoustic guitar comping, walking upright bass, focused momentum for strategy gameplay, medium-fast tempo.",
    },
    [EraId.Aether]: {
        era: EraId.Aether,
        label: "Aether",
        src: "/audio/eras/aether-loop.ogg",
        durationSeconds: LOOP_DURATION_SECONDS,
        prompt: "Aether era soundtrack loop, futuristic neoclassical acoustic trio, shimmering felt piano arpeggios, airy guitar textures, bowed and pizzicato upright bass, elegant and mysterious, restrained dynamics.",
    },
};

export const ERA_MUSIC_STORAGE_KEYS = {
    enabled: "simple-civ-music-enabled",
    volume: "simple-civ-music-volume",
} as const;

export function getEraMusicTrack(era: EraId | null | undefined): EraMusicTrack | null {
    if (!era) return null;
    return ERA_MUSIC_TRACKS[era] ?? null;
}
