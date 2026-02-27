/**
 * AI Camp Clearing Module
 * 
 * Manages AI decision-making and preparation for clearing native camps.
 * Uses a war-prep-like phase system: Buildup -> Gathering -> Positioning -> Ready
 */

import { CityStateYieldType, GameState, Player, DiplomacyState, NativeCamp, TechId, Unit, UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { aiInfo } from "./debug-logging.js";
import { isScoutType } from "./units/unit-helpers.js";

// Constants for camp clearing
const MIN_MILITARY_FOR_CAMP = 3;  // Require 3 military units before engaging
const MIN_TURN_FOR_CAMP_PRE_ARMY = 12;
const MIN_TURN_FOR_CAMP_ARMY_TECH = 4;
const MIN_TURN_FOR_CAMP_ARMY_FIELDED = 2;
const CAMP_SETTLE_RADIUS_PRE_ARMY = 8;
const CAMP_SETTLE_RADIUS_ARMY_TECH = 13;
const CAMP_SETTLE_RADIUS_ARMY_FIELDED = 17;
const MIN_POSITIONING_UNITS = 2;  // Need 2 units positioned before attacking
const POSITIONING_RADIUS = 5;     // Units within 5 tiles of camp are "positioned"
const MIN_GATHERING_TURNS = 1;    // Minimum turns in gathering phase
const MIN_POSITIONING_TURNS = 1;  // Minimum turns in positioning phase
const RETREAT_HP_THRESHOLD = 0.3; // Retreat if HP below 30%
const CAMP_TARGET_SCORE_MIN_PRE_ARMY = 28;
const CAMP_TARGET_SCORE_MIN_ARMY_TECH = 12;
const CAMP_TARGET_SCORE_MIN_ARMY_FIELDED = 5;
const CAMP_TARGET_SCORE_EARLY_OVERRIDE = 40;
const CAMP_EMERGENCY_RADIUS = 2;
const CAMP_POWER_RADIUS = 5;
const CAMP_ARMY_URGENCY_TECH_BONUS = 18;
const CAMP_ARMY_URGENCY_FIELDED_BONUS = 34;
const CAMP_ARMY_URGENCY_START_TURN = 60;
const CAMP_ARMY_URGENCY_PER_20_TURNS = 4;
const CAMP_ARMY_URGENCY_MAX_LATE_BONUS = 24;
const CAMP_PREP_TIMEOUT_PRE_ARMY = 15;
const CAMP_PREP_TIMEOUT_ARMY_TECH = 22;
const CAMP_PREP_TIMEOUT_ARMY_FIELDED = 28;

type CampClearingReadiness = "PreArmy" | "ArmyTech" | "ArmyFielded";

type CampTargetEvaluation = {
    camp: NativeCamp;
    score: number;
    nearestCityDist: number;
    requiredMilitary: number;
};

/**
 * Main entry point for camp clearing management.
 * Called each turn for AI players.
 */
export function manageCampClearing(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.isEliminated) return state;

    // If we have active camp prep, manage it
    if (player.campClearingPrep) {
        return updateCampClearingPrep(state, player);
    }

    // Otherwise, check if we should start preparing to clear a camp
    return checkForCampTargets(state, player);
}

/**
 * Update existing camp clearing preparation - handle phase transitions
 */
