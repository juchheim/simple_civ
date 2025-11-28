/**
 * AI Action Validation - Solutions 1-3 for efficiency
 * 
 * 1. Tile Reservation System - O(1) Set check to prevent friendly collisions
 * 2. Action Failure Tracking - O(1) Set check to prevent repeated failures
 * 3. Lightweight Pre-Validation - O(1) checks before expensive tryAction
 */

import { Action, GameState, HexCoord, TerrainType, UnitDomain, Unit, Tile } from "../../../core/types.js";
import { TERRAIN, UNITS } from "../../../core/constants.js";
import { hexDistance, hexEquals, hexToString, hexLine } from "../../../core/hex.js";

// ============================================================================
// Context Initialization Flag
// ============================================================================

/** Whether the validation context has been initialized for this turn */
let contextInitialized = false;

/**
 * Check if validation context is ready.
 * If not initialized, validation functions should be permissive (return true).
 */
export function isContextInitialized(): boolean {
    return contextInitialized;
}

// ============================================================================
// Solution 1: Tile Reservation System
// ============================================================================

/** Tiles that a friendly unit is moving to this turn */
const reservedTiles = new Set<string>();

/** Tiles occupied by friendly military at turn start (for quick lookup) */
const occupiedByFriendlyMilitary = new Set<string>();

/** Tiles occupied by friendly civilians at turn start */
const occupiedByFriendlyCivilian = new Set<string>();

export function initTileReservation(state: GameState, playerId: string) {
    reservedTiles.clear();
    occupiedByFriendlyMilitary.clear();
    occupiedByFriendlyCivilian.clear();
    
    for (const unit of state.units) {
        if (unit.ownerId === playerId) {
            const key = hexToString(unit.coord);
            const domain = UNITS[unit.type].domain;
            if (domain === UnitDomain.Civilian) {
                occupiedByFriendlyCivilian.add(key);
            } else {
                occupiedByFriendlyMilitary.add(key);
            }
        }
    }
}

export function reserveTile(coord: HexCoord) {
    reservedTiles.add(hexToString(coord));
}

export function isTileReserved(coord: HexCoord): boolean {
    return reservedTiles.has(hexToString(coord));
}

export function clearTileReservation() {
    reservedTiles.clear();
    occupiedByFriendlyMilitary.clear();
    occupiedByFriendlyCivilian.clear();
}

// ============================================================================
// Solution 2: Action Failure Tracking (Blocked Set)
// ============================================================================

/** Actions that have failed this turn - keyed by action signature */
const failedActions = new Set<string>();

function actionKey(action: Action): string {
    if (action.type === "MoveUnit") {
        return `move:${action.unitId}:${action.to.q},${action.to.r}`;
    }
    if (action.type === "Attack") {
        return `attack:${action.attackerId}:${action.targetId}`;
    }
    return `${action.type}:${JSON.stringify(action)}`;
}

export function markActionFailed(action: Action) {
    failedActions.add(actionKey(action));
}

export function hasActionFailed(action: Action): boolean {
    return failedActions.has(actionKey(action));
}

export function clearFailedActions() {
    failedActions.clear();
}

// ============================================================================
// Solution 3: Lightweight Pre-Validation
// ============================================================================

/** Tile lookup cache for O(1) tile access */
let tileLookup: Map<string, Tile> | null = null;

export function initTileLookup(state: GameState) {
    tileLookup = new Map();
    for (const tile of state.map.tiles) {
        tileLookup.set(hexToString(tile.coord), tile);
    }
}

export function clearTileLookup() {
    tileLookup = null;
}

function getTile(coord: HexCoord): Tile | undefined {
    if (!tileLookup) return undefined;
    return tileLookup.get(hexToString(coord));
}

/**
 * Lightweight pre-validation for MoveUnit actions
 * Returns false if the action will definitely fail
 * Returns true if the action might succeed (should still try)
 */
