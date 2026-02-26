import { type Action, type AiVictoryGoal, type GameState, ProjectId } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { canDeclareWar } from "../../helpers/diplomacy.js";
import type { InfluenceMaps } from "../influence-map.js";
import type { AiPlayerMemoryV2 } from "../memory.js";
import type { getAiProfileV2 } from "../rules.js";
import {
    passesWarTimingGate,
    recordFocusTarget,
} from "../diplomacy-helpers.js";
import { selectFocusCityAgainstTarget } from "../strategy.js";
import { FOCUS_CITY_STAGING_DISTANCE, LATE_GAME_WAR_DISTANCE_OVERRIDE, LATE_GAME_WAR_DISTANCE_TURN, WAR_INITIATION_LOOKBACK_TURNS } from "./constants.js";
import type { DiplomacyOpponentContext } from "./opponent-context.js";
import { hasDominatingPower } from "./utils.js";
import { applyScoredWarDeclaration, applyWarDeclaration } from "./war-declaration.js";
import { buildWarPreflightContext } from "./war-context.js";
import { computeFocusCityStagingCounts, evaluateWarRatioStaging, needsMoreWarStaging } from "./war-staging.js";

export function resolvePeaceStanceWar(input: {
    state: GameState;
    actions: Action[];
    playerId: string;
    other: GameState["players"][number];
    goal: AiVictoryGoal;
    profile: ReturnType<typeof getAiProfileV2>;
    memory: AiPlayerMemoryV2;
    myAnchor?: GameState["cities"][number];
    influence?: InfluenceMaps;
    myMilitaryCount: number;
    warsNow: number;
    warsPlanned: number;
    globalWarIntent: boolean;
    earlyRushActive: boolean;
    opponent: DiplomacyOpponentContext;
    debugEnabled: boolean;
}): { state: GameState; warsPlanned: number } {
    let next = input.state;
    let warsPlanned = input.warsPlanned;
    const targetId = input.other.id;

    if (input.globalWarIntent) {
        return { state: next, warsPlanned };
    }

    const warDistanceMax = next.turn >= LATE_GAME_WAR_DISTANCE_TURN
        ? Math.max(input.profile.diplomacy.warDistanceMax, LATE_GAME_WAR_DISTANCE_OVERRIDE)
        : input.profile.diplomacy.warDistanceMax;
    if (!input.profile.diplomacy.canInitiateWars) {
        return { state: next, warsPlanned };
    }
    if (input.opponent.dist > warDistanceMax + input.opponent.frontDistanceBonus) {
        return { state: next, warsPlanned };
    }

    const warPreflight = buildWarPreflightContext({
        state: next,
        playerId: input.playerId,
        targetId,
        goal: input.goal,
        civName: input.profile.civName,
        canInitiateWars: input.profile.diplomacy.canInitiateWars,
        warPowerRatio: input.profile.diplomacy.warPowerRatio,
        minStanceTurns: input.profile.diplomacy.minStanceTurns,
        warDistanceMax,
        ratio: input.opponent.ratio,
        dist: input.opponent.dist,
        frontDistanceBonus: input.opponent.frontDistanceBonus,
        memory: input.memory,
    });

    if (warPreflight.isAetherianPreTitan) {
        if (!warPreflight.needsCities || !warPreflight.targetHasWeakCity) {
            return { state: next, warsPlanned };
        }
        const myCityCount = next.cities.filter(c => c.ownerId === input.playerId).length;
        aiInfo(`[AI Diplo] Aetherian ${input.playerId} needs cities (${myCityCount}/4), attacking for expansion`);
    }
    if (warPreflight.overwhelmingPeace) {
        return { state: next, warsPlanned };
    }

    const isDominating = hasDominatingPower(next, input.playerId, targetId);
    if (isDominating && canDeclareWar(next, input.playerId, targetId)) {
        const declared = applyWarDeclaration({
            state: next,
            actions: input.actions,
            playerId: input.playerId,
            targetId,
            warsPlanned,
        });
        return {
            state: declared.state,
            warsPlanned: declared.warsPlanned,
        };
    }

    const recentInitiations = (input.memory.warInitiationTurns ?? [])
        .filter(t => (next.turn - t) <= WAR_INITIATION_LOOKBACK_TURNS);
    const progressThreat = warPreflight.progressThreat;
    const conquestThreat = warPreflight.conquestThreat;
    const hasTitanNow = warPreflight.hasTitanNow;
    const isAetherian = warPreflight.isAetherian;
    const escalatedRatio = warPreflight.escalatedRatio;

    if (progressThreat) {
        aiInfo(
            `[AI Diplo] ${input.playerId} sees Progress Threat in ${targetId} ` +
            `(Obs: ${next.players.find(p => p.id === targetId)?.completedProjects?.includes(ProjectId.Observatory)})`
        );
    }

    if (input.warsNow >= 1 && !progressThreat && !conquestThreat) {
        return { state: next, warsPlanned };
    }
    if (warPreflight.effectiveDist > warPreflight.allowDistance) {
        return { state: next, warsPlanned };
    }

    const ratioStaging = evaluateWarRatioStaging({
        effectiveOffensiveRatio: input.opponent.effectiveOffensiveRatio,
        effectiveRatio: input.opponent.effectiveRatio,
        escalatedRatio,
        myMilitaryCount: input.myMilitaryCount,
        myCityCount: next.cities.filter(c => c.ownerId === input.playerId).length,
        frontRatio: input.opponent.frontRatio,
        pressureRatio: input.opponent.pressureRatio,
        warsPlanned,
        maxConcurrentWars: input.profile.diplomacy.maxConcurrentWars,
    });

    if (ratioStaging.kind === "continue") {
        if (ratioStaging.shouldStageFocus) {
            const focusCity = selectFocusCityAgainstTarget(next, input.playerId, targetId, input.influence);
            if (focusCity) {
                next = recordFocusTarget(next, input.playerId, targetId, focusCity.id);
                if (input.debugEnabled && ratioStaging.reason === "needs-offensive-power") {
                    aiInfo(`[AI Diplo] ${input.playerId} staging vs ${targetId} (needs offensive power)`);
                }
                if (input.debugEnabled && ratioStaging.reason === "influence") {
                    aiInfo(
                        `[AI Diplo] ${input.playerId} staging vs ${targetId} ` +
                        `(front:${input.opponent.frontRatio.toFixed(2)} pressure:${input.opponent.pressureRatio.toFixed(2)})`
                    );
                }
            }
        }
        return { state: next, warsPlanned };
    }

    const focusCity = selectFocusCityAgainstTarget(next, input.playerId, targetId, input.influence);

    if (focusCity) {
        if (isAetherian && hasTitanNow && canDeclareWar(next, input.playerId, targetId)) {
            const declared = applyWarDeclaration({
                state: next,
                actions: input.actions,
                playerId: input.playerId,
                targetId,
                warsPlanned,
                options: {
                    setFocus: true,
                    focusCityId: focusCity.id,
                    warInitiationTurns: recentInitiations,
                },
            });
            return {
                state: declared.state,
                warsPlanned: declared.warsPlanned,
            };
        }

        if (progressThreat) {
            next = recordFocusTarget(next, input.playerId, targetId, focusCity.id);
        } else {
            const requiredNear = Math.max(4, Math.ceil(input.profile.tactics.forceConcentration * 5));
            const { nearCount, capturersNear } = computeFocusCityStagingCounts(
                next,
                input.playerId,
                focusCity.coord,
                FOCUS_CITY_STAGING_DISTANCE,
            );
            const needsStaging = needsMoreWarStaging({
                progressThreat,
                hasTitanNow,
                nearCount,
                capturersNear,
                requiredNear,
            });
            if (needsStaging) {
                next = recordFocusTarget(next, input.playerId, targetId, focusCity.id);
                if (input.debugEnabled) {
                    aiInfo(`[AI Diplo] ${input.playerId} staging vs ${targetId} (forces not ready)`);
                }
                return { state: next, warsPlanned };
            }
        }
    }

    const passesTimingGate = passesWarTimingGate({
        progressThreat,
        conquestThreat,
        earlyRushActive: input.earlyRushActive,
        turn: next.turn,
        minWarTurn: input.profile.diplomacy.minWarTurn,
        warsPlanned,
        maxConcurrentWars: input.profile.diplomacy.maxConcurrentWars,
        recentInitiations: recentInitiations.length,
        maxInitiatedWarsPer50Turns: input.profile.diplomacy.maxInitiatedWarsPer50Turns,
    });
    if (!passesTimingGate) {
        return { state: next, warsPlanned };
    }

    if (!canDeclareWar(next, input.playerId, targetId)) {
        return { state: next, warsPlanned };
    }

    const myCityCount = next.cities.filter(c => c.ownerId === input.playerId).length;
    const myUnits = next.units.filter(u => u.ownerId === input.playerId && u.type !== "Settler" && u.type !== "Scout").length;

    const declared = applyScoredWarDeclaration({
        state: next,
        actions: input.actions,
        playerId: input.playerId,
        targetId,
        warsPlanned,
        scoring: {
            effectiveOffensiveRatio: input.opponent.effectiveOffensiveRatio,
            escalatedRatio,
            progressThreat,
            conquestThreat,
            earlyRushActive: input.earlyRushActive,
            isDominating,
            frontRatio: input.opponent.frontRatio,
            pressureRatio: input.opponent.pressureRatio,
        },
        options: {
            setFocus: true,
            focusCityId: focusCity?.id,
            warInitiationTurns: recentInitiations,
            warCityCount: myCityCount,
            warUnitsCount: myUnits,
            recordCaptureTurn: true,
        },
        debugEnabled: input.debugEnabled,
    });
    if (declared.declared) {
        next = declared.state;
        warsPlanned = declared.warsPlanned;
    }

    return { state: next, warsPlanned };
}
