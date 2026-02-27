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
    /** Siege wave currently active (if any) */
    siegeWaveActive?: boolean;
    /** Turn when current siege wave started */
    siegeWaveStartTurn?: number;
    /** Last turn focus city HP dropped during current wave */
    siegeLastProgressTurn?: number;
    /** Lowest HP reached by focus city in current wave */
    siegeMinHpThisWave?: number;
    /** Failed siege waves per focus city */
    siegeFailureCount?: Record<string, number>;
    /** War preparation phase per target: 'buildup' | 'gathering' | 'positioning' | 'ready' */
    warPrepPhase?: Record<string, 'buildup' | 'gathering' | 'positioning' | 'ready'>;
    /** Turn when war prep started for each target */
    warPrepStartTurn?: Record<string, number>;
    /** City ID currently building Titan's Core (for pre-spawn deathball rally) */
    titanCoreCityId?: string;

    // Level 4: Army Phase State Machine
    /** Current army phase: scattered -> rallying -> staged -> attacking */
    armyPhase?: 'scattered' | 'rallying' | 'staged' | 'attacking';
    /** Rally point coordinate for army staging */
    armyRallyPoint?: { q: number; r: number };
    /** Turn when staged condition was first met (for timeout) */
    armyReadyTurn?: number;
    /** Turn when current army phase started (for phase timeout) */
    armyPhaseStartTurn?: number;

    // Level 2: Focus Fire
    /** Current tactical unit focus for concentrated attacks */
    tacticalFocusUnitId?: string;

    // Operational layer: theater management
    operationalTheaters?: OperationalTheater[];
    operationalTurn?: number;
    /** Last turn this civ executed at least one economic rush-buy. */
    lastEconomicRushBuyTurn?: number;
    /** City-state currently targeted for a multi-turn influence flip campaign. */
    cityStateFocusId?: string;
    /** Turn when city-state focus was last refreshed. */
    cityStateFocusSetTurn?: number;
};

export type OperationalObjective = "capture-capital" | "deny-progress" | "pressure" | "defend-border";

export type OperationalTheater = {
    id: string;
    targetPlayerId: string;
    targetCityId?: string;
    anchorCityId?: string;
    anchorCoord: { q: number; r: number };
    targetCoord: { q: number; r: number };
    objective: OperationalObjective;
    priority: number;
    threat: number;
    friendly: number;
    distance: number;
    atWar: boolean;
    cityCount: number;
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
