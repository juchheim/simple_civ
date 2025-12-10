/**
 * Native Camp Behavior AI
 * 
 * Handles the behavior of native units (Champions and Archers) that guard camps.
 * Implements a three-state machine: Patrol, Aggro, Retreat
 */

import {
    GameState,
    HexCoord,
    NativeCamp,
    Unit,
    UnitType,
    OverlayType,
} from "../../core/types.js";
import { UNITS } from "../../core/constants.js";
import {
    NATIVE_CAMP_TERRITORY_RADIUS,
    NATIVE_CAMP_AGGRO_DURATION,
    NATIVE_CAMP_CHASE_DISTANCE,
    NATIVE_HEAL_TERRITORY,
    NATIVE_HEAL_CAMP_TILE,
} from "../../core/constants.js";
import { hexDistance, getNeighbors, hexEquals, hexToString } from "../../core/hex.js";

const NATIVE_OWNER_ID = "natives";

/**
 * Check if a unit is a native
 */
export function isNativeUnit(unit: Unit): boolean {
    return unit.ownerId === NATIVE_OWNER_ID;
}

/**
 * Get all enemy (player) units within a camp's territory
 */
function getEnemiesInTerritory(state: GameState, camp: NativeCamp): Unit[] {
    return state.units.filter(u => {
        if (u.ownerId === NATIVE_OWNER_ID) return false;
        return hexDistance(u.coord, camp.coord) <= NATIVE_CAMP_TERRITORY_RADIUS;
    });
}

/**
 * Get all living native units for a camp
 */
function getCampUnits(state: GameState, camp: NativeCamp): Unit[] {
    return state.units.filter(u => u.campId === camp.id);
}

/**
 * Update camp state based on enemy presence
 */
function updateCampState(state: GameState, camp: NativeCamp): void {
    const enemies = getEnemiesInTerritory(state, camp);
    const campUnits = getCampUnits(state, camp);

    if (campUnits.length === 0) {
        // All natives dead, camp should be cleared
        return;
    }

    switch (camp.state) {
        case "Patrol":
            if (enemies.length > 0) {
                camp.state = "Aggro";
                camp.aggroTurnsRemaining = NATIVE_CAMP_AGGRO_DURATION;
                camp.aggroTargetPlayerId = enemies[0].ownerId;
            }
            break;

        case "Aggro":
            camp.aggroTurnsRemaining--;
            if (camp.aggroTurnsRemaining <= 0 && enemies.length === 0) {
                camp.state = "Patrol";
                camp.aggroTargetPlayerId = undefined;
            } else if (enemies.length > 0) {
                // Reset timer if still enemies
                camp.aggroTurnsRemaining = NATIVE_CAMP_AGGRO_DURATION;
            }
            break;

        case "Retreat":
            // After retreat, check if we should return to Patrol or Aggro
            if (enemies.length > 0) {
                camp.state = "Aggro";
                camp.aggroTurnsRemaining = NATIVE_CAMP_AGGRO_DURATION;
            } else {
                camp.state = "Patrol";
            }
            break;
    }
}

/**
 * Find the best tile for a native unit to move to during Patrol
 */
function findPatrolTarget(state: GameState, unit: Unit, camp: NativeCamp): HexCoord | null {
    const isChampion = unit.type === UnitType.NativeChampion;
    const targetDistance = isChampion ? 0 : 1; // Champion stays on camp, archers orbit

    const currentDist = hexDistance(unit.coord, camp.coord);
    if (currentDist === targetDistance) {
        // Already in position, maybe move around for patrol effect
        if (!isChampion && Math.random() < 0.5) {
            const neighbors = getNeighbors(unit.coord);
            const validMoves = neighbors.filter(n => {
                const dist = hexDistance(n, camp.coord);
                return dist >= 1 && dist <= 2 && isValidMoveTarget(state, n);
            });
            if (validMoves.length > 0) {
                return validMoves[Math.floor(Math.random() * validMoves.length)];
            }
        }
        return null;
    }

    // Move toward target distance
    const neighbors = getNeighbors(unit.coord);
    const betterMoves = neighbors.filter(n => {
        const newDist = hexDistance(n, camp.coord);
        return Math.abs(newDist - targetDistance) < Math.abs(currentDist - targetDistance)
            && isValidMoveTarget(state, n);
    });

    return betterMoves.length > 0 ? betterMoves[0] : null;
}

/**
 * Find the best tile for a native unit to move to during Aggro
 */
