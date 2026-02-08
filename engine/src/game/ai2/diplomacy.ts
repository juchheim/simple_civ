import { Action, AiVictoryGoal, DiplomacyState, GameState, ProjectId } from "../../core/types.js";
import { aiInfo, isAiDebugEnabled } from "../ai/debug-logging.js";
import { hexDistance } from "../../core/hex.js";
import { estimateMilitaryPower, estimateOffensivePower } from "../ai/goals.js";
import { getAiMemoryV2, setAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { getSiegeFailureCount } from "./siege-wave.js";
import { selectFocusCityAgainstTarget } from "./strategy.js";
import { canDeclareWar, findBorderViolators } from "../helpers/diplomacy.js";
import { checkTacticalOpportunity, hasUnitsStaged } from "./diplomacy/opportunities.js";
import {
    countNearbyByPredicate,
    currentWarCount,
    getWarEscalationFactor,
    hasCapturableCity,
    hasDominatingPower,
    hasUnitType,
    isProgressThreat,
    isProgressCiv,
    isConquestThreat,
    stanceDurationOk
} from "./diplomacy/utils.js";
import { clamp01, pickBest } from "./util.js";
import { getInfluenceMapsCached, type InfluenceMaps } from "./influence-map.js";

export { detectCounterAttackOpportunity, detectEarlyRushOpportunity } from "./diplomacy/opportunities.js";

type WarInitiationOptions = {
    focusCityId?: string;
    setFocus?: boolean;
    warInitiationTurns?: number[];
    warCityCount?: number;
    warUnitsCount?: number;
    recordCaptureTurn?: boolean;
};

function getInfluenceRatio(
    layer: InfluenceMaps["threat"] | undefined,
    coord?: { q: number; r: number }
): number {
    if (!layer || !coord || layer.max <= 0) return 0;
    return clamp01(layer.get(coord) / layer.max);
}

function recordFocusTarget(
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

function recordWarInitiation(
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

function recordLastStanceTurn(next: GameState, playerId: string, targetId: string): GameState {
    const memory = getAiMemoryV2(next, playerId);
    return setAiMemoryV2(next, playerId, {
        ...memory,
        lastStanceTurn: { ...(memory.lastStanceTurn ?? {}), [targetId]: next.turn },
    });
}

type DiplomacyCandidateType = "DeclareWar" | "StageWar" | "ProposePeace" | "AcceptPeace";

type DiplomacyCandidate = {
    type: DiplomacyCandidateType;
    targetId: string;
    score: number;
    reason: string;
    focusCityId?: string;
    breakdown?: Record<string, number>;
};

function formatDiplomacyBreakdown(candidate: DiplomacyCandidate): string {
    if (!candidate.breakdown) return candidate.reason;
    const parts = Object.entries(candidate.breakdown)
        .filter(([, value]) => Math.abs(value) >= 0.01)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([key, value]) => `${key}:${value.toFixed(2)}`);
    return `${candidate.reason} | ${parts.join(", ")}`;
}

function pickTopCandidate(candidates: DiplomacyCandidate[]): DiplomacyCandidate | null {
    const best = pickBest(candidates, c => c.score);
    return best ? best.item : null;
}



export function decideDiplomacyActionsV2(state: GameState, playerId: string, goal: AiVictoryGoal): { state: GameState; actions: Action[] } {
    let next = state;
    const actions: Action[] = [];
    const profile = getAiProfileV2(next, playerId);
    const memory = getAiMemoryV2(next, playerId);
    const debugEnabled = isAiDebugEnabled();

    // Early rush chance: RNG-based early aggression for civs with earlyRushChance
    // If triggered before turn 25, lower minWarTurn and war thresholds
    let earlyRushActive = false;
    if (profile.diplomacy.earlyRushChance && next.turn <= 25) {
        // Use player ID hash + seed for deterministic but varying behavior per game
        const rushSeed = (playerId.charCodeAt(0) + (next.seed ?? 0)) % 100;
        earlyRushActive = rushSeed < profile.diplomacy.earlyRushChance * 100;
    }

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
    type WarTriggerCandidate = {
        targetId: string;
        score: number;
        reason: string;
        focusCityId?: string;
        stageIfNotReady: boolean;
    };

    const warTriggerCandidates: WarTriggerCandidate[] = [];
    const getTriggerInfluenceBoost = (targetId: string | undefined): { boost: number; front: number; pressure: number } => {
        if (!targetId) return { boost: 0, front: 0, pressure: 0 };
        if (!influence) return { boost: 0, front: 0, pressure: 0 };
        const theirCities = next.cities.filter(c => c.ownerId === targetId);
        const theirAnchor = theirCities.find(c => c.isCapital) ?? theirCities[0];
        const front = Math.max(
            getInfluenceRatio(influence.front, myAnchor?.coord),
            getInfluenceRatio(influence.front, theirAnchor?.coord)
        );
        const pressure = Math.max(
            getInfluenceRatio(influence.pressure, myAnchor?.coord),
            getInfluenceRatio(influence.pressure, theirAnchor?.coord)
        );
        const boost = front * 0.08 + pressure * 0.06;
        return { boost, front, pressure };
    };

    // Border violation response (immediate declaration, no staging gate)
    const borderViolators = findBorderViolators(next, playerId)
        .filter(entry => canDeclareWar(next, playerId, entry.enemyId));
    if (borderViolators.length > 0 && myCities.length > 0) {
        for (const entry of borderViolators) {
            const enemyUnits = next.units.filter(u => u.ownerId === entry.enemyId);
            const minDist = enemyUnits.length
                ? Math.min(...enemyUnits.map(u => Math.min(...myCities.map(c => hexDistance(u.coord, c.coord)))))
                : 999;
            // Border violations are immediate casus belli; keep score higher than other triggers.
            const influenceBoost = getTriggerInfluenceBoost(entry.enemyId).boost;
            const score = clamp01(0.95 + (entry.count * 0.02) - (minDist * 0.01) + influenceBoost);
            warTriggerCandidates.push({
                targetId: entry.enemyId,
                score,
                reason: "border-violation",
                focusCityId: selectFocusCityAgainstTarget(next, playerId, entry.enemyId, influence)?.id,
                stageIfNotReady: false,
            });
        }
    }

    if (warsNow === 0 && warsPlanned === 0) {
        // Tactical opportunity (early rush, counter-attack, punitive strike)
        const opportunity = checkTacticalOpportunity(next, playerId);
        if (opportunity) {
            const influenceBoost = getTriggerInfluenceBoost(opportunity.targetId).boost;
            warTriggerCandidates.push({
                targetId: opportunity.targetId,
                score: clamp01(0.75 + influenceBoost),
                reason: `tactical:${opportunity.reason}`,
                focusCityId: opportunity.focusCity?.id,
                stageIfNotReady: true,
            });
        }

        // Forced peace-breaking at turn 180+ (with per-civ offset)
        const forcedWarTurnOffset = (playerId.charCodeAt(0) + (next.seed ?? 0)) % 25;
        const forcedWarTriggerTurn = 180 + forcedWarTurnOffset;
        if (next.turn >= forcedWarTriggerTurn) {
            let weakestId: string | null = null;
            let weakestPower = Infinity;

            for (const other of next.players) {
                if (other.id === playerId || other.isEliminated) continue;
                const theirCities = next.cities.filter(c => c.ownerId === other.id);
                if (theirCities.length === 0) continue;

                const theirPower = estimateMilitaryPower(other.id, next);
                const effectivePowerForComparison = other.isAI ? theirPower : theirPower * 0.7;
                if (effectivePowerForComparison < weakestPower) {
                    weakestPower = effectivePowerForComparison;
                    weakestId = other.id;
                }
            }

            if (weakestId) {
                const ratio = weakestPower > 0 ? myPower / weakestPower : 2;
                if (ratio >= 0.7) {
                    const influenceBoost = getTriggerInfluenceBoost(weakestId).boost;
                    warTriggerCandidates.push({
                        targetId: weakestId,
                        score: clamp01(0.55 + (ratio - 0.7) * 0.4 + influenceBoost),
                        reason: "forced-war",
                        focusCityId: selectFocusCityAgainstTarget(next, playerId, weakestId, influence)?.id,
                        stageIfNotReady: true,
                    });
                }
            }
        }

        // Tech-complete war forcing (20-tech stalemates)
        const player = next.players.find(p => p.id === playerId);
        const techTreeComplete = (player?.techs?.length ?? 0) >= 20;
        if (techTreeComplete) {
            for (const other of next.players) {
                if (other.id === playerId || other.isEliminated) continue;
                if ((other.techs?.length ?? 0) < 20) continue;
                const influenceBoost = getTriggerInfluenceBoost(other.id).boost;
                warTriggerCandidates.push({
                    targetId: other.id,
                    score: clamp01(0.65 + influenceBoost),
                    reason: "tech-stalemate",
                    focusCityId: selectFocusCityAgainstTarget(next, playerId, other.id, influence)?.id,
                    stageIfNotReady: true,
                });
                break;
            }
        }
    }

    let globalWarIntent = false;
    if (warTriggerCandidates.length > 0) {
        const bestTrigger = pickBest(warTriggerCandidates, c => c.score)?.item;
        if (bestTrigger) {
            const unitsReady = bestTrigger.stageIfNotReady
                ? hasUnitsStaged(next, playerId, bestTrigger.targetId, influence)
                : true;
            if (unitsReady && canDeclareWar(next, playerId, bestTrigger.targetId)) {
                aiInfo(`[AI Diplo] ${playerId} declaring war on ${bestTrigger.targetId} (${bestTrigger.reason})`);
                next = recordWarInitiation(next, playerId, bestTrigger.targetId, {
                    setFocus: true,
                    focusCityId: bestTrigger.focusCityId,
                });
                actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: bestTrigger.targetId, state: DiplomacyState.War });
                warsPlanned = Math.max(warsPlanned, warsNow + 1);
                globalWarIntent = true;
            } else if (bestTrigger.stageIfNotReady) {
                aiInfo(`[AI Diplo] ${playerId} staging for ${bestTrigger.targetId} (${bestTrigger.reason})`);
                next = recordFocusTarget(next, playerId, bestTrigger.targetId, bestTrigger.focusCityId);
                globalWarIntent = true;
            }
        }
    }

    for (const other of next.players) {
        if (other.id === playerId || other.isEliminated) continue;

        const stance = next.diplomacy?.[playerId]?.[other.id] ?? DiplomacyState.Peace;
        const theirPower = estimateMilitaryPower(other.id, next);
        const ratio = theirPower > 0 ? myPower / theirPower : Infinity;
        const offensiveRatio = theirPower > 0 ? myOffensivePower / theirPower : Infinity;

        const theirCities = next.cities.filter(c => c.ownerId === other.id);
        const theirAnchor = theirCities.find(c => c.isCapital) ?? theirCities[0];
        const dist = (myAnchor && theirAnchor) ? hexDistance(myAnchor.coord, theirAnchor.coord) : 999;
        const frontRatio = Math.max(
            getInfluenceRatio(influence?.front, myAnchor?.coord),
            getInfluenceRatio(influence?.front, theirAnchor?.coord)
        );
        const pressureRatio = Math.max(
            getInfluenceRatio(influence?.pressure, myAnchor?.coord),
            getInfluenceRatio(influence?.pressure, theirAnchor?.coord)
        );
        const frontDistanceBonus = Math.round(frontRatio * 4);

        const isHuman = !other.isAI;
        const bias = isHuman ? (profile.diplomacy.humanBias ?? 1.0) : 1.0;

        const effectiveRatio = ratio * bias;
        const effectiveOffensiveRatio = offensiveRatio * bias;

        const warDistanceMax = next.turn >= 160 ? Math.max(profile.diplomacy.warDistanceMax, 999) : profile.diplomacy.warDistanceMax;

        if (stance === DiplomacyState.War) {
            // =========================
            // WAR -> PEACE (Utility)
            // =========================
            const progressThreatNow =
                isProgressThreat(next, other.id) &&
                profile.diplomacy.canInitiateWars &&
                profile.diplomacy.warPowerRatio <= 1.35;

            const warAge = next.turn - (memory.lastStanceTurn?.[other.id] ?? next.turn);
            const myCurrentCityCount = next.cities.filter(c => c.ownerId === playerId).length;
            const myStartingCityCount = memory.warCityCount?.[other.id] ?? myCurrentCityCount;
            const lostCities = myStartingCityCount - myCurrentCityCount;
            const turnsSinceCapture = next.turn - (memory.lastCityCaptureTurn?.[other.id] ?? memory.lastStanceTurn?.[other.id] ?? next.turn);
            const incomingPeace = next.diplomacyOffers?.some(o => o.type === "Peace" && o.from === other.id && o.to === playerId);
            const pressureWarRatio = Math.max(
                getInfluenceRatio(influence?.pressure, myAnchor?.coord),
                getInfluenceRatio(influence?.pressure, theirAnchor?.coord)
            );
            const frontWarRatio = Math.max(
                getInfluenceRatio(influence?.front, myAnchor?.coord),
                getInfluenceRatio(influence?.front, theirAnchor?.coord)
            );
            const warMomentum = clamp01(pressureWarRatio * 0.6 + frontWarRatio * 0.4);
            const focusCity = memory.focusCityId ? next.cities.find(c => c.id === memory.focusCityId) : undefined;
            const siegeFailureCount = (focusCity && focusCity.ownerId === other.id)
                ? getSiegeFailureCount(memory, focusCity.id)
                : 0;

            if (hasCapturableCity(next, other.id)) {
                continue;
            }

            const enemyCitiesNow = next.cities.filter(c => c.ownerId === other.id).length;
            const shouldFinishEnemy = enemyCitiesNow <= 1 && ratio >= 1.2;
            if (shouldFinishEnemy) continue;

            if (!stanceDurationOk(next, playerId, other.id, profile.diplomacy.minStanceTurns, memory)) {
                continue;
            }

            const peaceCandidates: DiplomacyCandidate[] = [];
            const breakdownBase = { ratio, warAge, turnsSinceCapture };

            const militaryCollapse = ratio < 0.7 && lostCities > 0 && warAge >= 5;
            if (militaryCollapse && !progressThreatNow && warMomentum < 0.45) {
                peaceCandidates.push({
                    type: "ProposePeace",
                    targetId: other.id,
                    score: clamp01(0.9 - warMomentum * 0.3),
                    reason: "military-collapse",
                    breakdown: breakdownBase,
                });
            }

            const territorialStalemate =
                warAge >= 40 &&
                turnsSinceCapture >= 40 &&
                ratio >= 0.85 && ratio <= 1.15;
            if (territorialStalemate && !progressThreatNow) {
                peaceCandidates.push({
                    type: "ProposePeace",
                    targetId: other.id,
                    score: clamp01(0.7 - warMomentum * 0.2),
                    reason: "territorial-stalemate",
                    breakdown: breakdownBase,
                });
            }

            const siegeStalemate =
                siegeFailureCount >= 2 &&
                warAge >= 30 &&
                turnsSinceCapture >= 35 &&
                ratio <= 1.1;
            if (siegeStalemate && !progressThreatNow && warMomentum < 0.5) {
                peaceCandidates.push({
                    type: "ProposePeace",
                    targetId: other.id,
                    score: clamp01(0.65 - warMomentum * 0.2),
                    reason: "siege-stalemate",
                    breakdown: { ...breakdownBase, siegeFailures: siegeFailureCount },
                });
            }

            const thirdPartyThreat = state.players.some(p =>
                p.id !== playerId &&
                p.id !== other.id &&
                !p.isEliminated &&
                isProgressThreat(next, p.id)
            );
            if (thirdPartyThreat && warAge >= 20) {
                peaceCandidates.push({
                    type: "ProposePeace",
                    targetId: other.id,
                    score: clamp01(0.6 - warMomentum * 0.2),
                    reason: "third-party-progress-threat",
                    breakdown: breakdownBase,
                });
            }

            const warExhaustion =
                warAge >= 75 &&
                ratio >= 0.8 && ratio <= 1.2 &&
                !progressThreatNow;
            if (warExhaustion) {
                peaceCandidates.push({
                    type: "ProposePeace",
                    targetId: other.id,
                    score: clamp01(0.6 - warMomentum * 0.2),
                    reason: "war-exhaustion",
                    breakdown: breakdownBase,
                });
            }

            if (incomingPeace) {
                const stalledWinner =
                    ratio >= 1.05 && ratio <= 1.25 &&
                    warAge >= 50 &&
                    turnsSinceCapture >= 40;
                if (stalledWinner && !progressThreatNow) {
                    peaceCandidates.push({
                        type: "AcceptPeace",
                        targetId: other.id,
                        score: clamp01(0.8 - warMomentum * 0.25),
                        reason: "stalled-winner",
                        breakdown: breakdownBase,
                    });
                }
            }

            const aggressive = profile.diplomacy.canInitiateWars && profile.diplomacy.warPowerRatio <= 1.35;
            const stalemate = (ratio < 1.15) && (next.turn - (memory.lastStanceTurn?.[other.id] ?? next.turn)) >= Math.ceil(profile.diplomacy.minStanceTurns * (aggressive ? 3.5 : 2.5));
            const warDuration = next.turn - (memory.lastStanceTurn?.[other.id] ?? next.turn);
            const mutualExhaustion = warDuration >= 100 && ratio >= 0.85 && ratio <= 1.15;

            if (mutualExhaustion && !progressThreatNow) {
                peaceCandidates.push({
                    type: incomingPeace ? "AcceptPeace" : "ProposePeace",
                    targetId: other.id,
                    score: clamp01(0.8 - warMomentum * 0.25),
                    reason: "mutual-exhaustion",
                    breakdown: breakdownBase,
                });
            }

            const wantsPeace = ratio < profile.diplomacy.peacePowerThreshold;
            const winning = ratio >= 1.05;
            if (!progressThreatNow && !winning && (wantsPeace || stalemate)) {
                peaceCandidates.push({
                    type: incomingPeace ? "AcceptPeace" : "ProposePeace",
                    targetId: other.id,
                    score: clamp01(0.55 - warMomentum * 0.2),
                    reason: "low-advantage",
                    breakdown: breakdownBase,
                });
            }

            const peaceDecision = pickTopCandidate(peaceCandidates);
            if (peaceDecision) {
                actions.push({ type: peaceDecision.type, playerId, targetPlayerId: other.id } as Action);
                next = recordLastStanceTurn(next, playerId, other.id);
                if (debugEnabled) {
                    aiInfo(`[AI Diplo] ${playerId} ${peaceDecision.type} vs ${other.id} score=${peaceDecision.score.toFixed(2)} | ${formatDiplomacyBreakdown(peaceDecision)}`);
                }
            }
            continue;
        }

        // Peace -> consider war (skip if a global war trigger already staged/declared).
        if (globalWarIntent) continue;
        if (!profile.diplomacy.canInitiateWars) continue;
        if (dist > warDistanceMax + frontDistanceBonus) continue;

        // v9.10: Aetherian peace-until-Titan policy
        // Don't initiate wars until Titan is ready OR need cities for expansion
        // But still respond to progress/conquest threats
        const isAetherianPreTitan = profile.civName === "AetherianVanguard" && !hasUnitType(next, playerId, "Titan");
        if (isAetherianPreTitan) {
            const myCityCount = next.cities.filter(c => c.ownerId === playerId).length;
            const needsCities = myCityCount < 4; // Minimum 4 cities for Titan economy
            const targetHasWeakCity = next.cities.some(c =>
                c.ownerId === other.id && c.hp <= 0 // Capturable city available
            );

            if (!needsCities || !targetHasWeakCity) {
                continue;
            }
            aiInfo(`[AI Diplo] Aetherian ${playerId} needs cities (${myCityCount}/4), attacking for expansion`);
        }
        // If we're overwhelmingly ahead, allow re-declaring war faster (prevents long "peace cooldown" stalls).
        const overwhelmingPeace = ratio >= 3 && !stanceDurationOk(next, playerId, other.id, Math.ceil(profile.diplomacy.minStanceTurns * 0.4), memory);
        if (overwhelmingPeace) continue;

        // WAR ESCALATION: Apply escalation factor to make late-game wars more aggressive
        const escalationFactor = getWarEscalationFactor(next.turn);

        // DOMINATING POWER: If we have 5x power, declare war immediately (bypass all gates)
        // Still must respect peace cooldown
        const isDominating = hasDominatingPower(next, playerId, other.id);
        if (isDominating && canDeclareWar(next, playerId, other.id)) {
            next = recordWarInitiation(next, playerId, other.id);
            actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
            warsPlanned += 1;
            continue;
        }

        // Rate-limit war initiations.
        const recentInitiations = (memory.warInitiationTurns ?? []).filter(t => (next.turn - t) <= 50);

        const progressThreat =
            isProgressThreat(next, other.id) &&
            profile.diplomacy.canInitiateWars &&
            (goal === "Conquest" || profile.diplomacy.warPowerRatio <= 1.35);

        const conquestThreat =
            isConquestThreat(next, other.id) &&
            profile.diplomacy.canInitiateWars;

        if (progressThreat) {
            aiInfo(`[AI Diplo] ${playerId} sees Progress Threat in ${other.id} (Obs: ${next.players.find(p => p.id === other.id)?.completedProjects?.includes(ProjectId.Observatory)})`);
        }

        if (warsNow >= 1 && !progressThreat && !conquestThreat) continue;
        const hasTitanNow = hasUnitType(next, playerId, "Titan");
        const isAetherian = profile.civName === "AetherianVanguard";

        const requiredRatio = (hasTitanNow && isAetherian)
            ? Math.min(profile.diplomacy.warPowerRatio, 0.9)
            : (progressThreat
                ? Math.min(profile.diplomacy.warPowerRatio * 0.7, 1.0)
                : (conquestThreat
                    ? 0.4
                    : profile.diplomacy.warPowerRatio));

        const escalatedRatio = requiredRatio * escalationFactor;

        // Progress civ target distance bias
        const myPlayer = next.players.find(p => p.id === playerId);
        const iAmProgressCiv = myPlayer?.civName === "ScholarKingdoms" || myPlayer?.civName === "StarborneSeekers";
        const targetIsProgressCiv = isProgressCiv(next, other.id);
        const progressCivDistanceBonus = (!iAmProgressCiv && targetIsProgressCiv) ? 6 : 0;
        const effectiveDist = Math.max(1, dist - progressCivDistanceBonus - frontDistanceBonus);

        const allowDistance = (progressThreat || conquestThreat) ? Math.max(warDistanceMax, 999) : warDistanceMax;
        if (effectiveDist > allowDistance) continue;

        if (effectiveOffensiveRatio >= escalatedRatio) {
            if (myMilitaryCount < Math.max(4, Math.ceil(next.cities.filter(c => c.ownerId === playerId).length * 1.0))) continue;
        } else if (effectiveRatio >= escalatedRatio) {
            const focusCity = selectFocusCityAgainstTarget(next, playerId, other.id, influence);
            if (focusCity) {
                next = recordFocusTarget(next, playerId, other.id, focusCity.id);
                if (debugEnabled) {
                    aiInfo(`[AI Diplo] ${playerId} staging vs ${other.id} (needs offensive power)`);
                }
            }
            continue;
        } else {
            const stageByInfluence = (frontRatio > 0.35 || pressureRatio > 0.35) && effectiveRatio >= escalatedRatio * 0.85;
            if (stageByInfluence && warsPlanned < profile.diplomacy.maxConcurrentWars) {
                const focusCity = selectFocusCityAgainstTarget(next, playerId, other.id, influence);
                if (focusCity) {
                    next = recordFocusTarget(next, playerId, other.id, focusCity.id);
                    if (debugEnabled) {
                        aiInfo(`[AI Diplo] ${playerId} staging vs ${other.id} (front:${frontRatio.toFixed(2)} pressure:${pressureRatio.toFixed(2)})`);
                    }
                }
            }
            continue;
        }

        const focusCity = selectFocusCityAgainstTarget(next, playerId, other.id, influence);

        if (focusCity) {
            if (isAetherian && hasTitanNow && canDeclareWar(next, playerId, other.id)) {
                next = recordWarInitiation(next, playerId, other.id, {
                    setFocus: true,
                    focusCityId: focusCity.id,
                    warInitiationTurns: recentInitiations,
                });
                actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
                warsPlanned += 1;
                continue;
            }

            if (progressThreat) {
                next = recordFocusTarget(next, playerId, other.id, focusCity.id);
            } else {
                const stageDistMax = 6;
                const requiredNear = Math.max(4, Math.ceil(profile.tactics.forceConcentration * 5));
                const nearCount = next.units.filter(u =>
                    u.ownerId === playerId &&
                    u.type !== "Settler" && u.type !== "Scout" && u.type !== "Skiff" && u.type !== "ArmyScout" &&
                    hexDistance(u.coord, focusCity.coord) <= stageDistMax
                ).length;

                const capturersNear = countNearbyByPredicate(next, playerId, focusCity.coord, stageDistMax, (u) =>
                    u.type === "SpearGuard" || u.type === "ArmySpearGuard" || u.type === "Titan"
                );

                if (nearCount < requiredNear || (!hasTitanNow && capturersNear < 1)) {
                    next = recordFocusTarget(next, playerId, other.id, focusCity.id);
                    if (debugEnabled) {
                        aiInfo(`[AI Diplo] ${playerId} staging vs ${other.id} (forces not ready)`);
                    }
                    continue;
                }
            }
        }

        if (!progressThreat && !conquestThreat && !earlyRushActive) {
            if (next.turn < profile.diplomacy.minWarTurn) continue;
            if (warsPlanned >= profile.diplomacy.maxConcurrentWars) continue;
            if (recentInitiations.length >= profile.diplomacy.maxInitiatedWarsPer50Turns) continue;
        } else if (earlyRushActive) {
            if (next.turn < 8) continue;
        }

        if (!canDeclareWar(next, playerId, other.id)) continue;

        const myCityCount = next.cities.filter(c => c.ownerId === playerId).length;
        const myUnits = next.units.filter(u => u.ownerId === playerId && u.type !== "Settler" && u.type !== "Scout").length;

        const ratioScore = clamp01((effectiveOffensiveRatio - escalatedRatio) / Math.max(0.01, escalatedRatio));
        let warScore = ratioScore;
        if (progressThreat) warScore = Math.max(warScore, 0.8);
        if (conquestThreat) warScore = Math.max(warScore, 0.7);
        if (earlyRushActive) warScore = Math.max(warScore, 0.6);
        if (isDominating) warScore = 1.0;
        if (frontRatio > 0 || pressureRatio > 0) {
            warScore = clamp01(warScore + frontRatio * 0.12 + pressureRatio * 0.1);
        }

        if (warScore > 0) {
            next = recordWarInitiation(next, playerId, other.id, {
                setFocus: true,
                focusCityId: focusCity?.id,
                warInitiationTurns: recentInitiations,
                warCityCount: myCityCount,
                warUnitsCount: myUnits,
                recordCaptureTurn: true,
            });
            actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
            warsPlanned += 1;
            if (debugEnabled) {
                const influenceText = (frontRatio > 0 || pressureRatio > 0)
                    ? ` front:${frontRatio.toFixed(2)} pressure:${pressureRatio.toFixed(2)}`
                    : "";
                aiInfo(`[AI Diplo] ${playerId} declaring war on ${other.id} score=${warScore.toFixed(2)} (ratio:${effectiveOffensiveRatio.toFixed(2)} req:${escalatedRatio.toFixed(2)})${influenceText}`);
            }
        }
    }

    return { state: next, actions };
}