function updateCampClearingPrep(state: GameState, player: Player): GameState {
    const prep = player.campClearingPrep!;
    const camp = state.nativeCamps.find(c => c.id === prep.targetCampId);

    // Cancel if camp is cleared or no longer exists
    if (!camp) {
        aiInfo(`[AI CAMP] ${player.id} cancelling camp prep - camp ${prep.targetCampId} no longer exists`);
        return clearCampPrep(state, player.id);
    }

    const campIsEmergencyThreat = camp ? isCampEmergencyThreatForPlayer(state, player.id, camp) : false;
    const readiness = getCampClearingReadiness(state, player);
    const majorWars = getMajorWarCount(state, player.id);
    const restrictToEmergency = majorWars >= 3 || (majorWars >= 2 && readiness === "PreArmy");
    if (restrictToEmergency && !campIsEmergencyThreat) {
        aiInfo(
            `[AI CAMP] ${player.id} cancelling camp prep - wartime emergency-only mode (wars=${majorWars}, readiness=${readiness})`
        );
        return clearCampPrep(state, player.id);
    }

    // Cancel if we're in war prep against a player
    if (player.warPreparation) {
        aiInfo(`[AI CAMP] ${player.id} cancelling camp prep - war preparation takes priority`);
        return clearCampPrep(state, player.id);
    }

    const turnsSinceStart = state.turn - prep.startedTurn;
    const militaryCount = getMilitaryCount(state, player.id);
    const prepTimeout = getCampPrepTimeout(readiness);

    // Timeout after readiness-adjusted duration - give up
    if (turnsSinceStart > prepTimeout) {
        aiInfo(
            `[AI CAMP] ${player.id} camp prep TIMEOUT (${turnsSinceStart}/${prepTimeout}, readiness=${readiness}) - giving up on camp ${prep.targetCampId}`
        );
        return clearCampPrep(state, player.id);
    }

    let newState = prep.state;
    const requiredMilitary = getRequiredMilitaryForCamp(state, player, camp);

    if (prep.state === "Buildup") {
        if (militaryCount >= requiredMilitary) {
            aiInfo(
                `[AI CAMP] ${player.id} finished Buildup (${militaryCount}/${requiredMilitary} units), moving to Gathering`
            );
            newState = "Gathering";
            return updatePrepState(state, player.id, { ...prep, state: newState, startedTurn: state.turn });
        }
        if (state.turn % 5 === 0) {
            aiInfo(`[AI CAMP] ${player.id} building up for camp: ${militaryCount}/${requiredMilitary} units`);
        }
    } else if (prep.state === "Gathering") {
        if (turnsSinceStart >= MIN_GATHERING_TURNS) {
            aiInfo(`[AI CAMP] ${player.id} finished Gathering, moving to Positioning`);
            newState = "Positioning";
            return updatePrepState(state, player.id, { ...prep, state: newState });
        }
    } else if (prep.state === "Positioning") {
        if (turnsSinceStart >= MIN_GATHERING_TURNS + MIN_POSITIONING_TURNS) {
            if (areUnitsPositionedForCamp(state, player.id, camp)) {
                aiInfo(`[AI CAMP] ${player.id} units positioned, Ready to attack camp!`);
                newState = "Ready";
                return updatePrepState(state, player.id, { ...prep, state: newState });
            }
        }
    }

    return state;
}

/**
 * Check if we should start preparing to clear a camp
 */
function checkForCampTargets(state: GameState, player: Player): GameState {
    if (player.warPreparation) return state; // War prep takes priority
    const readiness = getCampClearingReadiness(state, player);
    const minTurnForCamp = getMinTurnForCamp(readiness);
    const settleRadius = getCampSettleRadius(readiness);
    const scoreMin = getCampTargetScoreMin(readiness);

    const majorWars = getMajorWarCount(state, player.id);
    const restrictToEmergency = majorWars >= 3 || (majorWars >= 2 && readiness === "PreArmy");
    if (restrictToEmergency && !hasEmergencyCampThreat(state, player.id)) return state;

    // Find visible camps
    const visibleCamps = getVisibleCamps(state, player.id);
    if (visibleCamps.length === 0) return state;
    const candidateCamps = restrictToEmergency
        ? visibleCamps.filter(camp => isCampEmergencyThreatForPlayer(state, player.id, camp))
        : visibleCamps;
    if (candidateCamps.length === 0) return state;

    const evaluations = candidateCamps
        .map(camp => evaluateCampTarget(state, player, camp, readiness))
        .filter((entry): entry is CampTargetEvaluation => !!entry)
        .sort((a, b) => b.score - a.score || a.nearestCityDist - b.nearestCityDist);

    const best = evaluations[0];
    if (!best) return state;

    const militaryCount = getMilitaryCount(state, player.id);
    const globalCityStateCount = state.cityStates?.length ?? 0;
    const activePlayerCount = state.players.filter(p => !p.isEliminated).length;
    const effectiveSettleRadius = readiness === "ArmyFielded" ? settleRadius + 2 : settleRadius;
    const earlyOverride = best.nearestCityDist <= CAMP_EMERGENCY_RADIUS && best.score >= CAMP_TARGET_SCORE_EARLY_OVERRIDE;
    const scarcityOverride = readiness !== "PreArmy"
        && globalCityStateCount <= Math.max(1, Math.floor(activePlayerCount / 2) - 1)
        && best.score >= (scoreMin - 6);
    if (state.turn < minTurnForCamp && !earlyOverride) return state;

    const cityRadiusGate = best.nearestCityDist <= effectiveSettleRadius || best.nearestCityDist <= CAMP_EMERGENCY_RADIUS;
    if (!cityRadiusGate) return state;

    const scoreGate = best.score >= scoreMin || earlyOverride || scarcityOverride;
    if (!scoreGate) return state;

    const requiredMilitary = Math.max(MIN_POSITIONING_UNITS, best.requiredMilitary);
    if (militaryCount < requiredMilitary) {
        aiInfo(
            `[AI CAMP] ${player.id} delaying camp ${best.camp.id}: military ${militaryCount}/${requiredMilitary} (score ${best.score.toFixed(1)}, readiness=${readiness})`
        );
    } else {
        aiInfo(
            `[AI CAMP] ${player.id} targeting camp ${best.camp.id}: score ${best.score.toFixed(1)}, dist ${best.nearestCityDist}, military ${militaryCount}, readiness=${readiness}`
        );
    }

    return {
        ...state,
        players: state.players.map(p =>
            p.id === player.id ? {
                ...p,
                campClearingPrep: {
                    targetCampId: best.camp.id,
                    state: militaryCount >= requiredMilitary ? "Gathering" : "Buildup",
                    startedTurn: state.turn
                }
            } : p
        )
    };

}

