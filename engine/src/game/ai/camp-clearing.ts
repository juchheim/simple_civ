/**
 * AI Camp Clearing Module
 * 
 * Manages AI decision-making and preparation for clearing native camps.
 * Uses a war-prep-like phase system: Buildup -> Gathering -> Positioning -> Ready
 */

import { CityStateYieldType, GameState, Player, DiplomacyState, NativeCamp, TechId, Unit, UnitType, HistoryEventType } from "../../core/types.js";
import type { CampClearingPrep } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { aiInfo } from "./debug-logging.js";
import { isScoutType } from "./units/unit-helpers.js";
import { logEvent } from "../history.js";

// Constants for camp clearing
const MIN_MILITARY_FOR_CAMP = 3;  // Require 3 military units before engaging
const MIN_TURN_FOR_CAMP_PRE_ARMY = 10;
const MIN_TURN_FOR_CAMP_ARMY_TECH = 2;
const MIN_TURN_FOR_CAMP_ARMY_FIELDED = 2;
const CAMP_MILITARY_MASS_READINESS_TURN = 44;
const CAMP_SETTLE_RADIUS_PRE_ARMY = 8;
const CAMP_SETTLE_RADIUS_ARMY_TECH = 13;
const CAMP_SETTLE_RADIUS_ARMY_FIELDED = 17;
const MIN_POSITIONING_UNITS = 2;  // Need 2 units positioned before attacking
const POSITIONING_RADIUS = 5;     // Units within 5 tiles of camp are "positioned"
const MIN_GATHERING_TURNS_PRE_ARMY = 1;
const MIN_GATHERING_TURNS_POST_ARMY = 0;
const MIN_POSITIONING_TURNS_PRE_ARMY = 1;
const MIN_POSITIONING_TURNS_POST_ARMY = 0;
const RETREAT_HP_THRESHOLD = 0.3; // Retreat if HP below 30%
const CAMP_TARGET_SCORE_MIN_PRE_ARMY = 24;
const CAMP_TARGET_SCORE_MIN_ARMY_TECH = 6;
const CAMP_TARGET_SCORE_MIN_ARMY_FIELDED = 1;
const CAMP_TARGET_SCORE_EARLY_OVERRIDE = 34;
const CAMP_EMERGENCY_RADIUS = 2;
const CAMP_POWER_RADIUS = 5;
const CAMP_ARMY_URGENCY_TECH_BONUS = 22;
const CAMP_ARMY_URGENCY_FIELDED_BONUS = 40;
const CAMP_ARMY_URGENCY_START_TURN = 40;
const CAMP_ARMY_URGENCY_PER_20_TURNS = 4;
const CAMP_ARMY_URGENCY_MAX_LATE_BONUS = 24;
const CAMP_RACE_PRESSURE_RADIUS = 7;
const CAMP_RACE_PRESSURE_NEAR_BONUS = 18;
const CAMP_RACE_PRESSURE_CLOSE_BONUS = 30;
const CAMP_RACE_PRESSURE_CRITICAL_BONUS = 44;
const CAMP_RACE_PRESSURE_MULTI_UNIT_BONUS = 8;
const CAMP_RACE_PRESSURE_AGGRO_BONUS = 6;
const CAMP_RACE_PRESSURE_MAX_CITY_DISTANCE = 6;
const CAMP_RACE_PRESSURE_MIN_POWER_RATIO = 0.85;
const CAMP_RACE_INTERCEPT_MIN_PRESSURE = CAMP_RACE_PRESSURE_CLOSE_BONUS;
const CAMP_RACE_INTERCEPT_CANCEL_LAG = 2;
const CAMP_RACE_INTERCEPT_CANCEL_MIN_TURNS = 2;
const CAMP_RACE_INTERCEPT_SKIP_ETA_GAP = 3;
const CAMP_PREP_TIMEOUT_PRE_ARMY = 15;
const CAMP_PREP_TIMEOUT_ARMY_TECH = 26;
const CAMP_PREP_TIMEOUT_ARMY_FIELDED = 34;
const CAMP_POST_ARMY_SHORTFALL_ALLOWANCE = 1;
const CAMP_POST_ARMY_SHORTFALL_RADIUS = 8;

export type CampClearingReadiness = "PreArmy" | "ArmyTech" | "ArmyFielded";
type CampPrepPhase = CampClearingPrep["state"];

