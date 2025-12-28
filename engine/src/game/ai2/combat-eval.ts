import { DiplomacyState, GameState, Unit, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { getCombatPreviewUnitVsCity, getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { getAiProfileV2 } from "./rules.js";
import { getAiMemoryV2 } from "./memory.js";
import { isMilitary } from "./unit-roles.js";
import { countThreatsToTile } from "../ai/units/movement-safety.js";
import { pickBest } from "./util.js";

function warEnemyIds(state: GameState, playerId: string): Set<string> {
    const ids = new Set<string>();
    for (const p of state.players) {
        if (p.id === playerId || p.isEliminated) continue;
        if (state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War) ids.add(p.id);
    }
    return ids;
}

function hasReadyCapturerAdjacent(state: GameState, playerId: string, cityCoord: { q: number; r: number }): boolean {
    return state.units.some(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        UNITS[u.type].canCaptureCity &&
        u.movesLeft > 0 &&
        hexDistance(u.coord, cityCoord) === 1
    );
}

function cityValue(state: GameState, playerId: string, city: any): number {
    const profile = getAiProfileV2(state, playerId);
    let v = 20;

    // v7.2: RECAPTURE PRIORITY (Item 4)
    // originalOwnerId tracks who founded the city. If it was ours and someone else owns it, we NEED it back.
    if (city.originalOwnerId === playerId && city.ownerId !== playerId) {
        v += 500; // High priority - recapture lost cities
        // Capital loss should trigger URGENT recapture priority
        if (city.isCapital) v += 1000;
    }

    // v7.2: CAPTURED CAPITAL PRIORITY (Item 5)
    // If we own an enemy capital, prioritize its development/defense (higher value)
    if (city.isCapital && city.ownerId === playerId && city.originalOwnerId !== playerId) {
        v += 100; // Value enemy capitals highly
    }

    if (city.isCapital) v += 35 * profile.titan.capitalHunt;
    const hpFrac = city.maxHp ? city.hp / city.maxHp : 1;
    v += (1 - hpFrac) * 18 * profile.titan.finisher;
    if (city.hp <= 0) v += 40;
    return v;
}

function unitValue(u: Unit): number {
    if (String(u.type).startsWith("Army")) return 18;
    if (u.type === UnitType.Titan) return 50;
    if (u.type === UnitType.Riders) return 12;
    if (u.type === UnitType.BowGuard) return 11;
    if (u.type === UnitType.SpearGuard) return 10;
    if (u.type === UnitType.Scout || u.type === UnitType.ArmyScout) return 4;
    if (u.type === UnitType.Settler) return 30;
    return 8;
}

function attackScoreVsUnit(state: GameState, playerId: string, attacker: Unit, defender: Unit): number {
    const profile = getAiProfileV2(state, playerId);
    const preview = getCombatPreviewUnitVsUnit(state, attacker, defender);
    const dmg = preview.estimatedDamage.avg;
    const ret = preview.returnDamage?.avg ?? 0;
    const kill = dmg >= defender.hp ? 1 : 0;
    const suicide = ret >= attacker.hp ? 1 : 0;

    const base = dmg * 2 + kill * (40 + unitValue(defender) * 2);
    const riskPenalty = (ret * 1.7) * (1 - profile.tactics.riskTolerance);
    const suicidePenalty = suicide ? 200 : 0;

    // Multi-threat awareness: check OTHER enemies that can attack this position after the attack
    const attackerStats = UNITS[attacker.type];
    const attackPosition = attackerStats.rng > 1 ? attacker.coord : defender.coord; // melee moves to target
    const threats = countThreatsToTile(state, playerId, attackPosition, defender.id);

    let exposurePenalty = 0;
    if (threats.count >= 2) {
        exposurePenalty = (threats.totalDamage * 0.8) * (1 - profile.tactics.riskTolerance);
    }
    if (threats.count >= 3 && !kill) {
        exposurePenalty += 80;
    }

    return base - riskPenalty - suicidePenalty - exposurePenalty;
}

function attackScoreVsCity(state: GameState, playerId: string, attacker: Unit, city: any): number {
    const profile = getAiProfileV2(state, playerId);
    const preview = getCombatPreviewUnitVsCity(state, attacker, city);
    const dmg = preview.estimatedDamage.avg;
    const ret = preview.returnDamage?.avg ?? 0;

    const wouldDropToZero = city.hp - dmg <= 0;
    const canCaptureNow = wouldDropToZero && UNITS[attacker.type].canCaptureCity && hexDistance(attacker.coord, city.coord) === 1;
    const attackerCanCapture = !!UNITS[attacker.type].canCaptureCity;
    const followUpCapture = hasReadyCapturerAdjacent(state, playerId, city.coord);

    const base = dmg * 2.5 + cityValue(state, playerId, city);
    const captureBonus = canCaptureNow ? 420 : 0;
    let riskPenalty = (ret * 1.8) * (1 - profile.tactics.riskTolerance);
    const capitalBonus = city.isCapital ? 180 : 0;

    if (city.isCapital) {
        riskPenalty *= 0.6;
        if (canCaptureNow) riskPenalty *= 0.2;
    }

    let lethalNoCapturePenalty = 0;
    if (wouldDropToZero && !canCaptureNow && !followUpCapture) {
        lethalNoCapturePenalty = attackerCanCapture ? 350 : 800;
    }

    return base + captureBonus + capitalBonus - riskPenalty - lethalNoCapturePenalty;
}

export function bestAttackForUnit(
    state: GameState,
    playerId: string,
    unit: Unit,
    enemyIdsOverride?: Set<string>
): { action: any; score: number } | null {
    const cityAtLoc = state.cities.find(c => hexEquals(c.coord, unit.coord));
    if (cityAtLoc && cityAtLoc.ownerId === playerId && unit.type !== UnitType.Settler) {
        return null;
    }

    const enemies = enemyIdsOverride ?? warEnemyIds(state, playerId);
    if (enemies.size === 0) return null;
    const rng = UNITS[unit.type].rng;
    const mem = getAiMemoryV2(state, playerId);
    const focusCity = mem.focusCityId ? state.cities.find(c => c.id === mem.focusCityId) : undefined;
    const focusEnemy = focusCity && enemies.has(focusCity.ownerId) ? focusCity : undefined;

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

    const nativeUnits = state.units
        .filter(u => u.campId && u.ownerId !== playerId)
        .filter(u => hexDistance(unit.coord, u.coord) <= rng)
        .map(u => ({
            kind: "Unit" as const,
            target: u,
            score: attackScoreVsUnit(state, playerId, unit, u) * 0.8,
        }));

    const unitTargets = state.units
        .filter(u => enemies.has(u.ownerId))
        .filter(u => hexDistance(unit.coord, u.coord) <= rng)
        .map(u => ({
            kind: "Unit" as const,
            target: u,
            score: attackScoreVsUnit(state, playerId, unit, u),
        }));

    const cityTargets = state.cities
        .filter(c => enemies.has(c.ownerId))
        .filter(c => hexDistance(unit.coord, c.coord) <= rng)
        .map(c => ({
            kind: "City" as const,
            target: c,
            score: (() => {
                let s = attackScoreVsCity(state, playerId, unit, c);
                if (focusEnemy && c.id === focusEnemy.id) {
                    if (UNITS[unit.type].canCaptureCity) s += 200;
                    if (UNITS[unit.type].rng > 1) s += 220;
                    if (unit.type === UnitType.Titan) s += 350;
                }
                return s;
            })(),
        }));

    const best = pickBest([...unitTargets, ...nativeUnits, ...cityTargets], t => t.score);
    if (!best) return null;

    const tgt = best.item;
    if (tgt.kind === "Unit") {
        return { action: { type: "Attack", playerId, attackerId: unit.id, targetType: "Unit", targetId: tgt.target.id }, score: tgt.score };
    }
    return { action: { type: "Attack", playerId, attackerId: unit.id, targetType: "City", targetId: tgt.target.id }, score: tgt.score };
}
