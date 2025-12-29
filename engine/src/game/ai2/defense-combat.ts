// Combat-oriented defensive behaviors extracted from defense.ts.
import { GameState, DiplomacyState } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { tryAction } from "../ai/shared/actions.js";
import { getThreatLevel } from "../ai/units/unit-helpers.js";
import { getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { aiInfo } from "../ai/debug-logging.js";
import { assessDefenseSituation, DefenseSituation } from "./defense-situation.js";
import { isMilitary } from "./unit-roles.js";


/**
 * v7.1: Home Defender Territorial Combat
 * Makes home defenders aggressively hunt and attack enemies in friendly territory.
 * This runs BEFORE the main offensive tactics to ensure territorial defense is prioritized.
 */
export function runHomeDefenderCombat(state: GameState, playerId: string): GameState {
    let next = state;

    // Get all home defenders that can act
    const homeDefenders = next.units.filter(u =>
        u.ownerId === playerId &&
        u.isHomeDefender === true &&
        isMilitary(u) &&
        !u.hasAttacked
    );

    if (homeDefenders.length === 0) return next;

    // Get all friendly territory tiles
    const friendlyTiles = new Set(
        next.map.tiles
            .filter(t => t.ownerId === playerId)
            .map(t => `${t.coord.q},${t.coord.r}`)
    );

    // Find all enemies that are at war with us
    const enemies = next.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        next.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    const enemyIds = new Set(enemies.map(e => e.id));

    // Find enemy units in or near friendly territory (within 2 tiles of our territory)
    const enemiesInTerritory = next.units.filter(u => {
        if (!enemyIds.has(u.ownerId)) return false;
        if (!isMilitary(u)) return false;

        // Check if enemy is in friendly territory
        const inTerritory = friendlyTiles.has(`${u.coord.q},${u.coord.r}`);
        if (inTerritory) return true;

        // Check if enemy is adjacent to friendly territory (threatening)
        const neighbors = getNeighbors(u.coord);
        return neighbors.some(n => friendlyTiles.has(`${n.q},${n.r}`));
    });

    if (enemiesInTerritory.length === 0) return next;

    // Get our cities for prioritization
    const myCities = next.cities.filter(c => c.ownerId === playerId);

    // Sort enemies by threat: closer to cities = higher priority
    const sortedEnemies = [...enemiesInTerritory].sort((a, b) => {
        const aMinDist = Math.min(...myCities.map(c => hexDistance(a.coord, c.coord)));
        const bMinDist = Math.min(...myCities.map(c => hexDistance(b.coord, c.coord)));
        return aMinDist - bMinDist; // Closer to cities = higher priority
    });

    aiInfo(`[AI Defense] ${playerId} has ${homeDefenders.length} home defenders vs ${enemiesInTerritory.length} enemies in territory`);

    // For each home defender, find and execute the best attack against territorial enemies
    for (const defender of homeDefenders) {
        const liveDefender = next.units.find(u => u.id === defender.id);
        if (!liveDefender || liveDefender.hasAttacked || liveDefender.movesLeft <= 0) continue;

        // Check if this unit is garrisoned (on city tile) - garrisoned units can't attack
        const onCity = myCities.some(c => hexEquals(c.coord, liveDefender.coord));
        if (onCity) continue; // Skip garrisoned defenders for attacks (they defend passively)

        // Find best attack target among enemies in territory
        let bestTarget: typeof sortedEnemies[0] | null = null;
        let bestScore = -Infinity;

        for (const enemy of sortedEnemies) {
            const liveEnemy = next.units.find(u => u.id === enemy.id);
            if (!liveEnemy) continue;

            const dist = hexDistance(liveDefender.coord, liveEnemy.coord);
            const range = UNITS[liveDefender.type].rng ?? 1;

            // Check if we can attack this turn
            if (dist > range) continue;

            // Score this attack (simple scoring for defensive attacks)
            const preview = getCombatPreviewUnitVsUnit(next, liveDefender, liveEnemy);
            const dmg = preview.estimatedDamage.avg;
            const ret = preview.returnDamage?.avg ?? 0;
            const kill = dmg >= liveEnemy.hp ? 50 : 0;
            const suicide = ret >= liveDefender.hp ? -100 : 0;

            // Priority: enemies closer to cities are more valuable to kill
            const cityProximityBonus = Math.max(0, 6 - Math.min(...myCities.map(c => hexDistance(liveEnemy.coord, c.coord)))) * 10;

            const score = dmg * 2 + kill + suicide - ret + cityProximityBonus;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = liveEnemy;
            }
        }

        // Execute attack if we found a good target
        if (bestTarget && bestScore > 0) {
            aiInfo(`[AI Defense] Home defender ${liveDefender.type} attacking ${bestTarget.type} (score: ${bestScore.toFixed(0)})`);
            next = tryAction(next, {
                type: "Attack",
                playerId,
                attackerId: liveDefender.id,
                targetId: bestTarget.id,
                targetType: "Unit"
            });
        }
    }

    // Second pass: Move home defenders toward enemies they couldn't attack
    for (const defender of homeDefenders) {
        const liveDefender = next.units.find(u => u.id === defender.id);
        if (!liveDefender || liveDefender.movesLeft <= 0) continue;

        // Skip if already in a city (garrison duty)
        const onCity = myCities.some(c => hexEquals(c.coord, liveDefender.coord));
        if (onCity) continue;

        // Find closest enemy in territory that we couldn't attack
        const range = UNITS[liveDefender.type].rng ?? 1;
        const targetEnemy = sortedEnemies.find(e => {
            const liveEnemy = next.units.find(u => u.id === e.id);
            return liveEnemy && hexDistance(liveDefender.coord, liveEnemy.coord) > range;
        });

        if (!targetEnemy) continue;
        const liveTarget = next.units.find(u => u.id === targetEnemy.id);
        if (!liveTarget) continue;

        // Move toward the enemy (but stay in friendly territory if possible)
        const neighbors = getNeighbors(liveDefender.coord)
            .filter(n => {
                // Can we move there?
                const tile = next.map.tiles.find(t => hexEquals(t.coord, n));
                if (!tile) return false;
                // Prefer staying in friendly territory
                return true;
            })
            .sort((a, b) => {
                const aDist = hexDistance(a, liveTarget.coord);
                const bDist = hexDistance(b, liveTarget.coord);
                // Prefer tiles in friendly territory
                const aInTerritory = friendlyTiles.has(`${a.q},${a.r}`) ? -10 : 0;
                const bInTerritory = friendlyTiles.has(`${b.q},${b.r}`) ? -10 : 0;
                return (aDist + aInTerritory) - (bDist + bInTerritory);
            });

        for (const step of neighbors) {
            const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: liveDefender.id, to: step });
            if (moved !== next) {
                aiInfo(`[AI Defense] Home defender ${liveDefender.type} moving toward enemy in territory`);
                next = moved;
                break;
            }
        }
    }

    return next;
}


