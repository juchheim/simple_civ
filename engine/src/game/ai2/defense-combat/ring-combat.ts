import { DiplomacyState, GameState } from "../../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isMilitary } from "../unit-roles.js";

/**
 * v7.8: Defensive Ring Combat
 * Makes units in defensive ring positions (distance 1 from cities) actively attack enemies.
 * This ensures ring defenders don't just sit passively as they get picked off.
 * 
 * Priority:
 * 1. Attack enemies closest to the city we're defending
 * 2. Prefer attacks that will kill the enemy
 * 3. Avoid suicide attacks unless we can get a kill
 * 4. If out of range, move toward enemy and attack (intercept ranged attackers)
 */
export function runDefensiveRingCombat(state: GameState, playerId: string): GameState {
    let next = state;

    const myCities = next.cities.filter(c => c.ownerId === playerId);
    if (myCities.length === 0) return next;

    // Find enemies at war with us
    const enemies = next.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        next.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    if (enemies.length === 0) return next;
    const enemyIds = new Set(enemies.map(e => e.id));

    // For each city, find units in the defensive ring (distance 1) that can attack
    for (const city of myCities) {
        // Find ring defenders for this city
        const ringDefenders = next.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            !u.hasAttacked &&
            u.movesLeft > 0 &&
            hexDistance(u.coord, city.coord) === 1
        );

        if (ringDefenders.length === 0) continue;

        // v7.9: Increased detection range from 3 to 5 tiles to catch enemies earlier
        // This ensures ring defenders start moving/engaging before enemies reach the city
        const nearbyEnemies = next.units.filter(u =>
            enemyIds.has(u.ownerId) &&
            isMilitary(u) &&
            hexDistance(u.coord, city.coord) <= 5
        );

        if (nearbyEnemies.length === 0) continue;

        // v8.1: Check if enemies are very close to city (within range 2) - don't abandon ring position
        const enemiesThreateningCity = nearbyEnemies.filter(e =>
            hexDistance(e.coord, city.coord) <= 2
        );

        // For each ring defender, find and execute best attack
        for (const defender of ringDefenders) {
            const liveDefender = next.units.find(u => u.id === defender.id);
            if (!liveDefender || liveDefender.hasAttacked || liveDefender.movesLeft <= 0) continue;

            // v8.1: Healing logic - damaged units should stay put and heal
            // Skip attacking if below 50% HP, UNLESS city is critically threatened (enemy adjacent)
            const maxHp = UNITS[liveDefender.type].hp;
            const hpPercent = liveDefender.hp / maxHp;
            const enemyAdjacent = nearbyEnemies.some(e => hexDistance(e.coord, city.coord) <= 1);

            if (hpPercent < 0.5 && !enemyAdjacent) {
                // Stay put and heal - don't attack
                aiInfo(`[RING COMBAT] ${playerId} ${liveDefender.type} staying put to heal (HP: ${liveDefender.hp}/${maxHp})`);
                continue;
            }

            const range = UNITS[liveDefender.type].rng ?? 1;

            // Find enemies in attack range
            const attackableEnemies = nearbyEnemies.filter(e => {
                const liveEnemy = next.units.find(u => u.id === e.id);
                return liveEnemy && hexDistance(liveDefender.coord, liveEnemy.coord) <= range;
            });

            // If we have enemies in range, attack the best one
            if (attackableEnemies.length > 0) {
                // Score each potential attack
                let bestTarget: typeof attackableEnemies[0] | null = null;
                let bestScore = -Infinity;

                for (const enemy of attackableEnemies) {
                    const liveEnemy = next.units.find(u => u.id === enemy.id);
                    if (!liveEnemy) continue;

                    const preview = getCombatPreviewUnitVsUnit(next, liveDefender, liveEnemy);
                    const dmg = preview.estimatedDamage.avg;
                    const ret = preview.returnDamage?.avg ?? 0;

                    // Score factors
                    const wouldKill = dmg >= liveEnemy.hp ? 50 : 0;
                    const wouldDie = ret >= liveDefender.hp ? -100 : 0;
                    const proximityToCity = (4 - hexDistance(liveEnemy.coord, city.coord)) * 15;
                    const damageRatio = (dmg - ret) * 2;

                    const score = wouldKill + wouldDie + proximityToCity + damageRatio;

                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = liveEnemy;
                    }
                }

                // v8.1: Lowered threshold from -20 to -50 - ring defenders MUST engage to protect city
                // Even unfavorable trades are worth it to protect the city
                if (bestTarget && bestScore > -50) {
                    aiInfo(`[RING COMBAT] ${playerId} ring defender ${liveDefender.type} attacking ${bestTarget.type} near ${city.name} (score: ${bestScore.toFixed(0)})`);
                    next = tryAction(next, {
                        type: "Attack",
                        playerId,
                        attackerId: liveDefender.id,
                        targetId: bestTarget.id,
                        targetType: "Unit"
                    });
                }
            } else {
                // No enemies in range - consider moving toward enemy
                // v8.1: DON'T move if enemies are threatening the city - hold ring position instead
                if (enemiesThreateningCity.length > 0) {
                    aiInfo(`[RING COMBAT] ${playerId} ${liveDefender.type} holding ring position (${enemiesThreateningCity.length} enemies near city)`);
                    continue; // Stay in ring position to defend
                }

                // Only move if we're melee and need to intercept a ranged attacker
                const isDefenderMelee = range === 1;
                if (!isDefenderMelee) continue; // Ranged units should stay put

                const closestEnemy = nearbyEnemies
                    .map(e => {
                        const liveEnemy = next.units.find(u => u.id === e.id);
                        return liveEnemy ? { enemy: liveEnemy, dist: hexDistance(liveDefender.coord, liveEnemy.coord) } : null;
                    })
                    .filter((x): x is NonNullable<typeof x> => x !== null)
                    .sort((a, b) => a.dist - b.dist)[0];

                if (!closestEnemy) continue;

                // v8.1: Only move if enemy is ranged AND out of their range from current position
                // (i.e., we can't hit them but they might be able to hit us)
                const isEnemyRanged = (UNITS[closestEnemy.enemy.type].rng ?? 1) > 1;
                if (!isEnemyRanged) continue; // Don't chase melee enemies, let them come to us

                // Find move options that get us in attack range while staying near city
                const neighbors = getNeighbors(liveDefender.coord);
                const moveOptions = neighbors
                    .map(n => ({
                        coord: n,
                        distToEnemy: hexDistance(n, closestEnemy.enemy.coord),
                        distToCity: hexDistance(n, city.coord)
                    }))
                    .filter(opt => {
                        // Can't move onto occupied tiles or city tiles
                        const occupied = next.units.some(u => hexEquals(u.coord, opt.coord));
                        const cityTile = next.cities.some(c => hexEquals(c.coord, opt.coord));
                        // v8.1: Don't move more than 2 tiles from city
                        const tooFarFromCity = opt.distToCity > 2;
                        return !occupied && !cityTile && !tooFarFromCity;
                    })
                    // v8.1: Only consider moves that put enemy in attack range
                    .filter(opt => opt.distToEnemy <= range)
                    .sort((a, b) => a.distToCity - b.distToCity); // Prefer staying closer to city

                if (moveOptions.length === 0) continue;

                const bestMove = moveOptions[0];

                aiInfo(`[RING COMBAT] ${playerId} ring defender ${liveDefender.type} intercepting ranged ${closestEnemy.enemy.type}`);
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: liveDefender.id,
                    to: bestMove.coord
                });

                if (moveResult !== next) {
                    next = moveResult;

                    // After moving, attack if in range
                    const movedDefender = next.units.find(u => u.id === liveDefender.id);
                    const stillAliveEnemy = next.units.find(u => u.id === closestEnemy.enemy.id);

                    if (movedDefender && !movedDefender.hasAttacked && stillAliveEnemy) {
                        const newDist = hexDistance(movedDefender.coord, stillAliveEnemy.coord);
                        if (newDist <= range) {
                            aiInfo(`[RING COMBAT] ${playerId} ${movedDefender.type} attacking after move`);
                            next = tryAction(next, {
                                type: "Attack",
                                playerId,
                                attackerId: movedDefender.id,
                                targetId: stillAliveEnemy.id,
                                targetType: "Unit"
                            });
                        }
                    }
                }
            }
        }
    }

    return next;
}
