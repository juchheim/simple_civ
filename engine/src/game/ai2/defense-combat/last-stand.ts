import { DiplomacyState, GameState } from "../../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isMilitary } from "../unit-roles.js";

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