/**
 * v7.2: Coordinated Defensive Focus Fire
 * When a city is threatened, coordinate nearby defenders to focus-fire the same enemy.
 * Goal: Kill enemies before they can attack the city.
 * 
 * Priority order:
 * 1. Enemies that can be killed this turn (multiple units focus same target)
 * 2. Enemies closest to cities
 * 3. Ranged enemies (they can hit city from distance)
 */
export function coordinateDefensiveFocusFire(state: GameState, playerId: string): GameState {
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

    // Build set of city coords to avoid pulling garrisons
    const cityCoords = new Set(myCities.map(c => `${c.coord.q},${c.coord.r}`));

    // For each threatened city, coordinate defense
    for (const city of myCities) {
        const threat = getThreatLevel(next, city, playerId);
        if (threat === "none") continue;

        // Find enemies within 3 tiles of this city (immediate threat)
        const nearbyEnemies = next.units.filter(u =>
            enemyIds.has(u.ownerId) &&
            isMilitary(u) &&
            hexDistance(u.coord, city.coord) <= 3
        );
        if (nearbyEnemies.length === 0) continue;

        // Find our defenders within 2 tiles of city that can attack
        // CRITICAL: Don't include garrisoned units - they can't attack!
        const defenders = next.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            !u.hasAttacked &&
            u.movesLeft > 0 &&
            hexDistance(u.coord, city.coord) <= 2 &&
            !cityCoords.has(`${u.coord.q},${u.coord.r}`) // Not garrisoned
        );
        if (defenders.length === 0) continue;

        // Score enemies for focus fire priority
        const scoredEnemies = nearbyEnemies.map(enemy => {
            const distToCity = hexDistance(enemy.coord, city.coord);
            const isRanged = UNITS[enemy.type].rng > 1;
            const hpPercent = enemy.hp / (enemy.maxHp || UNITS[enemy.type].hp);

            // Higher score = higher priority to kill
            let score = 100 - distToCity * 20; // Closer = higher priority
            if (isRanged) score += 30; // Ranged enemies are dangerous
            score += (1 - hpPercent) * 20; // Low HP enemies easier to finish

            return { enemy, score, distToCity };
        }).sort((a, b) => b.score - a.score);

        // Try to coordinate attacks on highest priority enemy
        for (const { enemy } of scoredEnemies) {
            const liveEnemy = next.units.find(u => u.id === enemy.id);
            if (!liveEnemy) continue; // Already dead
            if (liveEnemy.hp <= 0) continue;

            // Calculate total damage we can deal to this enemy
            let totalDamage = 0;
            const attackPlans: Array<{ defender: typeof defenders[0], damage: number }> = [];

            for (const defender of defenders) {
                const liveDefender = next.units.find(u => u.id === defender.id);
                if (!liveDefender || liveDefender.hasAttacked) continue;

                // Check if defender can attack this enemy
                const range = UNITS[liveDefender.type].rng || 1;
                const dist = hexDistance(liveDefender.coord, liveEnemy.coord);
                if (dist > range) continue; // Can't reach

                // Use combat preview to estimate damage
                const preview = getCombatPreviewUnitVsUnit(next, liveDefender, liveEnemy);
                const damage = preview.estimatedDamage.avg; // Use average damage estimate

                attackPlans.push({ defender: liveDefender, damage });
                totalDamage += damage;
            }

            // If we can kill this enemy, execute the attacks!
            if (totalDamage >= liveEnemy.hp && attackPlans.length > 0) {
                aiInfo(`[FOCUS FIRE] ${playerId} coordinating ${attackPlans.length} units to kill ${liveEnemy.type} (HP:${liveEnemy.hp}, est.dmg:${totalDamage})`);

                // Sort by damage (highest last so finisher gets the kill)
                attackPlans.sort((a, b) => a.damage - b.damage);

                let currentHp = liveEnemy.hp;
                for (const plan of attackPlans) {
                    if (currentHp <= 0) break; // Enemy dead

                    const liveDefender = next.units.find(u => u.id === plan.defender.id);
                    if (!liveDefender || liveDefender.hasAttacked) continue;

                    const attackResult = tryAction(next, {
                        type: "Attack",
                        playerId,
                        attackerId: liveDefender.id,
                        targetId: liveEnemy.id,
                        targetType: "Unit"
                    });

                    if (attackResult !== next) {
                        next = attackResult;
                        currentHp -= plan.damage;
                    }
                }

                // Check if enemy is dead
                const stillAlive = next.units.find(u => u.id === liveEnemy.id);
                if (!stillAlive || stillAlive.hp <= 0) {
                    aiInfo(`[FOCUS FIRE] ${playerId} killed ${liveEnemy.type}!`);
                }

                break; // Move to next city after coordinating an attack
            }
        }
    }

    return next;
}

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


