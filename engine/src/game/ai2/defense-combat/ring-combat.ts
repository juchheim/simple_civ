import { DiplomacyState, GameState } from "../../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { scoreAttackOption, scoreDefenseAttackOption } from "../attack-order/scoring.js";
import { canPlanAttack, isGarrisoned } from "../attack-order/shared.js";
import { isMilitary } from "../unit-roles.js";
import { DefenseAttackPlan } from "../defense-actions.js";



export function planDefensiveRingCombat(
    state: GameState,
    playerId: string,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>
): DefenseAttackPlan[] {
    const plans: DefenseAttackPlan[] = [];

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    if (myCities.length === 0) return plans;

    const enemies = state.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        state.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    if (enemies.length === 0) return plans;
    const enemyIds = new Set(enemies.map(e => e.id));

    for (const city of myCities) {
        const ringDefenders = state.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            !u.hasAttacked &&
            u.movesLeft > 0 &&
            hexDistance(u.coord, city.coord) === 1 && // Ring position (distance 1)
            !hexEquals(u.coord, city.coord) && // Safety: explicitly exclude garrisoned units (can't attack)
            !reservedUnitIds.has(u.id)
        );

        if (ringDefenders.length === 0) continue;

        const nearbyEnemies = state.units.filter(u =>
            enemyIds.has(u.ownerId) &&
            isMilitary(u) &&
            hexDistance(u.coord, city.coord) <= 5
        );

        if (nearbyEnemies.length === 0) continue;

        const enemiesThreateningCity = nearbyEnemies.filter(e =>
            hexDistance(e.coord, city.coord) <= 2
        );

        for (const defender of ringDefenders) {
            const liveDefender = state.units.find(u => u.id === defender.id);
            if (!liveDefender || liveDefender.hasAttacked || liveDefender.movesLeft <= 0) continue;

            const maxHp = UNITS[liveDefender.type].hp;
            const hpPercent = liveDefender.hp / maxHp;
            const enemyAdjacent = nearbyEnemies.some(e => hexDistance(e.coord, city.coord) <= 1);

            if (hpPercent < 0.5 && !enemyAdjacent) {
                continue;
            }

            const range = UNITS[liveDefender.type].rng ?? 1;
            const attackableEnemies = nearbyEnemies.filter(e => {
                const liveEnemy = state.units.find(u => u.id === e.id);
                return liveEnemy && canPlanAttack(state, liveDefender, "Unit", liveEnemy.id);
            });

            if (attackableEnemies.length > 0) {
                let bestTarget: typeof attackableEnemies[0] | null = null;
                let bestScore = -Infinity;
                let bestPreview: ReturnType<typeof getCombatPreviewUnitVsUnit> | null = null;

                for (const enemy of attackableEnemies) {
                    const liveEnemy = state.units.find(u => u.id === enemy.id);
                    if (!liveEnemy) continue;

                    const preview = getCombatPreviewUnitVsUnit(state, liveDefender, liveEnemy);
                    const dmg = preview.estimatedDamage.avg;
                    const ret = preview.returnDamage?.avg ?? 0;

                    const scored = scoreDefenseAttackOption({
                        state,
                        playerId,
                        attacker: liveDefender,
                        targetType: "Unit",
                        target: liveEnemy,
                        damage: dmg,
                        returnDamage: ret,
                        cityCoord: city.coord
                    });
                    const score = scored.score;

                    if (score > bestScore) {
                        bestScore = score;
                        bestTarget = liveEnemy;
                        bestPreview = preview;
                    }
                }

                if (bestTarget && bestScore > -50 && bestPreview) {
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
                        cityId: city.id,
                        reason: "ring-combat-attack"
                    });
                    reservedUnitIds.add(liveDefender.id);
                }
                continue;
            }

            if (enemiesThreateningCity.length > 0) {
                continue;
            }

            const isDefenderMelee = range === 1;
            if (!isDefenderMelee) continue;

            const closestEnemy = nearbyEnemies
                .map(e => {
                    const liveEnemy = state.units.find(u => u.id === e.id);
                    return liveEnemy ? { enemy: liveEnemy, dist: hexDistance(liveDefender.coord, liveEnemy.coord) } : null;
                })
                .filter((x): x is NonNullable<typeof x> => x !== null)
                .sort((a, b) => a.dist - b.dist)[0];

            if (!closestEnemy) continue;

            const isEnemyRanged = (UNITS[closestEnemy.enemy.type].rng ?? 1) > 1;
            if (!isEnemyRanged) continue;

            const neighbors = getNeighbors(liveDefender.coord);
            const moveOptions = neighbors
                .map(n => ({
                    coord: n,
                    distToEnemy: hexDistance(n, closestEnemy.enemy.coord),
                    distToCity: hexDistance(n, city.coord)
                }))
                .filter(opt => {
                    const occupied = state.units.some(u => hexEquals(u.coord, opt.coord));
                    const cityTile = state.cities.some(c => hexEquals(c.coord, opt.coord));
                    const tooFarFromCity = opt.distToCity > 2;
                    const coordKey = `${opt.coord.q},${opt.coord.r}`;
                    return !occupied && !cityTile && !tooFarFromCity && !reservedCoords.has(coordKey);
                })
                .filter(opt => opt.distToEnemy <= range)
                .sort((a, b) => a.distToCity - b.distToCity);

            if (moveOptions.length === 0) continue;

            const bestMove = moveOptions[0];
            const virtualAttacker = { ...liveDefender, coord: bestMove.coord };
            const preview = getCombatPreviewUnitVsUnit(state, virtualAttacker, closestEnemy.enemy);
            const dmg = preview.estimatedDamage.avg;
            const ret = preview.returnDamage?.avg ?? 0;
            const scored = scoreDefenseAttackOption({
                state,
                playerId,
                attacker: virtualAttacker,
                targetType: "Unit",
                target: closestEnemy.enemy,
                damage: dmg,
                returnDamage: ret,
                cityCoord: city.coord
            });

            plans.push({
                intent: "move-attack",
                unitId: liveDefender.id,
                score: scored.score,
                wouldKill: scored.wouldKill,
                plan: {
                    unit: liveDefender,
                    moveTo: bestMove.coord,
                    targetId: closestEnemy.enemy.id,
                    targetType: "Unit",
                    exposureDamage: 0,
                    potentialDamage: dmg,
                    wouldKill: scored.wouldKill,
                    score: scored.score
                },
                cityId: city.id,
                reason: "ring-combat-intercept"
            });
            reservedUnitIds.add(liveDefender.id);
            reservedCoords.add(`${bestMove.coord.q},${bestMove.coord.r}`);
        }
    }

    return plans;
}
