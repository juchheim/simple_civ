import { GameState, UnitType, DiplomacyState } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { tryAction } from "../ai/shared/actions.js";
// Graduated threat assessment from Legacy
import { getThreatLevel } from "../ai/units/unit-helpers.js";
import { getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { aiInfo } from "../ai/debug-logging.js";
import { getAiProfileV2 } from "./rules.js";
import { assessDefenseSituation, DefenseSituation } from "./defense-situation.js";


function isMilitary(u: { type: UnitType }): boolean {
    return UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Scout && u.type !== UnitType.ArmyScout;
}

/**
 * v7.2: Determine if a city is on the perimeter (border) of the empire.
 * A perimeter city is closer to enemy cities/units than other cities.
 * Interior cities are protected by perimeter cities.
 */
function isPerimeterCity(
    state: GameState,
    city: { coord: { q: number; r: number }, isCapital?: boolean },
    playerId: string
): boolean {
    // Find enemy cities and units
    const enemyPlayers = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated
    );
    const enemyIds = new Set(enemyPlayers.map(p => p.id));

    const enemyCities = state.cities.filter(c => enemyIds.has(c.ownerId));
    const enemyUnits = state.units.filter(u =>
        enemyIds.has(u.ownerId) &&
        isMilitary(u)
    );

    if (enemyCities.length === 0 && enemyUnits.length === 0) {
        // No enemies yet - this is an interior city (safe)
        return false;
    }

    // Find closest enemy threat
    let minEnemyDist = Infinity;
    for (const ec of enemyCities) {
        const dist = hexDistance(city.coord, ec.coord);
        if (dist < minEnemyDist) minEnemyDist = dist;
    }
    for (const eu of enemyUnits) {
        const dist = hexDistance(city.coord, eu.coord);
        if (dist < minEnemyDist) minEnemyDist = dist;
    }

    // Compare to other friendly cities - if this is one of the closest, it's perimeter
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    if (myCities.length <= 2) {
        // With 1-2 cities, all are perimeter
        return true;
    }

    // Calculate distances from all cities to enemies
    const cityDistances = myCities.map(c => {
        let minDist = Infinity;
        for (const ec of enemyCities) {
            const dist = hexDistance(c.coord, ec.coord);
            if (dist < minDist) minDist = dist;
        }
        for (const eu of enemyUnits) {
            const dist = hexDistance(c.coord, eu.coord);
            if (dist < minDist) minDist = dist;
        }
        return { city: c, dist: minDist };
    }).sort((a, b) => a.dist - b.dist);

    // Top 50% of cities by distance to enemy are perimeter
    const perimeterCount = Math.max(1, Math.ceil(myCities.length / 2));
    const perimeterCities = cityDistances.slice(0, perimeterCount);

    return perimeterCities.some(pc =>
        pc.city.coord.q === city.coord.q && pc.city.coord.r === city.coord.r
    );
}

