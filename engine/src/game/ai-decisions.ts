import { aiLog, aiInfo } from "./ai/debug-logging.js";
import { hexDistance, hexToString } from "../core/hex.js";
import { estimateMilitaryPower, aiVictoryBias } from "./ai/goals.js";
import {
    DiplomacyState,
    GameState,
    ProjectId,
    TechId,
    UnitType,
} from "../core/types.js";
import { getPersonalityForPlayer } from "./ai/personality.js";
import { getAiProfileV2 } from "./ai2/rules.js"; // v6.2: Added for Forge Clans check
import { setContact } from "./helpers/diplomacy.js";

export type WarPeaceDecision = "DeclareWar" | "ProposePeace" | "AcceptPeace" | "PrepareForWar" | "None";

// Typed result interfaces for pure evaluators
export type PowerClassification =
    | "dominating"     // 5x+ power advantage
    | "overwhelming"   // 2x-5x power advantage
    | "advantaged"     // 1.2x-2x power advantage
    | "even"           // 0.6x-1.2x power ratio
    | "disadvantaged"; // <0.6x power ratio

export type PowerRatioResult = {
    aiPower: number;
    enemyPower: number;
    ratio: number;
    classification: PowerClassification;
    isDominating: boolean;
    isOverwhelming: boolean;
    isFinishable: boolean;
    hasCityAdvantage: boolean;
};

export type DistanceEvalResult = {
    closestCityDist: number | null;
    capitalDist: number | null;
    isInRange: boolean;
    distanceScale: number;
    warDistanceMax: number;
    myCities: string[];
    theirCities: string[];
};

export type WarStatusResult = {
    turnsSinceChange: number;
    isExhausted: boolean;
    isStalemate: boolean;
    isWinning: boolean;
    isLosing: boolean;
    hasCityAdvantage: boolean;
};

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
function _hasOverwhelmingPowerOver(playerId: string, targetId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    return myPower >= theirPower * 2; // 2x power = overwhelming
}

/**
 * v0.98 Update 8: DOMINATION mode - massive power advantage
 * When you have 5x+ power, you should ALWAYS be at war until the enemy is eliminated
 * This fixes stalled games where dominant civs sit at peace with weak neighbors
 */
function _hasDominatingPowerOver(playerId: string, targetId: string, state: GameState): boolean {
    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    // Must have 5x power AND at least 100 power (not just 5 vs 1)
    return myPower >= theirPower * 5 && myPower >= 100;
}

/**
 * v0.98 Update 5: Check if target is finishable (1-2 cities, we have 1.5x power)
 */