/**
 * v8.1: Last Stand Combat
 * Forces cornered units to attack instead of passively dying.
 * 
 * A unit is considered "cornered" if:
 * 1. It has nearby enemies (within range 2)
 * 2. It cannot retreat to a friendly city (no path or blocked)
 * 3. It hasn't attacked yet this turn
 * 
 * Cornered units attack the best available target regardless of normal score thresholds.
 * Better to go down fighting than to die passively.
 */
export function runLastStandAttacks(state: GameState, playerId: string): GameState {
    let next = state;

    // Find enemies at war with us
    const enemies = next.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        next.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    if (enemies.length === 0) return next;
    const enemyIds = new Set(enemies.map(e => e.id));

    // Get friendly cities for retreat check
    const myCities = next.cities.filter(c => c.ownerId === playerId);

    // Find units that might be cornered
    const militaryUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        !u.hasAttacked &&
        u.movesLeft > 0
    );

    for (const unit of militaryUnits) {
        const liveUnit = next.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.hasAttacked) continue;

        // Check if there are nearby enemies
        const nearbyEnemies = next.units.filter(u =>
            enemyIds.has(u.ownerId) &&
            isMilitary(u) &&
            hexDistance(u.coord, liveUnit.coord) <= 2
        );

        if (nearbyEnemies.length === 0) continue; // Not threatened

        // Check if unit can escape to a friendly city
        const canRetreat = checkCanRetreat(next, liveUnit, myCities, enemyIds);

        if (canRetreat) continue; // Can still escape, normal logic applies

        // Unit is cornered! Force an attack on any available target
        const range = UNITS[liveUnit.type].rng ?? 1;
        const attackableEnemies = nearbyEnemies.filter(e =>
            hexDistance(liveUnit.coord, e.coord) <= range
        );

        if (attackableEnemies.length === 0) {
            // Can't attack directly, but maybe we CAN move to attack
            // Try to move to a tile that puts an enemy in range
            const neighbors = getNeighbors(liveUnit.coord);
            for (const neighbor of neighbors) {
                // Check if tile is unoccupied and not a city
                const occupied = next.units.some(u => hexEquals(u.coord, neighbor));
                const isCity = next.cities.some(c => hexEquals(c.coord, neighbor));
                if (occupied || isCity) continue;

                // Check if moving here puts an enemy in range
                const enemyInRange = nearbyEnemies.find(e =>
                    hexDistance(neighbor, e.coord) <= range
                );
                if (!enemyInRange) continue;

                // Move and attack!
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: liveUnit.id,
                    to: neighbor
                });

                if (moveResult !== next) {
                    next = moveResult;
                    const movedUnit = next.units.find(u => u.id === liveUnit.id);
                    const stillAlive = next.units.find(u => u.id === enemyInRange.id);

                    if (movedUnit && !movedUnit.hasAttacked && stillAlive) {
                        aiInfo(`[LAST STAND] ${playerId} ${movedUnit.type} moved and attacking ${stillAlive.type} (cornered, no escape)`);
                        next = tryAction(next, {
                            type: "Attack",
                            playerId,
                            attackerId: movedUnit.id,
                            targetId: stillAlive.id,
                            targetType: "Unit"
                        });
                    }
                    break;
                }
            }
            continue;
        }

        // Find best target (even at negative score - we're desperate!)
        let bestTarget: typeof attackableEnemies[0] | null = null;
        let bestScore = -Infinity;

        for (const enemy of attackableEnemies) {
            const preview = getCombatPreviewUnitVsUnit(next, liveUnit, enemy);
            const dmg = preview.estimatedDamage.avg;
            const ret = preview.returnDamage?.avg ?? 0;

            // Scoring for last stand: prioritize damage dealt and kills
            const wouldKill = dmg >= enemy.hp ? 100 : 0;
            const damageDealt = dmg * 3; // Value damage highly
            const damageTaken = ret * 1; // Deprioritize damage taken (we're dying anyway)

            const score = wouldKill + damageDealt - damageTaken;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = enemy;
            }
        }

        if (bestTarget) {
            aiInfo(`[LAST STAND] ${playerId} ${liveUnit.type} attacking ${bestTarget.type} (cornered, no escape, score: ${bestScore.toFixed(0)})`);
            next = tryAction(next, {
                type: "Attack",
                playerId,
                attackerId: liveUnit.id,
                targetId: bestTarget.id,
                targetType: "Unit"
            });
        }
    }

    return next;
}

