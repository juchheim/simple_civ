import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType } from "../../../core/types.js";
import { DAMAGE_BASE, DAMAGE_MAX, DAMAGE_MIN, TERRAIN, UNITS } from "../../../core/constants.js";
import { tileDefenseScore, expectedDamageFrom, expectedDamageToUnit, enemiesWithin, friendlyAdjacencyCount } from "./combat-metrics.js";
import { hasMilitaryAdvantage } from "./war-state.js";

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

    candidates.sort((a, b) => {
        if (Math.abs(a.danger - b.danger) > 2) {
            return a.danger - b.danger;
        }
        if (a.movesTowardTarget !== b.movesTowardTarget) {
            return a.movesTowardTarget ? -1 : 1;
        }
        if (a.defense !== b.defense) {
            return b.defense - a.defense;
        }
        return a.danger - b.danger;
    });

    const best = candidates[0];
    if (best.danger > currentDanger + 5) {
        return null;
    }

    return best.coord;
}

export function estimateSurvivalRounds(
    unit: any,
    state: GameState,
    playerId: string
): number {
    const threats = getNearbyThreats(state, playerId, unit.coord, 2);
    const adjacentThreats = threats.filter(t => t.distance === 1);

    if (adjacentThreats.length === 0) return 99; // Safe

    const damagePerRound = adjacentThreats.reduce((sum, t) => {
        return sum + expectedDamageFrom(t.unit, unit, state);
    }, 0);

    if (damagePerRound <= 0) return 99;

    return Math.ceil(unit.hp / damagePerRound);
}

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

export function shouldRetreat(unit: any, state: GameState, playerId: string): boolean {
    const nearbyEnemies = enemiesWithin(state, playerId, unit.coord, 2);
    if (nearbyEnemies === 0) return false;

    const nearbyFriends = friendlyAdjacencyCount(state, playerId, unit.coord);
    const unitHpPercent = unit.hp / unit.maxHp;

    const immediateThreats = getNearbyThreats(state, playerId, unit.coord, 2);
    const adjacentThreats = immediateThreats.filter(t => t.distance === 1);

    const weCanKill = adjacentThreats.some(threat => {
        const ourDamage = expectedDamageToUnit(unit, threat.unit, state);
        return ourDamage >= threat.unit.hp;
    });

    const expectedIncomingDamage = adjacentThreats.reduce((sum, t) => {
        return sum + expectedDamageFrom(t.unit, unit, state);
    }, 0);

    const wouldDie = expectedIncomingDamage >= unit.hp;

    if (wouldDie && weCanKill && unit.hp > 3) {
        return false;
    }

    if (wouldDie && !weCanKill) {
        return true;
    }

    if (unitHpPercent < 0.3 && nearbyEnemies > nearbyFriends + 1) {
        return true;
    }

    if (nearbyEnemies >= 3 && nearbyFriends <= 1) {
        return true;
    }

    if (unitHpPercent < 0.5 && nearbyFriends === 0 && nearbyEnemies >= 2) {
        return true;
    }

    return false;
}

export function countThreatsToTile(
    state: GameState,
    playerId: string,
    coord: { q: number; r: number },
    excludeUnitId?: string
): { count: number; totalDamage: number } {
    let count = 0;
    let totalDamage = 0;

    for (const enemy of state.units) {
        if (enemy.ownerId === playerId) continue;
        if (excludeUnitId && enemy.id === excludeUnitId) continue;

        const stats = UNITS[enemy.type as UnitType];
        if (stats.domain === "Civilian") continue;

        const dist = hexDistance(enemy.coord, coord);
        const canReach = dist <= stats.rng || (dist <= stats.move + stats.rng);

        if (canReach) {
            count++;
            totalDamage += Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, DAMAGE_BASE + Math.floor((stats.atk - 3) / 2)));
        }
    }

    return { count, totalDamage };
}

export function isAttackSafe(
    attacker: any,
    target: any,
    targetCoord: { q: number; r: number },
    state: GameState,
    playerId: string
): { safe: boolean; reason: string; riskLevel: "low" | "medium" | "high" | "suicidal" } {
    const stats = UNITS[attacker.type as UnitType];
    const { advantage, ratio } = hasMilitaryAdvantage(state, playerId);

    const attackPosition = stats.rng > 1 ? attacker.coord : targetCoord;
    const threats = countThreatsToTile(state, playerId, attackPosition, target?.id);

    const returnDamage = target ? expectedDamageFrom(target, attacker, state) : 0;
    const totalExpectedDamage = returnDamage + threats.totalDamage;

    let riskLevel: "low" | "medium" | "high" | "suicidal";
    let reason = "";

    if (totalExpectedDamage >= attacker.hp) {
        riskLevel = "suicidal";
        reason = `Would take ${totalExpectedDamage} damage (HP: ${attacker.hp}) from ${threats.count + 1} enemies`;
    } else if (threats.count >= 3 || totalExpectedDamage >= attacker.hp * 0.8) {
        riskLevel = "high";
        reason = `${threats.count} additional enemies can attack after (${totalExpectedDamage} total damage expected)`;
    } else if (threats.count >= 2 || totalExpectedDamage >= attacker.hp * 0.5) {
        riskLevel = "medium";
        reason = `${threats.count} additional enemies nearby`;
    } else {
        riskLevel = "low";
        reason = "Attack position is relatively safe";
    }

    let safe = false;

    if (advantage && ratio >= 1.5) {
        safe = riskLevel !== "suicidal";
    } else if (advantage) {
        safe = riskLevel === "low" || riskLevel === "medium";
    } else {
        safe = riskLevel === "low";
    }

    return { safe, reason, riskLevel };
}

export function shouldRetreatAfterAttacking(
    unit: any,
    state: GameState,
    playerId: string
): boolean {
    const inFriendlyCity = state.cities.some(c =>
        c.ownerId === playerId && hexEquals(c.coord, unit.coord)
    );
    if (inFriendlyCity) return false;

    const { advantage } = hasMilitaryAdvantage(state, playerId);
    const threats = countThreatsToTile(state, playerId, unit.coord);

    if (threats.count >= 2) {
        if (!advantage) return true;
        if (threats.totalDamage >= unit.hp * 0.6) return true;
    }

    const hpPercent = unit.hp / (unit.maxHp || 10);
    if (hpPercent < 0.4 && threats.count >= 1) {
        return true;
    }

    return false;
}

export function isMeleeAttackExposed(
    attacker: any,
    targetCoord: { q: number; r: number },
    state: GameState,
    playerId: string,
    targetId?: string
): boolean {
    const threats = countThreatsToTile(state, playerId, targetCoord, targetId);
    const { advantage } = hasMilitaryAdvantage(state, playerId);

    if (!advantage && threats.count >= 2) {
        return true;
    }

    if (threats.count >= 3) {
        return true;
    }

    return false;
}
