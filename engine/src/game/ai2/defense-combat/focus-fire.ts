import { DiplomacyState, GameState } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getThreatLevel } from "../../ai/units/unit-helpers.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { isMilitary } from "../unit-roles.js";

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
