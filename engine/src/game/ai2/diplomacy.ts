import { Action, AiVictoryGoal, DiplomacyState, GameState, ProjectId } from "../../core/types.js";
import { aiInfo } from "../ai/debug-logging.js";
import { hexDistance } from "../../core/hex.js";
import { estimateMilitaryPower } from "../ai/goals.js";
import { getAiMemoryV2, setAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { selectFocusCityAgainstTarget } from "./strategy.js";
import { canDeclareWar } from "../helpers/diplomacy.js";


// ============================================================================
// WAR ESCALATION & POWER COMPARISON (from Legacy AI)
// ============================================================================

/**
 * War escalation factor - civs become MORE aggressive as game progresses
 * Adjusted: 100/150/200 turns instead of Legacy's 100-180
 */
function getWarEscalationFactor(turn: number): number {
    if (turn < 100) return 1.0;  // No escalation before turn 100
    if (turn < 150) {
        // Turn 100-150: 1.0 -> 0.8 (20% more aggressive)
        const progress = (turn - 100) / 50;
        return 1.0 - (progress * 0.2);
    }
    if (turn < 200) {
        // Turn 150-200: 0.8 -> 0.6 (40% more aggressive total)
        const progress = (turn - 150) / 50;
        return 0.8 - (progress * 0.2);
    }
    // Turn 200+: 0.6 (40% more aggressive - "death war" mode)
    return 0.6;
}

/**
 * Check if we have DOMINATING power (5x+) over target
 * Dominant civs should ALWAYS be at war until enemy eliminated
 */
function hasDominatingPower(state: GameState, playerId: string, targetId: string): boolean {
    const myUnits = state.units.filter(u => u.ownerId === playerId && u.type !== "Settler" && u.type !== "Scout");
    const theirUnits = state.units.filter(u => u.ownerId === targetId && u.type !== "Settler" && u.type !== "Scout");

    const myPower = myUnits.length;
    const theirPower = Math.max(1, theirUnits.length);

    // 5x power AND at least 10 units (not just 5 vs 1)
    return myPower >= theirPower * 5 && myPower >= 10;
}

/**
 * Check if target has a capturable city (HP <= 0)
 * NEVER accept peace when we can capture a city this turn!
 */
function hasCapturableCity(state: GameState, targetId: string): boolean {
    return state.cities.some(c => c.ownerId === targetId && c.hp <= 0);
}

function hasUnitType(state: GameState, playerId: string, unitType: string): boolean {
    return state.units.some(u => u.ownerId === playerId && u.type === unitType);
}

function countNearbyByPredicate(
    state: GameState,
    playerId: string,
    center: { q: number; r: number },
    distMax: number,
    pred: (u: any) => boolean
): number {
    return state.units.filter(u => u.ownerId === playerId && pred(u) && hexDistance(u.coord, center) <= distMax).length;
}

function stanceDurationOk(state: GameState, playerId: string, targetId: string, minTurns: number, memory: ReturnType<typeof getAiMemoryV2>): boolean {
    const last = memory.lastStanceTurn?.[targetId] ?? 0;
    return last === 0 || (state.turn - last) >= minTurns;
}

function isProgressThreat(state: GameState, targetPlayerId: string): boolean {
    const p = state.players.find(x => x.id === targetPlayerId);
    if (!p) return false;
    const completedObs = p.completedProjects?.includes(ProjectId.Observatory);
    const completedAcad = p.completedProjects?.includes(ProjectId.GrandAcademy);
    const completedExp = p.completedProjects?.includes(ProjectId.GrandExperiment);
    if (completedExp) return true;

    // If they are currently building any progress-chain project, treat as a threat that scales with turn.
    const buildingProgress = state.cities.some(c =>
        c.ownerId === targetPlayerId &&
        c.currentBuild?.type === "Project" &&
        (c.currentBuild.id === ProjectId.Observatory || c.currentBuild.id === ProjectId.GrandAcademy || c.currentBuild.id === ProjectId.GrandExperiment)
    );

    // Early chain is only a "soft" threat; once Observatory is done or they are building Academy/Experiment, it's urgent.
    if (completedAcad || buildingProgress) return true;
    if (completedObs && state.turn >= 110) return true;
    return false;
}

function currentWarCount(state: GameState, playerId: string): number {
    return state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        (state.diplomacy?.[playerId]?.[p.id] ?? DiplomacyState.Peace) === DiplomacyState.War
    ).length;
}