export type CampTargetDiagnostics = {
    readiness: CampClearingReadiness;
    score: number;
    nearestCityDist: number;
    requiredMilitary: number;
    militaryCount: number;
};

export type CampPrepCancellationReason = "TimedOut" | "WarPrepCancelled" | "WartimeEmergencyCancelled" | "Other";
type CampPrepEndTelemetryOutcome =
    | "TimedOut"
    | "WarPrepCancelled"
    | "WartimeEmergencyCancelled"
    | "CampVanished"
    | "Retargeted"
    | "OtherCancelled";

type CampTargetEvaluation = {
    camp: NativeCamp;
    score: number;
    nearestCityDist: number;
    requiredMilitary: number;
    racePressureBonus: number;
};

type CampRaceTiming = {
    highPressure: boolean;
    losingEta: boolean;
    myApproachDist: number;
    rivalApproachDist: number;
    etaGap: number;
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
        logCampPrepEnded(state, player.id, prep, "CampVanished");
        return clearCampPrepAndRetarget(state, player.id, prep.targetCampId);
    }

    const campIsEmergencyThreat = camp ? isCampEmergencyThreatForPlayer(state, player.id, camp) : false;
    const readiness = getCampClearingReadiness(state, player);
    const majorWars = getMajorWarCount(state, player.id);
    const restrictToEmergency = majorWars >= 3 || (majorWars >= 2 && readiness === "PreArmy");
    if (restrictToEmergency && !campIsEmergencyThreat) {
        aiInfo(
            `[AI CAMP] ${player.id} cancelling camp prep - wartime emergency-only mode (wars=${majorWars}, readiness=${readiness})`
        );
        logCampPrepEnded(state, player.id, prep, "WartimeEmergencyCancelled");
        return clearCampPrepAndRetarget(state, player.id, prep.targetCampId);
    }

    // Cancel if we're in war prep against a player
    if (player.warPreparation) {
        aiInfo(`[AI CAMP] ${player.id} cancelling camp prep - war preparation takes priority`);
        logCampPrepEnded(state, player.id, prep, "WarPrepCancelled");
        return clearCampPrepAndRetarget(state, player.id, prep.targetCampId);
    }

    const turnsSinceStart = state.turn - prep.startedTurn;
    const militaryCount = getMilitaryCount(state, player.id);
    const prepTimeout = getCampPrepTimeout(readiness);

    // Timeout after readiness-adjusted duration - give up
    if (turnsSinceStart > prepTimeout) {
        aiInfo(
            `[AI CAMP] ${player.id} camp prep TIMEOUT (${turnsSinceStart}/${prepTimeout}, readiness=${readiness}) - giving up on camp ${prep.targetCampId}`
        );
        logCampPrepEnded(state, player.id, prep, "TimedOut");
        return clearCampPrepAndRetarget(state, player.id, prep.targetCampId);
    }

    let newState = prep.state;
    const requiredMilitary = getRequiredMilitaryForCamp(state, player, camp);
    const nearestCityDist = getNearestOwnedCityDistance(state, player.id, camp);
    const hasOperationalForce = canProceedWithCampAssault(
        readiness,
        militaryCount,
        requiredMilitary,
        nearestCityDist,
    );
    const raceTiming = evaluateCampRaceTiming(state, player.id, camp, readiness, undefined, {
        score: 0,
        nearestCityDist,
        requiredMilitary,
        militaryCount,
        racePressureBonus: 0,
    });
    const militaryShortfall = Math.max(0, requiredMilitary - militaryCount);
    if (
        prep.state !== "Ready"
        && raceTiming.highPressure
        && raceTiming.losingEta
        && (
            raceTiming.etaGap >= CAMP_RACE_INTERCEPT_SKIP_ETA_GAP
            || (militaryShortfall >= CAMP_RACE_INTERCEPT_CANCEL_LAG && turnsSinceStart >= CAMP_RACE_INTERCEPT_CANCEL_MIN_TURNS)
        )
    ) {
        aiInfo(
            `[AI CAMP] ${player.id} abandoning losing race for ${prep.targetCampId} ` +
            `(myEta=${raceTiming.myApproachDist}, rivalEta=${raceTiming.rivalApproachDist}, etaGap=${raceTiming.etaGap}, shortfall=${militaryShortfall})`
        );
        logCampPrepEnded(state, player.id, prep, "OtherCancelled");
        return clearCampPrepAndRetarget(state, player.id, prep.targetCampId);
    }

    if (prep.state === "Buildup") {
        if (hasOperationalForce) {
            aiInfo(
                `[AI CAMP] ${player.id} finished Buildup (${militaryCount}/${requiredMilitary} units), moving to Gathering`
            );
            newState = readiness === "PreArmy"
                ? "Gathering"
                : areUnitsPositionedForCamp(state, player.id, camp)
                    ? "Ready"
                    : "Positioning";
            const nextPrep = { ...prep, state: newState, startedTurn: state.turn };
            logCampPrepStateChanged(state, player.id, nextPrep, prep.state);
            return updatePrepState(state, player.id, nextPrep);
        }
        if (state.turn % 5 === 0) {
            aiInfo(`[AI CAMP] ${player.id} building up for camp: ${militaryCount}/${requiredMilitary} units`);
        }
    } else if (prep.state === "Gathering") {
        if (turnsSinceStart >= getMinGatheringTurns(readiness)) {
            if (readiness !== "PreArmy" && areUnitsPositionedForCamp(state, player.id, camp)) {
                aiInfo(`[AI CAMP] ${player.id} finished Gathering with units in place, Ready to attack camp!`);
                newState = "Ready";
            } else {
                aiInfo(`[AI CAMP] ${player.id} finished Gathering, moving to Positioning`);
                newState = "Positioning";
            }
            const nextPrep = { ...prep, state: newState };
            logCampPrepStateChanged(state, player.id, nextPrep, prep.state);
            return updatePrepState(state, player.id, nextPrep);
        }
    } else if (prep.state === "Positioning") {
        if (turnsSinceStart >= getMinGatheringTurns(readiness) + getMinPositioningTurns(readiness)) {
            if (areUnitsPositionedForCamp(state, player.id, camp)) {
                aiInfo(`[AI CAMP] ${player.id} units positioned, Ready to attack camp!`);
                newState = "Ready";
                const nextPrep = { ...prep, state: newState };
                logCampPrepStateChanged(state, player.id, nextPrep, prep.state);
                return updatePrepState(state, player.id, nextPrep);
            }
        }
    }

    return state;
}

