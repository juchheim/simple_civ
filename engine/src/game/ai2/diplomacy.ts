import { Action, AiVictoryGoal, DiplomacyState, GameState } from "../../core/types.js";
import { isAiDebugEnabled } from "../ai/debug-logging.js";
import { estimateMilitaryPower, estimateOffensivePower } from "../ai/goals.js";
import { getAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import {
    currentWarCount,
} from "./diplomacy/utils.js";
import { getInfluenceMapsCached } from "./influence-map.js";
import {
    computeEarlyRushActive,
    WarTriggerCandidate
} from "./diplomacy-trigger-helpers.js";
import {
    buildGlobalWarTriggerCandidates,
    resolveGlobalWarTriggerIntent
} from "./diplomacy/war-triggers.js";
import { buildDiplomacyOpponentContext } from "./diplomacy/opponent-context.js";
import { resolveWarStancePeace } from "./diplomacy/peace-resolution.js";
import { resolvePeaceStanceWar } from "./diplomacy/war-resolution.js";

export { detectCounterAttackOpportunity, detectEarlyRushOpportunity } from "./diplomacy/opportunities.js";



export function decideDiplomacyActionsV2(state: GameState, playerId: string, goal: AiVictoryGoal): { state: GameState; actions: Action[] } {
    let next = state;
    const actions: Action[] = [];
    const profile = getAiProfileV2(next, playerId);
    const memory = getAiMemoryV2(next, playerId);
    const debugEnabled = isAiDebugEnabled();

    // Early rush chance: RNG-based early aggression for civs with earlyRushChance
    // If triggered before turn 25, lower minWarTurn and war thresholds
    const earlyRushActive = computeEarlyRushActive(
        profile.diplomacy.earlyRushChance,
        next.turn,
        playerId,
        next.seed,
    );

    // Use offensive power for our own calculation - excludes home defenders and garrisons
    // Use full military power for enemy calculation - their defenders WILL fight back
    const myOffensivePower = estimateOffensivePower(playerId, next);
    const myPower = estimateMilitaryPower(playerId, next);
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const myAnchor = myCities.find(c => c.isCapital) ?? myCities[0];
    const influence = next.map?.tiles?.length
        ? (getInfluenceMapsCached(next, playerId, { budget: 500 }).maps ?? undefined)
        : undefined;
    const myMilitaryCount = next.units.filter(u =>
        u.ownerId === playerId && u.type !== "Settler" && u.type !== "Scout" && u.type !== "Skiff" && u.type !== "ArmyScout"
    ).length;
    const warsNow = currentWarCount(next, playerId);
    let warsPlanned = warsNow;

    // =========================================================================
    // GLOBAL WAR TRIGGERS (Utility-Scored)
    // =========================================================================
    const warTriggerCandidates: WarTriggerCandidate[] = buildGlobalWarTriggerCandidates({
        state: next,
        playerId,
        warsNow,
        warsPlanned,
        myPower,
        myCities,
        myAnchor,
        influence,
    });

    const triggerIntent = resolveGlobalWarTriggerIntent({
        state: next,
        actions,
        playerId,
        warsNow,
        warsPlanned,
        warTriggerCandidates,
        influence,
    });
    next = triggerIntent.state;
    warsPlanned = triggerIntent.warsPlanned;
    const globalWarIntent = triggerIntent.globalWarIntent;

    for (const other of next.players) {
        if (other.id === playerId || other.isEliminated) continue;

        const opponentContext = buildDiplomacyOpponentContext({
            state: next,
            playerId,
            other,
            myPower,
            myOffensivePower,
            myAnchor,
            influence,
            humanBias: profile.diplomacy.humanBias ?? 1.0,
        });
        const {
            stance,
            ratio,
            theirAnchor,
        } = opponentContext;

        if (stance === DiplomacyState.War) {
            next = resolveWarStancePeace({
                state: next,
                playersForThreatCheck: state.players,
                actions,
                playerId,
                targetId: other.id,
                ratio,
                myAnchorCoord: myAnchor?.coord,
                targetAnchorCoord: theirAnchor?.coord,
                memory,
                influence,
                minStanceTurns: profile.diplomacy.minStanceTurns,
                canInitiateWars: profile.diplomacy.canInitiateWars,
                warPowerRatio: profile.diplomacy.warPowerRatio,
                peacePowerThreshold: profile.diplomacy.peacePowerThreshold,
                debugEnabled,
            });
            continue;
        }

        const warResolution = resolvePeaceStanceWar({
            state: next,
            actions,
            playerId,
            other,
            goal,
            profile,
            memory,
            myAnchor,
            influence,
            myMilitaryCount,
            warsNow,
            warsPlanned,
            globalWarIntent,
            earlyRushActive,
            opponent: opponentContext,
            debugEnabled,
        });
        next = warResolution.state;
        warsPlanned = warResolution.warsPlanned;
    }

    return { state: next, actions };
}