/**
 * Check if a unit can retreat to a friendly city.
 * Returns false if:
 * - No friendly cities exist
 * - All adjacent tiles are blocked by enemies
 * - Unit is effectively surrounded
 */
function checkCanRetreat(
    state: GameState,
    unit: { coord: { q: number; r: number }, movesLeft: number },
    myCities: Array<{ coord: { q: number; r: number } }>,
    enemyIds: Set<string>
): boolean {
    if (myCities.length === 0) return false;

    // Find the nearest friendly city
    const nearestCity = myCities.reduce((nearest, city) => {
        const dist = hexDistance(unit.coord, city.coord);
        const nearestDist = hexDistance(unit.coord, nearest.coord);
        return dist < nearestDist ? city : nearest;
    }, myCities[0]);

    // Check if all adjacent tiles are blocked or lead away from safety
    const neighbors = getNeighbors(unit.coord);
    let validEscapeRoutes = 0;

    for (const neighbor of neighbors) {
        // Check if tile is occupied by enemy
        const enemyOnTile = state.units.some(u =>
            hexEquals(u.coord, neighbor) && enemyIds.has(u.ownerId)
        );
        if (enemyOnTile) continue;

        // Check if this tile gets us closer to a city
        const currentDist = hexDistance(unit.coord, nearestCity.coord);
        const newDist = hexDistance(neighbor, nearestCity.coord);
        if (newDist < currentDist) {
            validEscapeRoutes++;
        }
    }

    // If no valid escape routes leading toward safety, we're cornered
    return validEscapeRoutes > 0;
}

