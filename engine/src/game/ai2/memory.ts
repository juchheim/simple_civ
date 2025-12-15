import { GameState } from "../../core/types.js";

export type AiPlayerMemoryV2 = {
    /** Current strategic opponent focus (if any) */
    focusTargetPlayerId?: string;
    /** Current primary siege city focus (if any) */
    focusCityId?: string;
    /** Titan-specific focus target (if any) */
    titanFocusCityId?: string;
    /** Turn when focus was last set (used to avoid thrashing) */
    focusSetTurn?: number;
    /** Last diplomacy stance change turn for each opponent (v2-local) */
    lastStanceTurn?: Record<string, number>;
    /** Turn stamps for wars this player initiated (used for rate limiting). */
    warInitiationTurns?: number[];
    /** City count when war started with each opponent (for tracking losses) */
    warCityCount?: Record<string, number>;
    /** Unit count when war started with each opponent (for tracking casualties) */
    warUnitsCount?: Record<string, number>;
    /** Last turn a city was captured in war with each opponent (for stalemate detection) */
    lastCityCaptureTurn?: Record<string, number>;
    /** War preparation phase per target: 'buildup' | 'gathering' | 'positioning' | 'ready' */
    warPrepPhase?: Record<string, 'buildup' | 'gathering' | 'positioning' | 'ready'>;
    /** Turn when war prep started for each target */
    warPrepStartTurn?: Record<string, number>;
    /** City ID currently building Titan's Core (for pre-spawn deathball rally) */
    titanCoreCityId?: string;
};

export function getAiMemoryV2(state: GameState, playerId: string): AiPlayerMemoryV2 {
    const raw = (state.aiMemoryV2?.[playerId] ?? {}) as AiPlayerMemoryV2;
    return raw;
}

export function setAiMemoryV2(state: GameState, playerId: string, memory: AiPlayerMemoryV2): GameState {
    return {
        ...state,
        aiMemoryV2: {
            ...(state.aiMemoryV2 ?? {}),
            [playerId]: memory,
        },
    };
}


