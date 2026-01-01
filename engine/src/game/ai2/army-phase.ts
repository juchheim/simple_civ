/**
 * Level 4: Army Phase State Machine
 * 
 * Gates attacks by army readiness. Units don't attack individually as they arrive -
 * they wait at a rally point until the army is assembled, then attack together.
 * 
 * Phases: SCATTERED -> RALLYING -> STAGED -> ATTACKING
 */

import { GameState, Unit, UnitType, BuildingType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { getAiMemoryV2, setAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { isCombatUnitType } from "./schema.js";
import { getTacticalTuning } from "./tuning.js";

export type ArmyPhase = 'scattered' | 'rallying' | 'staged' | 'attacking';

// Unified CivAggressionProfile - aligned with existing forceConcentration/riskTolerance
type CivAggressionProfile = {
    exposureMultiplier: number;     // Level 1B: Multiplies calculated exposure
    waitThresholdMult: number;      // Level 3: Multiplies wait score threshold
    maxStagingTurns: number;        // Level 4: Max turns to wait in "staged" phase
    requiredArmyPercent: number;    // Level 4: % of army needed to attack
};

const CIV_AGGRESSION: Record<string, CivAggressionProfile> = {
    // Aggressive civs: high riskTolerance (0.55), high forceConcentration (0.75)
    // FIXv7.5: Unleash the Hordes - lower requirements (0.6 -> 0.4) and staging time (2 -> 1)
    ForgeClans: { exposureMultiplier: 0.6, waitThresholdMult: 0.4, maxStagingTurns: 1, requiredArmyPercent: 0.40 },
    RiverLeague: { exposureMultiplier: 0.6, waitThresholdMult: 0.5, maxStagingTurns: 1, requiredArmyPercent: 0.45 },
    AetherianVanguard: { exposureMultiplier: 0.6, waitThresholdMult: 0.5, maxStagingTurns: 1, requiredArmyPercent: 0.40 },
    // Balanced civ: moderate riskTolerance (0.45), moderate forceConcentration (0.7)
    JadeCovenant: { exposureMultiplier: 0.8, waitThresholdMult: 0.8, maxStagingTurns: 2, requiredArmyPercent: 0.60 },
    // Defensive civs: low riskTolerance (0.2), low forceConcentration (0.55)
    ScholarKingdoms: { exposureMultiplier: 1.0, waitThresholdMult: 1.0, maxStagingTurns: 3, requiredArmyPercent: 0.70 },
    StarborneSeekers: { exposureMultiplier: 1.0, waitThresholdMult: 1.0, maxStagingTurns: 3, requiredArmyPercent: 0.70 },
};

export function getCivAggression(civName: string): CivAggressionProfile {
    return CIV_AGGRESSION[civName] ?? { exposureMultiplier: 0.8, waitThresholdMult: 0.8, maxStagingTurns: 3, requiredArmyPercent: 0.70 };
}

function isMilitary(u: Unit): boolean {
    return isCombatUnitType(u.type);
}

function countMilitaryUnits(state: GameState, playerId: string): number {
    return state.units.filter(u => u.ownerId === playerId && isMilitary(u)).length;
}

function countUnitsNear(state: GameState, playerId: string, point: { q: number; r: number }, radius: number): number {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, point) <= radius
    ).length;
}

function hasArmyComposition(state: GameState, playerId: string, point: { q: number; r: number }, radius: number): boolean {
    const nearbyUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, point) <= radius
    );

    const hasCapturer = nearbyUnits.some(u => UNITS[u.type].canCaptureCity);
    const hasSiege = nearbyUnits.some(u => UNITS[u.type].rng > 1);

    return hasCapturer && hasSiege;
}

function getFocusCity(state: GameState, playerId: string): { id: string; coord: { q: number; r: number }; ownerId: string; hp: number; maxHp: number } | undefined {
    const mem = getAiMemoryV2(state, playerId);
    return mem.focusCityId ? state.cities.find(c => c.id === mem.focusCityId) : undefined;
}

function hasTitan(state: GameState, playerId: string): boolean {
    return state.units.some(u => u.ownerId === playerId && u.type === UnitType.Titan);
}

function titanNearTarget(state: GameState, playerId: string, targetCoord: { q: number; r: number }): boolean {
    const tuning = getTacticalTuning(state, playerId);
    const titan = state.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);
    return titan ? hexDistance(titan.coord, targetCoord) <= tuning.army.titanNearTargetDist : false;
}

function anyUnitDamagedThisTurn(state: GameState, playerId: string): boolean {
    // Check if any of our units lost HP this turn (would indicate enemy attack)
    // This is approximated by checking if any unit has HP below max
    return state.units.some(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.hp < (u.maxHp ?? UNITS[u.type].hp)
    );
}