function findAggroTarget(state: GameState, unit: Unit, camp: NativeCamp, enemies: Unit[]): HexCoord | null {
    if (enemies.length === 0) return null;

    // Find nearest enemy, prioritizing the one that triggered aggro
    let targetEnemy = enemies[0];
    let minDist = hexDistance(unit.coord, targetEnemy.coord);

    for (const enemy of enemies) {
        const dist = hexDistance(unit.coord, enemy.coord);
        if (dist < minDist) {
            minDist = dist;
            targetEnemy = enemy;
        }
    }

    // Check chase distance limit
    const distFromCamp = hexDistance(targetEnemy.coord, camp.coord);
    const maxChaseRange = NATIVE_CAMP_TERRITORY_RADIUS + NATIVE_CAMP_CHASE_DISTANCE;
    if (distFromCamp > maxChaseRange) {
        // Enemy too far, move toward camp instead
        return findPatrolTarget(state, unit, camp);
    }

    // Move toward enemy
    const neighbors = getNeighbors(unit.coord);
    const moves = neighbors.filter(n => {
        const newDist = hexDistance(n, targetEnemy.coord);
        const campDist = hexDistance(n, camp.coord);
        return newDist < minDist
            && campDist <= maxChaseRange
            && isValidMoveTarget(state, n);
    });

    return moves.length > 0 ? moves[0] : null;
}

/**
 * Find the best tile for a native unit to move to during Retreat
 */
function findRetreatTarget(state: GameState, unit: Unit, camp: NativeCamp): HexCoord | null {
    const currentDist = hexDistance(unit.coord, camp.coord);
    if (currentDist === 0) return null; // Already at camp

    const neighbors = getNeighbors(unit.coord);
    const closerMoves = neighbors.filter(n => {
        const newDist = hexDistance(n, camp.coord);
        return newDist < currentDist && isValidMoveTarget(state, n);
    });

    return closerMoves.length > 0 ? closerMoves[0] : null;
}

/**
 * Check if a tile is a valid movement target for natives
 */
function isValidMoveTarget(state: GameState, coord: HexCoord, movingUnitId?: string): boolean {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return false;

    // Check terrain
    const impassable = ["Mountain", "DeepSea", "Coast"];
    if (impassable.includes(tile.terrain)) return false;

    // Check for blocking units (no stacking allowed now)
    const blockingUnit = state.units.find(u =>
        hexEquals(u.coord, coord) && u.id !== movingUnitId
    );
    if (blockingUnit) return false;

    return true;
}

/**
 * Move a native unit to a target coordinate
 */
function moveNativeUnit(unit: Unit, target: HexCoord): void {
    unit.coord = target;
    unit.movesLeft = 0;
}

/**
 * Execute patrol behavior for a camp
 */
function executePatrolBehavior(state: GameState, camp: NativeCamp): void {
    const campUnits = getCampUnits(state, camp);

    for (const unit of campUnits) {
        if (unit.movesLeft <= 0) continue;

        const target = findPatrolTarget(state, unit, camp);
        if (target) {
            moveNativeUnit(unit, target);
        }
    }
}

/**
 * Execute aggro behavior for a camp - now includes attacking!
 */
function executeAggroBehavior(state: GameState, camp: NativeCamp): void {
    const campUnits = getCampUnits(state, camp);
    const enemies = getEnemiesInTerritory(state, camp);

    // Also consider enemies just outside territory for chasing
    const chaseRange = NATIVE_CAMP_TERRITORY_RADIUS + NATIVE_CAMP_CHASE_DISTANCE;
    const allNearbyEnemies = state.units.filter(u => {
        if (u.ownerId === NATIVE_OWNER_ID) return false;
        return hexDistance(u.coord, camp.coord) <= chaseRange;
    });

    for (const unit of campUnits) {
        // Skip if no moves or already attacked
        if (unit.movesLeft <= 0 && unit.hasAttacked) continue;

        // Try to attack first if adjacent to enemy
        if (!unit.hasAttacked) {
            const attacked = tryNativeAttack(state, unit, allNearbyEnemies);
            if (attacked) continue; // Used action on attack
        }

        // Then try to move toward enemies
        if (unit.movesLeft > 0) {
            const target = findAggroTarget(state, unit, camp, allNearbyEnemies.length > 0 ? allNearbyEnemies : enemies);
            if (target) {
                moveNativeUnit(unit, target);
            }
        }
    }
}

/**
 * Try to attack an adjacent enemy unit
 * Returns true if attack was made
 */
function tryNativeAttack(state: GameState, attacker: Unit, enemies: Unit[]): boolean {
    const attackerStats = UNITS[attacker.type];
    const range = attackerStats.rng ?? 1;

    // Find enemies in attack range
    const targetsInRange = enemies.filter(e => {
        const dist = hexDistance(attacker.coord, e.coord);
        return dist <= range && dist > 0;
    });

    if (targetsInRange.length === 0) return false;

    // Pick lowest HP target (prioritize killing)
    targetsInRange.sort((a, b) => a.hp - b.hp);
    const target = targetsInRange[0];

    // Execute simple combat
    executeNativeCombat(state, attacker, target);
    attacker.hasAttacked = true;

    return true;
}

/**
 * Execute combat between a native attacker and player defender
 */
