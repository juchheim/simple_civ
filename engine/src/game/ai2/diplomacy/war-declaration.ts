import { DiplomacyState, type Action, type GameState } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import {
    computeWarDeclarationScore,
    recordWarInitiation,
    type WarInitiationOptions
} from "../diplomacy-helpers.js";

export function formatWarDeclarationDebugText(input: {
    playerId: string;
    targetId: string;
    score: number;
    effectiveOffensiveRatio: number;
    escalatedRatio: number;
    frontRatio: number;
    pressureRatio: number;
}): string {
    const influenceText = (input.frontRatio > 0 || input.pressureRatio > 0)
        ? ` front:${input.frontRatio.toFixed(2)} pressure:${input.pressureRatio.toFixed(2)}`
        : "";
    return `[AI Diplo] ${input.playerId} declaring war on ${input.targetId} score=${input.score.toFixed(2)} ` +
        `(ratio:${input.effectiveOffensiveRatio.toFixed(2)} req:${input.escalatedRatio.toFixed(2)})${influenceText}`;
}

export function applyWarDeclaration(input: {
    state: GameState;
    actions: Action[];
    playerId: string;
    targetId: string;
    warsPlanned: number;
    options?: WarInitiationOptions;
    debugEnabled?: boolean;
    debugText?: string;
}): { state: GameState; warsPlanned: number } {
    const next = recordWarInitiation(input.state, input.playerId, input.targetId, input.options);
    input.actions.push({
        type: "SetDiplomacy",
        playerId: input.playerId,
        targetPlayerId: input.targetId,
        state: DiplomacyState.War,
    });
    if (input.debugEnabled && input.debugText) {
        aiInfo(input.debugText);
    }
    return {
        state: next,
        warsPlanned: input.warsPlanned + 1,
    };
}

export function applyScoredWarDeclaration(input: {
    state: GameState;
    actions: Action[];
    playerId: string;
    targetId: string;
    warsPlanned: number;
    scoring: Parameters<typeof computeWarDeclarationScore>[0];
    options?: WarInitiationOptions;
    debugEnabled?: boolean;
}): { state: GameState; warsPlanned: number; declared: boolean; warScore: number } {
    const warScore = computeWarDeclarationScore(input.scoring);
    if (warScore <= 0) {
        return {
            state: input.state,
            warsPlanned: input.warsPlanned,
            declared: false,
            warScore,
        };
    }

    const declaration = applyWarDeclaration({
        state: input.state,
        actions: input.actions,
        playerId: input.playerId,
        targetId: input.targetId,
        warsPlanned: input.warsPlanned,
        options: input.options,
        debugEnabled: input.debugEnabled,
        debugText: formatWarDeclarationDebugText({
            playerId: input.playerId,
            targetId: input.targetId,
            score: warScore,
            effectiveOffensiveRatio: input.scoring.effectiveOffensiveRatio,
            escalatedRatio: input.scoring.escalatedRatio,
            frontRatio: input.scoring.frontRatio,
            pressureRatio: input.scoring.pressureRatio,
        }),
    });

    return {
        ...declaration,
        declared: true,
        warScore,
    };
}
