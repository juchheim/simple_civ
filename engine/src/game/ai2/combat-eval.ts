import { GameState, Unit, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { getCombatPreviewUnitVsCity, getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { pickBest } from "./util.js";
import { canAttackCities, canAttackUnits, getWarEnemyIds } from "./schema.js";
import { canPlanAttack } from "./attack-order/shared.js";
import { scoreAttackOption } from "./attack-order/scoring.js";

export function bestAttackForUnit(
    state: GameState,
    playerId: string,
    unit: Unit,
    enemyIdsOverride?: Set<string>,
    visibleTargets?: { units: Set<string>; cities: Set<string> }
): { action: any; score: number } | null {
    const cityAtLoc = state.cities.find(c => hexEquals(c.coord, unit.coord));
    if (cityAtLoc && cityAtLoc.ownerId === playerId && unit.type !== UnitType.Settler) {
        return null;
    }

    const enemies = enemyIdsOverride ?? getWarEnemyIds(state, playerId);
    if (enemies.size === 0) return null;
    const canHitUnits = canAttackUnits(unit.type);
    const canHitCities = canAttackCities(unit.type);

    if (UNITS[unit.type].canCaptureCity) {
        const adjZero = state.cities.find(c =>
            enemies.has(c.ownerId) &&
            c.hp <= 0 &&
            hexDistance(unit.coord, c.coord) === 1
        );
        if (adjZero) {
            return {
                action: { type: "Attack", playerId, attackerId: unit.id, targetType: "City", targetId: adjZero.id },
                score: 999999,
            };
        }
    }

    const nativeUnits = canHitUnits
        ? state.units
            .filter(u => u.campId && u.ownerId !== playerId)
            .filter(u => !visibleTargets || visibleTargets.units.has(u.id))
            .filter(u => canPlanAttack(state, unit, "Unit", u.id))
            .map(u => ({
                kind: "Unit" as const,
                target: u,
                score: (() => {
                    const preview = getCombatPreviewUnitVsUnit(state, unit, u);
                    return scoreAttackOption({
                        state,
                        playerId,
                        attacker: unit,
                        targetType: "Unit",
                        target: u,
                        damage: preview.estimatedDamage.avg,
                        returnDamage: preview.returnDamage?.avg ?? 0
                    }).score * 0.8;
                })(),
            }))
        : [];

    const unitTargets = canHitUnits
        ? state.units
            .filter(u => enemies.has(u.ownerId))
            .filter(u => !visibleTargets || visibleTargets.units.has(u.id))
            .filter(u => canPlanAttack(state, unit, "Unit", u.id))
            .map(u => ({
                kind: "Unit" as const,
                target: u,
                score: (() => {
                    const preview = getCombatPreviewUnitVsUnit(state, unit, u);
                    return scoreAttackOption({
                        state,
                        playerId,
                        attacker: unit,
                        targetType: "Unit",
                        target: u,
                        damage: preview.estimatedDamage.avg,
                        returnDamage: preview.returnDamage?.avg ?? 0
                    }).score;
                })(),
            }))
        : [];

    const cityTargets = canHitCities
        ? state.cities
            .filter(c => enemies.has(c.ownerId))
            .filter(c => !visibleTargets || visibleTargets.cities.has(c.id))
            .filter(c => canPlanAttack(state, unit, "City", c.id))
            .map(c => ({
                kind: "City" as const,
                target: c,
                score: (() => {
                    const preview = getCombatPreviewUnitVsCity(state, unit, c);
                    return scoreAttackOption({
                        state,
                        playerId,
                        attacker: unit,
                        targetType: "City",
                        target: c,
                        damage: preview.estimatedDamage.avg,
                        returnDamage: preview.returnDamage?.avg ?? 0
                    }).score;
                })(),
            }))
        : [];

    const best = pickBest([...unitTargets, ...nativeUnits, ...cityTargets], t => t.score);
    if (!best) return null;

    const tgt = best.item;
    if (tgt.kind === "Unit") {
        return { action: { type: "Attack", playerId, attackerId: unit.id, targetType: "Unit", targetId: tgt.target.id }, score: tgt.score };
    }
    return { action: { type: "Attack", playerId, attackerId: unit.id, targetType: "City", targetId: tgt.target.id }, score: tgt.score };
}
