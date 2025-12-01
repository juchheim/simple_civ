import { CITY_DEFENSE_BASE, CITY_WARD_DEFENSE_BONUS, UNITS } from "../core/constants.js";
import { hexDistance, hexToString } from "../core/hex.js";
import { estimateMilitaryPower, aiVictoryBias } from "./ai/goals.js";
import {
    BuildingType,
    DiplomacyState,
    GameState,
    ProjectId,
    TechId,
    UnitType,
} from "../core/types.js";
import { getPersonalityForPlayer } from "./ai/personality.js";
import { setContact } from "./helpers/diplomacy.js";

export type WarPeaceDecision = "DeclareWar" | "ProposePeace" | "AcceptPeace" | "PrepareForWar" | "None";
const warVetoLog: string[] = [];
export function getWarVetoLog(): string[] {
    return [...warVetoLog];
}
export function clearWarVetoLog() {
    warVetoLog.length = 0;
}
function logVeto(reason: string) {
    if (warVetoLog.length < 1000) warVetoLog.push(reason);
}

function getVisibleKeys(state: GameState, observerId?: string): Set<string> {
    if (!observerId) return new Set();
    return new Set(state.visibility?.[observerId] ?? []);
}

function progressRaceRiskHigh(playerId: string, state: GameState): boolean {
    const me = state.players.find(p => p.id === playerId);
    if (!me) return false;
    const myProgressSteps = me.completedProjects.filter(p =>
        p === ProjectId.Observatory || p === ProjectId.GrandAcademy || p === ProjectId.GrandExperiment
    ).length;

    return state.players.some(p => {
        if (p.id === playerId) return false;
        const steps = p.completedProjects.filter(cp =>
            cp === ProjectId.Observatory || cp === ProjectId.GrandAcademy || cp === ProjectId.GrandExperiment
        ).length;
        const researchingProgress =
            p.currentTech?.id === TechId.StarCharts || p.currentTech?.id === TechId.ScholarCourts || p.currentTech?.id === TechId.ScriptLore;
        return steps > myProgressSteps || (researchingProgress && steps >= myProgressSteps);
    });
}

function enemyCityDistance(playerId: string, targetId: string, state: GameState): { dist: number | null; myCities: string[]; theirCities: string[] } {
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const theirCities = state.cities.filter(c => c.ownerId === targetId);
    if (!myCities.length || !theirCities.length) return { dist: null, myCities: myCities.map(c => c.id), theirCities: theirCities.map(c => c.id) };
    let best: number | null = null;
    for (const mine of myCities) {
        for (const theirs of theirCities) {
            const d = hexDistance(mine.coord, theirs.coord);
            if (best === null || d < best) best = d;
        }
    }
    return { dist: best, myCities: myCities.map(c => c.id), theirCities: theirCities.map(c => c.id) };
}

function hasTitan(playerId: string, state: GameState): boolean {
    return state.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
}

/**
 * v0.98 Update 8: Check if player has a significant population lead
 * Used by JadeCovenant to trigger aggressive mode when they have pop advantage
 * Threshold raised to 30+ pop to ensure they've built up before becoming aggressive
 */
function hasProgressLead(playerId: string, state: GameState): boolean {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return false;

    // Calculate total population
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myPop = myCities.reduce((sum, c) => sum + c.pop, 0);

    // Check against all other players
    let otherMaxPop = 0;
    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        const theirCities = state.cities.filter(c => c.ownerId === other.id);
        const theirPop = theirCities.reduce((sum, c) => sum + c.pop, 0);
        if (theirPop > otherMaxPop) otherMaxPop = theirPop;
    }

    // Has progress lead if 1.5x the highest enemy population AND 20+ total pop
    // Both conditions required - ensures substantial buildup before aggression spike
    // v0.99 Tuning: Reduced from 30 to 20 to allow earlier aggression
    return myPop >= otherMaxPop * 1.5 && myPop >= 20;
}

/**
 * v0.98 Update 5: Check if we have overwhelming power over a specific target
 * Used to bypass peace duration restrictions
 */
