import { aiLog, aiInfo } from "../debug-logging.js";
import { hexDistance } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { expectedDamageToUnit } from "./unit-helpers.js";
import { tryAction } from "../shared/actions.js";

/**
 * A battle group is a cluster of friendly units that are near each other and near enemies.
 * Used for coordinating attacks.
 */
export interface BattleGroup {
    units: any[];
    centerCoord: { q: number; r: number };
    nearbyEnemies: any[];
    primaryTarget: any | null;
}

/**
 * Identify clusters of friendly units that are engaged with enemies.
 * Returns groups that can coordinate their attacks.
 */
export function identifyBattleGroups(state: GameState, playerId: string): BattleGroup[] {
    const militaryUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        !u.hasAttacked &&
        u.type !== UnitType.Scout &&
        u.type !== UnitType.ArmyScout
    );

    if (militaryUnits.length === 0) return [];

    // Find enemies at war with us
    const warEnemyIds = state.players
        .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War)
        .map(p => p.id);
    const enemyUnits = state.units.filter(u => warEnemyIds.includes(u.ownerId));

    // Group units that are within 3 tiles of each other
    const groups: BattleGroup[] = [];
    const assigned = new Set<string>();

    for (const unit of militaryUnits) {
        if (assigned.has(unit.id)) continue;

        // Find nearby enemies within attack range
        const nearbyEnemies = enemyUnits.filter(e => {
            const dist = hexDistance(unit.coord, e.coord);
            return dist <= 3; // Within potential engagement range
        });

        // Skip if no enemies nearby
        if (nearbyEnemies.length === 0) continue;

        // Find other friendly units in this area
        const groupUnits = militaryUnits.filter(other => {
            if (assigned.has(other.id)) return false;
            const dist = hexDistance(unit.coord, other.coord);
            return dist <= 3;
        });

        // Mark all as assigned
        for (const u of groupUnits) {
            assigned.add(u.id);
        }

        // Find the best target (lowest HP enemy that multiple units can hit)
        const targetCandidates = nearbyEnemies.map(enemy => {
            const unitsInRange = groupUnits.filter(u => {
                const stats = UNITS[u.type];
                const dist = hexDistance(u.coord, enemy.coord);
                return dist <= stats.rng;
            });
            const totalDamage = unitsInRange.reduce((sum, u) => sum + expectedDamageToUnit(u, enemy, state), 0);
            return { enemy, unitsInRange, totalDamage, canKill: totalDamage >= enemy.hp };
        }).sort((a, b) => {
            // Prioritize killable targets
            if (a.canKill !== b.canKill) return a.canKill ? -1 : 1;
            // Then targets more units can hit
            if (a.unitsInRange.length !== b.unitsInRange.length) return b.unitsInRange.length - a.unitsInRange.length;
            // Then lowest HP
            return a.enemy.hp - b.enemy.hp;
        });

        const primaryTarget = targetCandidates[0]?.enemy || null;

        // Calculate center of group
        const avgQ = groupUnits.reduce((s, u) => s + u.coord.q, 0) / groupUnits.length;
        const avgR = groupUnits.reduce((s, u) => s + u.coord.r, 0) / groupUnits.length;

        groups.push({
            units: groupUnits,
            centerCoord: { q: Math.round(avgQ), r: Math.round(avgR) },
            nearbyEnemies,
            primaryTarget
        });
    }

    return groups;
}

/**
 * Coordinate attacks within a battle group.
 * Orders: ranged units attack first (soften), then melee (finish).
 * Focus fire: all units target the same enemy until dead.
 */
export function coordinateGroupAttack(
    state: GameState,
    playerId: string,
    group: BattleGroup
): GameState {
    let next = state;

    if (!group.primaryTarget) return next;

    // Sort units: ranged first (to soften targets), then melee
    const sortedUnits = [...group.units].sort((a, b) => {
        const aRng = UNITS[a.type as UnitType].rng;
        const bRng = UNITS[b.type as UnitType].rng;
        return bRng - aRng; // Higher range first
    });

    // Track the current primary target (may change if killed)
    let currentTarget = group.primaryTarget;

    for (const unit of sortedUnits) {
        const liveUnit = next.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.hasAttacked) continue;

        // Check if current target is still alive
        const targetStillAlive = next.units.find(u => u.id === currentTarget.id);

        if (!targetStillAlive) {
            // Target died - find new target with focus fire logic
            const warEnemyIds = next.players
                .filter(p => p.id !== playerId && !p.isEliminated && next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War)
                .map(p => p.id);

            const newTargets = next.units
                .filter(u => warEnemyIds.includes(u.ownerId) && hexDistance(u.coord, liveUnit.coord) <= UNITS[liveUnit.type].rng)
                .sort((a, b) => a.hp - b.hp); // Lowest HP first

            if (newTargets.length === 0) continue;
            currentTarget = newTargets[0];
        }

        const stats = UNITS[liveUnit.type];
        const dist = hexDistance(liveUnit.coord, currentTarget.coord);

        if (dist > stats.rng) continue; // Out of range

        const dmg = expectedDamageToUnit(liveUnit, currentTarget, next);
        const attacked = tryAction(next, {
            type: "Attack",
            playerId,
            attackerId: liveUnit.id,
            targetId: currentTarget.id,
            targetType: "Unit"
        });

        if (attacked !== next) {
            aiInfo(`[AI COORDINATED] ${playerId} ${liveUnit.type} attacks ${currentTarget.type} for ${dmg} dmg (focus fire)`);
            next = attacked;
        }
    }

    return next;
}
