/**
 * AI Camp Clearing Module
 * 
 * Manages AI decision-making and preparation for clearing native camps.
 * Uses a war-prep-like phase system: Buildup -> Gathering -> Positioning -> Ready
 */

import { CityStateYieldType, GameState, Player, DiplomacyState, NativeCamp, Unit, UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { aiInfo } from "./debug-logging.js";
import { isScoutType } from "./units/unit-helpers.js";

// Constants for camp clearing
const MIN_MILITARY_FOR_CAMP = 4;  // Require 4 military units before engaging
const MIN_TURN_FOR_CAMP = 10;     // Don't attempt before turn 10
const CAMP_SETTLE_RADIUS = 6;     // Consider camps within 6 tiles of settle locations
const MIN_POSITIONING_UNITS = 3;  // Need 3 units positioned before attacking
const POSITIONING_RADIUS = 4;     // Units within 4 tiles of camp are "positioned"
const MIN_GATHERING_TURNS = 2;    // Minimum turns in gathering phase
const MIN_POSITIONING_TURNS = 2;  // Minimum turns in positioning phase
const RETREAT_HP_THRESHOLD = 0.3; // Retreat if HP below 30%
const CAMP_TARGET_SCORE_MIN = 26;
const CAMP_TARGET_SCORE_EARLY_OVERRIDE = 52;
const CAMP_EMERGENCY_RADIUS = 2;
const CAMP_POWER_RADIUS = 5;

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

    // Cancel if we're now at war with a player (takes priority)
    const isAtWar = Object.values(state.diplomacy?.[player.id] || {}).some(
        s => s === DiplomacyState.War
    );
    const campIsEmergencyThreat = camp ? isCampEmergencyThreatForPlayer(state, player.id, camp) : false;
    if (isAtWar && !campIsEmergencyThreat) {
        aiInfo(`[AI CAMP] ${player.id} cancelling camp prep - now at war with a player`);
        return clearCampPrep(state, player.id);
    }

    // Cancel if we're in war prep against a player
    if (player.warPreparation) {
        aiInfo(`[AI CAMP] ${player.id} cancelling camp prep - war preparation takes priority`);
        return clearCampPrep(state, player.id);
    }

    const turnsSinceStart = state.turn - prep.startedTurn;
    const militaryCount = getMilitaryCount(state, player.id);

    // Timeout after 15 turns - give up
    if (turnsSinceStart > 15) {
        aiInfo(`[AI CAMP] ${player.id} camp prep TIMEOUT - giving up on camp ${prep.targetCampId}`);
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

    // Check if at war with majors; only permit emergency local responses.
    const isAtWar = Object.values(state.diplomacy?.[player.id] || {}).some(s => s === DiplomacyState.War);
    if (isAtWar && !hasEmergencyCampThreat(state, player.id)) return state;

    // Find visible camps
    const visibleCamps = getVisibleCamps(state, player.id);
    if (visibleCamps.length === 0) return state;
    const candidateCamps = isAtWar
        ? visibleCamps.filter(camp => isCampEmergencyThreatForPlayer(state, player.id, camp))
        : visibleCamps;
    if (candidateCamps.length === 0) return state;

    const evaluations = candidateCamps
        .map(camp => evaluateCampTarget(state, player, camp))
        .filter((entry): entry is CampTargetEvaluation => !!entry)
        .sort((a, b) => b.score - a.score || a.nearestCityDist - b.nearestCityDist);

    const best = evaluations[0];
    if (!best) return state;

    const militaryCount = getMilitaryCount(state, player.id);
    const earlyOverride = best.nearestCityDist <= CAMP_EMERGENCY_RADIUS && best.score >= CAMP_TARGET_SCORE_EARLY_OVERRIDE;
    if (state.turn < MIN_TURN_FOR_CAMP && !earlyOverride) return state;

    const cityRadiusGate = best.nearestCityDist <= CAMP_SETTLE_RADIUS || best.nearestCityDist <= CAMP_EMERGENCY_RADIUS;
    if (!cityRadiusGate) return state;

    const scoreGate = best.score >= CAMP_TARGET_SCORE_MIN || earlyOverride;
    if (!scoreGate) return state;

    const requiredMilitary = Math.max(MIN_POSITIONING_UNITS, best.requiredMilitary);
    if (militaryCount < requiredMilitary) {
        aiInfo(
            `[AI CAMP] ${player.id} delaying camp ${best.camp.id}: military ${militaryCount}/${requiredMilitary} (score ${best.score.toFixed(1)})`
        );
    } else {
        aiInfo(
            `[AI CAMP] ${player.id} targeting camp ${best.camp.id}: score ${best.score.toFixed(1)}, dist ${best.nearestCityDist}, military ${militaryCount}`
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

function evaluateCampTarget(state: GameState, player: Player, camp: NativeCamp): CampTargetEvaluation | null {
    const myCities = state.cities.filter(c => c.ownerId === player.id);
    if (myCities.length === 0) return null;

    const nearestCityDist = Math.min(...myCities.map(city => hexDistance(city.coord, camp.coord)));
    const nearestSettlerDist = getNearestSettlerDistance(state, player.id, camp);
    const yieldType = projectNextCityStateYieldType(state);
    const yieldPriority = getCityStateYieldPriority(player, yieldType);
    const localPower = estimateNearbyFriendlyPower(state, player.id, camp);
    const defenders = estimateCampDefenderPower(state, camp);
    const powerRatio = localPower / Math.max(1, defenders.power);

    const expansionPressure = Math.max(0, 8 - nearestCityDist) * 7;
    const settlerPressure = Number.isFinite(nearestSettlerDist)
        ? Math.max(0, 6 - nearestSettlerDist) * 4
        : 0;
    const rewardScore = yieldPriority * 20;
    const nativeThreatPenalty = defenders.count * 4;
    const underpoweredPenalty = powerRatio >= 1
        ? 0
        : (1 - powerRatio) * 28;
    const wartimePenalty = Object.values(state.diplomacy?.[player.id] || {}).some(s => s === DiplomacyState.War)
        ? ((player.aiGoal ?? "Balanced") === "Conquest" ? 6 : 16)
        : 0;

    const score = expansionPressure
        + settlerPressure
        + rewardScore
        - nativeThreatPenalty
        - underpoweredPenalty
        - wartimePenalty;

    let requiredMilitary = powerRatio >= 1.35 ? 3 : 4;
    if (nearestCityDist <= 2) {
        requiredMilitary = Math.max(3, requiredMilitary - 1);
    }

    return {
        camp,
        score,
        nearestCityDist,
        requiredMilitary,
    };
}

function getRequiredMilitaryForCamp(state: GameState, player: Player, camp: NativeCamp): number {
    const evalResult = evaluateCampTarget(state, player, camp);
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
