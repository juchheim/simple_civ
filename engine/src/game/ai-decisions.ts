import { CITY_DEFENSE_BASE, CITY_WARD_DEFENSE_BONUS, UNITS } from "../core/constants.js";
import { hexDistance } from "../core/hex.js";
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

export type WarPeaceDecision = "DeclareWar" | "ProposePeace" | "AcceptPeace" | "None";
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

function estimateMilitaryPower(playerId: string, state: GameState): number {
    const units = state.units.filter(u => u.ownerId === playerId);
    const unitPower = units.reduce((sum, u) => {
        const stats = UNITS[u.type];
        const atk = stats.atk * 2;
        const def = stats.def * 1.5;
        const hp = stats.hp * 0.25;
        const formationBonus = u.type.startsWith("Army") ? 1.25 : 1;
        return sum + (atk + def + hp) * formationBonus;
    }, 0);

    const cities = state.cities.filter(c => c.ownerId === playerId);
    const cityPower = cities.reduce((sum, c) => {
        const ward = c.buildings.includes(BuildingType.CityWard) ? CITY_WARD_DEFENSE_BONUS : 0;
        return sum + (CITY_DEFENSE_BASE + ward) * 2 + c.hp * 0.3;
    }, 0);

    return unitPower + cityPower;
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
    // Visibility-agnostic: consider all enemy cities
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
    
    // Has progress lead if 1.5x the highest enemy population AND 30+ total pop
    // Both conditions required - ensures substantial buildup before aggression spike
    return myPop >= otherMaxPop * 1.5 && myPop >= 30;
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

export function aiWarPeaceDecision(playerId: string, targetId: string, state: GameState): WarPeaceDecision {
    if (!state.contacts?.[playerId]?.[targetId]) {
        // if units/cities are visible, force contact
        const seesAny = state.units.some(u => u.ownerId === targetId);
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
    const warDistanceMax = aggression.warDistanceMax;
    const stance = state.diplomacy?.[playerId]?.[targetId] ?? DiplomacyState.Peace;
    const aiPower = estimateMilitaryPower(playerId, state);
    const enemyPower = estimateMilitaryPower(targetId, state);
    const _losingWar = aiPower < enemyPower * aggression.peacePowerThreshold;
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
            return "None";
        }

        // v0.98 Update 8: War exhaustion overrides "winning" stance
        // After 40 turns, even winners become willing to peace (unless they can finish the enemy)
        // EXCEPTION: Dominating power (5x+) NEVER gets war-weary - finish them!
        const dominating = hasDominatingPowerOver(playerId, targetId, state);
        if (exhausted && !finishable && !overwhelming && !dominating) {
            console.info(`[AI WAR EXHAUSTED] ${playerId} war-weary after ${turnsSinceChange} turns against ${targetId}`);
            const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
            if (incomingPeace) return "AcceptPeace";
            return "ProposePeace";
        }
        
        // v0.98 Update 8: Stalemate detection - propose peace if war is going nowhere
        if (stalemate) {
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
    if (dominating && theirCitiesExist) {
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
        console.info(`[AI WAR FINISH] ${playerId} declaring war on ${targetId} (${overwhelming ? "OVERWHELMING" : "FINISHABLE"}: power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}, dist ${dist})`);
        return "DeclareWar";
    }
    
    if (dist !== null && dist <= warDistanceMax && aiPower >= enemyPower * warPowerThreshold) {
        console.info(`[AI WAR] ${playerId} declaring war on ${targetId} (power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}, dist ${dist})`);
        return "DeclareWar";
    }

    if (declareAfterContact > 0 && contactTurns >= declareAfterContact && dist !== null) {
        if (aiPower >= enemyPower * 0.5) {
            return "DeclareWar";
        } else {
            logVeto(`Force-war veto: ${playerId}->${targetId} power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}`);
        }
    }

    if (dist === null) {
        logVeto(`No enemy city distance for ${playerId}->${targetId} contactTurns=${contactTurns} myCities=${myCities.join(",") || "none"} theirCities=${theirCities.join(",") || "none"}`);
    } else {
        logVeto(
            `No war: ${playerId}->${targetId} dist ${dist}/${warDistanceMax} power ${aiPower.toFixed(
                1
            )} vs ${enemyPower.toFixed(1)} req ${warPowerThreshold} contactTurns=${contactTurns} myCities=${myCities.join(",") || "none"} theirCities=${theirCities.join(",") || "none"}`
        );
    }

    return "None";
}

export { aiVictoryBias } from "./ai/goals.js";
export { aiChooseTech } from "./ai/tech.js";