export function canAttemptMove(
    state: GameState,
    playerId: string,
    unit: Unit,
    to: HexCoord
): boolean {
    // If context not initialized (e.g., direct test calls), skip validation
    if (!contextInitialized) return true;
    
    // Check 1: Already failed this turn
    const moveAction = { type: "MoveUnit" as const, playerId, unitId: unit.id, to };
    if (hasActionFailed(moveAction)) return false;
    
    // Check 2: No moves left
    if (unit.movesLeft <= 0) return false;
    
    // Check 3: Distance must be exactly 1
    if (hexDistance(unit.coord, to) !== 1) return false;
    
    // Check 4: Tile reserved by another unit moving there
    if (isTileReserved(to)) return false;
    
    // Check 5: Target tile exists and is passable for unit domain
    const targetTile = getTile(to);
    if (!targetTile) return false;
    
    const stats = UNITS[unit.type];
    const terrain = targetTile.terrain;
    
    // Mountain is impassable for ALL unit types
    if (terrain === TerrainType.Mountain) return false;
    
    // Domain-specific terrain checks
    if (stats.domain === UnitDomain.Land || stats.domain === UnitDomain.Civilian) {
        if (terrain === TerrainType.Coast || terrain === TerrainType.DeepSea) return false;
    } else if (stats.domain === UnitDomain.Naval) {
        if (terrain !== TerrainType.Coast && terrain !== TerrainType.DeepSea) return false;
    }
    
    // Check 6: Movement cost vs remaining moves
    const terrainData = TERRAIN[terrain];
    let cost = 1;
    if (stats.domain === UnitDomain.Land || stats.domain === UnitDomain.Civilian) {
        cost = terrainData.moveCostLand ?? 999;
    } else if (stats.domain === UnitDomain.Naval) {
        cost = terrainData.moveCostNaval ?? 999;
    }
    // Single-move units and Titans always pay 1
    if (stats.move === 1 || unit.type === "Titan") {
        cost = 1;
    }
    if (unit.movesLeft < cost) return false;
    
    // Check 7: Friendly military already on tile
    const toKey = hexToString(to);
    if (stats.domain !== UnitDomain.Civilian && occupiedByFriendlyMilitary.has(toKey)) {
        return false;
    }
    if (stats.domain === UnitDomain.Civilian && occupiedByFriendlyCivilian.has(toKey)) {
        return false;
    }
    
    // Check 8: Enemy units on tile
    const enemyUnitsOnTile = state.units.filter(u => 
        hexEquals(u.coord, to) && u.ownerId !== playerId
    );
    const hasEnemyMilitary = enemyUnitsOnTile.some(u => UNITS[u.type].domain !== UnitDomain.Civilian);
    
    // Military units can't move onto enemy military
    if (hasEnemyMilitary && stats.domain !== UnitDomain.Civilian) {
        return false;
    }
    // Civilians can't move onto ANY enemy units
    if (stats.domain === UnitDomain.Civilian && enemyUnitsOnTile.length > 0) {
        return false;
    }
    
    // Check 9: City capture validation
    const cityOnTile = state.cities.find(c => hexEquals(c.coord, to));
    if (cityOnTile && cityOnTile.ownerId !== playerId) {
        if (cityOnTile.hp > 0) return false; // City not capturable yet
        if (!stats.canCaptureCity) return false; // Unit can't capture
    }
    
    return true;
}

/**
 * Lightweight pre-validation for Attack actions
 */
export function canAttemptAttack(
    state: GameState,
    playerId: string,
    attacker: Unit,
    targetId: string,
    targetType: "Unit" | "City"
): boolean {
    // If context not initialized (e.g., direct test calls), skip validation
    if (!contextInitialized) return true;
    
    // Check 1: Already failed this turn
    const attackAction = { type: "Attack" as const, playerId, attackerId: attacker.id, targetId, targetType };
    if (hasActionFailed(attackAction)) return false;
    
    // Check 2: Unit state checks
    if (attacker.hasAttacked) return false;
    if (attacker.movesLeft <= 0) return false;
    
    const stats = UNITS[attacker.type];
    
    // Check 3: Find target and check range
    let targetCoord: HexCoord | undefined;
    
    if (targetType === "Unit") {
        const defender = state.units.find(u => u.id === targetId);
        if (!defender) return false;
        targetCoord = defender.coord;
    } else {
        const city = state.cities.find(c => c.id === targetId);
        if (!city) return false;
        targetCoord = city.coord;
    }
    
    const dist = hexDistance(attacker.coord, targetCoord);
    if (dist > stats.rng) return false;
    
    // Check 4: Line of sight (only if range > 1, melee doesn't need LoS check)
    if (stats.rng > 1 && !hasLineOfSight(attacker.coord, targetCoord)) {
        return false;
    }
    
    return true;
}

/**
 * Simplified LoS check - only checks for blocking terrain, no tile lookup errors
 */
function hasLineOfSight(from: HexCoord, to: HexCoord): boolean {
    if (!tileLookup) return true; // Assume clear if no lookup available
    
    const line = hexLine(from, to);
    // Skip start and end tiles, only check intermediate
    for (let i = 1; i < line.length - 1; i++) {
        const tile = tileLookup.get(hexToString(line[i]));
        if (!tile) return false;
        if (TERRAIN[tile.terrain].blocksLoS) return false;
    }
    return true;
}

// ============================================================================
// Combined Context Management
// ============================================================================

/**
 * Initialize all validation context at the start of an AI turn
 */
export function initValidationContext(state: GameState, playerId: string) {
    contextInitialized = true;
    initTileReservation(state, playerId);
    initTileLookup(state);
    clearFailedActions();
}

/**
 * Clear all validation context at the end of an AI turn
 */
export function clearValidationContext() {
    contextInitialized = false;
    clearTileReservation();
    clearTileLookup();
    clearFailedActions();
}

/**
 * Update occupancy tracking when a unit successfully moves
 * Call this after a successful move to keep the occupied sets accurate
 */
export function updateOccupancyAfterMove(unit: Unit, from: HexCoord, to: HexCoord) {
    const fromKey = hexToString(from);
    const toKey = hexToString(to);
    const domain = UNITS[unit.type].domain;
    
    if (domain === UnitDomain.Civilian) {
        occupiedByFriendlyCivilian.delete(fromKey);
        occupiedByFriendlyCivilian.add(toKey);
    } else {
        occupiedByFriendlyMilitary.delete(fromKey);
        occupiedByFriendlyMilitary.add(toKey);
    }
    
    // Also reserve the destination tile
    reserveTile(to);
}

