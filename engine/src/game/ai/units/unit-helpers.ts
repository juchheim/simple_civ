import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import {
    DiplomacyState,
    GameState,
    Player,
    TerrainType,
    UnitType,
    UnitState,
    BuildingType
} from "../../../core/types.js";
import {
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    DAMAGE_BASE,
    DAMAGE_MAX,
    DAMAGE_MIN,
    TERRAIN,
    UNITS
} from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { sortByDistance } from "../shared/metrics.js";
import { getEffectiveUnitStats } from "../../helpers/combat.js";
import { findFinishableEnemies, estimateMilitaryPower } from "../goals.js";

type SiegeMemory = { cityId: string; assignedTurn: number };

const primarySiegeMemory = new Map<string, SiegeMemory>();

export function cityIsCoastal(state: GameState, city: any): boolean {
    return getNeighbors(city.coord).some(c => {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, c));
        return tile && (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea);
    });
}

export function isAtWar(state: GameState, playerId: string): boolean {
    return state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

export function isScoutType(unitType: UnitType): boolean {
    return unitType === UnitType.Scout || unitType === UnitType.ArmyScout;
}

export function tileDefenseScore(state: GameState, coord: { q: number; r: number }): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -99;
    return TERRAIN[tile.terrain].defenseMod ?? 0;
}

export function expectedDamageToUnit(attacker: any, defender: any, state: GameState): number {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    const defenseStats = getEffectiveUnitStats(defender, state);
    let defensePower = defenseStats.def;
    const tile = state.map.tiles.find(t => hexEquals(t.coord, defender.coord));
    if (tile) {
        defensePower += TERRAIN[tile.terrain].defenseMod;
    }
    if (defender.state === UnitState.Fortified) defensePower += 1;
    const attackPower = attackerStats.atk;
    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    return Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));
}

export function expectedDamageToCity(attacker: any, city: any, state: GameState): number {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    let defensePower = CITY_DEFENSE_BASE + Math.floor(city.pop / 2);
    if (city.buildings?.includes(BuildingType.CityWard)) {
        defensePower += CITY_WARD_DEFENSE_BONUS;
    }
    const attackPower = attackerStats.atk;
    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    return Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));
}

export function expectedDamageFrom(defender: any, attacker: any, state: GameState): number {
    return expectedDamageToUnit(defender, attacker, state);
}

export function friendlyAdjacencyCount(state: GameState, playerId: string, coord: { q: number; r: number }): number {
    return getNeighbors(coord).filter(n =>
        state.units.some(u => u.ownerId === playerId && hexEquals(u.coord, n))
    ).length;
}

export function enemiesWithin(state: GameState, playerId: string, coord: { q: number; r: number }, radius: number): number {
    return state.units.filter(u =>
        u.ownerId !== playerId &&
        hexDistance(u.coord, coord) <= radius
    ).length;
}

