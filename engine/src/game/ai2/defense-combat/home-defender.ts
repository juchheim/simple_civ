import { DiplomacyState, GameState } from "../../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { canPlanMove } from "../../ai/shared/validation.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { scoreAttackOption } from "../attack-order/scoring.js";
import { canPlanAttack } from "../attack-order/shared.js";
import { isMilitary } from "../unit-roles.js";
import { DefenseAttackPlan, DefenseMovePlan, scoreDefenseMove } from "../defense-actions.js";



export function planHomeDefenderAttacks(
    state: GameState,
    playerId: string,
    reservedUnitIds: Set<string>
): DefenseAttackPlan[] {
    const plans: DefenseAttackPlan[] = [];

    const homeDefenders = state.units.filter(u =>
        u.ownerId === playerId &&
        u.isHomeDefender === true &&
        isMilitary(u) &&
        !u.hasAttacked &&
        u.movesLeft > 0 &&
        !reservedUnitIds.has(u.id)
    );

    if (homeDefenders.length === 0) return plans;

    const friendlyTiles = new Set(
        state.map.tiles
            .filter(t => t.ownerId === playerId)
            .map(t => `${t.coord.q},${t.coord.r}`)
    );

    const enemies = state.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        state.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    const enemyIds = new Set(enemies.map(e => e.id));

    const enemiesInTerritory = state.units.filter(u => {
        if (!enemyIds.has(u.ownerId)) return false;
        if (!isMilitary(u)) return false;
        const inTerritory = friendlyTiles.has(`${u.coord.q},${u.coord.r}`);
        if (inTerritory) return true;
        const neighbors = getNeighbors(u.coord);
        return neighbors.some(n => friendlyTiles.has(`${n.q},${n.r}`));
    });

    if (enemiesInTerritory.length === 0) return plans;

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const sortedEnemies = [...enemiesInTerritory].sort((a, b) => {
        const aMinDist = Math.min(...myCities.map(c => hexDistance(a.coord, c.coord)));
        const bMinDist = Math.min(...myCities.map(c => hexDistance(b.coord, c.coord)));
        return aMinDist - bMinDist;
    });

    for (const defender of homeDefenders) {
        const liveDefender = state.units.find(u => u.id === defender.id);
        if (!liveDefender || liveDefender.hasAttacked || liveDefender.movesLeft <= 0) continue;

        // Safety: garrisoned units (on city tile) cannot attack - skip them
        const onCity = myCities.some(c => hexEquals(c.coord, liveDefender.coord));
        if (onCity) continue;

        let bestTarget: typeof sortedEnemies[0] | null = null;
        let bestScore = -Infinity;
        let bestPreview: ReturnType<typeof getCombatPreviewUnitVsUnit> | null = null;

        for (const enemy of sortedEnemies) {
            const liveEnemy = state.units.find(u => u.id === enemy.id);
            if (!liveEnemy) continue;
            if (!canPlanAttack(state, liveDefender, "Unit", liveEnemy.id)) continue;

            const preview = getCombatPreviewUnitVsUnit(state, liveDefender, liveEnemy);
            const dmg = preview.estimatedDamage.avg;
            const ret = preview.returnDamage?.avg ?? 0;
            const cityProximityBonus = Math.max(0, 6 - Math.min(...myCities.map(c => hexDistance(liveEnemy.coord, c.coord)))) * 10;

            const scored = scoreAttackOption({
                state,
                playerId,
                attacker: liveDefender,
                targetType: "Unit",
                target: liveEnemy,
                damage: dmg,
                returnDamage: ret
            });
            const score = scored.score + cityProximityBonus;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = liveEnemy;
                bestPreview = preview;
            }
        }

        if (bestTarget && bestScore > 0 && bestPreview) {
            plans.push({
                intent: "attack",
                unitId: liveDefender.id,
                score: bestScore,
                wouldKill: bestPreview.estimatedDamage.avg >= bestTarget.hp,
                plan: {
                    attacker: liveDefender,
                    targetId: bestTarget.id,
                    targetType: "Unit",
                    damage: bestPreview.estimatedDamage.avg,
                    wouldKill: bestPreview.estimatedDamage.avg >= bestTarget.hp,
                    score: bestScore,
                    returnDamage: bestPreview.returnDamage?.avg ?? 0
                },
                reason: "home-defense-attack"
            });
            reservedUnitIds.add(liveDefender.id);
        }
    }

    return plans;
}

