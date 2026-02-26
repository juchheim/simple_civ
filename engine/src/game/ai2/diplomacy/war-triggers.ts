import { Action, GameState } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { canDeclareWar, findBorderViolators } from "../../helpers/diplomacy.js";
import { checkTacticalOpportunity, hasUnitsStaged } from "./opportunities.js";
import { selectFocusCityAgainstTarget } from "../strategy.js";
import {
    computeBorderViolationTriggerScore,
    computeForcedWarTriggerScore,
    computeTriggerInfluenceBoost,
    getForcedWarTriggerTurn,
    selectForcedWarTarget,
    WarTriggerCandidate
} from "../diplomacy-trigger-helpers.js";
import { clamp01, pickBest } from "../util.js";
import { recordFocusTarget } from "../diplomacy-helpers.js";
import type { InfluenceMaps } from "../influence-map.js";
import { applyWarDeclaration } from "./war-declaration.js";
import {
    DIPLOMACY_DISTANCE_FALLBACK_MAX,
    FORCED_WAR_TRIGGER,
    GLOBAL_TRIGGER_BASE_SCORES,
    TECH_STALEMATE_TECH_THRESHOLD
} from "./constants.js";

export function buildGlobalWarTriggerCandidates(input: {
    state: GameState;
    playerId: string;
    warsNow: number;
    warsPlanned: number;
    myPower: number;
    myCities: GameState["cities"];
    myAnchor?: { coord: { q: number; r: number } };
    influence?: InfluenceMaps;
}): WarTriggerCandidate[] {
    const { state, playerId, warsNow, warsPlanned, myPower, myCities, myAnchor, influence } = input;
    const candidates: WarTriggerCandidate[] = [];

    const borderViolators = findBorderViolators(state, playerId)
        .filter(entry => canDeclareWar(state, playerId, entry.enemyId));
    if (borderViolators.length > 0 && myCities.length > 0) {
        for (const entry of borderViolators) {
            const enemyUnits = state.units.filter(unit => unit.ownerId === entry.enemyId);
            const minDist = enemyUnits.length
                ? Math.min(...enemyUnits.map(unit => Math.min(...myCities.map(city => hexDistance(unit.coord, city.coord)))))
                : DIPLOMACY_DISTANCE_FALLBACK_MAX;

            const influenceBoost = computeTriggerInfluenceBoost(
                influence,
                myAnchor,
                state.cities,
                entry.enemyId
            ).boost;
            const score = computeBorderViolationTriggerScore(entry.count, minDist, influenceBoost);
            candidates.push({
                targetId: entry.enemyId,
                score,
                reason: "border-violation",
                focusCityId: selectFocusCityAgainstTarget(state, playerId, entry.enemyId, influence)?.id,
                stageIfNotReady: false,
            });
        }
    }

    if (warsNow === 0 && warsPlanned === 0) {
        const opportunity = checkTacticalOpportunity(state, playerId);
        if (opportunity) {
            const influenceBoost = computeTriggerInfluenceBoost(
                influence,
                myAnchor,
                state.cities,
                opportunity.targetId
            ).boost;
            candidates.push({
                targetId: opportunity.targetId,
                score: clamp01(GLOBAL_TRIGGER_BASE_SCORES.tactical + influenceBoost),
                reason: `tactical:${opportunity.reason}`,
                focusCityId: opportunity.focusCity?.id,
                stageIfNotReady: true,
            });
        }

        const forcedWarTriggerTurn = getForcedWarTriggerTurn(playerId, state.seed);
        if (state.turn >= forcedWarTriggerTurn) {
            const weakestTarget = selectForcedWarTarget(state, playerId);
            if (weakestTarget) {
                const ratio = weakestTarget.weakestPower > 0 ? myPower / weakestTarget.weakestPower : FORCED_WAR_TRIGGER.fallbackPowerRatio;
                if (ratio >= FORCED_WAR_TRIGGER.minimumPowerRatio) {
                    const influenceBoost = computeTriggerInfluenceBoost(
                        influence,
                        myAnchor,
                        state.cities,
                        weakestTarget.targetId
                    ).boost;
                    candidates.push({
                        targetId: weakestTarget.targetId,
                        score: computeForcedWarTriggerScore(myPower, weakestTarget.weakestPower, influenceBoost),
                        reason: "forced-war",
                        focusCityId: selectFocusCityAgainstTarget(state, playerId, weakestTarget.targetId, influence)?.id,
                        stageIfNotReady: true,
                    });
                }
            }
        }

        const player = state.players.find(p => p.id === playerId);
        const techTreeComplete = (player?.techs?.length ?? 0) >= TECH_STALEMATE_TECH_THRESHOLD;
        if (techTreeComplete) {
            for (const other of state.players) {
                if (other.id === playerId || other.isEliminated) continue;
                if ((other.techs?.length ?? 0) < TECH_STALEMATE_TECH_THRESHOLD) continue;
                const influenceBoost = computeTriggerInfluenceBoost(
                    influence,
                    myAnchor,
                    state.cities,
                    other.id
                ).boost;
                candidates.push({
                    targetId: other.id,
                    score: clamp01(GLOBAL_TRIGGER_BASE_SCORES.techStalemate + influenceBoost),
                    reason: "tech-stalemate",
                    focusCityId: selectFocusCityAgainstTarget(state, playerId, other.id, influence)?.id,
                    stageIfNotReady: true,
                });
                break;
            }
        }
    }

    return candidates;
}

export function resolveGlobalWarTriggerIntent(input: {
    state: GameState;
    actions: Action[];
    playerId: string;
    warsNow: number;
    warsPlanned: number;
    warTriggerCandidates: WarTriggerCandidate[];
    influence?: InfluenceMaps;
}): { state: GameState; warsPlanned: number; globalWarIntent: boolean } {
    let next = input.state;
    let warsPlanned = input.warsPlanned;
    let globalWarIntent = false;

    if (input.warTriggerCandidates.length > 0) {
        const bestTrigger = pickBest(input.warTriggerCandidates, c => c.score)?.item;
        if (bestTrigger) {
            const unitsReady = bestTrigger.stageIfNotReady
                ? hasUnitsStaged(next, input.playerId, bestTrigger.targetId, input.influence)
                : true;
            if (unitsReady && canDeclareWar(next, input.playerId, bestTrigger.targetId)) {
                const declared = applyWarDeclaration({
                    state: next,
                    actions: input.actions,
                    playerId: input.playerId,
                    targetId: bestTrigger.targetId,
                    warsPlanned,
                    options: {
                        setFocus: true,
                        focusCityId: bestTrigger.focusCityId,
                    },
                    debugEnabled: true,
                    debugText: `[AI Diplo] ${input.playerId} declaring war on ${bestTrigger.targetId} (${bestTrigger.reason})`,
                });
                next = declared.state;
                warsPlanned = Math.max(declared.warsPlanned, input.warsNow + 1);
                globalWarIntent = true;
            } else if (bestTrigger.stageIfNotReady) {
                aiInfo(`[AI Diplo] ${input.playerId} staging for ${bestTrigger.targetId} (${bestTrigger.reason})`);
                next = recordFocusTarget(next, input.playerId, bestTrigger.targetId, bestTrigger.focusCityId);
                globalWarIntent = true;
            }
        }
    }

    return { state: next, warsPlanned, globalWarIntent };
}
