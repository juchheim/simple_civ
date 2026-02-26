import { GameState } from "../../core/types.js";
import { getAiMemoryV2, setAiMemoryV2 } from "./memory.js";
import { clamp01, pickBest } from "./util.js";
import type { InfluenceMaps } from "./influence-map.js";

export type WarInitiationOptions = {
    focusCityId?: string;
    setFocus?: boolean;
    warInitiationTurns?: number[];
    warCityCount?: number;
    warUnitsCount?: number;
    recordCaptureTurn?: boolean;
};

export type DiplomacyCandidateType = "DeclareWar" | "StageWar" | "ProposePeace" | "AcceptPeace";

export type DiplomacyCandidate = {
    type: DiplomacyCandidateType;
    targetId: string;
    score: number;
    reason: string;
    focusCityId?: string;
    breakdown?: Record<string, number>;
};

export function getInfluenceRatio(
    layer: InfluenceMaps["threat"] | undefined,
    coord?: { q: number; r: number }
): number {
    if (!layer || !coord || layer.max <= 0) return 0;
    return clamp01(layer.get(coord) / layer.max);
}

export function recordFocusTarget(
    next: GameState,
    playerId: string,
    targetId: string,
    focusCityId?: string
): GameState {
    const memory = getAiMemoryV2(next, playerId);
    return setAiMemoryV2(next, playerId, {
        ...memory,
        focusTargetPlayerId: targetId,
        focusCityId,
        focusSetTurn: next.turn,
    });
}

export function recordWarInitiation(
    next: GameState,
    playerId: string,
    targetId: string,
    options: WarInitiationOptions = {}
): GameState {
    const memory = getAiMemoryV2(next, playerId);
    const warInitiationTurns = options.warInitiationTurns ?? (memory.warInitiationTurns ?? []);

    const updated = {
        ...memory,
        lastStanceTurn: { ...(memory.lastStanceTurn ?? {}), [targetId]: next.turn },
        warInitiationTurns: [...warInitiationTurns, next.turn],
        ...(options.setFocus ? {
            focusTargetPlayerId: targetId,
            focusCityId: options.focusCityId,
            focusSetTurn: next.turn,
        } : {}),
        ...(options.warCityCount !== undefined ? {
            warCityCount: { ...(memory.warCityCount ?? {}), [targetId]: options.warCityCount }
        } : {}),
        ...(options.warUnitsCount !== undefined ? {
            warUnitsCount: { ...(memory.warUnitsCount ?? {}), [targetId]: options.warUnitsCount }
        } : {}),
        ...(options.recordCaptureTurn ? {
            lastCityCaptureTurn: { ...(memory.lastCityCaptureTurn ?? {}), [targetId]: next.turn }
        } : {}),
    };

    return setAiMemoryV2(next, playerId, updated);
}

export function recordLastStanceTurn(next: GameState, playerId: string, targetId: string): GameState {
    const memory = getAiMemoryV2(next, playerId);
    return setAiMemoryV2(next, playerId, {
        ...memory,
        lastStanceTurn: { ...(memory.lastStanceTurn ?? {}), [targetId]: next.turn },
    });
}

export function formatDiplomacyBreakdown(candidate: DiplomacyCandidate): string {
    if (!candidate.breakdown) return candidate.reason;
    const parts = Object.entries(candidate.breakdown)
        .filter(([, value]) => Math.abs(value) >= 0.01)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([key, value]) => `${key}:${value.toFixed(2)}`);
    return `${candidate.reason} | ${parts.join(", ")}`;
}

export function pickTopCandidate(candidates: DiplomacyCandidate[]): DiplomacyCandidate | null {
    const best = pickBest(candidates, c => c.score);
    return best ? best.item : null;
}

export function passesWarTimingGate(input: {
    progressThreat: boolean;
    conquestThreat: boolean;
    earlyRushActive: boolean;
    turn: number;
    minWarTurn: number;
    warsPlanned: number;
    maxConcurrentWars: number;
    recentInitiations: number;
    maxInitiatedWarsPer50Turns: number;
}): boolean {
    if (!input.progressThreat && !input.conquestThreat && !input.earlyRushActive) {
        if (input.turn < input.minWarTurn) return false;
        if (input.warsPlanned >= input.maxConcurrentWars) return false;
        if (input.recentInitiations >= input.maxInitiatedWarsPer50Turns) return false;
    } else if (input.earlyRushActive) {
        if (input.turn < 8) return false;
    }
    return true;
}

export function computeWarDeclarationScore(input: {
    effectiveOffensiveRatio: number;
    escalatedRatio: number;
    progressThreat: boolean;
    conquestThreat: boolean;
    earlyRushActive: boolean;
    isDominating: boolean;
    frontRatio: number;
    pressureRatio: number;
}): number {
    const ratioScore = clamp01(
        (input.effectiveOffensiveRatio - input.escalatedRatio) / Math.max(0.01, input.escalatedRatio)
    );

    let warScore = ratioScore;
    if (input.progressThreat) warScore = Math.max(warScore, 0.8);
    if (input.conquestThreat) warScore = Math.max(warScore, 0.7);
    if (input.earlyRushActive) warScore = Math.max(warScore, 0.6);
    if (input.isDominating) warScore = 1.0;
    if (input.frontRatio > 0 || input.pressureRatio > 0) {
        warScore = clamp01(warScore + input.frontRatio * 0.12 + input.pressureRatio * 0.1);
    }
    return warScore;
}
