import { aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType, Unit } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { expectedDamageToUnit } from "./unit-helpers.js";
// tryAction import removed - coordinateGroupAttack is deprecated (v1.0.3)
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { scoreAttackOption } from "../../ai2/attack-order/scoring.js";
import { canPlanAttack } from "../../ai2/attack-order/shared.js";

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
 * @deprecated v1.0.3: This function executes attacks directly, bypassing the unified tactical planner.
 * Use planBattleGroupActions in tactical-planner.ts instead, which returns TacticalActionPlan[]
 * and respects armyPhase gating, conflict resolution, and wait-decision filtering.
 * 
 * This function is kept for reference but should NOT be called.
 */
export function coordinateGroupAttack(
    _state: GameState,
    _playerId: string,
    _group: BattleGroup
): GameState {
    // v1.0.3: This function is deprecated and does nothing.
    // Battle-group attacks are now planned through planBattleGroupActions in tactical-planner.ts
    // which properly gates by armyPhase and goes through conflict resolution.
    throw new Error("coordinateGroupAttack is deprecated. Use planBattleGroupActions instead.");
}

const getEligibleMilitaryUnits = (state: GameState, playerId: string) => {
    return state.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        !u.hasAttacked &&
        u.type !== UnitType.Scout &&
        u.type !== UnitType.ArmyScout &&
        !isGarrisoned(state, playerId, u)
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
    if (groupUnits.length === 0) return null;
    const playerId = groupUnits[0].ownerId;

    const targetCandidates = nearbyEnemies
        .map(enemy => {
            const attackPlans = groupUnits
                .map(attacker => {
                    if (!canPlanAttack(state, attacker, "Unit", enemy.id)) return null;
                    const preview = getCombatPreviewUnitVsUnit(state, attacker, enemy);
                    return {
                        attacker,
                        damage: preview.estimatedDamage.avg,
                        returnDamage: preview.returnDamage?.avg ?? 0
                    };
                })
                .filter((plan): plan is NonNullable<typeof plan> => plan !== null);

            if (attackPlans.length === 0) return null;

            let simHp = enemy.hp;
            let score = 0;
            let totalDamage = 0;

            const orderedPlans = [...attackPlans].sort((a, b) => a.damage - b.damage);
            for (const plan of orderedPlans) {
                const scored = scoreAttackOption({
                    state,
                    playerId,
                    attacker: plan.attacker,
                    targetType: "Unit",
                    target: enemy,
                    damage: plan.damage,
                    returnDamage: plan.returnDamage,
                    targetHpOverride: simHp
                });
                score += scored.score;
                simHp -= plan.damage;
                totalDamage += plan.damage;
            }

            const canKill = totalDamage >= enemy.hp;
            if (canKill) score += 40;

            return {
                enemy,
                score,
                canKill,
                unitsInRange: attackPlans.length
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort((a, b) => {
            if (a.canKill !== b.canKill) return a.canKill ? -1 : 1;
            if (a.score !== b.score) return b.score - a.score;
            if (a.unitsInRange !== b.unitsInRange) return b.unitsInRange - a.unitsInRange;
            return a.enemy.hp - b.enemy.hp;
        });

    return targetCandidates[0]?.enemy ?? null;
};

const sortUnitsByRange = (units: Unit[]) => {
    return [...units].sort((a, b) => {
        const aRng = UNITS[a.type as UnitType].rng;
        const bRng = UNITS[b.type as UnitType].rng;
        return bRng - aRng;
    });
};

const isGarrisoned = (state: GameState, playerId: string, unit: Unit): boolean => {
    return state.cities.some(c =>
        c.ownerId === playerId &&
        hexEquals(c.coord, unit.coord)
    );
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