function _isFinishableTarget(playerId: string, targetId: string, state: GameState): boolean {
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
function _hasCityAdvantage(playerId: string, targetId: string, state: GameState): boolean {
    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
    const theirCities = state.cities.filter(c => c.ownerId === targetId).length;
    return myCities > theirCities + 1; // Need 2+ city advantage
}

/**
 * v0.98 Update 6: Check if we're winning the war (more power AND more/equal cities)
 */
function _isWinningWar(playerId: string, targetId: string, state: GameState): boolean {
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
function _isActuallyLosingWar(playerId: string, targetId: string, state: GameState): boolean {
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
function _isWarExhausted(playerId: string, targetId: string, state: GameState): boolean {
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
function _isStalemate(playerId: string, targetId: string, state: GameState): boolean {
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

/**
 * Pure evaluator: Computes power ratio between two players with classification.
 * Returns a structured result for use in decision logic and debugging.
 */
export function evaluatePowerRatio(
    playerId: string,
    targetId: string,
    state: GameState
): PowerRatioResult {
    const aiPower = estimateMilitaryPower(playerId, state);
    const enemyPower = estimateMilitaryPower(targetId, state);
    const ratio = enemyPower > 0 ? aiPower / enemyPower : aiPower > 0 ? Infinity : 1;

    let classification: PowerClassification;
    if (ratio >= 5) classification = "dominating";
    else if (ratio >= 2) classification = "overwhelming";
    else if (ratio >= 1.2) classification = "advantaged";
    else if (ratio >= 0.6) classification = "even";
    else classification = "disadvantaged";

    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
    const theirCities = state.cities.filter(c => c.ownerId === targetId).length;
    const theirCityCount = state.cities.filter(c => c.ownerId === targetId).length;

    // Finishable: target has 1-2 cities and we have 1.5x power
    const isFinishable = theirCityCount > 0 && theirCityCount <= 2 && ratio >= 1.5;
    // City advantage: 2+ more cities than target
    const hasCityAdvantage = myCities > theirCities + 1;

    return {
        aiPower,
        enemyPower,
        ratio,
        classification,
        isDominating: ratio >= 5 && aiPower >= 100,
        isOverwhelming: ratio >= 2,
        isFinishable,
        hasCityAdvantage,
    };
}

/**
 * Pure evaluator: Assesses the current war status including stalemate/exhaustion.
 * Returns a structured result for use in decision logic.
 */
export function evaluateWarStatus(
    playerId: string,
    targetId: string,
    state: GameState
): WarStatusResult {
    const stateChangedTurn = state.diplomacyChangeTurn?.[playerId]?.[targetId] ?? 0;
    const turnsSinceChange = state.turn - stateChangedTurn;

    const myPower = estimateMilitaryPower(playerId, state);
    const theirPower = estimateMilitaryPower(targetId, state);
    const myCities = state.cities.filter(c => c.ownerId === playerId).length;
    const theirCities = state.cities.filter(c => c.ownerId === targetId).length;

    const ratio = theirPower > 0 ? myPower / theirPower : myPower > 0 ? Infinity : 1;

    // Exhaustion: 40+ turns of war
    const isExhausted = turnsSinceChange >= 40;

    // Stalemate detection (excludes dominating situations)
    const massivePowerAdvantage = ratio >= 5;
    const longWar = turnsSinceChange >= 25;
    const evenlyMatched = ratio >= 0.6 && ratio <= 1.7;
    const noTerritorialGains = Math.abs(myCities - theirCities) <= 2;
    const isStalemate = !massivePowerAdvantage && longWar && evenlyMatched && noTerritorialGains;

    // Winning: more power AND at least as many cities
    const isWinning = ratio > 1.2 && myCities >= theirCities;

    // Losing: significantly weaker OR fewer cities AND weaker
    const significantlyWeaker = ratio < 0.6;
    const losingTerritory = myCities < theirCities && myPower < theirPower;
    const isLosing = significantlyWeaker || losingTerritory;

    // City advantage: 2+ more cities
    const hasCityAdvantage = myCities > theirCities + 1;

    return {
        turnsSinceChange,
        isExhausted,
        isStalemate,
        isWinning,
        isLosing,
        hasCityAdvantage,
    };
}

/**
 * Pure evaluator: Computes distance-related metrics for war decisions.
 */
export function evaluateDistance(
    playerId: string,
    targetId: string,
    state: GameState,
    options?: { warDistanceMax?: number; distanceScale?: number }
): DistanceEvalResult {
    const { dist, myCities, theirCities } = enemyCityDistance(playerId, targetId, state);
    const capitalDist = getEnemyCapitalDistance(playerId, targetId, state);

    const mapWidth = state.map.width;
    const mapHeight = state.map.height;
    const mapSizeFactor = Math.max(1.0, (mapWidth * mapHeight) / (24 * 24));
    const distanceScale = options?.distanceScale ?? Math.sqrt(mapSizeFactor);
    const warDistanceMax = options?.warDistanceMax ?? Math.ceil(8 * distanceScale);

    const isInRange = dist !== null && dist <= warDistanceMax;

    return {
        closestCityDist: dist,
        capitalDist,
        isInRange,
        distanceScale,
        warDistanceMax,
        myCities,
        theirCities,
    };
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

/**
 * Determines the best diplomatic action (War, Peace, or None) for an AI player against a target.
 * Evaluates military power, distance, personality traits, and game state (winning/losing).
 * @param playerId - The AI player making the decision.
 * @param targetId - The target player to evaluate.
 * @param state - The current game state.
 * @param options - Optional flags (e.g., ignorePrep to bypass war preparation).
 * @returns The decision: "DeclareWar", "ProposePeace", "AcceptPeace", "PrepareForWar", or "None".
 */
export function aiWarPeaceDecision(playerId: string, targetId: string, state: GameState, options?: { ignorePrep?: boolean }): WarPeaceDecision {
    if (!ensureInitialContact(state, playerId, targetId)) return "None";

    const context = buildDecisionContext(playerId, targetId, state);

    if (context.inWar) {
        return evaluateWarState(context, options);
    }

    return evaluatePeaceState(context, options);
}

type DecisionContext = {
    playerId: string;
    targetId: string;
    state: GameState;
    personality: ReturnType<typeof getPersonalityForPlayer>;
    aggression: ReturnType<typeof getPersonalityForPlayer>["aggression"];
    baseWarPowerThreshold: number;
    victoryBias: ReturnType<typeof aiVictoryBias>;
    escalationFactor: number;
    warPowerThreshold: number;
    mapSizeFactor: number;
    distanceScale: number;
    capitalBonus: number;
    largeMapAggressionBonus: number;
    finalWarPowerThreshold: number;
    distanceBonus: number;
    scaledBaseDistance: number;
    warDistanceMax: number;
    stance: DiplomacyState;
    aiPower: number;
    enemyPower: number;
    peaceThreshold: number;
    progressRisk: boolean;
    inWar: boolean;
    contactTurnKey: string;
    metTurn: number;
    contactTurns: number;
    declareAfterContact: number;
    stateChangedTurn: number;
    turnsSinceChange: number;
};

function ensureInitialContact(state: GameState, playerId: string, targetId: string): boolean {
    if (state.contacts?.[playerId]?.[targetId]) {
        return true;
    }

    const visibleKeys = getVisibleKeys(state, playerId);
    const seesAny =
        state.units.some(u => u.ownerId === targetId && visibleKeys.has(hexToString(u.coord))) ||
        state.cities.some(c => c.ownerId === targetId && visibleKeys.has(hexToString(c.coord)));

    if (seesAny) {
        setContact(state, playerId, targetId);
        return true;
    }

    return false;
}

function buildDecisionContext(playerId: string, targetId: string, state: GameState): DecisionContext {
    const personality = getPersonalityForPlayer(state, playerId);
    const profile = getAiProfileV2(state, playerId); // v6.2: Get profile for civ checks
    const aggression = personality.aggression;

    const baseWarPowerThreshold = (() => {
        if (aggression.aggressionSpikeTrigger === "TitanBuilt" && hasTitan(playerId, state)) {
            return aggression.warPowerThresholdLate ?? aggression.warPowerThreshold;
        }
        if (aggression.aggressionSpikeTrigger === "ProgressLead" && hasProgressLead(playerId, state)) {
            aiInfo(`[AI AGGRESSION] ${playerId} has population lead - becoming more aggressive!`);
            return aggression.warPowerThresholdLate ?? aggression.warPowerThreshold;
        }
        return aggression.warPowerThreshold;
    })();

    const victoryBias = aiVictoryBias(playerId, state);
    let escalationFactor = 1.0;
    if (victoryBias === "Conquest" || profile.civName === "ForgeClans") {
        escalationFactor = getWarEscalationFactor(state.turn);
        // Forge Clans get extra 15% aggression ramp
        if (profile.civName === "ForgeClans") escalationFactor *= 0.85;
    } else if (state.turn > 150) {
        // Late Game Total War: All civs become aggressive to prevent stalls
        const lateProgress = Math.min(1, (state.turn - 150) / 40); // 40 turn ramp to chaos
        escalationFactor = 1.0 - (lateProgress * 0.5); // Down to 0.5 factor
    }

    const warPowerThreshold = (victoryBias === "Conquest" || profile.civName === "ForgeClans")
        ? baseWarPowerThreshold
        : Math.max(baseWarPowerThreshold, 1.1);

    const mapWidth = state.map.width;
    const mapHeight = state.map.height;
    const mapSizeFactor = Math.max(1.0, (mapWidth * mapHeight) / (24 * 24));
    const distanceScale = Math.sqrt(mapSizeFactor);

    let capitalBonus = 1.0;
    // Late game: ignore capital distance penalty, just kill
    if (escalationFactor < 1.0 || (profile.civName === "ForgeClans" && state.turn > 100)) {
        capitalBonus = 0.9;
        const capDist = getEnemyCapitalDistance(playerId, targetId, state);
        if (capDist !== null && capDist <= aggression.warDistanceMax * distanceScale) {
            capitalBonus = 0.8; // More aggressive near capitals
        }
    }

    let largeMapAggressionBonus = 1.0;
    if (victoryBias === "Conquest" && mapSizeFactor >= 1.0) {
        largeMapAggressionBonus = 0.9;
    }

    const finalWarPowerThreshold = warPowerThreshold * escalationFactor * capitalBonus * largeMapAggressionBonus;
    const distanceBonus = Math.max(0, Math.floor((state.turn - 100) / 20));
    const scaledBaseDistance = Math.ceil(aggression.warDistanceMax * distanceScale);
    const warDistanceMax = (escalationFactor < 1.0) ? 999 : scaledBaseDistance + distanceBonus;

    const stance = state.diplomacy?.[playerId]?.[targetId] ?? DiplomacyState.Peace;
    const aiPower = estimateMilitaryPower(playerId, state);
    const enemyPower = estimateMilitaryPower(targetId, state);

    let peaceThreshold = aggression.peacePowerThreshold;
    if (victoryBias === "Conquest" && mapSizeFactor >= 1.0) {
        peaceThreshold -= 0.1;
    }

    const progressRisk = progressRaceRiskHigh(playerId, state);
    const inWar = stance === DiplomacyState.War;
    const contactTurnKey = `metTurn_${targetId}`;
    const metTurn = (state.contacts?.[playerId] as any)?.[contactTurnKey] ?? state.turn;
    const contactTurns = Math.max(0, state.turn - metTurn);
    const declareAfterContact = personality.declareAfterContactTurns ?? 0;

    const stateChangedTurn = state.diplomacyChangeTurn?.[playerId]?.[targetId] ?? 0;
    const turnsSinceChange = state.turn - stateChangedTurn;

    return {
        playerId,
        targetId,
        state,
        personality,
        aggression,
        baseWarPowerThreshold,
        victoryBias,
        escalationFactor,
        warPowerThreshold,
        mapSizeFactor,
        distanceScale,
        capitalBonus,
        largeMapAggressionBonus,
        finalWarPowerThreshold,
        distanceBonus,
        scaledBaseDistance,
        warDistanceMax,
        stance,
        aiPower,
        enemyPower,
        peaceThreshold,
        progressRisk,
        inWar,
        contactTurnKey,
        metTurn,
        contactTurns,
        declareAfterContact,
        stateChangedTurn,
        turnsSinceChange,
    };
}

function evaluateWarState(context: DecisionContext, _options?: { ignorePrep?: boolean }): WarPeaceDecision {
    const { playerId, targetId, state, escalationFactor, progressRisk } = context;

    // Use typed evaluators
    const power = evaluatePowerRatio(playerId, targetId, state);
    const warStatus = evaluateWarStatus(playerId, targetId, state);

    const MIN_WAR_DURATION = (power.isOverwhelming || power.isFinishable || power.hasCityAdvantage || warStatus.isWinning) ? 25 : 15;

    if (warStatus.turnsSinceChange < MIN_WAR_DURATION) {
        return "None";
    }
    aiLog(`[AI WAR] ${playerId} vs ${targetId}: War duration ${warStatus.turnsSinceChange}/${MIN_WAR_DURATION} - eligible for peace`);

    const enemyCities = state.cities.filter(c => c.ownerId === targetId);
    const hasCapturableCity = enemyCities.some(c => c.hp <= 0);

    if (hasCapturableCity) {
        aiInfo(`[AI WAR CONTINUE] ${playerId} refusing peace with ${targetId} - city is CAPTURABLE (HP <= 0)!`);
        return "None";
    }

    const lateGameDeathWar = escalationFactor < 0.8;

    if (warStatus.isExhausted && !power.isFinishable && !power.isOverwhelming && !power.isDominating && !lateGameDeathWar) {
        aiInfo(`[AI WAR EXHAUSTED] ${playerId} war-weary after ${warStatus.turnsSinceChange} turns against ${targetId}`);
        const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
        if (incomingPeace) return "AcceptPeace";
        return "ProposePeace";
    }

    if (warStatus.isStalemate && !lateGameDeathWar) {
        aiInfo(`[AI WAR STALEMATE] ${playerId} recognizes stalemate with ${targetId} after ${warStatus.turnsSinceChange} turns`);
        const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
        if (incomingPeace) return "AcceptPeace";
        return "ProposePeace";
    }

    if (power.isOverwhelming || power.isFinishable || power.hasCityAdvantage || warStatus.isWinning) {
        aiInfo(`[AI WAR CONTINUE] ${playerId} continuing war with ${targetId} (overwhelming=${power.isOverwhelming}, finishable=${power.isFinishable}, cityAdv=${power.hasCityAdvantage}, winning=${warStatus.isWinning})`);
        return "None";
    }

    const incomingPeace = state.diplomacyOffers?.some(o => o.type === "Peace" && o.from === targetId && o.to === playerId);
    if (incomingPeace && (warStatus.isLosing || progressRisk)) return "AcceptPeace";
    if (warStatus.isLosing || progressRisk) return "ProposePeace";

    return "None";
}

function evaluatePeaceState(context: DecisionContext, options?: { ignorePrep?: boolean }): WarPeaceDecision {
    const {
        playerId,
        targetId,
        state,
        warDistanceMax,
        finalWarPowerThreshold,
        aiPower,
        enemyPower,
        contactTurns,
        declareAfterContact,
        stateChangedTurn,
        turnsSinceChange,
        inWar,
        warPowerThreshold,
        capitalBonus,
        escalationFactor,
        peaceThreshold,
        mapSizeFactor,
    } = context;

    // Use typed evaluator
    const power = evaluatePowerRatio(playerId, targetId, state);
    const bypassPeaceDuration = power.isOverwhelming || power.isFinishable || power.isDominating;
    const theirCitiesExist = state.cities.some(c => c.ownerId === targetId);

    const player = state.players.find(p => p.id === playerId);
    const prep = player?.warPreparation;
    const isPrepping = prep && prep.targetId === targetId;
    const isReady = isPrepping && prep.state === "Ready";

    if (power.isDominating && theirCitiesExist) {
        if (!options?.ignorePrep && !isReady) {
            aiInfo(`[AI DOMINATION] ${playerId} has DOMINATING power (5x) - Bypassing War Prep!`);
        }
        aiInfo(`[AI DOMINATION] ${playerId} entering DOMINATION mode against ${targetId} (power ${power.aiPower.toFixed(1)} vs ${power.enemyPower.toFixed(1)} = ${power.ratio.toFixed(1)}x)`);
        return "DeclareWar";
    }

    const MIN_PEACE_DURATION = 15;
    const hadPriorDiplomacyChange = stateChangedTurn > 0;
    if (hadPriorDiplomacyChange && !inWar && turnsSinceChange < MIN_PEACE_DURATION && !bypassPeaceDuration) {
        logVeto(`Peace too recent: ${playerId}->${targetId} turns since peace: ${turnsSinceChange}/${MIN_PEACE_DURATION}`);
        return "None";
    }

    const distEval = evaluateDistance(playerId, targetId, state, { warDistanceMax });
    if (distEval.theirCities.length === 0 || distEval.myCities.length === 0) {
        logVeto(`No cities for war eval ${playerId}->${targetId} myCities=${distEval.myCities.join(",") || "none"} theirCities=${distEval.theirCities.join(",") || "none"}`);
    }

    const dist = distEval.closestCityDist;

    if (dist !== null && (power.isOverwhelming || power.isFinishable)) {
        if (!options?.ignorePrep && !isReady) return "None";
        aiInfo(`[AI WAR FINISH] ${playerId} declaring war on ${targetId} (${power.isOverwhelming ? "OVERWHELMING" : "FINISHABLE"}: power ${power.aiPower.toFixed(1)} vs ${power.enemyPower.toFixed(1)}, dist ${dist})`);
        return "DeclareWar";
    }

    if (dist !== null && dist <= warDistanceMax && aiPower >= enemyPower * finalWarPowerThreshold) {
        if (!options?.ignorePrep && !isReady) return "None";
        if (escalationFactor < 1.0) {
            aiInfo(`[AI WAR ESCALATION] ${playerId} declaring war on ${targetId} (Escalation: ${(escalationFactor * 100).toFixed(0)}%, CapBonus: ${(capitalBonus * 100).toFixed(0)}%, Threshold: ${finalWarPowerThreshold.toFixed(2)})`);
        }
        aiInfo(`[AI WAR] ${playerId} declaring war on ${targetId} (power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)}, dist ${dist})`);
        return "DeclareWar";
    } else if (dist !== null && dist <= warDistanceMax) {
        if (aiPower >= enemyPower * 0.25) {
            return "PrepareForWar";
        }
    }

    if (declareAfterContact > 0 && contactTurns >= declareAfterContact && dist !== null) {
        const forcedWarThreshold = Math.max(0.8, warPowerThreshold);
        if (aiPower >= enemyPower * forcedWarThreshold) {
            if (!options?.ignorePrep && !isReady) return "None";
            aiInfo(`[AI WAR CONTACT] ${playerId} declaring war on ${targetId} after ${contactTurns} turns of contact`);
            return "DeclareWar";
        } else {
            if (aiPower >= enemyPower * 0.25) {
                return "PrepareForWar";
            }
            logVeto(`Force-war veto: ${playerId}->${targetId} power ${aiPower.toFixed(1)} vs ${enemyPower.toFixed(1)} (threshold ${forcedWarThreshold.toFixed(2)})`);
        }
    }

    if (dist === null) {
        logVeto(`No enemy city distance for ${playerId}->${targetId} contactTurns=${contactTurns} myCities=${distEval.myCities.join(",") || "none"} theirCities=${distEval.theirCities.join(",") || "none"}`);
    } else {
        logVeto(
            `No war: ${playerId}->${targetId} dist ${dist}/${warDistanceMax} power ${aiPower.toFixed(
                1
            )} vs ${enemyPower.toFixed(1)} req ${finalWarPowerThreshold.toFixed(2)} (base ${warPowerThreshold}) contactTurns=${contactTurns} myCities=${distEval.myCities.join(",") || "none"} theirCities=${distEval.theirCities.join(",") || "none"}`
        );
    }

    void peaceThreshold; // Retain parity with prior variables even if unused.
    void mapSizeFactor;

    return "None";
}

export { aiVictoryBias } from "./ai/goals.js";
export { aiChooseTech } from "./ai/tech.js";
