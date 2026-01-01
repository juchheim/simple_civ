/**
 * Level 3: Attack vs Wait Decision
 * 
 * A secondary filter that runs WITHIN the attack phase (after Level 4 says "attack").
 * Individual units may choose to wait if conditions are unfavorable.
 * 
 * This is NOT about preventing all attacks - it's about holding back specific units
 * that would be making bad trades.
 */

import { GameState, Unit, UnitType } from "../../core/types.js";
import { hexDistance } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { getAiMemoryV2 } from "./memory.js";
import { getAiProfileV2 } from "./rules.js";
import { countThreatsToTile } from "../ai/units/movement-safety.js";
import { getCivAggression } from "./army-phase.js";
import { PlannedAttack } from "./attack-order.js";
import { scoreAttackOption } from "./attack-order/scoring.js";
import { isCombatUnitType } from "./schema.js";
import { getUnitStrategicValue } from "./tactical-threat.js";
import { getTacticalTuning } from "./tuning.js";

export type WaitDecision = {
    shouldWait: boolean;
    reason: string;
    score: number;
};

function isMilitary(u: Unit): boolean {
    return isCombatUnitType(u.type);
}

function scorePlannedAttack(
    state: GameState,
    playerId: string,
    attack: PlannedAttack
): number | null {
    if (attack.targetType === "Unit") {
        const target = state.units.find(u => u.id === attack.targetId);
        if (!target) return null;
        return scoreAttackOption({
            state,
            playerId,
            attacker: attack.attacker,
            targetType: "Unit",
            target,
            damage: attack.damage,
            returnDamage: attack.returnDamage
        }).score;
    }

    const city = state.cities.find(c => c.id === attack.targetId);
    if (!city) return null;
    return scoreAttackOption({
        state,
        playerId,
        attacker: attack.attacker,
        targetType: "City",
        target: city,
        damage: attack.damage,
        returnDamage: attack.returnDamage
    }).score;
}

/**
 * Wait Condition 1: Reinforcements Incoming
 * If reinforcements are close (1-3 turns), consider waiting
 */
