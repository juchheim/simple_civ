import { clamp01 } from "../util.js";

export type ProductionScoreBreakdown = {
    total: number;
    components: Record<string, number>;
    notes?: string[];
};

export type ProductionCandidate<TOption> = {
    option: TOption;
    score: number;
    reason: string;
    breakdown: ProductionScoreBreakdown;
};

export const PRODUCTION_BASE_SCORES = {
    cityUnderAttack: 1.0,
    warStaging: 0.96,
    warTrebuchet: 0.93,
    warGarrison: 0.90,
    warEmergency: 0.88,
    aetherianRush: 0.86,
    victoryProject: 0.84,
    defensePriority: 0.80,
    riverLeagueBoost: 0.78,
    defensiveEarly: 0.76,
    earlyExpansion: 0.74,
    defensiveLorekeeper: 0.72,
    defensiveArmy: 0.70,
    techUnlock: 0.66,
    proactiveReinforcement: 0.64,
    defenseSupport: 0.62,
    capabilityGap: 0.60,
    expansion: 0.58,
    economy: 0.54,
    fallbackMix: 0.50,
    fallbackDefault: 0.46,
};

export function formatProductionBreakdown(breakdown: ProductionScoreBreakdown): string {
    const parts = Object.entries(breakdown.components)
        .filter(([, value]) => Math.abs(value) >= 0.01)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([key, value]) => `${key}:${value.toFixed(2)}`);
    if (breakdown.notes && breakdown.notes.length > 0) {
        parts.push(`notes:${breakdown.notes.join("|")}`);
    }
    return parts.join(", ");
}

export function addProductionCandidate<TOption>(
    candidates: ProductionCandidate<TOption>[],
    input: {
        option: TOption | null;
        reason: string;
        base: number;
        components?: Record<string, number>;
        notes?: string[];
    }
): void {
    if (!input.option) return;
    const components = { base: input.base, ...(input.components ?? {}) };
    const total = clamp01(Object.values(components).reduce((sum, value) => sum + value, 0));
    candidates.push({
        option: input.option,
        score: total,
        reason: input.reason,
        breakdown: {
            total,
            components,
            notes: input.notes && input.notes.length > 0 ? input.notes : undefined,
        },
    });
}
