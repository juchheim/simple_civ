import { aiLog, aiInfo } from "../debug-logging.js";
import { hexDistance } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType, Unit } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { expectedDamageToUnit } from "./unit-helpers.js";
import { tryAction } from "../shared/actions.js";

/**
 * A battle group is a cluster of friendly units that are near each other and near enemies.
 * Used for coordinating attacks.
 */
export interface BattleGroup {
    units: Unit[];
    centerCoord: { q: number; r: number };
    nearbyEnemies: Unit[];
    primaryTarget: Unit | null;
}

/**
 * Identify clusters of friendly units that are engaged with enemies.
 * Returns groups that can coordinate their attacks.
 */
export function identifyBattleGroups(state: GameState, playerId: string): BattleGroup[] {
    const militaryUnits = getEligibleMilitaryUnits(state, playerId);

    if (militaryUnits.length === 0) return [];

    const enemyUnits = getWarEnemies(state, playerId);

    const groups: BattleGroup[] = [];
    const assigned = new Set<string>();

    for (const unit of militaryUnits) {
        if (assigned.has(unit.id)) continue;

        const nearbyEnemies = findNearbyEnemies(unit, enemyUnits);

        if (nearbyEnemies.length === 0) continue;

        const groupUnits = collectGroupUnits(unit, militaryUnits, assigned);

        markAssigned(groupUnits, assigned);

        const primaryTarget = selectPrimaryTarget(groupUnits, nearbyEnemies, state);

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
    const sortedUnits = sortUnitsByRange(group.units);

    // Track the current primary target (may change if killed)
    let currentTarget = group.primaryTarget;

    for (const unit of sortedUnits) {
        const liveUnit = next.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.hasAttacked) continue;

        // Check if current target is still alive
        const targetStillAlive = next.units.find(u => u.id === currentTarget.id);

        if (!targetStillAlive) {
            const replacement = findReplacementTarget(next, playerId, liveUnit);
            if (!replacement) continue;
            currentTarget = replacement;
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

const getEligibleMilitaryUnits = (state: GameState, playerId: string) => {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        !u.hasAttacked &&
        u.type !== UnitType.Scout &&
        u.type !== UnitType.ArmyScout
    );
};

const getWarEnemies = (state: GameState, playerId: string) => {
    const warEnemyIds = state.players
        .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War)
        .map(p => p.id);
    return state.units.filter(u => warEnemyIds.includes(u.ownerId));
};

const findNearbyEnemies = (unit: Unit, enemies: Unit[]) => {
    return enemies.filter(e => hexDistance(unit.coord, e.coord) <= 3);
};

const collectGroupUnits = (anchor: Unit, allUnits: Unit[], assigned: Set<string>) => {
    return allUnits.filter(other => {
        if (assigned.has(other.id)) return false;
        const dist = hexDistance(anchor.coord, other.coord);
        return dist <= 3;
    });
};

const markAssigned = (units: Unit[], assigned: Set<string>) => {
    for (const u of units) {
        assigned.add(u.id);
    }
};

const selectPrimaryTarget = (groupUnits: Unit[], nearbyEnemies: Unit[], state: GameState) => {
    const targetCandidates = nearbyEnemies.map(enemy => {
        const unitsInRange = groupUnits.filter(u => {
            const stats = UNITS[u.type as UnitType];
            const dist = hexDistance(u.coord, enemy.coord);
            return dist <= stats.rng;
        });
        const totalDamage = unitsInRange.reduce((sum, u) => sum + expectedDamageToUnit(u, enemy, state), 0);
        return { enemy, unitsInRange, totalDamage, canKill: totalDamage >= enemy.hp };
    }).sort((a, b) => {
        if (a.canKill !== b.canKill) return a.canKill ? -1 : 1;
        if (a.unitsInRange.length !== b.unitsInRange.length) return b.unitsInRange.length - a.unitsInRange.length;
        return a.enemy.hp - b.enemy.hp;
    });

    return targetCandidates[0]?.enemy || null;
};

const sortUnitsByRange = (units: Unit[]) => {
    return [...units].sort((a, b) => {
        const aRng = UNITS[a.type as UnitType].rng;
        const bRng = UNITS[b.type as UnitType].rng;
        return bRng - aRng;
    });
};

const findReplacementTarget = (state: GameState, playerId: string, liveUnit: Unit) => {
    const warEnemyIds = state.players
        .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War)
        .map(p => p.id);

    const newTargets = state.units
        .filter(u => warEnemyIds.includes(u.ownerId) && hexDistance(u.coord, liveUnit.coord) <= UNITS[liveUnit.type as UnitType].rng)
        .sort((a, b) => a.hp - b.hp);

    return newTargets[0];
};