/**
 * v8.0: Tactical Defense System
 * 
 * Uses defense situation assessment to execute intelligent defensive actions:
 * - Intercept: Melee units pursue ranged enemies
 * - Focus-fire: Coordinate multiple units on weakest enemy
 * - Sortie: Counter-attack when we have advantage
 */
export function runTacticalDefense(state: GameState, playerId: string): GameState {
    let next = state;

    // Assess situation for all cities
    const situations = assessDefenseSituation(next, playerId);

    // Process each city based on its situation
    for (const situation of situations) {
        if (situation.threatLevel === "none") continue;

        aiInfo(`[TACTICAL] ${situation.city.name}: ${situation.threatLevel} threat, recommending ${situation.recommendedAction}`);

        switch (situation.recommendedAction) {
            case "intercept":
                next = executeIntercept(next, playerId, situation);
                break;
            case "focus-fire":
                next = executeFocusFire(next, playerId, situation);
                break;
            case "sortie":
                next = executeSortie(next, playerId, situation);
                break;
            case "retreat":
                // Retreat handled by existing logic
                break;
            case "hold":
            default:
                // Just hold position
                break;
        }
    }

    return next;
}

/**
 * Execute intercept action: Melee units move toward and attack ranged enemies
 * v8.1: Only intercept if we can ACTUALLY attack this turn (move + attack)
 */
function executeIntercept(state: GameState, playerId: string, situation: DefenseSituation): GameState {
    let next = state;

    // Find ranged enemies threatening the city
    const rangedEnemies = situation.nearbyEnemies.filter(e => UNITS[e.type]?.rng > 1);
    if (rangedEnemies.length === 0) return next;

    // v8.1: Check if any enemies are close to city - if so, prioritize defending ring
    const enemiesNearCity = situation.nearbyEnemies.filter(e =>
        hexDistance(e.coord, situation.city.coord) <= 2
    );
    if (enemiesNearCity.length > 0) {
        aiInfo(`[INTERCEPT] Skipping intercept - ${enemiesNearCity.length} enemies near city, holding ring`);
        return next; // Don't move ring defenders when city is actively threatened
    }

    // Sort by distance (closest first)
    rangedEnemies.sort((a, b) =>
        hexDistance(a.coord, situation.city.coord) - hexDistance(b.coord, situation.city.coord)
    );

    // Get melee units that can intercept
    const meleeUnits = situation.ringUnits.filter(u => {
        const liveUnit = next.units.find(lu => lu.id === u.id);
        if (!liveUnit || liveUnit.movesLeft <= 0) return false;
        return UNITS[liveUnit.type]?.rng === 1;
    });

    for (const target of rangedEnemies) {
        for (const melee of meleeUnits) {
            const liveUnit = next.units.find(u => u.id === melee.id);
            if (!liveUnit || liveUnit.movesLeft <= 0) continue;

            const dist = hexDistance(liveUnit.coord, target.coord);
            if (dist === 1) {
                // Can attack directly
                const result = tryAction(next, {
                    type: "Attack",
                    playerId,
                    attackerId: liveUnit.id,
                    targetId: target.id,
                    targetType: "Unit"
                });
                if (result !== next) {
                    next = result;
                    aiInfo(`[INTERCEPT] ${liveUnit.type} attacking ${target.type}`);
                    break;
                }
            } else if (dist === 2 && liveUnit.movesLeft >= 1) {
                // v8.1: Only move if we can attack in the SAME turn (distance exactly 2)
                // This prevents shuffling toward enemies we can't hit
                const neighbors = getNeighbors(target.coord);
                for (const neighbor of neighbors) {
                    const moveDist = hexDistance(liveUnit.coord, neighbor);
                    if (moveDist === 1) { // Must be exactly 1 step away
                        const moveResult = tryAction(next, {
                            type: "MoveUnit",
                            playerId,
                            unitId: liveUnit.id,
                            to: neighbor
                        });
                        if (moveResult !== next) {
                            next = moveResult;
                            // Now try to attack
                            const liveAfterMove = next.units.find(u => u.id === liveUnit.id);
                            if (liveAfterMove && !liveAfterMove.hasAttacked) {
                                const attackResult = tryAction(next, {
                                    type: "Attack",
                                    playerId,
                                    attackerId: liveAfterMove.id,
                                    targetId: target.id,
                                    targetType: "Unit"
                                });
                                if (attackResult !== next) {
                                    next = attackResult;
                                    aiInfo(`[INTERCEPT] ${liveUnit.type} moved and attacked ${target.type}`);
                                }
                            }
                            break;
                        }
                    }
                }
            }
            // v8.1: Removed else case - don't move toward enemies if we can't attack this turn
        }
    }

    return next;
}