function checkReinforcementsIncoming(state: GameState, playerId: string, combatCenter: { q: number; r: number }): WaitDecision {
    const tuning = getTacticalTuning(state, playerId);
    const combatZoneRadius = tuning.wait.combatZoneRadius;

    // Units in combat zone
    const inZone = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, combatCenter) <= combatZoneRadius
    );

    // Reinforcements (1-3 tiles outside combat zone)
    const reinforcements = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, combatCenter) > combatZoneRadius &&
        hexDistance(u.coord, combatCenter) <= combatZoneRadius + tuning.wait.reinforcementBuffer
    );

    const currentPower = inZone.reduce((sum, u) => sum + getUnitStrategicValue(u), 0);
    const reinforcementPower = reinforcements.reduce((sum, u) => sum + getUnitStrategicValue(u), 0);

    if (currentPower > 0 && reinforcementPower > currentPower * tuning.wait.reinforcementPowerRatio) {
        return { shouldWait: true, score: reinforcementPower * tuning.wait.reinforcementBaseScoreMult, reason: "Reinforcements incoming" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Wait Condition 2: Local Power Disadvantage
 */
function checkLocalPowerDisadvantage(state: GameState, playerId: string, combatCenter: { q: number; r: number }): WaitDecision {
    const tuning = getTacticalTuning(state, playerId);
    const combatZoneRadius = tuning.wait.combatZoneRadius;

    // Get enemies
    const enemies = state.players.filter(p =>
        p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War"
    );
    const enemyIds = new Set(enemies.map(e => e.id));

    const ourUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, combatCenter) <= combatZoneRadius
    );

    const theirUnits = state.units.filter(u =>
        enemyIds.has(u.ownerId) &&
        isMilitary(u) &&
        hexDistance(u.coord, combatCenter) <= combatZoneRadius
    );

    const ourPower = ourUnits.reduce((sum, u) => sum + getUnitStrategicValue(u), 0);
    const theirPower = theirUnits.reduce((sum, u) => sum + getUnitStrategicValue(u), 0);

    const ratio = ourPower / Math.max(theirPower, 1);

    if (ratio < tuning.wait.localPowerRatioBad) {
        return { shouldWait: true, score: tuning.wait.exposureHighThreatScore, reason: "Outnumbered locally" };
    }

    if (ratio < tuning.wait.localPowerRatioPoor) {
        return { shouldWait: true, score: tuning.wait.exposureMedThreatScore, reason: "Slight disadvantage" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Wait Condition 3: No Kill Possible
 */
function checkNoKillPossible(state: GameState, playerId: string, plannedAttacks: PlannedAttack[]): WaitDecision {
    const tuning = getTacticalTuning(state, playerId);
    const killsPossible = plannedAttacks.filter(a => a.wouldKill).length;

    if (killsPossible === 0) {
        const scores = plannedAttacks
            .map(a => scorePlannedAttack(state, playerId, a))
            .filter((s): s is number => s !== null);
        const totalScore = scores.reduce((sum, s) => sum + s, 0);
        const avgScore = scores.length > 0 ? totalScore / scores.length : 0;

        if (totalScore <= 0) {
            return { shouldWait: true, score: tuning.wait.noKillBaseScore, reason: "Poor trades, no kills" };
        }

        if (avgScore < tuning.wait.noKillAvgScoreThreshold) {
            return { shouldWait: true, score: tuning.wait.noKillLowValueScore, reason: "Low-value pokes, no kills" };
        }
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Wait Condition 4: Exposure After Attack
 */
function checkExposureAfterAttack(state: GameState, playerId: string, attack: PlannedAttack): WaitDecision {
    // After attacking, unit can't move. Check exposure at attack position.
    let positionAfterAttack = attack.attacker.coord;

    // Melee units advance after kill
    if (attack.wouldKill && UNITS[attack.attacker.type].rng === 1) {
        const target = state.units.find(u => u.id === attack.targetId);
        if (target) {
            positionAfterAttack = target.coord;
        }
    }

    const tuning = getTacticalTuning(state, playerId);
    const threats = countThreatsToTile(state, playerId, positionAfterAttack, attack.targetId);

    if (threats.count >= tuning.wait.exposureThreatCount && !attack.wouldKill) {
        return { shouldWait: true, score: tuning.wait.exposureHighThreatScore, reason: "Would be too exposed" };
    }

    if (threats.count >= tuning.wait.exposureMedThreatCount && threats.totalDamage >= attack.attacker.hp * tuning.wait.exposureMedThreatDamageRatio) {
        return { shouldWait: true, score: tuning.wait.exposureMedThreatScore, reason: "Moderately exposed" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Wait Condition 5: Terrain Disadvantage
 */
function checkTerrainDisadvantage(state: GameState, attack: PlannedAttack, tuning: ReturnType<typeof getTacticalTuning>): WaitDecision {
    const defenderTile = state.map.tiles.find(t => {
        const target = state.units.find(u => u.id === attack.targetId);
        return target && t.coord.q === target.coord.q && t.coord.r === target.coord.r;
    });

    const attackerTile = state.map.tiles.find(t =>
        t.coord.q === attack.attacker.coord.q && t.coord.r === attack.attacker.coord.r
    );

    if (!defenderTile || !attackerTile) {
        return { shouldWait: false, score: 0, reason: "" };
    }

    // Check defensive terrain (hills, forest give defense bonus)
    // Note: This relies on simple heuristics, but could be tuned if we want to weight terrain differently.
    // For now, only the score is tuned.
    const defenderBonus = (defenderTile.terrain === 'Hills' || defenderTile.terrain === 'Forest') ? 1 : 0;
    const attackerBonus = (attackerTile.terrain === 'Hills' || attackerTile.terrain === 'Forest') ? 1 : 0;

    if (defenderBonus > attackerBonus && !attack.wouldKill) {
        return { shouldWait: true, score: tuning.wait.terrainScore, reason: "Terrain disadvantage" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Check override conditions that force attack even if wait conditions are met
 */
function mustAttackAnyway(state: GameState, playerId: string, attack: PlannedAttack): { mustAttack: boolean; reason: string } {
    const profile = getAiProfileV2(state, playerId);
    const civAggression = getCivAggression(profile.civName);

    const tuning = getTacticalTuning(state, playerId);

    // Override 1: War dragging on too long (use turn as proxy)
    if (state.turn >= tuning.wait.overrideWarDurationTurns) {
        return { mustAttack: true, reason: "War too long, push!" };
    }

    // Override 2: City almost captured (low HP)
    const memory = getAiMemoryV2(state, playerId);
    const focusCity = memory.focusCityId ? state.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (focusCity && focusCity.hp <= focusCity.maxHp * tuning.wait.overrideCityHpRatio) {
        return { mustAttack: true, reason: "City nearly captured!" };
    }

    // Override 3: Titan is attacking (attacker is Titan)
    if (attack.attacker.type === UnitType.Titan) {
        return { mustAttack: true, reason: "Titan always attacks" };
    }

    // Override 3b: Attacking a Titan (Target is Titan) - Chip damage is valuable
    if (attack.targetType === "Unit") {
        const target = state.units.find(u => u.id === attack.targetId);
        if (target && target.type === UnitType.Titan) {
            return { mustAttack: true, reason: "Always attack enemy Titan" };
        }
    }

    // Override 4: Very high value target
    if (attack.wouldKill && attack.score > tuning.wait.overrideHighValueKillScore) {
        return { mustAttack: true, reason: "High value kill" };
    }

    // Override 5: Aggressive civ personality
    if (civAggression.waitThresholdMult <= tuning.wait.overrideAggressiveThreshold) {
        return { mustAttack: true, reason: "Aggressive civ" };
    }

    return { mustAttack: false, reason: "" };
}

/**
 * Main entry point: Should this specific unit wait instead of attacking?
 */
export function shouldUnitWait(
    state: GameState,
    playerId: string,
    attack: PlannedAttack,
    allPlannedAttacks: PlannedAttack[]
): WaitDecision {
    const profile = getAiProfileV2(state, playerId);
    const civAggression = getCivAggression(profile.civName);

    // Check overrides first
    const override = mustAttackAnyway(state, playerId, attack);
    if (override.mustAttack) {
        return { shouldWait: false, score: 0, reason: override.reason };
    }

    // Get combat center (use focus city or first enemy)
    const memory = getAiMemoryV2(state, playerId);
    const combatCenter = memory.focusCityId
        ? state.cities.find(c => c.id === memory.focusCityId)?.coord
        : state.units.find(u => u.ownerId !== playerId && isMilitary(u))?.coord;

    if (!combatCenter) {
        return { shouldWait: false, score: 0, reason: "No combat zone" };
    }

    const tuning = getTacticalTuning(state, playerId);

    // Evaluate wait conditions
    const conditions: WaitDecision[] = [
        checkReinforcementsIncoming(state, playerId, combatCenter),
        checkLocalPowerDisadvantage(state, playerId, combatCenter),
        checkNoKillPossible(state, playerId, allPlannedAttacks),
        checkExposureAfterAttack(state, playerId, attack),
        checkTerrainDisadvantage(state, attack, tuning)
    ];

    const totalWaitScore = conditions.reduce((sum, c) => sum + c.score, 0);
    const effectiveWaitScore = totalWaitScore * civAggression.waitThresholdMult;

    // Compare wait score to attack score
    // Wait only if wait score exceeds 60% of attack score 
    const waitThreshold = attack.score * tuning.wait.waitThresholdRatio;

    if (effectiveWaitScore > waitThreshold) {
        const primaryReason = conditions.filter(c => c.shouldWait).sort((a, b) => b.score - a.score)[0];
        return { shouldWait: true, score: effectiveWaitScore, reason: primaryReason?.reason ?? "Multiple factors" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Filter planned attacks, removing ones where the unit should wait
 */
export function filterAttacksWithWaitDecision(
    state: GameState,
    playerId: string,
    attacks: PlannedAttack[]
): PlannedAttack[] {
    return attacks.filter(attack => {
        const decision = shouldUnitWait(state, playerId, attack, attacks);
        return !decision.shouldWait;
    });
}
