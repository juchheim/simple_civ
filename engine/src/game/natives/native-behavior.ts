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
    UnitState,
    Tile,
    TerrainType,
    DiplomacyState,
    HistoryEventType,
} from "../../core/types.js";
import {
    UNITS,
    NATIVE_CAMP_CLEAR_PRODUCTION_REWARD,
    TERRAIN,
    FORTIFY_DEFENSE_BONUS,
} from "../../core/constants.js";
import {
    NATIVE_CAMP_TERRITORY_RADIUS,
    NATIVE_CAMP_AGGRO_DURATION,
    NATIVE_CAMP_CHASE_DISTANCE,
    NATIVE_HEAL_TERRITORY,
    NATIVE_HEAL_CAMP_TILE,
} from "../../core/constants.js";
import { hexDistance, getNeighbors, hexEquals, hexToString } from "../../core/hex.js";
import { buildTileLookup, calculateCiv6Damage, getEffectiveUnitStats, hasClearLineOfSight } from "../helpers/combat.js";
import { seededBool, seededChoice } from "../helpers/random.js";
import { createCity, claimCityTerritory, ensureWorkedTiles } from "../helpers/cities.js";
import { expelUnitsFromTerritory } from "../helpers/movement.js";
import { logEvent } from "../history.js";

const NATIVE_OWNER_ID = "natives";

/**
 * Check if a unit is a native
 */
export function isNativeUnit(unit: Unit): boolean {
    return unit.ownerId === NATIVE_OWNER_ID;
}

/**
 * Units garrisoned in their own city are "sheltered" and should not be
 * treated as chase/aggro targets for natives.
 */
function isShelteredInOwnCity(state: GameState, unit: Unit): boolean {
    const cityAtLocation = state.cities.find(c => hexEquals(c.coord, unit.coord));
    return !!cityAtLocation && cityAtLocation.ownerId === unit.ownerId;
}

/**
 * Get all enemy (player) units within a camp's territory
 */