/**
 * Get camps that the player has visibility on
 */
function getVisibleCamps(state: GameState, playerId: string): NativeCamp[] {
    // visibility/revealed arrays contain coord strings like "q,r"
    const visibleKeys = new Set(state.visibility?.[playerId] || []);
    const revealedKeys = new Set(state.revealed?.[playerId] || []);

    return state.nativeCamps.filter(camp => {
        const key = `${camp.coord.q},${camp.coord.r}`;
        return visibleKeys.has(key) || revealedKeys.has(key);
    });
}

/**
 * Count non-scout military units
 */
function getMilitaryCount(state: GameState, playerId: string): number {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian"
    ).length;
}

function getCampClearingReadiness(state: GameState, player: Player): CampClearingReadiness {
    const hasArmyTech = player.techs.includes(TechId.DrilledRanks);
    const militaryCount = getMilitaryCount(state, player.id);
    const hasMilitaryMass = militaryCount >= 4 && state.turn >= 55;
    const hasFieldedArmy = state.units.some(
        unit =>
            unit.ownerId === player.id &&
            unit.type.startsWith("Army") &&
            !isScoutType(unit.type)
    );

    if (hasFieldedArmy) return "ArmyFielded";
    if (hasArmyTech || hasMilitaryMass) return "ArmyTech";
    return "PreArmy";
}

function getMinTurnForCamp(readiness: CampClearingReadiness): number {
    if (readiness === "ArmyFielded") return MIN_TURN_FOR_CAMP_ARMY_FIELDED;
    if (readiness === "ArmyTech") return MIN_TURN_FOR_CAMP_ARMY_TECH;
    return MIN_TURN_FOR_CAMP_PRE_ARMY;
}

function getCampSettleRadius(readiness: CampClearingReadiness): number {
    if (readiness === "ArmyFielded") return CAMP_SETTLE_RADIUS_ARMY_FIELDED;
    if (readiness === "ArmyTech") return CAMP_SETTLE_RADIUS_ARMY_TECH;
    return CAMP_SETTLE_RADIUS_PRE_ARMY;
}

function getCampTargetScoreMin(readiness: CampClearingReadiness): number {
    if (readiness === "ArmyFielded") return CAMP_TARGET_SCORE_MIN_ARMY_FIELDED;
    if (readiness === "ArmyTech") return CAMP_TARGET_SCORE_MIN_ARMY_TECH;
    return CAMP_TARGET_SCORE_MIN_PRE_ARMY;
}