export function defendCitiesV2(state: GameState, playerId: string): GameState {
    let next = state;
    const cities = next.cities.filter(c => c.ownerId === playerId);
    if (cities.length === 0) return next;

    const capital = cities.find(c => c.isCapital) ?? cities[0];

    // Build threat assessment for ALL cities (not just capital)
    const cityThreats = cities.map(city => ({
        city,
        threat: getThreatLevel(next, city, playerId),
        isCapital: city.isCapital ?? false
    }));

    // Sort cities by threat level (critical > high > low > none), capitals first within same level
    const threatOrder = { critical: 0, high: 1, low: 2, none: 3 };
    cityThreats.sort((a, b) => {
        const threatDiff = threatOrder[a.threat] - threatOrder[b.threat];
        if (threatDiff !== 0) return threatDiff;
        return (b.isCapital ? 1 : 0) - (a.isCapital ? 1 : 0);
    });

    // v1.1: Build set of city coordinates for garrison protection
    const cityCoords = new Set(
        cities.map(c => `${c.coord.q},${c.coord.r}`)
    );

    // 1) Ensure each city has a garrison if possible - prioritize threatened cities
    for (const { city, threat } of cityThreats) {
        const hasGarrison = next.units.some(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            hexEquals(u.coord, city.coord)
        );
        if (hasGarrison) continue;

        // Only pull garrisons for none/low threat if we have excess units
        const urgency = threat === "critical" || threat === "high";
        const searchRadius = urgency ? 6 : 2; // Look further for critical cities

        const candidates = next.units
            .filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                UNITS[u.type].domain !== "Civilian" &&
                u.type !== UnitType.Titan &&
                !u.hasAttacked &&
                hexDistance(u.coord, city.coord) <= searchRadius &&
                !cityCoords.has(`${u.coord.q},${u.coord.r}`) // v1.1: Don't pull from other cities
            )
            .sort((a, b) => hexDistance(a.coord, city.coord) - hexDistance(b.coord, city.coord));

        const cand = candidates[0];
        if (!cand) continue;

        // Move into city if adjacent; otherwise step toward.
        if (hexDistance(cand.coord, city.coord) === 1) {
            next = tryAction(next, { type: "MoveUnit", playerId, unitId: cand.id, to: city.coord });
        }
    }

    // v7.2: Capital should always have 1 garrison + 3 in ring (total 4 defenders)
    // Note: Only 1 unit can be IN the city, rest must be in adjacent tiles (ring)
    // Capitals ALWAYS get full defense regardless of perimeter status
    const CAPITAL_MIN_DEFENDERS = 4; // 1 inside + 3 in ring
    if (capital) {
        // Count units in capital (should be max 1)
        const capitalGarrison = next.units.find(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexEquals(u.coord, capital.coord)
        );

        // Count units in ring (adjacent to capital)
        const capitalRingDefenders = next.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexDistance(u.coord, capital.coord) === 1
        );

        const totalDefenders = (capitalGarrison ? 1 : 0) + capitalRingDefenders.length;

        // Check if enemy has ranged attackers nearby - if so, prefer ranged garrison
        const enemies = next.players.filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        ).map(p => p.id);

        const nearbyEnemyRanged = next.units.filter(u =>
            enemies.includes(u.ownerId) &&
            UNITS[u.type].rng > 1 &&
            hexDistance(u.coord, capital.coord) <= 5
        ).length;

        // If enemy has ranged and garrison isn't ranged, try to swap
        if (nearbyEnemyRanged > 0 && capitalGarrison && UNITS[capitalGarrison.type].rng <= 1) {
            // Find a ranged unit in ring to swap with garrison
            const rangedInRing = capitalRingDefenders.find(u =>
                UNITS[u.type].rng > 1 && u.movesLeft > 0
            );
            if (rangedInRing && capitalGarrison.movesLeft > 0) {
                // Try to swap: garrison out, ranged in
                const neighbors = getNeighbors(capital.coord).filter(n =>
                    !next.units.some(u => hexEquals(u.coord, n))
                );
                if (neighbors.length > 0) {
                    // Move garrison to empty adjacent tile
                    const moveOut = tryAction(next, {
                        type: "MoveUnit", playerId, unitId: capitalGarrison.id, to: neighbors[0]
                    });
                    if (moveOut !== next) {
                        next = moveOut;
                        // Move ranged into capital
                        const moveIn = tryAction(next, {
                            type: "MoveUnit", playerId, unitId: rangedInRing.id, to: capital.coord
                        });
                        if (moveIn !== next) {
                            next = moveIn;
                            aiInfo(`[CAPITAL DEFENSE] ${playerId} swapped ${rangedInRing.type} into capital (enemy has ranged)`);
                        }
                    }
                }
            }
        }

        // If we need more defenders, pull units toward capital ring
        if (totalDefenders < CAPITAL_MIN_DEFENDERS) {
            const available = next.units.filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                isMilitary(u) &&
                u.type !== UnitType.Titan &&
                !cityCoords.has(`${u.coord.q},${u.coord.r}`) && // Don't pull from other cities
                hexDistance(u.coord, capital.coord) > 1 // Not already in ring
            ).sort((a, b) => hexDistance(a.coord, capital.coord) - hexDistance(b.coord, capital.coord));

            const needed = CAPITAL_MIN_DEFENDERS - totalDefenders;
            for (const unit of available.slice(0, needed)) {
                // Move toward capital (to ring position, not inside)
                const ringPositions = getNeighbors(capital.coord).filter(n =>
                    !next.units.some(u => hexEquals(u.coord, n))
                );

                if (ringPositions.length > 0) {
                    // If adjacent, move directly to ring
                    if (hexDistance(unit.coord, capital.coord) === 2) {
                        const closest = ringPositions.sort((a, b) =>
                            hexDistance(unit.coord, a) - hexDistance(unit.coord, b)
                        )[0];
                        const moveResult = tryAction(next, {
                            type: "MoveUnit", playerId, unitId: unit.id, to: closest
                        });
                        if (moveResult !== next) {
                            next = moveResult;
                            continue;
                        }
                    }
                }

                // Otherwise step toward capital
                const sorted = getNeighbors(unit.coord).sort((a, b) =>
                    hexDistance(a, capital.coord) - hexDistance(b, capital.coord)
                );
                for (const n of sorted) {
                    const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: n });
                    if (attempt !== next) {
                        next = attempt;
                        break;
                    }
                }
            }

            aiInfo(`[CAPITAL DEFENSE] ${playerId} capital has ${totalDefenders} defenders (min: ${CAPITAL_MIN_DEFENDERS}), reinforcing ring...`);
        }
    }


    // 2) Reinforce threatened cities based on threat level
    for (const { city, threat } of cityThreats) {
        if (threat === "none") continue;

        // Determine desired defenders based on threat level
        const desired = threat === "critical" ? 3 : threat === "high" ? 2 : 1;
        const defendersNear = next.units.filter(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            u.type !== UnitType.Titan &&
            hexDistance(u.coord, city.coord) <= 2
        ).length;

        if (defendersNear >= desired) continue;

        // Pull reinforcements from farther away for more threatened cities
        const pullRadius = threat === "critical" ? 8 : threat === "high" ? 5 : 3;
        const reinforcements = next.units
            .filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                UNITS[u.type].domain !== "Civilian" &&
                u.type !== UnitType.Titan &&
                hexDistance(u.coord, city.coord) >= 3 &&
                hexDistance(u.coord, city.coord) <= pullRadius &&
                !cityCoords.has(`${u.coord.q},${u.coord.r}`) // v1.1: Don't pull from other cities
            )
            .sort((a, b) => hexDistance(a.coord, city.coord) - hexDistance(b.coord, city.coord));

        for (const unit of reinforcements.slice(0, desired - defendersNear)) {
            const neighbors = next.map.tiles
                .filter(t => hexDistance(t.coord, unit.coord) === 1)
                .map(t => t.coord)
                .sort((a, b) => hexDistance(a, city.coord) - hexDistance(b, city.coord));
            for (const step of neighbors) {
                const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: step });
                if (moved !== next) {
                    next = moved;
                    break;
                }
            }
        }
    }

    return next;
}

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

        // For each ring defender, find and execute best attack
        for (const defender of ringDefenders) {
            const liveDefender = next.units.find(u => u.id === defender.id);
            if (!liveDefender || liveDefender.hasAttacked || liveDefender.movesLeft <= 0) continue;

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

                // v7.9: Lowered threshold from 0 to -20 to make ring defenders attack more aggressively
                // Ring defenders should engage to protect the city even at disadvantage
                if (bestTarget && bestScore > -20) {
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
                // No enemies in range - move toward closest enemy and attack if possible
                // This handles melee defenders vs ranged attackers
                const closestEnemy = nearbyEnemies
                    .map(e => {
                        const liveEnemy = next.units.find(u => u.id === e.id);
                        return liveEnemy ? { enemy: liveEnemy, dist: hexDistance(liveDefender.coord, liveEnemy.coord) } : null;
                    })
                    .filter((x): x is NonNullable<typeof x> => x !== null)
                    .sort((a, b) => a.dist - b.dist)[0];

                if (!closestEnemy) continue;

                // Find the best tile to move to that gets us closer to the enemy
                const neighbors = getNeighbors(liveDefender.coord);
                const moveOptions = neighbors
                    .map(n => ({
                        coord: n,
                        distToEnemy: hexDistance(n, closestEnemy.enemy.coord),
                        distToCity: hexDistance(n, city.coord)
                    }))
                    .filter(opt => {
                        // Can't move onto occupied tiles
                        const occupied = next.units.some(u => hexEquals(u.coord, opt.coord));
                        const cityTile = next.cities.some(c => hexEquals(c.coord, opt.coord));
                        return !occupied && !cityTile;
                    })
                    .sort((a, b) => a.distToEnemy - b.distToEnemy);

                if (moveOptions.length === 0) continue;

                const bestMove = moveOptions[0];

                // v7.9: Always move toward enemy if we're melee and enemy is ranged (intercept them)
                // This fixes the issue where ShieldGuards just sit there while BowGuards pick them off
                const isDefenderMelee = range === 1;
                const isEnemyRanged = (UNITS[closestEnemy.enemy.type].rng ?? 1) > 1;
                const shouldIntercept = isDefenderMelee && isEnemyRanged;

                // Move if it gets us closer to the enemy OR if we need to intercept a ranged enemy
                if (bestMove.distToEnemy < hexDistance(liveDefender.coord, closestEnemy.enemy.coord) || shouldIntercept) {
                    aiInfo(`[RING COMBAT] ${playerId} ring defender ${liveDefender.type} moving to intercept ${closestEnemy.enemy.type}`);
                    const moveResult = tryAction(next, {
                        type: "MoveUnit",
                        playerId,
                        unitId: liveDefender.id,
                        to: bestMove.coord
                    });

                    if (moveResult !== next) {
                        next = moveResult;

                        // After moving, try to attack if now in range
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
    }

    return next;
}


/**
 * v7.2: Preemptive Defensive Sortie
 * Garrison units sortie out to attack approaching enemies BEFORE they can attack the city.
 * 
 * SAFETY REQUIREMENTS (per user feedback):
 * 1. There's a replacement unit that can take the garrison spot, OR
 * 2. The sortie is "safe":
 *    - Unit will survive the attack (check combat preview)
 *    - Unit can return to city next turn (attack target is adjacent, unit has 1+ move)
 *    - Not facing multiple enemies that would kill it before return
 * 
 * Priority: Attack enemies closest to the city first.
 */
// function runDefensiveSortie removed as it relies on garrison attacks which are visually disabled.

/**
 * v7.2: Defensive Ring Positioning
 * Instead of stacking all defenders inside the city, position excess defenders
 * in a ring around the city to screen/intercept attackers.
 * 
 * Benefits:
 * - Attackers must fight through the ring before reaching city
 * - Ranged units in ring can attack before enemy reaches city
 * - Better use of defensive terrain (hills, forests)
 * 
 * Logic:
 * - Keep 1-2 garrison inside city (based on threat level)
 * - Position excess defenders on adjacent tiles
 * - Prefer tiles with defensive terrain
 * - Prefer tiles between city and approaching enemies
 */
export function positionDefensiveRing(state: GameState, playerId: string): GameState {
    let next = state;

    const myCities = next.cities.filter(c => c.ownerId === playerId);
    if (myCities.length === 0) return next;

    // Find enemies at war with us
    const enemies = next.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        next.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    const enemyIds = new Set(enemies.map(e => e.id));

    // Build set of city coords
    const cityCoords = new Set(myCities.map(c => `${c.coord.q},${c.coord.r}`));

    // Get terrain for defensive scoring
    const getTile = (coord: { q: number; r: number }) =>
        next.map.tiles.find(t => hexEquals(t.coord, coord));

    // v7.2: Pull units to form ring around PERIMETER cities only
    // This ensures aggressive civs don't waste units defending interior cities
    // Capital: 4 total (handled separately in defendCitiesV2)
    // Perimeter cities: 3 total (1 garrison + 2 ring)
    // Interior cities: 1 total (garrison only) - NO ring formation

    // v7.2: EARLY OFFENSE BYPASS for aggressive civs (ForgeClans)
    // If civ has earlyRushChance and we're in early game, skip ring formation
    // to allow full commitment to early offensive
    const profile = getAiProfileV2(next, playerId);
    const earlyRushChance = profile.diplomacy.earlyRushChance ?? 0;
    const isEarlyGame = next.turn < 50;
    const skipRingForOffense = earlyRushChance > 0 && isEarlyGame;

    if (skipRingForOffense) {
        aiInfo(`[RING DEFENSE] ${profile.civName} skipping ring defense (early rush mode, turn ${next.turn})`);
        return next;
    }

    for (const city of myCities) {
        // v7.7: Capital now included in ring defense (was previously skipped, causing undefended capitals)
        // Capital: 4 total (1 garrison + 3 ring)
        // Perimeter cities: 3 total (1 garrison + 2 ring)
        // Interior cities: 1 total (garrison only) - NO ring formation
        const perimeter = isPerimeterCity(next, city, playerId);
        const desiredTotal = city.isCapital ? 4 : (perimeter ? 3 : 1);
        const desiredRing = desiredTotal - 1; // Subtract 1 for garrison inside

        if (desiredRing <= 0) continue; // Interior cities don't need ring

        // Find available defenders (not in garrison, not already in a ring)
        const allMilitary = next.units.filter(u => u.ownerId === playerId && isMilitary(u) && !u.hasAttacked);
        const inGarrisons = new Set(next.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`));

        // v1.2: Also track units already in a defensive ring around ANY city
        // These should not be pulled to form rings around other cities
        const inRings = new Set<string>();
        for (const c of myCities) {
            for (const u of allMilitary) {
                if (hexDistance(u.coord, c.coord) === 1) {
                    inRings.add(u.id);
                }
            }
        }

        // v1.2: Exclude units in garrisons AND units already in a ring around any city
        let available = allMilitary.filter(u =>
            !inGarrisons.has(`${u.coord.q},${u.coord.r}`) &&
            !inRings.has(u.id)
        );

        // How many do we have already?
        const currentRing = allMilitary.filter(u => hexDistance(u.coord, city.coord) === 1);
        const needed = desiredRing - currentRing.length;

        if (needed <= 0) continue;

        // Score adjacent tiles for defense
        const neighbors = getNeighbors(city.coord);
        const scoredTiles = neighbors.map(coord => {
            const tile = getTile(coord);
            if (!tile) return { coord, score: -1 };

            // Base score for terrain
            let score = 10;
            if (tile.terrain === "Hills" || tile.terrain === "Forest") score += 5;

            // Score for proximity to enemies
            const closestEnemyUnit = next.units
                .filter(u => enemyIds.has(u.ownerId))
                .reduce((minDist, u) => {
                    return Math.min(minDist, hexDistance(coord, u.coord));
                }, 100);

            // Favor positions between city and enemies (dist to enumy + dist to city should be close to dist city-to-enemy)
            // But for now, let's just use proximity to enemies to intercept
            score += (10 - Math.min(10, closestEnemyUnit));

            return { coord, score };
        });

        // Simplified for v7.2: Just pick the best empty tiles
        const targetTiles = scoredTiles
            .filter(t => !next.units.some(u => hexEquals(u.coord, t.coord)))
            .sort((a, b) => b.score - a.score)
            .slice(0, needed);

        for (const target of targetTiles) {
            if (available.length === 0) break;

            // Find closest available unit
            const closest = available.sort((a, b) =>
                hexDistance(a.coord, target.coord) - hexDistance(b.coord, target.coord)
            )[0];

            if (hexDistance(closest.coord, target.coord) <= closest.movesLeft) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: closest.id,
                    to: target.coord
                });
                if (moveResult !== next) {
                    next = moveResult;
                    available = available.filter(u => u.id !== closest.id);
                }
            }
        }
    }

    return next;
}

/**
 * v7.2: Mutual Defense - Cities Share Defenders
 * When a city is under attack, nearby cities send spare defenders to help.
 * 
 * Rules:
 * - Only send reinforcements from cities that have MORE than their minimum defenders
 * - Capital: keep 4, only send excess
 * - Perimeter: keep 3, only send excess
 * - Interior: keep 1, only send excess
 * - Prioritize reinforcing the most threatened city
 * - Units move toward the threatened city (may take multiple turns)
 */
export function sendMutualDefenseReinforcements(state: GameState, playerId: string): GameState {
    let next = state;

    const myCities = next.cities.filter(c => c.ownerId === playerId);
    if (myCities.length < 2) return next; // Need at least 2 cities for mutual defense

    // Find enemies at war with us
    const enemies = next.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        next.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    if (enemies.length === 0) return next;

    // Calculate threat level and defender status for each city
    const cityStatus = myCities.map(city => {
        const threat = getThreatLevel(next, city, playerId);
        const perimeter = isPerimeterCity(next, city, playerId);

        // Minimum required defenders
        // v7.2: Use perimeter status for capital too. Safe capital only needs 1 garrison.
        const minDefenders = city.isCapital ? (perimeter ? 4 : 1) : (perimeter ? 3 : 1);

        // Count current defenders (garrison + ring)
        const garrison = next.units.find(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexEquals(u.coord, city.coord)
        );
        const ringDefenders = next.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexDistance(u.coord, city.coord) === 1
        );
        const currentDefenders = (garrison ? 1 : 0) + ringDefenders.length;

        // Excess defenders that could be sent
        const excess = Math.max(0, currentDefenders - minDefenders);

        // Deficit defenders that are needed
        const deficit = Math.max(0, minDefenders - currentDefenders);

        return {
            city,
            threat,
            perimeter,
            minDefenders,
            currentDefenders,
            excess,
            deficit,
            ringDefenders
        };
    });

    // Find cities that need reinforcements (high/critical threat AND deficit)
    const needsHelp = cityStatus
        .filter(cs => (cs.threat === "high" || cs.threat === "critical") && cs.deficit > 0)
        .sort((a, b) => {
            // Critical before high
            if (a.threat === "critical" && b.threat !== "critical") return -1;
            if (b.threat === "critical" && a.threat !== "critical") return 1;
            // Capital before others
            if (a.city.isCapital && !b.city.isCapital) return -1;
            if (b.city.isCapital && !a.city.isCapital) return 1;
            // Higher deficit first
            return b.deficit - a.deficit;
        });

    if (needsHelp.length === 0) return next;

    // Find cities that can send help (have excess defenders)
    const canHelp = cityStatus
        .filter(cs => cs.excess > 0)
        .sort((a, b) => b.excess - a.excess); // Highest excess first

    // Send reinforcements from helper cities to threatened cities
    for (const needy of needsHelp) {
        if (needy.deficit <= 0) continue;

        for (const helper of canHelp) {
            if (helper.excess <= 0) continue;

            // Check distance - only help nearby cities (within 8 tiles)
            const distance = hexDistance(helper.city.coord, needy.city.coord);
            if (distance > 8) continue;

            // Find ring defenders that can be sent
            const toSend = helper.ringDefenders.filter(u => {
                const liveUnit = next.units.find(uu => uu.id === u.id);
                return liveUnit && liveUnit.movesLeft > 0;
            }).slice(0, Math.min(helper.excess, needy.deficit));

            for (const unit of toSend) {
                const liveUnit = next.units.find(u => u.id === unit.id);
                if (!liveUnit || liveUnit.movesLeft <= 0) continue;

                // Move toward the threatened city
                const ringPositions = getNeighbors(needy.city.coord).filter(n =>
                    !next.units.some(u => hexEquals(u.coord, n))
                );

                let moved = false;

                // If close enough, move directly to ring
                if (ringPositions.length > 0) {
                    const closest = ringPositions.sort((a, b) =>
                        hexDistance(liveUnit.coord, a) - hexDistance(liveUnit.coord, b)
                    )[0];

                    if (hexDistance(liveUnit.coord, closest) <= liveUnit.movesLeft) {
                        const moveResult = tryAction(next, {
                            type: "MoveUnit", playerId, unitId: liveUnit.id, to: closest
                        });
                        if (moveResult !== next) {
                            next = moveResult;
                            moved = true;
                            aiInfo(`[MUTUAL DEFENSE] ${playerId} ${liveUnit.type} from ${helper.city.name} reinforcing ${needy.city.name} (threat:${needy.threat})`);
                        }
                    }
                }

                // Otherwise step toward city
                if (!moved) {
                    const sorted = getNeighbors(liveUnit.coord).sort((a, b) =>
                        hexDistance(a, needy.city.coord) - hexDistance(b, needy.city.coord)
                    );
                    for (const n of sorted) {
                        const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: liveUnit.id, to: n });
                        if (attempt !== next) {
                            next = attempt;
                            aiInfo(`[MUTUAL DEFENSE] ${playerId} ${liveUnit.type} stepping from ${helper.city.name} toward ${needy.city.name}`);
                            break;
                        }
                    }
                }

                helper.excess--;
                needy.deficit--;
                if (needy.deficit <= 0) break;
            }

            if (needy.deficit <= 0) break;
        }
    }

    return next;
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
 */
function executeIntercept(state: GameState, playerId: string, situation: DefenseSituation): GameState {
    let next = state;

    // Find ranged enemies threatening the city
    const rangedEnemies = situation.nearbyEnemies.filter(e => UNITS[e.type]?.rng > 1);
    if (rangedEnemies.length === 0) return next;

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
            } else if (dist <= liveUnit.movesLeft + 1) {
                // Move toward then attack
                const neighbors = getNeighbors(target.coord);
                for (const neighbor of neighbors) {
                    const moveDist = hexDistance(liveUnit.coord, neighbor);
                    if (moveDist <= liveUnit.movesLeft) {
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
                            if (liveAfterMove && liveAfterMove.movesLeft > 0) {
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