function pickRallyCoord(state: GameState, target: { q: number; r: number }, desiredDist: number, scanLimit: number): { q: number; r: number } {
    let best = target;
    let bestScore = Number.POSITIVE_INFINITY;
    let scanned = 0;
    for (const t of state.map.tiles) {
        if (scanned++ > scanLimit) break;
        const d = hexDistance(t.coord, target);
        if (d !== desiredDist) continue;
        const score = Math.abs(t.coord.q - target.q) + Math.abs(t.coord.r - target.r);
        if (score < bestScore) {
            bestScore = score;
            best = t.coord;
        }
    }
    return best;
}

/**
 * Main entry point: Update army phase and return current phase
 */
export function updateArmyPhase(state: GameState, playerId: string): { state: GameState; phase: ArmyPhase } {
    const mem = getAiMemoryV2(state, playerId);
    const profile = getAiProfileV2(state, playerId);
    const civAggression = getCivAggression(profile.civName);
    const tuning = getTacticalTuning(state, playerId);

    let currentPhase: ArmyPhase = mem.armyPhase ?? 'scattered';
    let rallyPoint = mem.armyRallyPoint;
    let readyTurn = mem.armyReadyTurn;

    const focusCity = getFocusCity(state, playerId);
    const militaryCount = countMilitaryUnits(state, playerId);

    // Check for override conditions that force attack phase
    const forceAttack = checkAttackOverrides(state, playerId, focusCity, civAggression);
    if (forceAttack) {
        return {
            state: setAiMemoryV2(state, playerId, { ...mem, armyPhase: 'attacking' }),
            phase: 'attacking'
        };
    }

    // Phase transitions
    switch (currentPhase) {
        case 'scattered': {
            // Transition: SCATTERED -> RALLYING when we have focus target and enough units
            if (focusCity && militaryCount >= tuning.army.minUnitsForEarlyAttack) {
                rallyPoint = pickRallyCoord(state, focusCity.coord, tuning.army.rallyDist, tuning.army.rallyScanLimit);
                currentPhase = 'rallying';
            }
            break;
        }

        case 'rallying': {
            // Transition: RALLYING -> STAGED when required units near rally
            if (!rallyPoint || !focusCity) {
                currentPhase = 'scattered';
                break;
            }

            const requiredNear = Math.max(tuning.army.minUnitsForEarlyAttack, Math.ceil(profile.tactics.forceConcentration * 5));
            const nearCount = countUnitsNear(state, playerId, rallyPoint, tuning.army.rallyRadius);
            const hasComposition = hasArmyComposition(state, playerId, rallyPoint, tuning.army.rallyRadius);

            if (nearCount >= requiredNear && hasComposition) {
                currentPhase = 'staged';
                readyTurn = state.turn;
            }
            break;
        }

        case 'staged': {
            // Transition: STAGED -> ATTACKING when enough army or timeout
            if (!rallyPoint) {
                currentPhase = 'scattered';
                break;
            }

            const nearRally = countUnitsNear(state, playerId, rallyPoint, tuning.army.stagedRadius);
            const armyPercent = militaryCount > 0 ? nearRally / militaryCount : 0;
            const turnsStaged = readyTurn ? state.turn - readyTurn : 0;

            // Trigger attack when:
            // 1. Required % of army assembled
            // 2. OR been staged for max turns (anti-stall)
            // 3. OR aggressive civ with enough force
            if (armyPercent >= civAggression.requiredArmyPercent) {
                currentPhase = 'attacking';
            } else if (turnsStaged >= civAggression.maxStagingTurns) {
                currentPhase = 'attacking';
            } else if (profile.tactics.forceConcentration < tuning.army.minForceConcentrationForEarlyAttack && nearRally >= tuning.army.minUnitsForEarlyAttack) {
                currentPhase = 'attacking';
            }
            break;
        }

        case 'attacking': {
            // Stay in attacking unless war ends or army destroyed
            const enemies = state.players.filter(p =>
                p.id !== playerId &&
                !p.isEliminated &&
                state.diplomacy?.[playerId]?.[p.id] === "War"
            );

            if (enemies.length === 0) {
                currentPhase = 'scattered';
                rallyPoint = undefined;
                readyTurn = undefined;
            } else if (militaryCount < 2) {
                // Army destroyed, reset to scattered
                currentPhase = 'scattered';
                rallyPoint = undefined;
                readyTurn = undefined;
            }
            break;
        }
    }

    // Update memory
    const newState = setAiMemoryV2(state, playerId, {
        ...mem,
        armyPhase: currentPhase,
        armyRallyPoint: rallyPoint,
        armyReadyTurn: readyTurn
    });

    return { state: newState, phase: currentPhase };
}

/**
 * Check for conditions that override normal phase progression and force attack
 */