function getCampPrepTimeout(readiness: CampClearingReadiness): number {
    if (readiness === "ArmyFielded") return CAMP_PREP_TIMEOUT_ARMY_FIELDED;
    if (readiness === "ArmyTech") return CAMP_PREP_TIMEOUT_ARMY_TECH;
    return CAMP_PREP_TIMEOUT_PRE_ARMY;
}

function projectNextCityStateYieldType(state: GameState): CityStateYieldType {
    const rotation: CityStateYieldType[] = ["Science", "Production", "Food", "Gold"];
    const cursor = state.cityStateTypeCycleIndex ?? 0;
    return rotation[cursor % rotation.length];
}

function getCityStateYieldPriority(player: Player, yieldType: CityStateYieldType): number {
    const goal = player.aiGoal ?? "Balanced";
    const treasury = player.treasury ?? 0;
    const netGold = player.netGold ?? 0;

    const baseByGoal: Record<CityStateYieldType, number> = goal === "Progress"
        ? { Science: 1.35, Production: 0.95, Food: 1.0, Gold: 1.1 }
        : goal === "Conquest"
            ? { Science: 0.85, Production: 1.45, Food: 1.05, Gold: 1.2 }
            : { Science: 1.1, Production: 1.1, Food: 1.05, Gold: 1.1 };

    let priority = baseByGoal[yieldType];
    if (yieldType === "Gold" && (netGold < 0 || treasury < 40)) {
        priority += 0.3;
    }
    if (yieldType === "Food" && goal !== "Conquest") {
        priority += 0.1;
    }
    return priority;
}

function estimateUnitPower(type: UnitType): number {
    const stats = UNITS[type];
    return (stats.atk * 1.8) + (stats.def * 1.1) + (stats.hp * 0.12) + (stats.rng * 1.25);
}

function estimateNearbyFriendlyPower(state: GameState, playerId: string, camp: NativeCamp): number {
    let power = 0;
    for (const unit of state.units) {
        if (unit.ownerId !== playerId) continue;
        if (isScoutType(unit.type)) continue;
        if (UNITS[unit.type].domain === "Civilian") continue;
        if (hexDistance(unit.coord, camp.coord) > CAMP_POWER_RADIUS) continue;
        power += estimateUnitPower(unit.type);
    }
    return power;
}

function estimateCampDefenderPower(state: GameState, camp: NativeCamp): { count: number; power: number } {
    const defenders = state.units.filter(unit => unit.campId === camp.id);
    const power = defenders.reduce((sum, defender) => sum + estimateUnitPower(defender.type), 0);
    return { count: defenders.length, power };
}

function getNearestSettlerDistance(state: GameState, playerId: string, camp: NativeCamp): number {
    const settlers = state.units.filter(unit => unit.ownerId === playerId && unit.type === UnitType.Settler);
    if (settlers.length === 0) return Number.POSITIVE_INFINITY;
    let best = Number.POSITIVE_INFINITY;
    for (const settler of settlers) {
        best = Math.min(best, hexDistance(settler.coord, camp.coord));
    }
    return best;
}

function isCampEmergencyThreatForPlayer(state: GameState, playerId: string, camp: NativeCamp): boolean {
    const myCities = state.cities.filter(city => city.ownerId === playerId);
    if (myCities.length === 0) return false;
    const nearestCityDist = Math.min(...myCities.map(city => hexDistance(city.coord, camp.coord)));
    return nearestCityDist <= CAMP_EMERGENCY_RADIUS;
}

function hasEmergencyCampThreat(state: GameState, playerId: string): boolean {
    for (const camp of state.nativeCamps) {
        if (isCampEmergencyThreatForPlayer(state, playerId, camp)) return true;
    }
    return false;
}

function getMajorWarCount(state: GameState, playerId: string): number {
    const relations = state.diplomacy?.[playerId] || {};
    let wars = 0;
    for (const player of state.players) {
        if (player.id === playerId || player.isEliminated) continue;
        if (relations[player.id] === DiplomacyState.War) wars += 1;
    }
    return wars;
}