/**
 * Check if we should start preparing to clear a camp
 */
function checkForCampTargets(
    state: GameState,
    player: Player,
    excludedCampIds?: Set<string>,
): GameState {
    if (player.warPreparation) return state; // War prep takes priority
    const readiness = getCampClearingReadiness(state, player);
    const minTurnForCamp = getMinTurnForCamp(readiness);
    const settleRadius = getCampSettleRadius(readiness);
    const scoreMin = getCampTargetScoreMin(readiness);

    const majorWars = getMajorWarCount(state, player.id);
    const restrictToEmergency = majorWars >= 3 || (majorWars >= 2 && readiness === "PreArmy");
    if (restrictToEmergency && !hasEmergencyCampThreat(state, player.id)) return state;

    const evaluations = getCampTargetEvaluations(state, player, readiness);
    if (evaluations.length === 0) return state;

    const militaryCount = getMilitaryCount(state, player.id);
    const globalCityStateCount = state.cityStates?.length ?? 0;
    const activePlayerCount = state.players.filter(p => !p.isEliminated).length;
    const effectiveSettleRadius = readiness === "ArmyFielded" ? settleRadius + 2 : settleRadius;
    let selected: CampTargetEvaluation | null = null;

    for (const candidate of evaluations) {
        if (excludedCampIds?.has(candidate.camp.id)) {
            continue;
        }
        const earlyOverride = candidate.nearestCityDist <= CAMP_EMERGENCY_RADIUS && candidate.score >= CAMP_TARGET_SCORE_EARLY_OVERRIDE;
        const scarcityOverride = readiness !== "PreArmy"
            && globalCityStateCount <= Math.max(1, Math.floor(activePlayerCount / 2) - 1)
            && candidate.score >= (scoreMin - 6);
        if (state.turn < minTurnForCamp && !earlyOverride) {
            continue;
        }

        const cityRadiusGate = candidate.nearestCityDist <= effectiveSettleRadius || candidate.nearestCityDist <= CAMP_EMERGENCY_RADIUS;
        if (!cityRadiusGate) {
            continue;
        }

        const scoreGate = candidate.score >= scoreMin || earlyOverride || scarcityOverride;
        if (!scoreGate) {
            continue;
        }

        const requiredMilitary = Math.max(MIN_POSITIONING_UNITS, candidate.requiredMilitary);
        const hasOperationalForce = canProceedWithCampAssault(
            readiness,
            militaryCount,
            requiredMilitary,
            candidate.nearestCityDist,
        );
        const shouldStartBuildup = canStartCampBuildup(
            readiness,
            militaryCount,
            requiredMilitary,
            candidate.nearestCityDist,
        );
        const raceTiming = evaluateCampRaceTiming(state, player.id, candidate.camp, readiness, candidate);
        const militaryShortfall = Math.max(0, requiredMilitary - militaryCount);
        const unitsAlreadyPositioned = areUnitsPositionedForCamp(state, player.id, candidate.camp);
        const canAggressivelyEscalate = readiness !== "PreArmy" && militaryShortfall <= CAMP_POST_ARMY_SHORTFALL_ALLOWANCE;
        if (
            raceTiming.highPressure
            && raceTiming.losingEta
            && raceTiming.etaGap >= CAMP_RACE_INTERCEPT_SKIP_ETA_GAP
            && !unitsAlreadyPositioned
            && !canAggressivelyEscalate
        ) {
            aiInfo(
                `[AI CAMP] ${player.id} skipping losing contested camp ${candidate.camp.id} ` +
                `(myEta=${raceTiming.myApproachDist}, rivalEta=${raceTiming.rivalApproachDist}, etaGap=${raceTiming.etaGap}, shortfall=${militaryShortfall})`
            );
            continue;
        }

        if (militaryCount < requiredMilitary && !hasOperationalForce && !shouldStartBuildup) {
            continue;
        }

        if (militaryCount < requiredMilitary && !hasOperationalForce) {
            aiInfo(
                `[AI CAMP] ${player.id} delaying camp ${candidate.camp.id}: military ${militaryCount}/${requiredMilitary} (score ${candidate.score.toFixed(1)}, readiness=${readiness})`
            );
        } else {
            aiInfo(
                `[AI CAMP] ${player.id} targeting camp ${candidate.camp.id}: score ${candidate.score.toFixed(1)}, dist ${candidate.nearestCityDist}, military ${militaryCount}, readiness=${readiness}`
            );
        }

        selected = candidate;
        break;
    }

    if (!selected) return state;

    const prep = createCampPrepFromEvaluation(state, player, readiness, selected, militaryCount);
    logCampPrepStarted(state, player.id, prep, {
        readiness,
        score: selected.score,
        nearestCityDist: selected.nearestCityDist,
        requiredMilitary: Math.max(MIN_POSITIONING_UNITS, selected.requiredMilitary),
        militaryCount,
    });

    return {
        ...state,
        players: state.players.map(p =>
            p.id === player.id ? {
                ...p,
                campClearingPrep: prep
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
    const hasMilitaryMass = militaryCount >= 4 && state.turn >= CAMP_MILITARY_MASS_READINESS_TURN;
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

function getMinGatheringTurns(readiness: CampClearingReadiness): number {
    return readiness === "PreArmy" ? MIN_GATHERING_TURNS_PRE_ARMY : MIN_GATHERING_TURNS_POST_ARMY;
}

function getMinPositioningTurns(readiness: CampClearingReadiness): number {
    return readiness === "PreArmy" ? MIN_POSITIONING_TURNS_PRE_ARMY : MIN_POSITIONING_TURNS_POST_ARMY;
}

function getCampPrepTimeout(readiness: CampClearingReadiness): number {
    if (readiness === "ArmyFielded") return CAMP_PREP_TIMEOUT_ARMY_FIELDED;
    if (readiness === "ArmyTech") return CAMP_PREP_TIMEOUT_ARMY_TECH;
    return CAMP_PREP_TIMEOUT_PRE_ARMY;
}

function getCampTargetEvaluations(
    state: GameState,
    player: Player,
    readiness: CampClearingReadiness,
): CampTargetEvaluation[] {
    const majorWars = getMajorWarCount(state, player.id);
    const restrictToEmergency = majorWars >= 3 || (majorWars >= 2 && readiness === "PreArmy");
    const visibleCamps = getVisibleCamps(state, player.id);
    if (visibleCamps.length === 0) return [];

    const candidateCamps = restrictToEmergency
        ? visibleCamps.filter(camp => isCampEmergencyThreatForPlayer(state, player.id, camp))
        : visibleCamps;

    const evaluations = candidateCamps
        .map(camp => evaluateCampTarget(state, player, camp, readiness))
        .filter((entry): entry is CampTargetEvaluation => !!entry)
        .sort((a, b) =>
            b.score - a.score
            || b.racePressureBonus - a.racePressureBonus
            || a.nearestCityDist - b.nearestCityDist
        );

    return evaluations;
}

function getNearestOwnedCityDistance(state: GameState, playerId: string, camp: NativeCamp): number {
    const myCities = state.cities.filter(city => city.ownerId === playerId);
    if (myCities.length === 0) return Number.POSITIVE_INFINITY;
    return Math.min(...myCities.map(city => hexDistance(city.coord, camp.coord)));
}

function canProceedWithCampAssault(
    readiness: CampClearingReadiness,
    militaryCount: number,
    requiredMilitary: number,
    nearestCityDist: number,
): boolean {
    if (militaryCount >= requiredMilitary) return true;
    if (readiness === "PreArmy") return false;
    return nearestCityDist <= CAMP_POST_ARMY_SHORTFALL_RADIUS
        && militaryCount >= Math.max(MIN_POSITIONING_UNITS, requiredMilitary - CAMP_POST_ARMY_SHORTFALL_ALLOWANCE);
}

function canStartCampBuildup(
    readiness: CampClearingReadiness,
    militaryCount: number,
    requiredMilitary: number,
    nearestCityDist: number,
): boolean {
    if (militaryCount >= requiredMilitary) return true;
    if (readiness === "PreArmy") return false;
    const shortfall = requiredMilitary - militaryCount;
    return shortfall <= CAMP_POST_ARMY_SHORTFALL_ALLOWANCE
        && nearestCityDist <= CAMP_POST_ARMY_SHORTFALL_RADIUS;
}

function createCampPrepFromEvaluation(
    state: GameState,
    player: Player,
    readiness: CampClearingReadiness,
    evaluation: CampTargetEvaluation,
    militaryCount: number,
): CampClearingPrep {
    const requiredMilitary = Math.max(MIN_POSITIONING_UNITS, evaluation.requiredMilitary);
    const hasOperationalForce = canProceedWithCampAssault(
        readiness,
        militaryCount,
        requiredMilitary,
        evaluation.nearestCityDist,
    );
    const unitsPositioned = hasOperationalForce && areUnitsPositionedForCamp(state, player.id, evaluation.camp);
    const initialPrepState = !hasOperationalForce
        ? "Buildup"
        : unitsPositioned && readiness !== "PreArmy"
            ? "Ready"
            : readiness === "PreArmy"
                ? "Gathering"
                : "Positioning";

    return {
        targetCampId: evaluation.camp.id,
        state: initialPrepState,
        startedTurn: state.turn,
    };
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

function estimateRivalCampPressure(
    state: GameState,
    playerId: string,
    camp: NativeCamp,
): { bonus: number; nearestRivalDist: number } {
    const visibleKeys = new Set(state.visibility?.[playerId] || []);
    let nearestRivalDist = Number.POSITIVE_INFINITY;
    let rivalMilitaryCount = 0;

    for (const unit of state.units) {
        if (unit.ownerId === playerId || unit.ownerId === "natives") continue;
        if (UNITS[unit.type].domain === "Civilian") continue;
        if (isScoutType(unit.type)) continue;
        const coordKey = `${unit.coord.q},${unit.coord.r}`;
        if (visibleKeys.size > 0 && !visibleKeys.has(coordKey)) continue;
        const dist = hexDistance(unit.coord, camp.coord);
        if (dist > CAMP_RACE_PRESSURE_RADIUS) continue;
        rivalMilitaryCount += 1;
        nearestRivalDist = Math.min(nearestRivalDist, dist);
    }

    let bonus = 0;
    if (nearestRivalDist <= 2) {
        bonus += CAMP_RACE_PRESSURE_CRITICAL_BONUS;
    } else if (nearestRivalDist <= 4) {
        bonus += CAMP_RACE_PRESSURE_CLOSE_BONUS;
    } else if (nearestRivalDist <= CAMP_RACE_PRESSURE_RADIUS) {
        bonus += CAMP_RACE_PRESSURE_NEAR_BONUS;
    }
    if (rivalMilitaryCount >= 2) {
        bonus += CAMP_RACE_PRESSURE_MULTI_UNIT_BONUS;
    }
    if (camp.state === "Aggro" && rivalMilitaryCount > 0) {
        bonus += CAMP_RACE_PRESSURE_AGGRO_BONUS;
    }

    return {
        bonus,
        nearestRivalDist,
    };
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
    const racePressure = estimateRivalCampPressure(state, player.id, camp);
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
        : nearestCityDist <= 6
            ? 28
            : 22;
    const firstSuzerainBonus = mySuzerainCount === 0 ? 24 : 0;
    const globalScarcityBonus = globalCityStateCount < Math.max(1, Math.floor(activePlayerCount / 2))
        ? 10
        : globalCityStateCount < activePlayerCount
            ? 6
            : 0;
    const nearFrontierBonus = nearestCityDist <= 5
        ? (readiness === "PreArmy" ? 6 : 12)
        : 0;
    const canCrediblyRaceForCamp = readiness !== "PreArmy"
        && nearestCityDist <= CAMP_RACE_PRESSURE_MAX_CITY_DISTANCE
        && (powerRatio >= CAMP_RACE_PRESSURE_MIN_POWER_RATIO || defenders.count <= 1);
    const rivalPressureBonus = canCrediblyRaceForCamp ? racePressure.bonus : 0;
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
        + rivalPressureBonus
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
    if (readiness !== "PreArmy" && nearestCityDist <= 6 && powerRatio >= 0.9) {
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
        racePressureBonus: rivalPressureBonus,
    };
}

function getClosestFriendlyCampApproachDistance(state: GameState, playerId: string, camp: NativeCamp): number {
    const distances = state.units
        .filter(unit =>
            unit.ownerId === playerId
            && !isScoutType(unit.type)
            && UNITS[unit.type].domain !== "Civilian"
        )
        .map(unit => hexDistance(unit.coord, camp.coord));
    return distances.length > 0 ? Math.min(...distances) : Number.POSITIVE_INFINITY;
}

function getClosestVisibleRivalCampApproachDistance(state: GameState, playerId: string, camp: NativeCamp): number {
    const visibleKeys = new Set(state.visibility?.[playerId] || []);
    const distances = state.units
        .filter(unit =>
            unit.ownerId !== playerId
            && unit.ownerId !== "natives"
            && !isScoutType(unit.type)
            && UNITS[unit.type].domain !== "Civilian"
        )
        .filter(unit => {
            if (visibleKeys.size === 0) return true;
            const key = `${unit.coord.q},${unit.coord.r}`;
            return visibleKeys.has(key);
        })
        .map(unit => hexDistance(unit.coord, camp.coord));
    return distances.length > 0 ? Math.min(...distances) : Number.POSITIVE_INFINITY;
}

function evaluateCampRaceTiming(
    state: GameState,
    playerId: string,
    camp: NativeCamp,
    readiness: CampClearingReadiness,
    evaluation?: CampTargetEvaluation,
    fallback?: {
        score: number;
        nearestCityDist: number;
        requiredMilitary: number;
        militaryCount: number;
        racePressureBonus: number;
    },
): CampRaceTiming {
    const player = state.players.find(entry => entry.id === playerId);
    const targetEvaluation = evaluation
        ?? (player ? evaluateCampTarget(state, player, camp, readiness) : null)
        ?? fallback;
    const racePressureBonus = targetEvaluation?.racePressureBonus ?? 0;
    const highPressure = racePressureBonus >= CAMP_RACE_INTERCEPT_MIN_PRESSURE;
    const myApproachDist = getClosestFriendlyCampApproachDistance(state, playerId, camp);
    const rivalApproachDist = getClosestVisibleRivalCampApproachDistance(state, playerId, camp);
    const losingEta = Number.isFinite(rivalApproachDist) && myApproachDist > (rivalApproachDist + 1);
    return {
        highPressure,
        losingEta,
        myApproachDist,
        rivalApproachDist,
        etaGap: Number.isFinite(myApproachDist) && Number.isFinite(rivalApproachDist)
            ? Math.max(0, myApproachDist - rivalApproachDist)
            : 0,
    };
}

function getRequiredMilitaryForCamp(state: GameState, player: Player, camp: NativeCamp): number {
    const readiness = getCampClearingReadiness(state, player);
    const evalResult = evaluateCampTarget(state, player, camp, readiness);
    if (!evalResult) return MIN_MILITARY_FOR_CAMP;
    return Math.max(MIN_POSITIONING_UNITS, evalResult.requiredMilitary);
}

export function getCampTargetDiagnostics(state: GameState, playerId: string, campId: string): CampTargetDiagnostics | null {
    const player = state.players.find(entry => entry.id === playerId && !entry.isEliminated);
    const camp = state.nativeCamps.find(entry => entry.id === campId);
    if (!player || !camp) return null;

    const readiness = getCampClearingReadiness(state, player);
    const evaluation = evaluateCampTarget(state, player, camp, readiness);
    if (!evaluation) return null;

    return {
        readiness,
        score: evaluation.score,
        nearestCityDist: evaluation.nearestCityDist,
        requiredMilitary: Math.max(MIN_POSITIONING_UNITS, evaluation.requiredMilitary),
        militaryCount: getMilitaryCount(state, playerId),
    };
}

export function classifyCampPrepCancellation(
    state: GameState,
    playerId: string,
    prep: CampClearingPrep,
): CampPrepCancellationReason {
    const player = state.players.find(entry => entry.id === playerId);
    if (!player || player.isEliminated) return "Other";
    if (player.warPreparation) return "WarPrepCancelled";

    const camp = state.nativeCamps.find(entry => entry.id === prep.targetCampId);
    if (!camp) return "Other";

    const readiness = getCampClearingReadiness(state, player);
    const majorWars = getMajorWarCount(state, playerId);
    const restrictToEmergency = majorWars >= 3 || (majorWars >= 2 && readiness === "PreArmy");
    if (restrictToEmergency && !isCampEmergencyThreatForPlayer(state, playerId, camp)) {
        return "WartimeEmergencyCancelled";
    }

    const prepTimeout = getCampPrepTimeout(readiness);
    const turnsSinceStart = state.turn - prep.startedTurn;
    if (turnsSinceStart > prepTimeout) {
        return "TimedOut";
    }

    return "Other";
}

function logCampPrepStarted(
    state: GameState,
    playerId: string,
    prep: CampClearingPrep,
    diagnostics: CampTargetDiagnostics | null,
): void {
    const camp = state.nativeCamps.find(entry => entry.id === prep.targetCampId);
    logEvent(state, HistoryEventType.CampClearingStarted, playerId, {
        campId: prep.targetCampId,
        campCoord: camp?.coord,
        prepState: prep.state,
        readiness: diagnostics?.readiness ?? "PreArmy",
        score: diagnostics?.score,
        nearestCityDist: diagnostics?.nearestCityDist,
        requiredMilitary: diagnostics?.requiredMilitary,
        militaryCount: diagnostics?.militaryCount,
    });
}

function logCampPrepStateChanged(
    state: GameState,
    playerId: string,
    prep: CampClearingPrep,
    fromState: CampPrepPhase,
): void {
    logEvent(state, HistoryEventType.CampClearingStateChanged, playerId, {
        campId: prep.targetCampId,
        fromState,
        toState: prep.state,
    });
}

function logCampPrepEnded(
    state: GameState,
    playerId: string,
    prep: CampClearingPrep,
    outcome: CampPrepEndTelemetryOutcome,
): void {
    const camp = state.nativeCamps.find(entry => entry.id === prep.targetCampId);
    logEvent(state, HistoryEventType.CampClearingEnded, playerId, {
        campId: prep.targetCampId,
        campCoord: camp?.coord,
        outcome,
    });
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

export function clearCampPrepAndRetarget(state: GameState, playerId: string, excludedCampId?: string): GameState {
    const clearedState = clearCampPrep(state, playerId);
    const player = clearedState.players.find(entry => entry.id === playerId);
    if (!player || player.isEliminated || player.campClearingPrep) return clearedState;
    const excluded = excludedCampId ? new Set([excludedCampId]) : undefined;
    return checkForCampTargets(clearedState, player, excluded);
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
