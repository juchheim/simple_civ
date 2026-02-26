import { type Action, type GameState } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import type { InfluenceMaps } from "../influence-map.js";
import type { AiPlayerMemoryV2 } from "../memory.js";
import { formatDiplomacyBreakdown, pickTopCandidate, recordLastStanceTurn } from "../diplomacy-helpers.js";
import { buildPeaceCandidates } from "./peace-candidates.js";
import { buildPeaceDecisionContext } from "./peace-context.js";

export function resolveWarStancePeace(input: {
    state: GameState;
    playersForThreatCheck: GameState["players"];
    actions: Action[];
    playerId: string;
    targetId: string;
    ratio: number;
    myAnchorCoord?: { q: number; r: number };
    targetAnchorCoord?: { q: number; r: number };
    memory: AiPlayerMemoryV2;
    influence?: InfluenceMaps;
    minStanceTurns: number;
    canInitiateWars: boolean;
    warPowerRatio: number;
    peacePowerThreshold: number;
    debugEnabled: boolean;
}): GameState {
    const peaceContext = buildPeaceDecisionContext({
        state: input.state,
        playersForThreatCheck: input.playersForThreatCheck,
        playerId: input.playerId,
        targetId: input.targetId,
        ratio: input.ratio,
        myAnchorCoord: input.myAnchorCoord,
        targetAnchorCoord: input.targetAnchorCoord,
        memory: input.memory,
        influence: input.influence,
        minStanceTurns: input.minStanceTurns,
        canInitiateWars: input.canInitiateWars,
        warPowerRatio: input.warPowerRatio,
    });
    if (!peaceContext) return input.state;

    const peaceCandidates = buildPeaceCandidates({
        targetId: input.targetId,
        ratio: input.ratio,
        warAge: peaceContext.warAge,
        turnsSinceCapture: peaceContext.turnsSinceCapture,
        lostCities: peaceContext.lostCities,
        warMomentum: peaceContext.warMomentum,
        siegeFailureCount: peaceContext.siegeFailureCount,
        progressThreatNow: peaceContext.progressThreatNow,
        thirdPartyThreat: peaceContext.thirdPartyThreat,
        incomingPeace: peaceContext.incomingPeace,
        aggressive: peaceContext.aggressive,
        minStanceTurns: input.minStanceTurns,
        turn: input.state.turn,
        lastStanceTurn: peaceContext.lastStanceTurn,
        peacePowerThreshold: input.peacePowerThreshold,
    });

    const peaceDecision = pickTopCandidate(peaceCandidates);
    if (!peaceDecision) return input.state;

    input.actions.push({ type: peaceDecision.type, playerId: input.playerId, targetPlayerId: input.targetId } as Action);
    const next = recordLastStanceTurn(input.state, input.playerId, input.targetId);
    if (input.debugEnabled) {
        aiInfo(
            `[AI Diplo] ${input.playerId} ${peaceDecision.type} vs ${input.targetId} ` +
            `score=${peaceDecision.score.toFixed(2)} | ${formatDiplomacyBreakdown(peaceDecision)}`
        );
    }
    return next;
}