function evaluateCampTarget(
    state: GameState,
    player: Player,
    camp: NativeCamp,
    readiness: CampClearingReadiness
): CampTargetEvaluation | null {
    const myCities = state.cities.filter(c => c.ownerId === player.id);
    if (myCities.length === 0) return null;

    const nearestCityDist = Math.min(...myCities.map(city => hexDistance(city.coord, camp.coord)));
    const nearestSettlerDist = getNearestSettlerDistance(state, player.id, camp);
    const yieldType = projectNextCityStateYieldType(state);
    const yieldPriority = getCityStateYieldPriority(player, yieldType);
    const localPower = estimateNearbyFriendlyPower(state, player.id, camp);
    const defenders = estimateCampDefenderPower(state, camp);
    const powerRatio = localPower / Math.max(1, defenders.power);
    const mySuzerainCount = (state.cityStates ?? []).filter(cityState => cityState.suzerainId === player.id).length;
    const activePlayerCount = state.players.filter(p => !p.isEliminated).length;
    const globalCityStateCount = state.cityStates?.length ?? 0;

    const expansionPressure = Math.max(0, 8 - nearestCityDist) * 7;
    const settlerPressure = Number.isFinite(nearestSettlerDist)
        ? Math.max(0, 6 - nearestSettlerDist) * 4
        : 0;
    const rewardScore = yieldPriority * 30;
    const earlyTempoBonus = state.turn <= 120
        ? 10
        : state.turn <= 180
            ? 4
            : 0;
    const armyUrgencyBonus = readiness === "ArmyFielded"
        ? CAMP_ARMY_URGENCY_FIELDED_BONUS
        : readiness === "ArmyTech"
            ? CAMP_ARMY_URGENCY_TECH_BONUS
            : 0;
    const lateUrgencyBonus = readiness === "PreArmy"
        ? 0
        : Math.min(
            CAMP_ARMY_URGENCY_MAX_LATE_BONUS,
            Math.max(0, Math.floor((state.turn - CAMP_ARMY_URGENCY_START_TURN) / 20)) * CAMP_ARMY_URGENCY_PER_20_TURNS
        );
    const postArmyPushBonus = readiness === "PreArmy" || state.turn < CAMP_ARMY_URGENCY_START_TURN
        ? 0
        : 16;
    const firstSuzerainBonus = mySuzerainCount === 0 ? 24 : 0;
    const globalScarcityBonus = globalCityStateCount < Math.max(1, Math.floor(activePlayerCount / 2))
        ? 10
        : globalCityStateCount < activePlayerCount
            ? 6
            : 0;
    const nearFrontierBonus = nearestCityDist <= 5 ? 6 : 0;
    const nativeThreatPenalty = defenders.count * 3;
    const underpoweredPenaltyMultiplier = readiness === "PreArmy"
        ? 26
        : readiness === "ArmyTech"
            ? 18
            : 12;
    const underpoweredPenalty = powerRatio >= 0.9
        ? 0
        : (0.9 - powerRatio) * underpoweredPenaltyMultiplier;
    const majorWars = getMajorWarCount(state, player.id);
    const baseWartimePenaltyPerWar = readiness === "PreArmy"
        ? ((player.aiGoal ?? "Balanced") === "Conquest" ? 10 : 16)
        : readiness === "ArmyTech"
            ? ((player.aiGoal ?? "Balanced") === "Conquest" ? 4 : 8)
            : ((player.aiGoal ?? "Balanced") === "Conquest" ? 2 : 5);
    const wartimePenaltyScale = mySuzerainCount === 0 ? 0.7 : 1;
    const wartimePenalty = majorWars * baseWartimePenaltyPerWar * wartimePenaltyScale;

    const score = expansionPressure
        + settlerPressure
        + rewardScore
        + earlyTempoBonus
        + armyUrgencyBonus
        + lateUrgencyBonus
        + postArmyPushBonus
        + firstSuzerainBonus
        + globalScarcityBonus
        + nearFrontierBonus
        - nativeThreatPenalty
        - underpoweredPenalty
        - wartimePenalty;

    let requiredMilitary = powerRatio >= 1.15
        ? 2
        : powerRatio >= 0.9
            ? 3
            : 4;
    if (defenders.count <= 2) {
        requiredMilitary = Math.max(2, requiredMilitary - 1);
    }
    if (nearestCityDist <= 2) {
        requiredMilitary = Math.max(2, requiredMilitary - 1);
    }
    if (readiness === "PreArmy") {
        requiredMilitary += 1;
    } else if (readiness === "ArmyFielded") {
        requiredMilitary -= 1;
    }
    if (readiness === "ArmyFielded" && powerRatio >= 1) {
        requiredMilitary -= 1;
    }
    requiredMilitary = Math.max(MIN_POSITIONING_UNITS, Math.min(5, requiredMilitary));

    return {
        camp,
        score,
        nearestCityDist,
        requiredMilitary,
    };
}