function executeNativeCombat(state: GameState, attacker: Unit, defender: Unit): void {
    const attackerStats = UNITS[attacker.type];
    const defenderStats = UNITS[defender.type];

    // Get effective stats (including camp bonus for champion)
    let atk = attackerStats.atk;
    let def = attackerStats.def;

    // Champion gets +2/+2 within 2 tiles of camp
    if (attacker.type === UnitType.NativeChampion && attacker.campId) {
        const camp = state.nativeCamps.find(c => c.id === attacker.campId);
        if (camp && hexDistance(attacker.coord, camp.coord) <= 2) {
            atk += 2;
            def += 2;
        }
    }

    // Calculate damage (simplified formula)
    const attackerDamage = Math.max(1, atk - (defenderStats.def * 0.5));
    const defenderDamage = Math.max(1, defenderStats.atk - (def * 0.5));

    // Apply damage
    defender.hp -= Math.round(attackerDamage);
    attacker.hp -= Math.round(defenderDamage * 0.5); // Counter-attack is weaker

    // Remove dead units
    if (defender.hp <= 0) {
        const idx = state.units.findIndex(u => u.id === defender.id);
        if (idx !== -1) state.units.splice(idx, 1);
    }
    if (attacker.hp <= 0) {
        const idx = state.units.findIndex(u => u.id === attacker.id);
        if (idx !== -1) state.units.splice(idx, 1);
    }
}

/**
 * Execute retreat behavior for a camp
 */
function executeRetreatBehavior(state: GameState, camp: NativeCamp): void {
    const campUnits = getCampUnits(state, camp);

    for (const unit of campUnits) {
        if (unit.movesLeft <= 0) continue;

        const target = findRetreatTarget(state, unit, camp);
        if (target) {
            moveNativeUnit(unit, target);
        }
    }
}

/**
 * Heal native units at the end of round
 */
function healNatives(state: GameState, camp: NativeCamp): void {
    const campUnits = getCampUnits(state, camp);

    for (const unit of campUnits) {
        const distFromCamp = hexDistance(unit.coord, camp.coord);

        // Only heal if in territory
        if (distFromCamp > NATIVE_CAMP_TERRITORY_RADIUS) continue;

        const healAmount = distFromCamp === 0 ? NATIVE_HEAL_CAMP_TILE : NATIVE_HEAL_TERRITORY;
        unit.hp = Math.min(unit.maxHp, unit.hp + healAmount);
    }
}

/**
 * Reset native unit movement for end of round
 */
function resetNativeMovement(state: GameState): void {
    for (const unit of state.units.filter(u => u.ownerId === NATIVE_OWNER_ID)) {
        const stats = unit.type === UnitType.NativeChampion
            ? { move: 1 }
            : { move: 1 };
        unit.movesLeft = stats.move;
        unit.hasAttacked = false;
    }
}

/**
 * Handle camp clearing when all natives are dead
 */
function handleCampClearing(state: GameState): void {
    for (const camp of [...state.nativeCamps]) {
        const campUnits = getCampUnits(state, camp);

        if (campUnits.length === 0) {
            // All natives dead - clear the camp
            const campTile = state.map.tiles.find(t => hexEquals(t.coord, camp.coord));
            if (campTile) {
                // Remove NativeCamp overlay, add ClearedSettlement
                const campIdx = campTile.overlays.indexOf(OverlayType.NativeCamp);
                if (campIdx !== -1) {
                    campTile.overlays.splice(campIdx, 1);
                }
                campTile.overlays.push(OverlayType.ClearedSettlement);
            }

            // Remove camp from state
            const campIndex = state.nativeCamps.findIndex(c => c.id === camp.id);
            if (campIndex !== -1) {
                state.nativeCamps.splice(campIndex, 1);
            }
        }
    }
}

/**
 * Process native camp behavior for the end of round
 * Called after all players have taken their turns
 */
export function processNativeTurn(state: GameState): void {
    // First, reset movement for all native units
    resetNativeMovement(state);

    // Handle any camps that were cleared during the round
    handleCampClearing(state);

    // Process each camp
    for (const camp of state.nativeCamps) {
        // Update camp state based on enemy presence
        updateCampState(state, camp);

        // Execute behavior based on state
        switch (camp.state) {
            case "Patrol":
                executePatrolBehavior(state, camp);
                break;
            case "Aggro":
                executeAggroBehavior(state, camp);
                break;
            case "Retreat":
                executeRetreatBehavior(state, camp);
                break;
        }

        // Heal natives at end of turn
        healNatives(state, camp);
    }
}

/**
 * Trigger retreat state for natives in a camp when they take damage
 * Should be called from attack logic when a native takes damage
 */
export function triggerNativeRetreat(state: GameState, damagedUnit: Unit): void {
    if (!damagedUnit.campId) return;

    const camp = state.nativeCamps.find(c => c.id === damagedUnit.campId);
    if (!camp) return;

    camp.state = "Retreat";
}

/**
 * Check if attacking a native should trigger aggro for the camp
 * Should be called from attack logic when a native is targeted
 */
export function triggerNativeAggro(state: GameState, targetedUnit: Unit, attackerPlayerId: string): void {
    if (!targetedUnit.campId) return;

    const camp = state.nativeCamps.find(c => c.id === targetedUnit.campId);
    if (!camp) return;

    camp.state = "Aggro";
    camp.aggroTurnsRemaining = NATIVE_CAMP_AGGRO_DURATION;
    camp.aggroTargetPlayerId = attackerPlayerId;
}
