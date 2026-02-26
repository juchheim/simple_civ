import type { GameState } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";

export type WarRatioStagingDecision =
    | { kind: "proceed" }
    | {
        kind: "continue";
        shouldStageFocus: boolean;
        reason: "insufficient-military" | "needs-offensive-power" | "influence" | "insufficient-ratio";
    };

export function evaluateWarRatioStaging(input: {
    effectiveOffensiveRatio: number;
    effectiveRatio: number;
    escalatedRatio: number;
    myMilitaryCount: number;
    myCityCount: number;
    frontRatio: number;
    pressureRatio: number;
    warsPlanned: number;
    maxConcurrentWars: number;
}): WarRatioStagingDecision {
    if (input.effectiveOffensiveRatio >= input.escalatedRatio) {
        const requiredMilitary = Math.max(4, Math.ceil(input.myCityCount * 1.0));
        if (input.myMilitaryCount < requiredMilitary) {
            return { kind: "continue", shouldStageFocus: false, reason: "insufficient-military" };
        }
        return { kind: "proceed" };
    }

    if (input.effectiveRatio >= input.escalatedRatio) {
        return { kind: "continue", shouldStageFocus: true, reason: "needs-offensive-power" };
    }

    const stageByInfluence =
        (input.frontRatio > 0.35 || input.pressureRatio > 0.35) &&
        input.effectiveRatio >= input.escalatedRatio * 0.85 &&
        input.warsPlanned < input.maxConcurrentWars;

    if (stageByInfluence) {
        return { kind: "continue", shouldStageFocus: true, reason: "influence" };
    }

    return { kind: "continue", shouldStageFocus: false, reason: "insufficient-ratio" };
}

export function computeFocusCityStagingCounts(
    state: GameState,
    playerId: string,
    focusCoord: { q: number; r: number },
    stageDistMax: number
): { nearCount: number; capturersNear: number } {
    const nearCount = state.units.filter(u =>
        u.ownerId === playerId &&
        u.type !== "Settler" && u.type !== "Scout" && u.type !== "Skiff" && u.type !== "ArmyScout" &&
        hexDistance(u.coord, focusCoord) <= stageDistMax
    ).length;

    const capturersNear = state.units.filter(u =>
        u.ownerId === playerId &&
        (u.type === "SpearGuard" || u.type === "ArmySpearGuard" || u.type === "Titan") &&
        hexDistance(u.coord, focusCoord) <= stageDistMax
    ).length;

    return { nearCount, capturersNear };
}

export function needsMoreWarStaging(input: {
    progressThreat: boolean;
    hasTitanNow: boolean;
    nearCount: number;
    capturersNear: number;
    requiredNear: number;
}): boolean {
    if (input.progressThreat) return false;
    return input.nearCount < input.requiredNear || (!input.hasTitanNow && input.capturersNear < 1);
}