export function getWarTargets(state: GameState, playerId: string): Player[] {
    return state.players.filter(
        p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

export function warPowerRatio(state: GameState, playerId: string, warTargets: Player[]): { myPower: number; enemyPower: number; ratio: number } {
    if (!warTargets.length) {
        return { myPower: 0, enemyPower: 0, ratio: 0 };
    }
    const myPower = estimateMilitaryPower(playerId, state);
    const enemyPowers = warTargets.map(t => estimateMilitaryPower(t.id, state));
    const enemyPower = Math.max(...enemyPowers, 0);
    const ratio = enemyPower > 0 ? myPower / enemyPower : Number.POSITIVE_INFINITY;
    return { myPower, enemyPower, ratio };
}

export function shouldUseWarProsecutionMode(state: GameState, playerId: string, warTargets: Player[]): boolean {
    if (!warTargets.length) return false;
    const { enemyPower, ratio } = warPowerRatio(state, playerId, warTargets);

    // Check if any enemy is "finishable" (few cities)
    const hasWeakEnemy = warTargets.some(p => {
        const cities = state.cities.filter(c => c.ownerId === p.id);
        return cities.length <= 2;
    });

    // v0.99: Steamroll logic - if we are 2x stronger OR enemy is weak, prosecute!
    return enemyPower > 0 && (ratio >= 2.0 || hasWeakEnemy);
}

export function warGarrisonCap(state: GameState, playerId: string, isInWarProsecutionMode: boolean): number {
    const playerCities = state.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return 0;
    if (isInWarProsecutionMode) return 1;
    return Math.max(1, Math.floor(playerCities.length / 2));
}

export function selectHeldGarrisons(state: GameState, playerId: string, warTargets: Player[], maxGarrisons: number): Set<string> {
    const held = new Set<string>();
    if (maxGarrisons <= 0) return held;

    const playerCities = state.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return held;

    const enemyUnits = state.units.filter(u => warTargets.some(w => w.id === u.ownerId));
    const orderedCities = [...playerCities].sort((a, b) => {
        if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
        const aThreat = enemyUnits.length ? Math.min(...enemyUnits.map(e => hexDistance(e.coord, a.coord))) : Number.POSITIVE_INFINITY;
        const bThreat = enemyUnits.length ? Math.min(...enemyUnits.map(e => hexDistance(e.coord, b.coord))) : Number.POSITIVE_INFINITY;
        if (aThreat !== bThreat) return aThreat - bThreat;
        return a.hp - b.hp;
    });

    for (const city of orderedCities) {
        if (held.size >= maxGarrisons) break;
        const stationed = state.units.filter(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
        if (!stationed.length) continue;
        const combatants = stationed.filter(u => UNITS[u.type].domain !== "Civilian");
        const defender = (combatants.length ? combatants : stationed).sort((a, b) => b.hp - a.hp)[0];
        if (defender) {
            held.add(defender.id);
        }
    }

    return held;
}

export function selectPrimarySiegeCity(
    state: GameState,
    playerId: string,
    units: any[],
    warCities: any[],
    options?: { forceRetarget?: boolean; preferClosest?: boolean }
): any | null {
    let preferClosest = !!options?.preferClosest;
    if (options?.forceRetarget) {
        primarySiegeMemory.delete(playerId);
    }

    const stored = primarySiegeMemory.get(playerId);
    if (stored) {
        const storedCity = warCities.find(c => c.id === stored.cityId);
        if (storedCity) {
            const turnsOnTarget = state.turn - stored.assignedTurn;
            if (turnsOnTarget >= 15) {
                primarySiegeMemory.delete(playerId);
                preferClosest = true;
            } else {
                return storedCity;
            }
        } else {
            primarySiegeMemory.delete(playerId);
        }
    }

    if (!warCities.length) {
        primarySiegeMemory.delete(playerId);
        return null;
    }

    if (!units.length) {
        primarySiegeMemory.delete(playerId);
        return null;
    }

    const finishableEnemyIds = findFinishableEnemies(playerId, state);
    const finishableCities = warCities.filter(c => finishableEnemyIds.includes(c.ownerId));

    const citiesToConsider = finishableCities.length > 0 ? finishableCities : warCities;

    const candidate = citiesToConsider
        .map(c => ({
            city: c,
            hp: c.hp,
            dist: Math.min(...units.map(u => hexDistance(u.coord, c.coord))),
            isCapital: c.isCapital ? 0 : 1,
            isFinishable: finishableEnemyIds.includes(c.ownerId) ? 0 : 1
        }))
        .sort((a, b) => {
            if (preferClosest) {
                if (a.dist !== b.dist) return a.dist - b.dist;
                if (a.hp !== b.hp) return a.hp - b.hp;
                if (a.isFinishable !== b.isFinishable) return a.isFinishable - b.isFinishable;
                return a.isCapital - b.isCapital;
            }
            if (a.isFinishable !== b.isFinishable) return a.isFinishable - b.isFinishable;
            if (a.isCapital !== b.isCapital) return a.isCapital - b.isCapital;
            if (a.hp !== b.hp) return a.hp - b.hp;
            return a.dist - b.dist;
        })[0].city;

    if (finishableEnemyIds.includes(candidate.ownerId)) {
        console.info(`[AI FINISH HIM] ${playerId} targeting ${candidate.name} (${candidate.ownerId}) - weak enemy with few cities!`);
    }

    primarySiegeMemory.set(playerId, { cityId: candidate.id, assignedTurn: state.turn });
    return candidate;
}

export function stepToward(
    state: GameState,
    playerId: string,
    unitId: string,
    target: { q: number; r: number }
): GameState {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || unit.movesLeft <= 0) return state;

    if (hexDistance(unit.coord, target) === 1) {
        // Check for peacetime movement restrictions
        const tile = state.map.tiles.find(t => hexEquals(t.coord, target));
        let allowed = true;
        if (tile && tile.ownerId && tile.ownerId !== playerId) {
            const diplomacy = state.diplomacy[playerId]?.[tile.ownerId];
            const isCity = state.cities.some(c => hexEquals(c.coord, target));
            if (!isCity && diplomacy !== DiplomacyState.War) allowed = false;
        }

        if (allowed) {
            const movedDirect = tryAction(state, {
                type: "MoveUnit",
                playerId,
                unitId,
                to: target
            });
            if (movedDirect !== state) return movedDirect;
        }
    }

    const neighbors = getNeighbors(unit.coord);
    const ordered = sortByDistance(target, neighbors, coord => coord);
    for (const neighbor of ordered) {
        // Check for peacetime movement restrictions
        const tile = state.map.tiles.find(t => hexEquals(t.coord, neighbor));
        if (tile && tile.ownerId && tile.ownerId !== playerId) {
            const diplomacy = state.diplomacy[playerId]?.[tile.ownerId];
            const isCity = state.cities.some(c => hexEquals(c.coord, neighbor));
            if (!isCity && diplomacy !== DiplomacyState.War) continue;
        }

        const moved = tryAction(state, {
            type: "MoveUnit",
            playerId,
            unitId,
            to: neighbor
        });
        if (moved !== state) return moved;
    }

    return state;
}

// --- TACTICAL HELPERS (v1.0) ---

export function getThreatLevel(state: GameState, city: any, playerId: string): "none" | "low" | "high" | "critical" {
    const enemies = enemiesWithin(state, playerId, city.coord, 3);
    if (enemies === 0) return "none";

    const cityHpPercent = city.hp / city.maxHp;
    if (cityHpPercent <= 0.5 || enemies >= 3) return "critical";
    if (enemies >= 1) return "high";
    return "low";
}

// Note: shouldRetreat has been moved to the "INTELLIGENT RETREAT" section below
// with enhanced combat outcome evaluation

export function getBestSkirmishPosition(
    unit: any,
    target: any,
    state: GameState,
    playerId: string
): { q: number; r: number } | null {
    const stats = UNITS[unit.type as UnitType];
    if (stats.rng <= 1) return null; // Melee units don't skirmish

    const currentDist = hexDistance(unit.coord, target.coord);
    const desiredDist = stats.rng;

    // If we are already at max range, stay there (unless we can move to better terrain at same range)
    if (currentDist === desiredDist) {
        // Check if current tile is safe-ish
        const enemiesAdj = enemiesWithin(state, playerId, unit.coord, 1);
        if (enemiesAdj === 0) return unit.coord;
    }

    const neighbors = getNeighbors(unit.coord);
    const candidates = neighbors.map(n => ({
        coord: n,
        dist: hexDistance(n, target.coord),
        defense: tileDefenseScore(state, n),
        enemiesAdj: enemiesWithin(state, playerId, n, 1)
    }));

    // Filter valid moves
    const valid = candidates.filter(c => {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, c.coord));
        if (!tile || (tile.ownerId && tile.ownerId !== playerId && state.diplomacy[playerId]?.[tile.ownerId] !== DiplomacyState.War)) return false; // Respect borders if not at war
        if (state.units.some(u => hexEquals(u.coord, c.coord))) return false; // Blocked
        return true;
    });

    // Sort by: 
    // 1. Safety (0 adjacent enemies)
    // 2. Range (closest to max range without exceeding it)
    // 3. Defense bonus
    valid.sort((a, b) => {
        const aSafe = a.enemiesAdj === 0 ? 1 : 0;
        const bSafe = b.enemiesAdj === 0 ? 1 : 0;
        if (aSafe !== bSafe) return bSafe - aSafe;

        const aRangeScore = Math.abs(desiredDist - a.dist);
        const bRangeScore = Math.abs(desiredDist - b.dist);
        if (aRangeScore !== bRangeScore) return aRangeScore - bRangeScore;

        return b.defense - a.defense;
    });

    return valid.length > 0 ? valid[0].coord : null;
}