export function planHomeDefenderMoves(
    state: GameState,
    playerId: string,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>
): DefenseMovePlan[] {
    const plans: DefenseMovePlan[] = [];

    const homeDefenders = state.units.filter(u =>
        u.ownerId === playerId &&
        u.isHomeDefender === true &&
        isMilitary(u) &&
        !u.hasAttacked &&
        u.movesLeft > 0 &&
        !reservedUnitIds.has(u.id)
    );

    if (homeDefenders.length === 0) return plans;

    const friendlyTiles = new Set(
        state.map.tiles
            .filter(t => t.ownerId === playerId)
            .map(t => `${t.coord.q},${t.coord.r}`)
    );

    const enemies = state.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        state.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    const enemyIds = new Set(enemies.map(e => e.id));

    const enemiesInTerritory = state.units.filter(u => {
        if (!enemyIds.has(u.ownerId)) return false;
        if (!isMilitary(u)) return false;
        const inTerritory = friendlyTiles.has(`${u.coord.q},${u.coord.r}`);
        if (inTerritory) return true;
        const neighbors = getNeighbors(u.coord);
        return neighbors.some(n => friendlyTiles.has(`${n.q},${n.r}`));
    });

    if (enemiesInTerritory.length === 0) return plans;

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const sortedEnemies = [...enemiesInTerritory].sort((a, b) => {
        const aMinDist = Math.min(...myCities.map(c => hexDistance(a.coord, c.coord)));
        const bMinDist = Math.min(...myCities.map(c => hexDistance(b.coord, c.coord)));
        return aMinDist - bMinDist;
    });

    for (const defender of homeDefenders) {
        const liveDefender = state.units.find(u => u.id === defender.id);
        if (!liveDefender || liveDefender.movesLeft <= 0) continue;

        const onCity = myCities.some(c => hexEquals(c.coord, liveDefender.coord));
        if (onCity) continue;

        const range = UNITS[liveDefender.type].rng ?? 1;
        const targetEnemy = sortedEnemies.find(e => {
            const liveEnemy = state.units.find(u => u.id === e.id);
            return liveEnemy && hexDistance(liveDefender.coord, liveEnemy.coord) > range;
        });

        if (!targetEnemy) continue;
        const liveTarget = state.units.find(u => u.id === targetEnemy.id);
        if (!liveTarget) continue;

        const neighbors = getNeighbors(liveDefender.coord)
            .filter(n => {
                const tile = state.map.tiles.find(t => hexEquals(t.coord, n));
                return !!tile;
            })
            .sort((a, b) => {
                const aDist = hexDistance(a, liveTarget.coord);
                const bDist = hexDistance(b, liveTarget.coord);
                const aInTerritory = friendlyTiles.has(`${a.q},${a.r}`) ? -10 : 0;
                const bInTerritory = friendlyTiles.has(`${b.q},${b.r}`) ? -10 : 0;
                return (aDist + aInTerritory) - (bDist + bInTerritory);
            });

        for (const step of neighbors) {
            const key = `${step.q},${step.r}`;
            if (reservedCoords.has(key)) continue;
            if (canPlanMove(state, playerId, liveDefender, step)) {
                plans.push({
                    intent: "support",
                    unitId: liveDefender.id,
                    action: { type: "MoveUnit", playerId, unitId: liveDefender.id, to: step },
                    score: scoreDefenseMove("raid", hexDistance(step, liveTarget.coord)),
                    reason: "home-defense-move"
                });
                reservedUnitIds.add(liveDefender.id);
                reservedCoords.add(key);
                break;
            }
        }
    }

    return plans;
}