function getRequiredMilitaryForCamp(state: GameState, player: Player, camp: NativeCamp): number {
    const readiness = getCampClearingReadiness(state, player);
    const evalResult = evaluateCampTarget(state, player, camp, readiness);
    if (!evalResult) return MIN_MILITARY_FOR_CAMP;
    return Math.max(MIN_POSITIONING_UNITS, evalResult.requiredMilitary);
}

/**
 * Check if enough units are positioned near the camp
 */
function areUnitsPositionedForCamp(state: GameState, playerId: string, camp: NativeCamp): boolean {
    const myUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian"
    );

    let positionedCount = 0;
    for (const unit of myUnits) {
        if (hexDistance(unit.coord, camp.coord) <= POSITIONING_RADIUS) {
            positionedCount++;
        }
    }

    return positionedCount >= MIN_POSITIONING_UNITS;
}

/**
 * Clear camp prep from player
 */
function clearCampPrep(state: GameState, playerId: string): GameState {
    return {
        ...state,
        players: state.players.map(p =>
            p.id === playerId ? { ...p, campClearingPrep: undefined } : p
        )
    };
}

/**
 * Update prep state
 */
function updatePrepState(state: GameState, playerId: string, prep: NonNullable<Player["campClearingPrep"]>): GameState {
    return {
        ...state,
        players: state.players.map(p =>
            p.id === playerId ? { ...p, campClearingPrep: prep } : p
        )
    };
}

/**
 * Get the target camp for movement/attack decisions.
 * Returns null if not in Ready state.
 */
export function getTargetCamp(state: GameState, playerId: string): NativeCamp | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player?.campClearingPrep) return null;

    const prep = player.campClearingPrep;
    return state.nativeCamps.find(c => c.id === prep.targetCampId) || null;
}

/**
 * Check if player is in a camp clearing phase that requires unit movement toward camp
 */
export function shouldMoveTowardCamp(state: GameState, playerId: string): boolean {
    const player = state.players.find(p => p.id === playerId);
    if (!player?.campClearingPrep) return false;

    const phase = player.campClearingPrep.state;
    return phase === "Gathering" || phase === "Positioning" || phase === "Ready";
}

/**
 * Check if player is ready to attack the camp
 */
export function isReadyToAttackCamp(state: GameState, playerId: string): boolean {
    const player = state.players.find(p => p.id === playerId);
    return player?.campClearingPrep?.state === "Ready";
}

/**
 * Get native units sorted by attack priority.
 * Priority: lowest HP first, archers before champion
 */
export function getPrioritizedNativeTargets(state: GameState, campId: string): Unit[] {
    const campUnits = state.units.filter(u => u.campId === campId);

    return campUnits.sort((a, b) => {
        // Archers before Champion (Champion is more dangerous near camp)
        if (a.type === UnitType.NativeChampion && b.type !== UnitType.NativeChampion) return 1;
        if (a.type !== UnitType.NativeChampion && b.type === UnitType.NativeChampion) return -1;

        // Lowest HP first
        return a.hp - b.hp;
    });
}

/**
 * Check if a unit should retreat from camp combat
 */
export function shouldRetreatFromCampCombat(unit: Unit): boolean {
    return unit.hp / unit.maxHp < RETREAT_HP_THRESHOLD;
}

/**
 * Check if attacking would be a sacrifice that doesn't result in a kill.
 * Returns true if the attack is worth taking (kills target or unit survives).
 */
export function isWorthwhileAttack(
    attackerHp: number,
    expectedDamageToTarget: number,
    targetHp: number,
    expectedCounterDamage: number
): boolean {
    const wouldKillTarget = expectedDamageToTarget >= targetHp;
    const wouldSurvive = attackerHp > expectedCounterDamage;

    // Worth it if: we survive OR we kill the target
    return wouldSurvive || wouldKillTarget;
}
