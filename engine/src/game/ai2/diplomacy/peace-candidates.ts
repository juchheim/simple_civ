import { DiplomacyCandidate } from "../diplomacy-helpers.js";
import { clamp01 } from "../util.js";

export type PeaceCandidateInput = {
    targetId: string;
    ratio: number;
    warAge: number;
    turnsSinceCapture: number;
    lostCities: number;
    warMomentum: number;
    siegeFailureCount: number;
    progressThreatNow: boolean;
    thirdPartyThreat: boolean;
    incomingPeace: boolean;
    aggressive: boolean;
    minStanceTurns: number;
    turn: number;
    lastStanceTurn: number;
    peacePowerThreshold: number;
};

export function buildPeaceCandidates(input: PeaceCandidateInput): DiplomacyCandidate[] {
    const peaceCandidates: DiplomacyCandidate[] = [];
    const breakdownBase = {
        ratio: input.ratio,
        warAge: input.warAge,
        turnsSinceCapture: input.turnsSinceCapture,
    };

    const militaryCollapse = input.ratio < 0.7 && input.lostCities > 0 && input.warAge >= 5;
    if (militaryCollapse && !input.progressThreatNow && input.warMomentum < 0.45) {
        peaceCandidates.push({
            type: "ProposePeace",
            targetId: input.targetId,
            score: clamp01(0.9 - input.warMomentum * 0.3),
            reason: "military-collapse",
            breakdown: breakdownBase,
        });
    }

    const territorialStalemate =
        input.warAge >= 40 &&
        input.turnsSinceCapture >= 40 &&
        input.ratio >= 0.85 && input.ratio <= 1.15;
    if (territorialStalemate && !input.progressThreatNow) {
        peaceCandidates.push({
            type: "ProposePeace",
            targetId: input.targetId,
            score: clamp01(0.7 - input.warMomentum * 0.2),
            reason: "territorial-stalemate",
            breakdown: breakdownBase,
        });
    }

    const siegeStalemate =
        input.siegeFailureCount >= 2 &&
        input.warAge >= 30 &&
        input.turnsSinceCapture >= 35 &&
        input.ratio <= 1.1;
    if (siegeStalemate && !input.progressThreatNow && input.warMomentum < 0.5) {
        peaceCandidates.push({
            type: "ProposePeace",
            targetId: input.targetId,
            score: clamp01(0.65 - input.warMomentum * 0.2),
            reason: "siege-stalemate",
            breakdown: { ...breakdownBase, siegeFailures: input.siegeFailureCount },
        });
    }

    if (input.thirdPartyThreat && input.warAge >= 20) {
        peaceCandidates.push({
            type: "ProposePeace",
            targetId: input.targetId,
            score: clamp01(0.6 - input.warMomentum * 0.2),
            reason: "third-party-progress-threat",
            breakdown: breakdownBase,
        });
    }

    const warExhaustion =
        input.warAge >= 75 &&
        input.ratio >= 0.8 && input.ratio <= 1.2 &&
        !input.progressThreatNow;
    if (warExhaustion) {
        peaceCandidates.push({
            type: "ProposePeace",
            targetId: input.targetId,
            score: clamp01(0.6 - input.warMomentum * 0.2),
            reason: "war-exhaustion",
            breakdown: breakdownBase,
        });
    }

    if (input.incomingPeace) {
        const stalledWinner =
            input.ratio >= 1.05 && input.ratio <= 1.25 &&
            input.warAge >= 50 &&
            input.turnsSinceCapture >= 40;
        if (stalledWinner && !input.progressThreatNow) {
            peaceCandidates.push({
                type: "AcceptPeace",
                targetId: input.targetId,
                score: clamp01(0.8 - input.warMomentum * 0.25),
                reason: "stalled-winner",
                breakdown: breakdownBase,
            });
        }
    }

    const stalemate =
        (input.ratio < 1.15) &&
        (input.turn - input.lastStanceTurn) >= Math.ceil(input.minStanceTurns * (input.aggressive ? 3.5 : 2.5));
    const warDuration = input.turn - input.lastStanceTurn;
    const mutualExhaustion = warDuration >= 100 && input.ratio >= 0.85 && input.ratio <= 1.15;
    if (mutualExhaustion && !input.progressThreatNow) {
        peaceCandidates.push({
            type: input.incomingPeace ? "AcceptPeace" : "ProposePeace",
            targetId: input.targetId,
            score: clamp01(0.8 - input.warMomentum * 0.25),
            reason: "mutual-exhaustion",
            breakdown: breakdownBase,
        });
    }

    const wantsPeace = input.ratio < input.peacePowerThreshold;
    const winning = input.ratio >= 1.05;
    if (!input.progressThreatNow && !winning && (wantsPeace || stalemate)) {
        peaceCandidates.push({
            type: input.incomingPeace ? "AcceptPeace" : "ProposePeace",
            targetId: input.targetId,
            score: clamp01(0.55 - input.warMomentum * 0.2),
            reason: "low-advantage",
            breakdown: breakdownBase,
        });
    }

    return peaceCandidates;
}
