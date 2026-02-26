import type { OperationalObjective } from "../memory.js";

export const PRODUCTION_MOD_WEIGHTS = {
    threat: 0.01,
    safety: 0.01,
    gap: 0.01,
    expansion: 0.01,
    composition: 0.04,
} as const;

export type ProductionThreatLevel = "none" | "probe" | "raid" | "assault";

export const PRODUCTION_THREAT_INTENSITY: Record<ProductionThreatLevel, number> = {
    none: 0,
    probe: 0.25,
    raid: 0.6,
    assault: 1,
};

export const THEATER_OBJECTIVE_BIAS: Record<OperationalObjective, number> = {
    "deny-progress": 0.02,
    "capture-capital": 0.015,
    pressure: 0.01,
    "defend-border": 0,
};

export const PRODUCTION_INFLUENCE_MOD_WEIGHTS = {
    front: 0.03,
    border: 0.02,
    pressure: 0.02,
} as const;

export function getEarlyExpansionSupplyPenalty(supplyGap: number, atWar: boolean): number {
    if (supplyGap >= 2) return -0.08;
    if (supplyGap >= 1) return -0.05;
    if (atWar && supplyGap >= 0) return -0.03;
    return 0;
}

export function getExpansionSupplyPenalty(supplyGap: number, atWar: boolean): number {
    if (supplyGap >= 2) return -0.10;
    if (supplyGap >= 1) return -0.06;
    if (atWar && supplyGap >= 0) return -0.03;
    return 0;
}

export function getEconomyMilitaryPressureBoost(
    supplyGap: number,
    supplyNearCap: boolean,
    atWar: boolean
): number {
    if (supplyGap >= 3) return 0.20;
    if (supplyGap >= 1) return 0.14;
    if (atWar && supplyGap >= 0) return 0.08;
    return supplyNearCap ? 0.04 : 0;
}
