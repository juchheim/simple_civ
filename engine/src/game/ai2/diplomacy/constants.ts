export const DIPLOMACY_DISTANCE_FALLBACK_MAX = 999;

export const FRONT_DISTANCE_BONUS_SCALE = 4;

export const LATE_GAME_WAR_DISTANCE_TURN = 160;
export const LATE_GAME_WAR_DISTANCE_OVERRIDE = 999;

export const WAR_INITIATION_LOOKBACK_TURNS = 50;
export const FOCUS_CITY_STAGING_DISTANCE = 6;

export const EARLY_RUSH_MAX_TURN = 25;
export const EARLY_RUSH_SEED_MOD = 100;

export const TRIGGER_INFLUENCE_WEIGHTS = {
    front: 0.08,
    pressure: 0.06,
} as const;

export const BORDER_VIOLATION_TRIGGER_SCORE = {
    base: 0.95,
    violationWeight: 0.02,
    distanceWeight: 0.01,
} as const;

export const FORCED_WAR_TRIGGER = {
    baseTurn: 180,
    turnOffsetRange: 25,
    minimumPowerRatio: 0.7,
    fallbackPowerRatio: 2,
    scoreBase: 0.55,
    scoreSlope: 0.4,
    humanPowerDiscount: 0.7,
} as const;

export const GLOBAL_TRIGGER_BASE_SCORES = {
    tactical: 0.75,
    techStalemate: 0.65,
} as const;

export const TECH_STALEMATE_TECH_THRESHOLD = 20;

export const WAR_THREAT_DISTANCE_OVERRIDE = 999;

export const OPPORTUNITY_STAGING = {
    baseDistance: 5,
    minStagedUnits: 3,
    frontDistanceScale: 2,
    lowPressureThreshold: 0.2,
    highFrontThreshold: 0.6,
    absoluteMinUnits: 2,
} as const;

export const OPPORTUNITY_EARLY_RUSH = {
    maxTurn: 60,
    minimumPriority: 25,
} as const;

export const OPPORTUNITY_COUNTER_ATTACK = {
    minimumPriority: 40,
} as const;

export const OPPORTUNITY_PUNITIVE_STRIKE_MIN_FREE_UNITS = 4;
