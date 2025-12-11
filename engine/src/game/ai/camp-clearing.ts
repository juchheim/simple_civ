/**
 * AI Camp Clearing Module
 * 
 * Manages AI decision-making and preparation for clearing native camps.
 * Uses a war-prep-like phase system: Buildup -> Gathering -> Positioning -> Ready
 */

import { GameState, Player, DiplomacyState, NativeCamp, Unit, UnitType } from "../../core/types.js";
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
    if (isAtWar) {
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

    if (prep.state === "Buildup") {
        if (militaryCount >= MIN_MILITARY_FOR_CAMP) {
            aiInfo(`[AI CAMP] ${player.id} finished Buildup (${militaryCount} units), moving to Gathering`);
            newState = "Gathering";
            return updatePrepState(state, player.id, { ...prep, state: newState, startedTurn: state.turn });
        }
        if (state.turn % 5 === 0) {
            aiInfo(`[AI CAMP] ${player.id} building up for camp: ${militaryCount}/${MIN_MILITARY_FOR_CAMP} units`);
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
    // Prerequisites
    if (state.turn < MIN_TURN_FOR_CAMP) return state;
    if (player.warPreparation) return state; // War prep takes priority

    // Check if at war
    const isAtWar = Object.values(state.diplomacy?.[player.id] || {}).some(
        s => s === DiplomacyState.War
    );
    if (isAtWar) return state;

    // Find visible camps
    const visibleCamps = getVisibleCamps(state, player.id);
    if (visibleCamps.length === 0) return state;

    // Check if any camp is near a desirable settle location
    // For now, prioritize camps near our existing cities (expansion zone)
    const myCities = state.cities.filter(c => c.ownerId === player.id);
    if (myCities.length === 0) return state;

    for (const camp of visibleCamps) {
        // Is this camp near any of our cities? (blocking expansion)
        const nearestCityDist = Math.min(
            ...myCities.map(c => hexDistance(c.coord, camp.coord))
        );

        if (nearestCityDist <= CAMP_SETTLE_RADIUS) {
            aiInfo(`[AI CAMP] ${player.id} found camp ${camp.id} blocking expansion (${nearestCityDist} tiles from city)`);

            // Start buildup phase
            return {
                ...state,
                players: state.players.map(p =>
                    p.id === player.id ? {
                        ...p,
                        campClearingPrep: {
                            targetCampId: camp.id,
                            state: "Buildup",
                            startedTurn: state.turn
                        }
                    } : p
                )
            };
        }
    }

    return state;
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