// --- INTELLIGENT RETREAT (v2.0) ---

/**
 * Calculate danger score for a tile based on nearby enemies and their attack capabilities.
 * Higher score = more dangerous.
 */
export function evaluateTileDanger(
    state: GameState,
    playerId: string,
    coord: { q: number; r: number }
): number {
    let dangerScore = 0;

    // Get all enemy units
    const enemies = state.units.filter(u => u.ownerId !== playerId);

    for (const enemy of enemies) {
        const dist = hexDistance(coord, enemy.coord);
        const stats = UNITS[enemy.type as UnitType];

        // Adjacent enemies are very dangerous (can attack immediately)
        if (dist === 1) {
            dangerScore += 10 + stats.atk;
        }
        // Within attack range is dangerous
        else if (dist <= stats.rng) {
            dangerScore += 5 + stats.atk * 0.5;
        }
        // Within 2 moves is a threat
        else if (dist <= stats.move + 1) {
            dangerScore += 2;
        }
    }

    // Bonus safety for friendly city tiles
    const cityOnTile = state.cities.find(c => hexEquals(c.coord, coord) && c.ownerId === playerId);
    if (cityOnTile) {
        dangerScore -= 5;
    }

    // Bonus safety for high defense terrain
    dangerScore -= tileDefenseScore(state, coord) * 2;

    return dangerScore;
}