/**
 * Execute focus-fire: Coordinate multiple units to eliminate single target
 */
function executeFocusFire(state: GameState, playerId: string, situation: DefenseSituation): GameState {
    let next = state;

    const target = situation.focusTarget;
    if (!target) return next;

    const liveTarget = next.units.find(u => u.id === target.id);
    if (!liveTarget) return next;

    aiInfo(`[FOCUS-FIRE] Targeting ${liveTarget.type} (HP: ${liveTarget.hp})`);

    // Get all units that can attack the target
    const attackers = [...situation.ringUnits];
    if (situation.garrison) attackers.push(situation.garrison);

    for (const attacker of attackers) {
        const liveAttacker = next.units.find(u => u.id === attacker.id);
        const currentTarget = next.units.find(u => u.id === target.id);

        if (!liveAttacker || !currentTarget || liveAttacker.movesLeft <= 0) continue;
        if (currentTarget.hp <= 0) break; // Target eliminated

        const dist = hexDistance(liveAttacker.coord, currentTarget.coord);
        const range = UNITS[liveAttacker.type]?.rng || 1;

        if (dist <= range) {
            const result = tryAction(next, {
                type: "Attack",
                playerId,
                attackerId: liveAttacker.id,
                targetId: currentTarget.id,
                targetType: "Unit"
            });
            if (result !== next) {
                next = result;
                aiInfo(`[FOCUS-FIRE] ${liveAttacker.type} attacked ${currentTarget.type}`);
            }
        }
    }

    return next;
}

/**
 * Execute sortie: Counter-attack when we have advantage
 */
function executeSortie(state: GameState, playerId: string, situation: DefenseSituation): GameState {
    let next = state;

    // Only sortie if we have significant advantage
    if (situation.defenseScore < situation.threatScore * 1.2) return next;
    if (situation.ringUnits.length < 3) return next;

    aiInfo(`[SORTIE] ${situation.city.name} counter-attacking!`);

    // Attack weakest enemies first
    const sortedEnemies = [...situation.nearbyEnemies].sort((a, b) => a.hp - b.hp);

    for (const enemy of sortedEnemies) {
        const liveEnemy = next.units.find(u => u.id === enemy.id);
        if (!liveEnemy) continue;

        for (const unit of situation.ringUnits) {
            const liveUnit = next.units.find(u => u.id === unit.id);
            if (!liveUnit || liveUnit.movesLeft <= 0) continue;

            const dist = hexDistance(liveUnit.coord, liveEnemy.coord);
            const range = UNITS[liveUnit.type]?.rng || 1;

            if (dist <= range) {
                const result = tryAction(next, {
                    type: "Attack",
                    playerId,
                    attackerId: liveUnit.id,
                    targetId: liveEnemy.id,
                    targetType: "Unit"
                });
                if (result !== next) {
                    next = result;
                    aiInfo(`[SORTIE] ${liveUnit.type} attacked ${liveEnemy.type}`);
                }
            }
        }
    }

    return next;
}