function checkAttackOverrides(
    state: GameState,
    playerId: string,
    focusCity: { coord: { q: number; r: number }; hp: number; maxHp: number } | undefined,
    _civAggression: CivAggressionProfile
): boolean {
    // Get enemies for several checks
    const enemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === "War"
    );

    if (enemies.length === 0) return false;
    const enemyIds = new Set(enemies.map(e => e.id));

    // Override 1: Titan near target -> attack immediately
    if (focusCity && hasTitan(state, playerId) && titanNearTarget(state, playerId, focusCity.coord)) {
        return true;
    }

    const tuning = getTacticalTuning(state, playerId);

    // Override 2: City HP reduced (active siege) -> don't retreat
    if (focusCity && focusCity.maxHp && focusCity.hp < focusCity.maxHp * tuning.army.cityHpSiegeThreshold) {
        return true;
    }

    // Override 3: Enemy attacked us (defensive response)
    if (anyUnitDamagedThisTurn(state, playerId)) {
        return true;
    }

    // Override 4: Overwhelming power advantage (2:1)
    const ourPower = state.units.filter(u => u.ownerId === playerId && isMilitary(u)).length;
    const theirPower = state.units.filter(u => enemies.some(e => e.id === u.ownerId) && isMilitary(u)).length;
    if (theirPower > 0 && ourPower / theirPower >= tuning.army.overwhelmingPowerRatio) {
        return true;
    }

    // Override 5: Multiple units already in attack range of enemy target
    // If we have 2+ capturers adjacent to enemy city, attack NOW
    const enemyCities = state.cities.filter(c => enemies.some(e => e.id === c.ownerId));
    for (const city of enemyCities) {
        const adjacentCapturers = state.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            UNITS[u.type].canCaptureCity &&
            hexDistance(u.coord, city.coord) === 1
        ).length;
        if (adjacentCapturers >= 2) {
            return true; // Already in siege position!
        }
    }

    // Override 6: Any unit adjacent to enemy city with low HP (finishing blow possible)
    for (const city of enemyCities) {
        if (city.hp <= tuning.army.lowHpCityThreshold) { // Low HP city
            const adjacentUnits = state.units.filter(u =>
                u.ownerId === playerId &&
                isMilitary(u) &&
                hexDistance(u.coord, city.coord) <= UNITS[u.type].rng
            ).length;
            if (adjacentUnits >= 1) {
                return true; // Can finish the city!
            }
        }
    }

    // Override 7: Local Superiority (Smart Aggression)
    // If we have significantly more power LOCALLY than the target city/area has defense, attack immediately.
    // This prevents "waiting for 100% of army" when 3 units could win easily.
    if (focusCity) {
        // Calculate Local Army Power (Attackers within 5 tiles of target)
        const localUnits = state.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexDistance(u.coord, focusCity.coord) <= tuning.army.localSuperiorityRadius
        );
        const localPower = localUnits.reduce((sum, u) => sum + UNITS[u.type].atk, 0);

        // Calculate Target Defense (City + Defenders within 2 tiles)
        let targetDefense = 0;
        // City defense
        const cityObj = state.cities.find(c => hexDistance(c.coord, focusCity.coord) === 0);
        if (cityObj) {
            targetDefense += 3; // Base defense (CITY_DEFENSE_BASE)
            if (cityObj.buildings.includes(BuildingType.CityWard)) targetDefense += 3;
            if (cityObj.buildings.includes(BuildingType.Bulwark)) targetDefense += 8;
            if (cityObj.buildings.includes(BuildingType.ShieldGenerator)) targetDefense += 15;
            targetDefense += Math.min(cityObj.pop, 10); // Population factor estimate
        }

        // Defender units
        const defenders = state.units.filter(u =>
            u.ownerId === cityObj?.ownerId &&
            hexDistance(u.coord, focusCity.coord) <= 2
        );
        targetDefense += defenders.reduce((sum, u) => sum + UNITS[u.type].def, 0);

        // If we have 1.5x superiority, GO!
        // Min power 5 prevents single-scout suicide runs
        if (localPower > (targetDefense * tuning.army.localSuperiorityRatio) && localPower > tuning.army.localSuperiorityMinPower) {
            return true;
        }
    }

    // Override 8: Enemy Titan threatening our cities (Defensive Mobilization)
    // If an enemy Titan is near ANY of our cities, we must switch to "attacking" phase 
    // to unlock our units to fight it (otherwise they stay in "scattered"/"rallying" and wont attack).
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const enemyTitans = state.units.filter(u => enemyIds.has(u.ownerId) && u.type === UnitType.Titan);

    for (const titan of enemyTitans) {
        // Check if Titan is near any of our cities (within 5 tiles - threat range)
        const threatening = myCities.some(c => hexDistance(titan.coord, c.coord) <= 5);
        if (threatening) {
            return true;
        }
    }

    return false;
}

/**
 * Check if a specific attack should be allowed even during non-attack phase
 * (opportunity kills)
 */
export function allowOpportunityKill(wouldKill: boolean, score: number, armyPhase: ArmyPhase, threshold: number): boolean {
    if (armyPhase === 'attacking') {
        return true; // Normal attack phase
    }

    // During staging, only allow guaranteed kills with high score
    if (wouldKill && score > threshold) {
        return true;
    }

    return false;
}

/**
 * Get the current army rally point (for movement routing)
 */
export function getArmyRallyPoint(state: GameState, playerId: string): { q: number; r: number } | undefined {
    const mem = getAiMemoryV2(state, playerId);
    return mem.armyRallyPoint;
}