function hasOverwhelmingPowerOver(playerId: string, targetId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    return myPower >= theirPower * 2; // 2x power = overwhelming
}

/**
 * v0.98 Update 8: DOMINATION mode - massive power advantage
 * When you have 5x+ power, you should ALWAYS be at war until the enemy is eliminated
 * This fixes stalled games where dominant civs sit at peace with weak neighbors
 */
function hasDominatingPowerOver(playerId: string, targetId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    // Must have 5x power AND at least 100 power (not just 5 vs 1)
    return myPower >= theirPower * 5 && myPower >= 100;
}

/**
 * v0.98 Update 5: Check if target is finishable (1-2 cities, we have 1.5x power)
 */
function isFinishableTarget(playerId: string, targetId: string, state: GameState): boolean {
    const theirCities = state.cities.filter(c => c.ownerId === targetId);
    if (theirCities.length === 0 || theirCities.length > 2) return false;

    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    return myPower >= theirPower * 1.5;
}

/**
 * v0.98 Update 6: Check if we have city advantage over target
 * Don't make peace when we're territorially dominant
 */
function hasCityAdvantage(playerId: string, targetId: string, state: GameState): boolean {
    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
    const theirCities = state.cities.filter(c => c.ownerId === targetId).length;
    return myCities > theirCities + 1; // Need 2+ city advantage
}

/**
 * v0.98 Update 6: Check if we're winning the war (more power AND more/equal cities)
 */
function isWinningWar(playerId: string, targetId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
    const theirCities = state.cities.filter(c => c.ownerId === targetId).length;

    // Winning if: more power AND at least as many cities
    return myPower > theirPower * 1.2 && myCities >= theirCities;
}

/**
 * v0.98 Update 6: Check if we're actually losing (lost cities or significantly weaker)
 * More strict than before - don't peace out just because enemy is slightly stronger
 */
function isActuallyLosingWar(playerId: string, targetId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
    const theirCities = state.cities.filter(c => c.ownerId === targetId).length;

    // Actually losing if: significantly weaker (< 60% power) OR fewer cities AND weaker
    const significantlyWeaker = myPower < theirPower * 0.6;
    const losingTerritory = myCities < theirCities && myPower < theirPower;

    return significantlyWeaker || losingTerritory;
}

/**
 * v0.98 Update 8: War exhaustion check
 * After extended warfare with no progress, both sides become war-weary
 */
function isWarExhausted(playerId: string, targetId: string, state: GameState): boolean {
    const stateChangedTurn = state.diplomacyChangeTurn?.[playerId]?.[targetId] ?? 0;
    const turnsSinceWarStart = state.turn - stateChangedTurn;

    // War exhaustion kicks in after 40 turns of continuous war
    return turnsSinceWarStart >= 40;
}

/**
 * v0.98 Update 8: Stalemate detection
 * Check if the war is making no progress (evenly matched, neither side gaining ground)
 * EXCEPTION: If we have 5x+ power advantage, it's NOT a stalemate - we should finish them
 */
function isStalemate(playerId: string, targetId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
    const theirCities = state.cities.filter(c => c.ownerId === targetId).length;

    const stateChangedTurn = state.diplomacyChangeTurn?.[playerId]?.[targetId] ?? 0;
    const turnsSinceWarStart = state.turn - stateChangedTurn;

    // v0.98 Update 8: NEVER consider it a stalemate if we have massive power advantage
    // This fixes tiny map stalls where dominant civs peace out instead of finishing
    const massivePowerAdvantage = myPower >= theirPower * 5;
    if (massivePowerAdvantage) {
        return false; // Not a stalemate - keep fighting!
    }

    // Stalemate conditions:
    // 1. War has lasted at least 25 turns
    // 2. Power ratio is between 0.6 and 1.7 (neither side dominant)
    // 3. City counts are within 2 of each other (no significant territorial change)
    const longWar = turnsSinceWarStart >= 25;
    const evenlyMatched = myPower >= theirPower * 0.6 && myPower <= theirPower * 1.7;
    const noTerritorialGains = Math.abs(myCities - theirCities) <= 2;

    return longWar && evenlyMatched && noTerritorialGains;
}

