import { DiplomacyState, GameState } from "../../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isMilitary } from "../unit-roles.js";

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