/**
 * Find all enemies within a certain range and return their info.
 * Used for multi-threat awareness.
 */
export function getNearbyThreats(
    state: GameState,
    playerId: string,
    coord: { q: number; r: number },
    range: number
): Array<{ unit: any; distance: number; attackPower: number }> {
    const threats: Array<{ unit: any; distance: number; attackPower: number }> = [];

    for (const unit of state.units) {
        if (unit.ownerId === playerId) continue;

        const dist = hexDistance(coord, unit.coord);
        if (dist <= range) {
            const stats = UNITS[unit.type as UnitType];
            if (stats.domain !== "Civilian") {
                threats.push({
                    unit,
                    distance: dist,
                    attackPower: stats.atk
                });
            }
        }
    }

    return threats.sort((a, b) => a.distance - b.distance);
}

/**
 * Find the safest adjacent tile to step toward a target.
 * Avoids moving into tiles with high danger (enemies in attack range).
 * Returns null if staying put is safer than any movement option.
 */
export function findSafeRetreatTile(
    state: GameState,
    playerId: string,
    unit: any,
    targetCoord: { q: number; r: number }
): { q: number; r: number } | null {
    const currentDanger = evaluateTileDanger(state, playerId, unit.coord);
    const neighbors = getNeighbors(unit.coord);

    const candidates = neighbors
        .map(coord => {
            const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
            if (!tile) return null;

            // Check terrain passability
            const terrain = TERRAIN[tile.terrain];
            if (terrain.blocksLoS) return null; // Mountains, etc.

            // Check for blocking unit
            const blockingUnit = state.units.find(u => hexEquals(u.coord, coord));
            if (blockingUnit && blockingUnit.ownerId !== playerId) return null;
            if (blockingUnit && UNITS[blockingUnit.type].domain !== "Civilian") return null;

            // Check territory restrictions (peace time)
            if (tile.ownerId && tile.ownerId !== playerId) {
                const diplomacy = state.diplomacy[playerId]?.[tile.ownerId];
                if (diplomacy !== DiplomacyState.War) return null;
            }

            const danger = evaluateTileDanger(state, playerId, coord);
            const distToTarget = hexDistance(coord, targetCoord);
            const currentDistToTarget = hexDistance(unit.coord, targetCoord);
            const movesTowardTarget = distToTarget < currentDistToTarget;

            return {
                coord,
                danger,
                distToTarget,
                movesTowardTarget,
                defense: tileDefenseScore(state, coord)
            };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

    if (candidates.length === 0) return null;

    // Sort by:
    // 1. Safety (lower danger is better)
    // 2. Moves toward target (prefer progress toward safety)
    // 3. Defense bonus (prefer defensible terrain)
    candidates.sort((a, b) => {
        // Primary: Avoid danger (strongly prefer safer tiles)
        if (Math.abs(a.danger - b.danger) > 2) {
            return a.danger - b.danger;
        }

        // Secondary: Progress toward target
        if (a.movesTowardTarget !== b.movesTowardTarget) {
            return a.movesTowardTarget ? -1 : 1;
        }

        // Tertiary: Better defense
        if (a.defense !== b.defense) {
            return b.defense - a.defense;
        }

        // Finally: Lower danger
        return a.danger - b.danger;
    });

    const best = candidates[0];

    // Don't move if staying is significantly safer
    if (best.danger > currentDanger + 5) {
        return null;
    }

    return best.coord;
}

// --- COMBAT EVALUATION (v2.0) ---

/**
 * Estimate how many rounds the unit can survive against nearby threats.
 * Lower = more danger, 0 = would die this turn.
 */
export function estimateSurvivalRounds(
    unit: any,
    state: GameState,
    playerId: string
): number {
    const threats = getNearbyThreats(state, playerId, unit.coord, 2);
    const adjacentThreats = threats.filter(t => t.distance === 1);

    if (adjacentThreats.length === 0) return 99; // Safe

    // Calculate expected damage per round from adjacent enemies
    const damagePerRound = adjacentThreats.reduce((sum, t) => {
        return sum + expectedDamageFrom(t.unit, unit, state);
    }, 0);

    if (damagePerRound <= 0) return 99;

    return Math.ceil(unit.hp / damagePerRound);
}

/**
 * Check if unit can one-shot any nearby enemy.
 * Returns the weakest enemy we can kill, or null if none.
 */
export function canKillNearbyEnemy(
    unit: any,
    state: GameState,
    playerId: string
): { unit: any; damage: number } | null {
    const threats = getNearbyThreats(state, playerId, unit.coord, 2);
    const adjacentThreats = threats.filter(t => t.distance === 1);

    for (const threat of adjacentThreats) {
        const ourDamage = expectedDamageToUnit(unit, threat.unit, state);
        if (ourDamage >= threat.unit.hp) {
            return { unit: threat.unit, damage: ourDamage };
        }
    }

    return null;
}

/**
 * Enhanced retreat decision that considers combat outcomes.
 * Returns true if the unit should retreat instead of fighting.
 */
export function shouldRetreat(unit: any, state: GameState, playerId: string): boolean {
    const nearbyEnemies = enemiesWithin(state, playerId, unit.coord, 2);
    if (nearbyEnemies === 0) return false;

    const nearbyFriends = friendlyAdjacencyCount(state, playerId, unit.coord);
    const unitHpPercent = unit.hp / unit.maxHp;

    // Get immediate threats (enemies that can attack us this turn)
    const immediateThreats = getNearbyThreats(state, playerId, unit.coord, 2);
    const adjacentThreats = immediateThreats.filter(t => t.distance === 1);

    // Estimate if we can kill any adjacent enemy before dying
    const weCanKill = adjacentThreats.some(threat => {
        const ourDamage = expectedDamageToUnit(unit, threat.unit, state);
        return ourDamage >= threat.unit.hp;
    });

    // Estimate how much damage we'd take this turn
    const expectedIncomingDamage = adjacentThreats.reduce((sum, t) => {
        return sum + expectedDamageFrom(t.unit, unit, state);
    }, 0);

    const wouldDie = expectedIncomingDamage >= unit.hp;

    // SMART RETREAT RULES:

    // Rule 1: If we'd die but can get a kill, consider staying (trade)
    if (wouldDie && weCanKill && unit.hp > 3) {
        // Only trade if it's a valuable target or we're not critically hurt
        return false;
    }

    // Rule 2: If we'd die without getting a kill, definitely retreat
    if (wouldDie && !weCanKill) {
        return true;
    }

    // Rule 3: If critically wounded (< 30% HP) and outnumbered, retreat
    if (unitHpPercent < 0.3 && nearbyEnemies > nearbyFriends + 1) {
        return true;
    }

    // Rule 4: If completely overwhelmed (1v3+) even if healthy, retreat
    if (nearbyEnemies >= 3 && nearbyFriends <= 1) {
        return true;
    }

    // Rule 5: If moderately wounded (< 50%) and no support, retreat
    if (unitHpPercent < 0.5 && nearbyFriends === 0 && nearbyEnemies >= 2) {
        return true;
    }

    return false;
}