function getWarEscalationFactor(turn: number): number {
    // Starts at 1.0 (no effect) until turn 100
    // Decreases linearly to 0.5 at turn 180
    // Formula: 1.0 - ((turn - 100) / 80) * 0.5
    if (turn < 100) return 1.0;
    const progress = Math.min(1, (turn - 100) / 80);
    return Math.max(0.5, 1.0 - progress * 0.5);
}

function getEnemyCapitalDistance(playerId: string, targetId: string, state: GameState): number | null {
    const myUnits = state.units.filter(u => u.ownerId === playerId && u.type.startsWith("Army"));
    const targetCapitals = state.cities.filter(c => c.ownerId === targetId && c.isCapital);

    if (myUnits.length === 0 || targetCapitals.length === 0) return null;

    let minDist = Infinity;
    for (const unit of myUnits) {
        for (const cap of targetCapitals) {
            const d = hexDistance(unit.coord, cap.coord);
            if (d < minDist) minDist = d;
        }
    }
    return minDist === Infinity ? null : minDist;
}

export function aiWarPeaceDecision(playerId: string, targetId: string, state: GameState, options?: { ignorePrep?: boolean }): WarPeaceDecision {
    if (!state.contacts?.[playerId]?.[targetId]) {
        const visibleKeys = getVisibleKeys(state, playerId);
        const seesAny =
            state.units.some(u => u.ownerId === targetId && visibleKeys.has(hexToString(u.coord))) ||
            state.cities.some(c => c.ownerId === targetId && visibleKeys.has(hexToString(c.coord)));
        if (seesAny) {
            setContact(state, playerId, targetId);
        } else {
            return "None";
        }
    }
    const personality = getPersonalityForPlayer(state, playerId);
    const aggression = personality.aggression;
    const warPowerThreshold = (() => {
        // v0.98 Update 7: Check for aggression spike triggers
        if (aggression.aggressionSpikeTrigger === "TitanBuilt" && hasTitan(playerId, state)) {
            return aggression.warPowerThresholdLate ?? aggression.warPowerThreshold;
        }
        if (aggression.aggressionSpikeTrigger === "ProgressLead" && hasProgressLead(playerId, state)) {
            console.info(`[AI AGGRESSION] ${playerId} has population lead - becoming more aggressive!`);
            return aggression.warPowerThresholdLate ?? aggression.warPowerThreshold;
        }
        return aggression.warPowerThreshold;
    })();

    // v0.99 Update: War Escalation
    // As the game progresses, Conquest-focused civs become more aggressive
    // Universal Escalation: After turn 150, EVERYONE gets more aggressive to prevent stalls
    const victoryBias = aiVictoryBias(playerId, state);
    let escalationFactor = 1.0;

    if (victoryBias === "Conquest") {
        escalationFactor = getWarEscalationFactor(state.turn);
    } else if (state.turn > 150) {
        // Late game universal escalation (gentler slope than Conquest)
        // 1.0 -> 0.6 from turn 150 to 230
        const lateProgress = Math.min(1, (state.turn - 150) / 80);
        escalationFactor = 1.0 - (lateProgress * 0.4);
    }

    // v0.99 Update: Large Map Scaling
    // On larger maps, distances are greater and there are more opponents.
    // We need to scale aggression and distance limits to match.
    // Standard map is 24x24.
    const mapWidth = state.map.width;
    const mapHeight = state.map.height;
    const mapSizeFactor = Math.max(1.0, (mapWidth * mapHeight) / (24 * 24));
    const distanceScale = Math.sqrt(mapSizeFactor); // Scale distance by sqrt of area ratio

    // Capital Targeting Bonus: If we are escalating AND enemy capital is vulnerable, be even more aggressive
    let capitalBonus = 1.0;
    if (escalationFactor < 1.0) {
        const capDist = getEnemyCapitalDistance(playerId, targetId, state);
        // Scale the check distance by map size
        if (capDist !== null && capDist <= aggression.warDistanceMax * distanceScale) {
            capitalBonus = 0.9; // 10% easier to declare war if capital is in range
        }
    }

    // v0.99 Update: Aggression Scaling on Large Maps
    // Conquest civs need to be more aggressive on large maps to overcome the "turtling" tendency
    let largeMapAggressionBonus = 1.0;
    // v0.99 Update: Extended to Standard maps (factor >= 1.0)
    if (victoryBias === "Conquest" && mapSizeFactor >= 1.0) {
        largeMapAggressionBonus = 0.9; // 10% lower threshold on Standard/Large/Huge maps
    }

    const finalWarPowerThreshold = warPowerThreshold * escalationFactor * capitalBonus * largeMapAggressionBonus;

    // Increase distance range over time (starts at turn 100, +1 tile every 20 turns)
    // v0.99 Update: If escalating (Conquest civ late game), remove distance limit to ensure we can reach any capital
    const distanceBonus = Math.max(0, Math.floor((state.turn - 100) / 20));
    // Scale base distance by map size
    const scaledBaseDistance = Math.ceil(aggression.warDistanceMax * distanceScale);
    const warDistanceMax = (escalationFactor < 1.0) ? 999 : scaledBaseDistance + distanceBonus;
    const stance = state.diplomacy?.[playerId]?.[targetId] ?? DiplomacyState.Peace;
    const aiPower = estimateMilitaryPower(playerId, state);
    const enemyPower = estimateMilitaryPower(targetId, state);

    // v0.99 Update: Conquest civs are harder to peace out on larger maps
    let peaceThreshold = aggression.peacePowerThreshold;
    if (victoryBias === "Conquest" && mapSizeFactor >= 1.0) {
        peaceThreshold -= 0.1; // Stay in war longer (e.g. 0.8 -> 0.7)
    }
    const _losingWar = aiPower < enemyPower * peaceThreshold;

    const progressRisk = progressRaceRiskHigh(playerId, state);
    const inWar = stance === DiplomacyState.War;
    const contactTurnKey = `metTurn_${targetId}`;
    const metTurn = (state.contacts?.[playerId] as any)?.[contactTurnKey] ?? state.turn;
    const contactTurns = Math.max(0, state.turn - metTurn);
    const declareAfterContact = personality.declareAfterContactTurns ?? 0;

    // Check diplomacy state duration
    const stateChangedTurn = state.diplomacyChangeTurn?.[playerId]?.[targetId] ?? 0;
    const turnsSinceChange = state.turn - stateChangedTurn;

    if (inWar) {
        // v0.98 Update 6: Extended war duration when winning
        // Base: 15 turns, Extended: 25 turns if we're winning or have advantage
        const overwhelming = hasOverwhelmingPowerOver(playerId, targetId, state);
        const finishable = isFinishableTarget(playerId, targetId, state);
        const cityAdvantage = hasCityAdvantage(playerId, targetId, state);
        const winning = isWinningWar(playerId, targetId, state);
        const actuallyLosing = isActuallyLosingWar(playerId, targetId, state);

        // v0.98 Update 8: War exhaustion and stalemate detection
        const exhausted = isWarExhausted(playerId, targetId, state);
        const stalemate = isStalemate(playerId, targetId, state);

        // Extended duration when we have any advantage
        const MIN_WAR_DURATION = (overwhelming || finishable || cityAdvantage || winning) ? 25 : 15;

        if (turnsSinceChange < MIN_WAR_DURATION) {
            // War must last at least minimum turns before proposing peace
            // console.log(`[AI WAR] ${playerId} vs ${targetId}: War duration ${turnsSinceChange}/${MIN_WAR_DURATION} - continuing`);
            return "None";
        } else {
            console.log(`[AI WAR] ${playerId} vs ${targetId}: War duration ${turnsSinceChange}/${MIN_WAR_DURATION} - eligible for peace`);
        }

        // v0.99 Fix: NEVER sign peace if we have a capturable city (HP <= 0)
        // This prevents the "Stalled Game" scenario where a city sits at -1 HP during forced peace
        const enemyCities = state.cities.filter(c => c.ownerId === targetId);
        const hasCapturableCity = enemyCities.some(c => c.hp <= 0);

        if (hasCapturableCity) {
            console.info(`[AI WAR CONTINUE] ${playerId} refusing peace with ${targetId} - city is CAPTURABLE (HP <= 0)!`);
            return "None";
        }

        // v0.98 Update 8: War exhaustion overrides "winning" stance
        // After 40 turns, even winners become willing to peace (unless they can finish the enemy)
        // EXCEPTION: Dominating power (5x+) NEVER gets war-weary - finish them!
        // v0.99 Update: Late Game Escalation (factor < 0.8) ALSO ignores exhaustion/stalemate
        // If we are in the "Death War" phase, we fight to the end.
        const dominating = hasDominatingPowerOver(playerId, targetId, state);
        const lateGameDeathWar = escalationFactor < 0.8;

        if (exhausted && !finishable && !overwhelming && !dominating && !lateGameDeathWar) {
            console.info(`[AI WAR EXHAUSTED] ${playerId} war-weary after ${turnsSinceChange} turns against ${targetId}`);
            const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
            if (incomingPeace) return "AcceptPeace";
            return "ProposePeace";
        }

        // v0.98 Update 8: Stalemate detection - propose peace if war is going nowhere
        if (stalemate && !lateGameDeathWar) {
            console.info(`[AI WAR STALEMATE] ${playerId} recognizes stalemate with ${targetId} after ${turnsSinceChange} turns`);
            const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
            if (incomingPeace) return "AcceptPeace";
            return "ProposePeace";
        }

        // v0.98 Update 6: Continue fighting if we have significant advantage (but not forever - see above)
        if (overwhelming || finishable || cityAdvantage || winning) {
            console.info(`[AI WAR CONTINUE] ${playerId} continuing war with ${targetId} (overwhelming=${overwhelming}, finishable=${finishable}, cityAdv=${cityAdvantage}, winning=${winning})`);
            return "None";
        }

        // v0.98 Update 6: Accept/propose peace if ACTUALLY losing
        const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
        if (incomingPeace && (actuallyLosing || progressRisk)) return "AcceptPeace";
        if (actuallyLosing || progressRisk) return "ProposePeace";

        // Default: keep fighting if we're in the middle (not winning, not losing)
        // But this will eventually trigger stalemate or exhaustion above
        return "None";
    }

    // v0.98 Update 5: Overwhelming power or finishable target bypasses peace duration
    // This fixes stalled games where dominant civs get stuck in peace/war cycles
    const overwhelming = hasOverwhelmingPowerOver(playerId, targetId, state);
    const finishable = isFinishableTarget(playerId, targetId, state);
    const dominating = hasDominatingPowerOver(playerId, targetId, state);
    const bypassPeaceDuration = overwhelming || finishable || dominating;

    // v0.98 Update 8: DOMINATION MODE - 5x+ power advantage bypasses ALL restrictions
    // This is the #1 fix for stalled games - dominant civs MUST finish off weak opponents
    const theirCitiesExist = state.cities.some(c => c.ownerId === targetId);

    // Check for War Preparation
    const player = state.players.find(p => p.id === playerId);
    const prep = player?.warPreparation;
    const isPrepping = prep && prep.targetId === targetId;
    const isReady = isPrepping && prep.state === "Ready";

    if (dominating && theirCitiesExist) {
        // v0.99 Update: Domination Bypass
        // If we have 5x power, we don't need to wait for full preparation.
        // We are strong enough to crush them immediately.
        if (!options?.ignorePrep && !isReady) {
            console.info(`[AI DOMINATION] ${playerId} has DOMINATING power (5x) - Bypassing War Prep!`);
        } else {
            // Standard log if we were ready anyway
            // (No-op, just fall through to declare)
        }
        console.info(`[AI DOMINATION] ${playerId} entering DOMINATION mode against ${targetId} (power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)} = ${(aiPower / Math.max(1, enemyPower)).toFixed(1)}x)`);
        return "DeclareWar";
    }

    // Minimum peace duration check - but only if there was a previous war
    // Don't block initial wars!
    const MIN_PEACE_DURATION = 15;
    const hadPriorDiplomacyChange = stateChangedTurn > 0;
    if (hadPriorDiplomacyChange && !inWar && turnsSinceChange < MIN_PEACE_DURATION && !bypassPeaceDuration) {
        // Peace must last at least 15 turns before declaring war AGAIN
        // UNLESS we have overwhelming power or target is finishable
        logVeto(`Peace too recent: ${playerId}->${targetId} turns since peace: ${turnsSinceChange}/${MIN_PEACE_DURATION}`);
        return "None";
    }

    const { dist, myCities, theirCities } = enemyCityDistance(playerId, targetId, state);
    if (theirCities.length === 0 || myCities.length === 0) {
        logVeto(`No cities for war eval ${playerId}->${targetId} myCities=${myCities.join(",") || "none"} theirCities=${theirCities.join(",") || "none"}`);
    }

    // v0.98 Update 5: Always declare war if we have overwhelming power or target is finishable
    if (dist !== null && (overwhelming || finishable)) {
        if (!options?.ignorePrep && !isReady) return "None";
        console.info(`[AI WAR FINISH] ${playerId} declaring war on ${targetId} (${overwhelming ? "OVERWHELMING" : "FINISHABLE"}: power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}, dist ${dist})`);
        return "DeclareWar";
    }

    if (dist !== null && dist <= warDistanceMax && aiPower >= enemyPower * finalWarPowerThreshold) {
        if (!options?.ignorePrep && !isReady) return "None";
        if (escalationFactor < 1.0) {
            console.info(`[AI WAR ESCALATION] ${playerId} declaring war on ${targetId} (Escalation: ${(escalationFactor * 100).toFixed(0)}%, CapBonus: ${(capitalBonus * 100).toFixed(0)}%, Threshold: ${finalWarPowerThreshold.toFixed(2)})`);
        }
        console.info(`[AI WAR] ${playerId} declaring war on ${targetId} (power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}, dist ${dist})`);
        return "DeclareWar";
    } else if (dist !== null && dist <= warDistanceMax) {
        // v0.99: If we are close enough to fight but too weak, we should build up!
        // This solves the deadlock where weak AIs never build an army to start a war.
        // Only build up if we are not hopelessly outmatched (at least 25% of their power)
        if (aiPower >= enemyPower * 0.25) {
            return "PrepareForWar";
        }
    }

    if (declareAfterContact > 0 && contactTurns >= declareAfterContact && dist !== null) {
        if (aiPower >= enemyPower * 0.5) {
            if (!options?.ignorePrep && !isReady) return "None";
            return "DeclareWar";
        } else {
            // Also prepare if we want to force war but are weak
            if (aiPower >= enemyPower * 0.25) {
                return "PrepareForWar";
            }
            logVeto(`Force-war veto: ${playerId}->${targetId} power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}`);
        }
    }

    if (dist === null) {
        logVeto(`No enemy city distance for ${playerId}->${targetId} contactTurns=${contactTurns} myCities=${myCities.join(",") || "none"} theirCities=${theirCities.join(",") || "none"}`);
    } else {
        logVeto(
            `No war: ${playerId}->${targetId} dist ${dist}/${warDistanceMax} power ${aiPower.toFixed(
                1
            )} vs ${enemyPower.toFixed(1)} req ${finalWarPowerThreshold.toFixed(2)} (base ${warPowerThreshold}) contactTurns=${contactTurns} myCities=${myCities.join(",") || "none"} theirCities=${theirCities.join(",") || "none"}`
        );
    }

    return "None";
}

export { aiVictoryBias } from "./ai/goals.js";
export { aiChooseTech } from "./ai/tech.js";
