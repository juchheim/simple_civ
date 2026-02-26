import { AiVictoryGoal, City, DiplomacyState, GameState } from "../../core/types.js";
import { estimateMilitaryPower } from "../ai/goals.js";
import { getAiMemoryV2, setAiMemoryV2, type OperationalTheater } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { buildPerception } from "./perception.js";
import { type InfluenceMaps } from "./influence-map.js";
import { aiInfo, isAiDebugEnabled } from "../ai/debug-logging.js";
import { pickBest } from "./util.js";
import {
    buildForcedGoalCandidates,
    buildStandardGoalCandidates,
    computeForcedGoal,
    formatGoalBreakdown,
    type GoalCandidate
} from "./strategy/goal-selection.js";
import {
    buildFocusTargetCandidates,
    pickBestWarFinishTarget,
    selectBestFocusCityCandidate,
    shouldKeepFocusTarget
} from "./strategy/focus-selection.js";

export function isAtWarV2(state: GameState, playerId: string): boolean {
    return state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

export function chooseVictoryGoalV2(state: GameState, playerId: string): AiVictoryGoal {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return "Balanced";

    const profile = getAiProfileV2(state, playerId);
    const inWar = isAtWarV2(state, playerId);
    const forced = computeForcedGoal(state, playerId, player);
    let candidates: GoalCandidate[] = [];

    if (forced) {
        candidates = buildForcedGoalCandidates(forced);
        const bestForced = pickBest(candidates, c => c.score)?.item?.goal ?? forced.goal;
        if (isAiDebugEnabled()) {
            const chosen = candidates.find(c => c.goal === bestForced);
            if (chosen) {
                const breakdown = formatGoalBreakdown(chosen.breakdown);
                aiInfo(`[AI Goal] Forced ${bestForced} (${chosen.score.toFixed(2)}) | ${breakdown}`);
            }
        }
        return bestForced;
    }

    candidates = buildStandardGoalCandidates(state, playerId, player, profile, inWar);

    const best = pickBest(candidates, c => c.score)?.item ?? candidates[0];
    if (isAiDebugEnabled()) {
        const breakdown = formatGoalBreakdown(best.breakdown);
        aiInfo(`[AI Goal] ${best.goal} (${best.score.toFixed(2)}) | ${breakdown}`);
    }
    return best.goal;
}

export function selectFocusTargetV2(state: GameState, playerId: string): { state: GameState; focusTargetId?: string; focusCityId?: string } {
    const memory = getAiMemoryV2(state, playerId);
    const profile = getAiProfileV2(state, playerId);
    const myPower = estimateMilitaryPower(playerId, state);
    const perception = buildPerception(state, playerId);

    const theaters = memory.operationalTheaters ?? [];
    const theaterFresh = memory.operationalTurn !== undefined && (state.turn - memory.operationalTurn) <= 2;
    const primaryTheater: OperationalTheater | null = theaterFresh && theaters.length > 0 ? theaters[0] : null;

    const enemies = state.players.filter(p => p.id !== playerId && !p.isEliminated);
    const visibleEnemies = perception.visibilityKnown
        ? enemies.filter(e => perception.visibleEnemyIds.has(e.id))
        : enemies;
    const candidateEnemies = perception.visibilityKnown && visibleEnemies.length > 0
        ? visibleEnemies
        : enemies;
    if (enemies.length === 0) return { state, focusTargetId: undefined, focusCityId: undefined };

    // If our stored focus city is no longer an enemy city (captured / flipped), clear it so we can roll forward.
    if (memory.focusCityId) {
        const fc = state.cities.find(c => c.id === memory.focusCityId);
        if (!fc || fc.ownerId === playerId) {
            const cleared = setAiMemoryV2(state, playerId, {
                ...memory,
                focusCityId: undefined,
                focusTargetPlayerId: undefined,
                focusSetTurn: undefined,
            });
            return selectFocusTargetV2(cleared, playerId);
        }
    }

    // Legacy "FINISH HIM": if we're already at war with someone who is nearly dead, hard-focus them until eliminated.
    const warEnemies = enemies.filter(e => state.diplomacy?.[playerId]?.[e.id] === DiplomacyState.War);
    if (warEnemies.length > 0) {
        const bestFinish = pickBestWarFinishTarget(state, playerId, warEnemies, myPower);
        if (bestFinish) {
            const focusCity = selectFocusCityAgainstTarget(state, playerId, bestFinish.id);
            const next = setAiMemoryV2(state, playerId, {
                ...memory,
                focusTargetPlayerId: bestFinish.id,
                focusCityId: focusCity?.id,
                focusSetTurn: state.turn,
            });
            return { state: next, focusTargetId: bestFinish.id, focusCityId: focusCity?.id };
        }
    }

    // Stickiness: keep focus longer during wars so we actually finish capital sieges (conquest requires capitals).
    const shouldStickToTarget = shouldKeepFocusTarget({
        state,
        playerId,
        enemies,
        focusTargetPlayerId: memory.focusTargetPlayerId,
        focusSetTurn: memory.focusSetTurn,
        inWar: isAtWarV2(state, playerId),
    });
    if (shouldStickToTarget && memory.focusTargetPlayerId) {
        return { state, focusTargetId: memory.focusTargetPlayerId, focusCityId: memory.focusCityId };
    }

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myAnchor = myCities.find(c => c.isCapital) ?? myCities[0];
    if (!myAnchor) return { state, focusTargetId: undefined, focusCityId: undefined };

    // Check if there's a human player in the game
    const hasHumanPlayer = state.players.some(p => !p.isAI && !p.isEliminated);

    const candidateTargets = buildFocusTargetCandidates({
        state,
        playerId,
        myPower,
        myAnchor,
        candidateEnemies,
        profile,
        primaryTheater,
        hasHumanPlayer,
    });

    const bestTarget = pickBest(candidateTargets, c => c.score)?.item?.targetId;
    if (!bestTarget) {
        return { state, focusTargetId: undefined, focusCityId: undefined };
    }

    const focusCity = selectFocusCityAgainstTarget(state, playerId, bestTarget);
    const next = setAiMemoryV2(state, playerId, {
        ...memory,
        focusTargetPlayerId: bestTarget,
        focusCityId: focusCity?.id,
        focusSetTurn: state.turn,
    });
    return { state: next, focusTargetId: bestTarget, focusCityId: focusCity?.id };
}

export function selectFocusCityAgainstTarget(
    state: GameState,
    playerId: string,
    targetId: string,
    influence?: InfluenceMaps
): City | undefined {
    const profile = getAiProfileV2(state, playerId);
    const memory = getAiMemoryV2(state, playerId);
    const perception = buildPerception(state, playerId);
    const theaterFresh = memory.operationalTurn !== undefined && (state.turn - memory.operationalTurn) <= 2;
    const theaterForTarget = theaterFresh ? (memory.operationalTheaters ?? []).find(t => t.targetPlayerId === targetId) : undefined;

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const anchor = myCities.find(c => c.isCapital) ?? myCities[0];
    if (!anchor) return undefined;

    const enemyCities = state.cities.filter(c => c.ownerId === targetId);
    if (enemyCities.length === 0) return undefined;
    const visibleEnemyCities = enemyCities.filter(c => perception.isCoordVisible(c.coord));
    const candidateCities = perception.visibilityKnown && visibleEnemyCities.length > 0
        ? visibleEnemyCities
        : enemyCities;

    return selectBestFocusCityCandidate({
        state,
        playerId,
        anchor,
        candidateCities,
        profile,
        theaterForTarget,
        influence,
    });
}