export function decideDiplomacyActionsV2(state: GameState, playerId: string, goal: AiVictoryGoal): { state: GameState; actions: Action[] } {
    let next = state;
    const actions: Action[] = [];
    const profile = getAiProfileV2(next, playerId);
    const memory = getAiMemoryV2(next, playerId);

    // Early rush chance: RNG-based early aggression for civs with earlyRushChance
    // If triggered before turn 25, lower minWarTurn and war thresholds
    let earlyRushActive = false;
    if (profile.diplomacy.earlyRushChance && next.turn <= 25) {
        // Use player ID hash + seed for deterministic but varying behavior per game
        const rushSeed = (playerId.charCodeAt(0) + (next.seed ?? 0)) % 100;
        earlyRushActive = rushSeed < profile.diplomacy.earlyRushChance * 100;
    }

    const myPower = estimateMilitaryPower(playerId, next);
    const myCities = next.cities.filter(c => c.ownerId === playerId);
    const myAnchor = myCities.find(c => c.isCapital) ?? myCities[0];
    const myMilitaryCount = next.units.filter(u => u.ownerId === playerId && u.type !== "Settler" && u.type !== "Scout" && u.type !== "Skiff" && u.type !== "ArmyScout").length;
    const warsNow = currentWarCount(next, playerId);
    let warsPlanned = warsNow;

    // =========================================================================
    // FORCED PEACE-BREAKING: At turn 180+ with no wars, target weakest civ
    // =========================================================================
    // This breaks multi-civ stalemates where everyone is at peace and turtling
    // v4: Reverted to turn 180, 70% power - less aggressive to avoid mutual destruction
    // Use player ID hash for randomness so civs don't all trigger on same turn
    const forcedWarTurnOffset = (playerId.charCodeAt(0) + (next.seed ?? 0)) % 25; // 0-24 turn offset
    const forcedWarTriggerTurn = 180 + forcedWarTurnOffset;

    // ALL civs participate in forced peace-breaking
    if (next.turn >= forcedWarTriggerTurn && warsNow === 0) {
        // Find weakest visible enemy
        let weakestId: string | null = null;
        let weakestPower = Infinity;

        for (const other of next.players) {
            if (other.id === playerId || other.isEliminated) continue;
            const theirCities = next.cities.filter(c => c.ownerId === other.id);
            if (theirCities.length === 0) continue;

            const theirPower = estimateMilitaryPower(other.id, next);
            if (theirPower < weakestPower) {
                weakestPower = theirPower;
                weakestId = other.id;
            }
        }

        // v4: Attack when at 70% power or more (was 50%)
        // Check peace cooldown before declaring war
        if (weakestId && myPower >= weakestPower * 0.7 && canDeclareWar(next, playerId, weakestId)) {
            aiInfo(`[AI Diplo] ${playerId} FORCED WAR at turn ${next.turn} against weakest target ${weakestId}`);
            const mem2 = getAiMemoryV2(next, playerId);
            next = setAiMemoryV2(next, playerId, {
                ...mem2,
                lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [weakestId]: next.turn },
                warInitiationTurns: [...(mem2.warInitiationTurns ?? []), next.turn]
            });
            actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: weakestId, state: DiplomacyState.War });
            warsPlanned = 1;
        }
    }

    // =========================================================================
    // v6.6: TECH-COMPLETE WAR FORCING - Break stalemates between 20-tech civs
    // =========================================================================
    // Analysis showed 14.2% stall rate, many involving multiple civs with completed
    // tech trees (20 techs) at peace with each other. Force war between them.
    const player = next.players.find(p => p.id === playerId);
    const techTreeComplete = (player?.techs?.length ?? 0) >= 20;

    if (techTreeComplete && warsNow === 0) {
        // Find another 20-tech civ to fight
        for (const other of next.players) {
            if (other.id === playerId || other.isEliminated) continue;
            const theirTechs = other.techs?.length ?? 0;

            // Both have 20 techs = stalemate risk, force war
            // Check peace cooldown before declaring war
            if (theirTechs >= 20 && canDeclareWar(next, playerId, other.id)) {
                const theirCities = next.cities.filter(c => c.ownerId === other.id).length;
                if (theirCities === 0) continue; // Can't fight eliminated civs

                aiInfo(`[AI Diplo] ${playerId} TECH STALEMATE WAR at turn ${next.turn} - both have 20 techs, forcing war against ${other.id}`);
                const mem2 = getAiMemoryV2(next, playerId);
                next = setAiMemoryV2(next, playerId, {
                    ...mem2,
                    lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn },
                    warInitiationTurns: [...(mem2.warInitiationTurns ?? []), next.turn]
                });
                actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
                warsPlanned = 1;
                break; // Only declare one war at a time
            }
        }
    }

    for (const other of next.players) {
        if (other.id === playerId || other.isEliminated) continue;

        const stance = next.diplomacy?.[playerId]?.[other.id] ?? DiplomacyState.Peace;
        const theirPower = estimateMilitaryPower(other.id, next);
        const ratio = theirPower > 0 ? myPower / theirPower : Infinity;

        const theirCities = next.cities.filter(c => c.ownerId === other.id);
        const theirAnchor = theirCities.find(c => c.isCapital) ?? theirCities[0];
        const dist = (myAnchor && theirAnchor) ? hexDistance(myAnchor.coord, theirAnchor.coord) : 999;

        const warDistanceMax = next.turn >= 160 ? Math.max(profile.diplomacy.warDistanceMax, 999) : profile.diplomacy.warDistanceMax;

        if (stance === DiplomacyState.War) {
            // Progress threat check - needed for multiple conditions below
            const progressThreatNow =
                isProgressThreat(next, other.id) &&
                profile.diplomacy.canInitiateWars &&
                profile.diplomacy.warPowerRatio <= 1.35;

            // GAME-STATE PEACE CONDITIONS
            const warAge = next.turn - (memory.lastStanceTurn?.[other.id] ?? next.turn);
            const myCurrentCityCount = next.cities.filter(c => c.ownerId === playerId).length;
            const myStartingCityCount = memory.warCityCount?.[other.id] ?? myCurrentCityCount;
            const lostCities = myStartingCityCount - myCurrentCityCount;

            // Condition 1: Military Collapse - TUNED: 0.7 ratio (30% weaker), 5 turns
            const militaryCollapse = ratio < 0.7 && lostCities > 0 && warAge >= 5;
            if (militaryCollapse && !progressThreatNow) {
                actions.push({ type: "ProposePeace", playerId, targetPlayerId: other.id });
                const mem2 = getAiMemoryV2(next, playerId);
                next = setAiMemoryV2(next, playerId, { ...mem2, lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn } });
                continue;
            }

            // Condition 2: Territorial Stalemate - TIGHTENED: 40+ turns no progress, VERY even forces
            // OLD: 20 turns, 25 no-capture, 0.85-1.15 ratio (too loose!)
            // NEW: 40 turns, 40 no-capture, 0.95-1.05 ratio (truly stalled only)
            const turnsSinceCapture = next.turn - (memory.lastCityCaptureTurn?.[other.id] ?? memory.lastStanceTurn?.[other.id] ?? next.turn);
            const territorialStalemate =
                warAge >= 40 &&
                turnsSinceCapture >= 40 &&
                ratio >= 0.95 && ratio <= 1.05;  // VERY even - true stalemate

            if (territorialStalemate && !progressThreatNow) {
                actions.push({ type: "ProposePeace", playerId, targetPlayerId: other.id });
                const mem2 = getAiMemoryV2(next, playerId);
                next = setAiMemoryV2(next, playerId, { ...mem2, lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn } });
                continue;
            }

            // Condition 3: Third-party progress threat emerges
            const thirdPartyThreat = state.players.some(p =>
                p.id !== playerId &&
                p.id !== other.id &&
                !p.isEliminated &&
                isProgressThreat(next, p.id)
            );

            if (thirdPartyThreat && warAge >= 20) {
                actions.push({ type: "ProposePeace", playerId, targetPlayerId: other.id });
                const mem2 = getAiMemoryV2(next, playerId);
                next = setAiMemoryV2(next, playerId, { ...mem2, lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn } });
                continue;
            }

            // Condition 4: War Exhaustion - FIXED: 120+ turn wars (longer than avg 103)
            // OLD: 60 turns (fires at 58% of avg war!) 
            // NEW: 120 turns (only truly exhausted wars)
            const warExhaustion =
                warAge >= 120 &&
                ratio >= 0.8 && ratio <= 1.2 &&
                !progressThreatNow;

            if (warExhaustion) {
                actions.push({ type: "ProposePeace", playerId, targetPlayerId: other.id });
                const mem2 = getAiMemoryV2(next, playerId);
                next = setAiMemoryV2(next, playerId, { ...mem2, lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn } });
                continue;
            }



            // CAPTURABLE CITY CHECK: NEVER accept peace if enemy has city at 0 HP!
            if (hasCapturableCity(next, other.id)) {
                // Enemy has a capturable city - refuse peace and capture it!
                continue;
            }

            // STALLED WINNER: Accept peace when winning but can't finish
            // Check for incoming peace offers from opponent
            const incomingPeace = next.diplomacyOffers?.some(o => o.type === "Peace" && o.from === other.id && o.to === playerId);

            if (incomingPeace) {
                const warAge = next.turn - (memory.lastStanceTurn?.[other.id] ?? next.turn);
                const turnsSinceCapture = next.turn - (memory.lastCityCaptureTurn?.[other.id] ?? memory.lastStanceTurn?.[other.id] ?? next.turn);

                // TIGHTENED: Winner with MINIMAL advantage who is truly stalled
                // REVISION: Much stricter to prevent premature peace
                // OLD: 1.1-2.0 ratio, 30 turns, 25 no-capture (TOO LENIENT - caused 70% None!)
                // NEW: 1.05-1.25 ratio, 50 turns, 40 no-capture (only barely winning + really stuck)
                const stalledWinner =
                    ratio >= 1.05 && ratio <= 1.25 &&   // BARELY winning (not 1.5x!)
                    warAge >= 50 &&                      // War dragged LONGER
                    turnsSinceCapture >= 40;             // MUCH stricter stall check

                if (stalledWinner && !progressThreatNow) {
                    // "I'm barely winning but completely stalled - accept peace"
                    actions.push({ type: "AcceptPeace", playerId, targetPlayerId: other.id });
                    const mem2 = getAiMemoryV2(next, playerId);
                    next = setAiMemoryV2(next, playerId, { ...mem2, lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn } });
                    continue;
                }
            }

            if (!stanceDurationOk(next, playerId, other.id, profile.diplomacy.minStanceTurns, memory)) continue;

            // v6.1: Use peacePowerThreshold. 
            // If ratio < threshold, we accept peace.
            // Low threshold (0.9) means we only accept peace if we are losing.
            // High threshold (1.1) means we accept peace even if slightly winning.
            const wantsPeace = ratio < profile.diplomacy.peacePowerThreshold;
            const enemyCitiesNow = next.cities.filter(c => c.ownerId === other.id).length;
            // Stalemate heuristic: if we aren't decisively winning, and the war has dragged, propose peace.

            // REVISION 2: Much stricter "Finish Him" to prevent eternal wars.
            // Only prevent peace when TRULY winning and enemy has 1 city left.
            // OLD: cities <= 2 && ratio >= 0.9 (caused eternal wars between evenly matched civs)
            // NEW: cities <= 1 && ratio >= 1.2 (only when decisively winning against 1-city enemy)
            const shouldFinishEnemy = enemyCitiesNow <= 1 && ratio >= 1.2;
            if (shouldFinishEnemy) continue; // Don't peace out when delivering the finishing blow!

            // Legacy "shouldAvoidPeaceToFinish" kept for compatibility but now redundant with above.
            const shouldAvoidPeaceToFinish = enemyCitiesNow <= 2 && ratio >= 1.05;


            // FINAL TUNING: Stalemate peace for ALL civs (including aggressive ones)
            // Aggressive civs require 3.5x minStanceTurns instead of 2.5x
            const aggressive = profile.diplomacy.canInitiateWars && profile.diplomacy.warPowerRatio <= 1.35;
            const stalemate = (ratio < 1.15) && (next.turn - (memory.lastStanceTurn?.[other.id] ?? next.turn)) >= Math.ceil(profile.diplomacy.minStanceTurns * (aggressive ? 3.5 : 2.5));

            // FINAL TUNING: "Mutual Exhaustion" - wars >100 turns with even forces auto-resolve via peace
            const warDuration = next.turn - (memory.lastStanceTurn?.[other.id] ?? next.turn);
            const mutualExhaustion = warDuration >= 100 && ratio >= 0.85 && ratio <= 1.15;

            if (mutualExhaustion && !progressThreatNow) {
                // Force peace - this war is unwinnable and dragging
                const incomingPeace = next.diplomacyOffers?.some(o => o.type === "Peace" && o.from === other.id && o.to === playerId);
                actions.push(incomingPeace
                    ? { type: "AcceptPeace", playerId, targetPlayerId: other.id }
                    : { type: "ProposePeace", playerId, targetPlayerId: other.id }
                );
                const mem2 = getAiMemoryV2(next, playerId);
                next = setAiMemoryV2(next, playerId, { ...mem2, lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn } });
                continue;
            }

            // Also don't accept/propose peace when we're winning (prevents peace loops).
            const winning = ratio >= 1.05;
            if (!progressThreatNow && !winning && !shouldAvoidPeaceToFinish && (wantsPeace || stalemate)) {
                const incomingPeace = next.diplomacyOffers?.some(o => o.type === "Peace" && o.from === other.id && o.to === playerId);
                actions.push(incomingPeace
                    ? { type: "AcceptPeace", playerId, targetPlayerId: other.id }
                    : { type: "ProposePeace", playerId, targetPlayerId: other.id }
                );
                const mem2 = getAiMemoryV2(next, playerId);
                next = setAiMemoryV2(next, playerId, { ...mem2, lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn } });
            }
            continue;
        }

        // Peace → consider war.
        if (!profile.diplomacy.canInitiateWars) continue;
        if (dist > warDistanceMax) continue;
        // If we're overwhelmingly ahead, allow re-declaring war faster (prevents long "peace cooldown" stalls).
        const overwhelmingPeace = ratio >= 3 && !stanceDurationOk(next, playerId, other.id, Math.ceil(profile.diplomacy.minStanceTurns * 0.4), memory);
        if (overwhelmingPeace) continue;

        const atWar = (goal === "Conquest" || profile.diplomacy.warPowerRatio <= 1.35);

        // WAR ESCALATION: Apply escalation factor to make late-game wars more decisive
        const escalationFactor = getWarEscalationFactor(next.turn);

        // DOMINATING POWER: If we have 5x power, declare war immediately (bypass all gates)
        // Still must respect peace cooldown
        const isDominating = hasDominatingPower(next, playerId, other.id);
        if (isDominating && canDeclareWar(next, playerId, other.id)) {
            const mem2 = getAiMemoryV2(next, playerId);
            next = setAiMemoryV2(next, playerId, {
                ...mem2,
                lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn },
                warInitiationTurns: [...(mem2.warInitiationTurns ?? []), next.turn]
            });
            actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
            warsPlanned += 1;
            continue;
        }

        // If we're already at war, do NOT start additional wars (concentration wins wars),
        // except for urgent progress-denial.
        // (This is the primary fix for "tons of wars but no conquest wins".)
        // Rate-limit war initiations.
        const recentInitiations = (memory.warInitiationTurns ?? []).filter(t => (next.turn - t) <= 50);

        // Progress-denial: if an opponent is on/near the Progress win chain, aggressive civs should override distance/thresholds.
        // This must trigger even when our goal is "Balanced" (otherwise Progress civs get a free win window).
        const progressThreat =
            isProgressThreat(next, other.id) &&
            profile.diplomacy.canInitiateWars &&
            (goal === "Conquest" || profile.diplomacy.warPowerRatio <= 1.35);

        if (progressThreat) {
            aiInfo(`[AI Diplo] ${playerId} sees Progress Threat in ${other.id} (Obs: ${next.players.find(p => p.id === other.id)?.completedProjects?.includes(ProjectId.Observatory)})`);
        }


        // If we're already at war, do NOT start additional wars (concentration wins wars),
        // UNLESS we're finishing a weak enemy OR facing urgent progress-denial.
        if (warsNow >= 1 && !progressThreat) continue;
        const hasTitanNow = hasUnitType(next, playerId, "Titan");
        const isAetherian = profile.civName === "AetherianVanguard";
        // Titan online => lower threshold: the whole point is to start capturing.
        const requiredRatio = (hasTitanNow && isAetherian)
            ? Math.min(profile.diplomacy.warPowerRatio, 0.9)
            : (progressThreat
                ? Math.min(profile.diplomacy.warPowerRatio * 0.7, 1.0)
                : profile.diplomacy.warPowerRatio);

        // Apply escalation factor (makes late-game wars more aggressive)
        const escalatedRatio = requiredRatio * escalationFactor;

        const allowDistance = progressThreat ? Math.max(warDistanceMax, 999) : warDistanceMax;
        if (dist > allowDistance) continue;

        if (ratio >= escalatedRatio) {
            // Basic sanity gate: don't declare war with no army.
            if (myMilitaryCount < Math.max(2, Math.ceil(next.cities.filter(c => c.ownerId === playerId).length * 0.75))) continue;

            const focusCity = selectFocusCityAgainstTarget(next, playerId, other.id);

            // Force concentration gate (prevents "trickle wars"): require some forces near the prospective front.
            if (focusCity) {
                // Titan online for Aetherian: declare war immediately (Titan is the conquest engine).
                // Staging gates are intentionally bypassed to avoid "Titan exists but never fights".
                // Still must respect peace cooldown
                if (isAetherian && hasTitanNow && canDeclareWar(next, playerId, other.id)) {
                    const mem2 = getAiMemoryV2(next, playerId);
                    next = setAiMemoryV2(next, playerId, {
                        ...mem2,
                        focusTargetPlayerId: other.id,
                        focusCityId: focusCity.id,
                        focusSetTurn: next.turn,
                        lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn },
                        warInitiationTurns: [...recentInitiations, next.turn],
                    });
                    actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
                    warsPlanned += 1;
                    continue;
                }
                // Progress denial must be allowed to start immediately, even if we aren't staged yet.
                // Otherwise we "politely stage for 30 turns" and lose to GrandExperiment.
                if (progressThreat) {
                    const mem2a = getAiMemoryV2(next, playerId);
                    next = setAiMemoryV2(next, playerId, {
                        ...mem2a,
                        focusTargetPlayerId: other.id,
                        focusCityId: focusCity.id,
                        focusSetTurn: next.turn,
                    });
                } else {
                    // REVISION 2: Moderate staging requirements.
                    const stageDistMax = 6;
                    const requiredNear = Math.max(3, Math.ceil(profile.tactics.forceConcentration * 4));
                    const nearCount = next.units.filter(u =>
                        u.ownerId === playerId &&
                        u.type !== "Settler" && u.type !== "Scout" && u.type !== "Skiff" && u.type !== "ArmyScout" &&
                        hexDistance(u.coord, focusCity.coord) <= stageDistMax
                    ).length;

                    // Composition gate: Softened.
                    // OLD: Must have 1 Capturer AND 1 Siege. (Blocked pure melee armies).
                    // NEW: Must have 1 Capturer. Siege is optional if we have pure numbers.
                    const capturersNear = countNearbyByPredicate(next, playerId, focusCity.coord, stageDistMax, (u) =>
                        u.type === "SpearGuard" || u.type === "ArmySpearGuard" || u.type === "Titan"
                    );

                    // If we don't have enough troops OR (no Titan AND no Capturers), wait.
                    // Removed the "SiegeNear < 1" blocker. Melee rushes are valid.
                    if (nearCount < requiredNear) {
                        // Start focusing, but wait to declare until forces are staged.
                        const mem2a = getAiMemoryV2(next, playerId);
                        next = setAiMemoryV2(next, playerId, {
                            ...mem2a,
                            focusTargetPlayerId: other.id,
                            focusCityId: focusCity.id,
                            focusSetTurn: next.turn,
                        });
                        continue;
                    }

                    // Must have at least ONE unit capable of capturing the city.
                    if (!hasTitanNow && capturersNear < 1) {
                        const mem2a = getAiMemoryV2(next, playerId);
                        next = setAiMemoryV2(next, playerId, {
                            ...mem2a,
                            focusTargetPlayerId: other.id,
                            focusCityId: focusCity.id,
                            focusSetTurn: next.turn,
                        });
                        continue;
                    }
                }
            }

            // From here, we have enough nearby forces. Apply "declare now" gates.
            // BYPASS GATES if it's a Progress Threat OR early rush is active
            if (!progressThreat && !earlyRushActive) {
                if (next.turn < profile.diplomacy.minWarTurn) continue;
                if (warsPlanned >= profile.diplomacy.maxConcurrentWars) continue;
                if (recentInitiations.length >= profile.diplomacy.maxInitiatedWarsPer50Turns) continue;
            } else if (earlyRushActive) {
                // Early rush: lower threshold but still require turn 8 minimum
                if (next.turn < 8) continue;
            }

            // Check peace cooldown before declaring war
            if (!canDeclareWar(next, playerId, other.id)) continue;

            const mem2 = getAiMemoryV2(next, playerId);
            const myCities = next.cities.filter(c => c.ownerId === playerId).length;
            const myUnits = next.units.filter(u => u.ownerId === playerId && u.type !== "Settler" && u.type !== "Scout").length;

            next = setAiMemoryV2(next, playerId, {
                ...mem2,
                focusTargetPlayerId: other.id,
                focusCityId: focusCity?.id,
                focusSetTurn: next.turn,
                lastStanceTurn: { ...(mem2.lastStanceTurn ?? {}), [other.id]: next.turn },
                warInitiationTurns: [...recentInitiations, next.turn],
                // Track starting state for game-state peace conditions
                warCityCount: { ...(mem2.warCityCount ?? {}), [other.id]: myCities },
                warUnitsCount: { ...(mem2.warUnitsCount ?? {}), [other.id]: myUnits },
                lastCityCaptureTurn: { ...(mem2.lastCityCaptureTurn ?? {}), [other.id]: next.turn },
            });
            actions.push({ type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
            warsPlanned += 1;
        }
    }

    return { state: next, actions };
}