function getEnemiesInTerritory(state: GameState, camp: NativeCamp): Unit[] {
    return state.units.filter(u => {
        if (u.ownerId === NATIVE_OWNER_ID) return false;
        if (hexDistance(u.coord, camp.coord) > NATIVE_CAMP_TERRITORY_RADIUS) return false;
        if (isShelteredInOwnCity(state, u)) return false;
        return true;
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
            }
            break;

        case "Aggro":
            camp.aggroTurnsRemaining--;
            if (camp.aggroTurnsRemaining <= 0 && enemies.length === 0) {
                camp.state = "Patrol";
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
        if (!isChampion && seededBool(state)) {
            const neighbors = getNeighbors(unit.coord);
            const validMoves = neighbors.filter(n => {
                const dist = hexDistance(n, camp.coord);
                return dist >= 1 && dist <= 2 && isValidMoveTarget(state, n, unit.id);
            });
            const target = seededChoice(state, validMoves);
            if (target) return target;
        }
        return null;
    }

    // Move toward target distance
    const neighbors = getNeighbors(unit.coord);
    const betterMoves = neighbors.filter(n => {
        const newDist = hexDistance(n, camp.coord);
        return Math.abs(newDist - targetDistance) < Math.abs(currentDist - targetDistance)
            && isValidMoveTarget(state, n, unit.id);
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
            && isValidMoveTarget(state, n, unit.id);
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
        return newDist < currentDist && isValidMoveTarget(state, n, unit.id);
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
    const impassable = [TerrainType.Mountain, TerrainType.DeepSea, TerrainType.Coast];
    if (impassable.includes(tile.terrain as TerrainType)) return false;

    // Check for blocking units (no stacking allowed now)
    const blockingUnit = state.units.find(u =>
        hexEquals(u.coord, coord) && u.id !== movingUnitId
    );
    if (blockingUnit) return false;

    // Natives do not enter city-center tiles.
    const cityOnTile = state.cities.find(c => hexEquals(c.coord, coord));
    if (cityOnTile) return false;

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
        if (hexDistance(u.coord, camp.coord) > chaseRange) return false;
        if (isShelteredInOwnCity(state, u)) return false;
        return true;
    });

    for (const unit of campUnits) {
        const activeUnit = state.units.find(u => u.id === unit.id);
        if (!activeUnit) continue;

        // Skip if no moves and already attacked
        if (activeUnit.movesLeft <= 0 && activeUnit.hasAttacked) continue;

        let attacked = false;

        // Prefer attacking if already in range
        if (!activeUnit.hasAttacked) {
            attacked = tryNativeAttack(state, activeUnit, allNearbyEnemies);
        }

        // If we haven't attacked yet, try to move into range, then fire once
        if (!attacked && activeUnit.movesLeft > 0) {
            const target = findAggroTarget(state, activeUnit, camp, allNearbyEnemies.length > 0 ? allNearbyEnemies : enemies);
            if (target) {
                moveNativeUnit(activeUnit, target);
                tryNativeAttack(state, activeUnit, allNearbyEnemies);
            }
        }
    }
}

/**
 * Try to attack an adjacent enemy unit
 * Returns true if attack was made
 */
function tryNativeAttack(state: GameState, attacker: Unit, enemies: Unit[]): boolean {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    const range = attackerStats.rng ?? 1;
    const vision = attackerStats.vision ?? range;
    const tileLookup = buildTileLookup(state);

    // Find enemies in attack range
    const targetsInRange = enemies.filter(e => {
        const dist = hexDistance(attacker.coord, e.coord);
        if (dist <= 0 || dist > range) return false;
        if (dist > vision) return false; // Do not shoot beyond vision
        if (isShelteredInOwnCity(state, e)) {
            // Respect city garrison protection: natives do not attack units inside their own city
            return false;
        }
        return hasClearLineOfSight(state, attacker.coord, e.coord, tileLookup);
    });

    if (targetsInRange.length === 0) return false;

    // Pick lowest HP target (prioritize killing)
    targetsInRange.sort((a, b) => a.hp - b.hp);
    const target = targetsInRange[0];

    // Execute combat using shared damage formula
    resolveNativeAttack(state, attacker, target, tileLookup);

    return true;
}

/**
 * Execute combat between a native attacker and player defender using the shared damage formula.
 */
function resolveNativeAttack(state: GameState, attacker: Unit, defender: Unit, tileLookup: Map<string, Tile>): void {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    const defenderStats = getEffectiveUnitStats(defender, state);

    // Defender terrain/fortify bonus
    let defensePower = defenderStats.def;
    const defenderTile = tileLookup.get(hexToString(defender.coord));
    if (defenderTile) defensePower += TERRAIN[defenderTile.terrain].defenseMod;
    if (defender.state === UnitState.Fortified) defensePower += FORTIFY_DEFENSE_BONUS;

    // Flanking bonus for natives: same rule as players (+1 per other friendly adjacent)
    const defenderNeighbors = getNeighbors(defender.coord);
    let flankingBonus = 0;
    for (const n of defenderNeighbors) {
        const friend = state.units.find(u =>
            hexEquals(u.coord, n) &&
            u.ownerId === attacker.ownerId &&
            u.id !== attacker.id &&
            UNITS[u.type].domain !== "Civilian"
        );
        if (friend) flankingBonus += 1;
    }

    // Primary damage roll
    const { damage, newSeed } = calculateCiv6Damage(attackerStats.atk + flankingBonus, defensePower, state.seed);
    state.seed = newSeed;

    defender.hp -= damage;
    defender.lastDamagedOnTurn = state.turn;
    attacker.hasAttacked = true;
    attacker.movesLeft = 0;
    attacker.state = UnitState.Normal;

    // Remove defender if dead
    if (defender.hp <= 0) {
        state.units = state.units.filter(u => u.id !== defender.id);
    }

    // Counter-attack for melee defenders
    if (defender.hp > 0 && attackerStats.rng === 1) {
        let attackerDefense = attackerStats.def;
        const attackerTile = tileLookup.get(hexToString(attacker.coord));
        if (attackerTile) attackerDefense += TERRAIN[attackerTile.terrain].defenseMod;
        // Note: attacker cannot be fortified after attacking (state is Normal)

        const { damage: returnDamage, newSeed: returnSeed } = calculateCiv6Damage(
            defenderStats.atk, attackerDefense, state.seed
        );
        state.seed = returnSeed;
        attacker.hp -= returnDamage;
        attacker.lastDamagedOnTurn = state.turn;
    }

    // Remove attacker if dead
    if (attacker.hp <= 0) {
        state.units = state.units.filter(u => u.id !== attacker.id);
    }

    // Check for camp clearing when the last defender dies (reward credited to defender's owner)
    if (attacker.campId) {
        const remaining = state.units.filter(u => u.campId === attacker.campId);
        if (remaining.length === 0) {
            clearNativeCamp(state, attacker.campId, defender.ownerId);
        }
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

        // Only heal on camp tile or within patrol ring (territory radius)
        if (distFromCamp > NATIVE_CAMP_TERRITORY_RADIUS) continue;
        // Do not heal if unit was damaged this turn
        if (unit.lastDamagedOnTurn === state.turn) continue;

        const healAmount = distFromCamp === 0 ? NATIVE_HEAL_CAMP_TILE : NATIVE_HEAL_TERRITORY;
        unit.hp = Math.min(unit.maxHp, unit.hp + healAmount);
    }
}

/**
 * Reset native unit movement for end of round
 */
function resetNativeMovement(state: GameState): void {
    for (const unit of state.units.filter(u => u.ownerId === NATIVE_OWNER_ID)) {
        const stats = UNITS[unit.type];
        unit.movesLeft = stats.move;
        unit.hasAttacked = false;
    }
}

function convertCampToCity(state: GameState, camp: NativeCamp, killerPlayerId: string, campTile?: Tile): void {
    const newCity = createCity(state, killerPlayerId, camp.coord, { storedProduction: NATIVE_CAMP_CLEAR_PRODUCTION_REWARD });

    if (campTile) {
        const clearedIdx = campTile.overlays.indexOf(OverlayType.ClearedSettlement);
        if (clearedIdx !== -1) {
            campTile.overlays.splice(clearedIdx, 1);
        }
        campTile.ownerId = killerPlayerId;
        campTile.ownerCityId = newCity.id;
        campTile.hasCityCenter = true;
    }

    claimCityTerritory(newCity, state, killerPlayerId, 1);
    newCity.workedTiles = ensureWorkedTiles(newCity, state);
    state.cities.push(newCity);

    for (const otherPlayer of state.players) {
        if (otherPlayer.id === killerPlayerId) continue;

        const isAtWar = state.diplomacy[killerPlayerId]?.[otherPlayer.id] === DiplomacyState.War;
        if (!isAtWar) {
            expelUnitsFromTerritory(state, otherPlayer.id, killerPlayerId);
        }
    }

    logEvent(state, HistoryEventType.CityFounded, killerPlayerId, { cityId: newCity.id, cityName: newCity.name, coord: newCity.coord });
}

/**
 * Clear a native camp: remove overlay, optionally convert to a city for the killer, drop from state, and reset AI prep.
 */
export function clearNativeCamp(state: GameState, campId: string, killerPlayerId?: string): void {
    if (!state.nativeCamps) {
        state.nativeCamps = [];
    }
    const campIndex = state.nativeCamps.findIndex(c => c.id === campId);
    if (campIndex === -1) return;

    const camp = state.nativeCamps[campIndex];
    const campTile = state.map.tiles.find(t => hexEquals(t.coord, camp.coord));
    if (campTile) {
        const campIdx = campTile.overlays.indexOf(OverlayType.NativeCamp);
        if (campIdx !== -1) {
            campTile.overlays.splice(campIdx, 1);
        }
        if (!killerPlayerId && !campTile.overlays.includes(OverlayType.ClearedSettlement)) {
            campTile.overlays.push(OverlayType.ClearedSettlement);
        }
    }

    if (killerPlayerId) {
        convertCampToCity(state, camp, killerPlayerId, campTile);
    }

    state.nativeCamps.splice(campIndex, 1);

    // Clear any AI camp prep that targeted this camp
    for (const player of state.players) {
        if (player.campClearingPrep?.targetCampId === campId) {
            player.campClearingPrep = undefined;
        }
    }
}

/**
 * Process native camp behavior for the end of round
 * Called after all players have taken their turns
 */
export function processNativeTurn(state: GameState): void {
    if (!state.nativeCamps) {
        state.nativeCamps = [];
    }

    // First, reset movement for all native units
    resetNativeMovement(state);

    // Handle any camps that were cleared during the round (no reward context here)
    for (const camp of [...state.nativeCamps]) {
        const campUnits = getCampUnits(state, camp);
        if (campUnits.length === 0) {
            clearNativeCamp(state, camp.id);
        }
    }

    // Process each camp
    for (const camp of [...state.nativeCamps]) {
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
export function triggerNativeAggro(state: GameState, targetedUnit: Unit, _attackerPlayerId: string): void {
    if (!targetedUnit.campId) return;

    const camp = state.nativeCamps.find(c => c.id === targetedUnit.campId);
    if (!camp) return;

    camp.state = "Aggro";
    camp.aggroTurnsRemaining = NATIVE_CAMP_AGGRO_DURATION;
}
