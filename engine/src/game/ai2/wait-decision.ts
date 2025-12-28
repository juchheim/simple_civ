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

export type WaitDecision = {
    shouldWait: boolean;
    reason: string;
    score: number;
};

function isMilitary(u: Unit): boolean {
    return UNITS[u.type].domain !== "Civilian" && u.type !== UnitType.Scout && u.type !== UnitType.ArmyScout;
}

function unitValue(u: Unit): number {
    if (String(u.type).startsWith("Army")) return 18;
    if (u.type === UnitType.Titan) return 50;
    if (u.type === UnitType.Riders) return 12;
    if (u.type === UnitType.BowGuard) return 11;
    if (u.type === UnitType.SpearGuard) return 10;
    return 8;
}

/**
 * Wait Condition 1: Reinforcements Incoming
 * If reinforcements are close (1-3 turns), consider waiting
 */
function checkReinforcementsIncoming(state: GameState, playerId: string, combatCenter: { q: number; r: number }): WaitDecision {
    const combatZoneRadius = 6;

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
        hexDistance(u.coord, combatCenter) <= combatZoneRadius + 3
    );

    const currentPower = inZone.reduce((sum, u) => sum + unitValue(u), 0);
    const reinforcementPower = reinforcements.reduce((sum, u) => sum + unitValue(u), 0);

    if (currentPower > 0 && reinforcementPower > currentPower * 0.3) {
        return { shouldWait: true, score: reinforcementPower * 0.5, reason: "Reinforcements incoming" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Wait Condition 2: Local Power Disadvantage
 */
function checkLocalPowerDisadvantage(state: GameState, playerId: string, combatCenter: { q: number; r: number }): WaitDecision {
    const combatZoneRadius = 6;

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

    const ourPower = ourUnits.reduce((sum, u) => sum + unitValue(u), 0);
    const theirPower = theirUnits.reduce((sum, u) => sum + unitValue(u), 0);

    const ratio = ourPower / Math.max(theirPower, 1);

    if (ratio < 0.6) {
        return { shouldWait: true, score: 60, reason: "Outnumbered locally" };
    }

    if (ratio < 0.8) {
        return { shouldWait: true, score: 30, reason: "Slight disadvantage" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Wait Condition 3: No Kill Possible
 */
function checkNoKillPossible(plannedAttacks: PlannedAttack[]): WaitDecision {
    const killsPossible = plannedAttacks.filter(a => a.wouldKill).length;

    if (killsPossible === 0) {
        const totalDamage = plannedAttacks.reduce((sum, a) => sum + a.damage, 0);
        const totalReturn = plannedAttacks.reduce((sum, a) => sum + a.returnDamage, 0);

        if (totalReturn > totalDamage * 0.8) {
            return { shouldWait: true, score: 40, reason: "Bad trade, no kills" };
        }

        if (totalDamage < 10) {
            return { shouldWait: true, score: 20, reason: "Marginal damage, no kills" };
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

    const threats = countThreatsToTile(state, playerId, positionAfterAttack, attack.targetId);

    if (threats.count >= 3 && !attack.wouldKill) {
        return { shouldWait: true, score: 40, reason: "Would be too exposed" };
    }

    if (threats.count >= 2 && threats.totalDamage >= attack.attacker.hp * 0.5) {
        return { shouldWait: true, score: 20, reason: "Moderately exposed" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Wait Condition 5: Terrain Disadvantage
 */
function checkTerrainDisadvantage(state: GameState, attack: PlannedAttack): WaitDecision {
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
    const defenderBonus = (defenderTile.terrain === 'Hills' || defenderTile.terrain === 'Forest') ? 1 : 0;
    const attackerBonus = (attackerTile.terrain === 'Hills' || attackerTile.terrain === 'Forest') ? 1 : 0;

    if (defenderBonus > attackerBonus && !attack.wouldKill) {
        return { shouldWait: true, score: 15, reason: "Terrain disadvantage" };
    }

    return { shouldWait: false, score: 0, reason: "" };
}

/**
 * Check override conditions that force attack even if wait conditions are met
 */
function mustAttackAnyway(state: GameState, playerId: string, attack: PlannedAttack): { mustAttack: boolean; reason: string } {
    const profile = getAiProfileV2(state, playerId);
    const civAggression = getCivAggression(profile.civName);

    // Override 1: War dragging on too long (use turn as proxy)
    if (state.turn >= 30) {
        return { mustAttack: true, reason: "War too long, push!" };
    }

    // Override 2: City almost captured (low HP)
    const memory = getAiMemoryV2(state, playerId);
    const focusCity = memory.focusCityId ? state.cities.find(c => c.id === memory.focusCityId) : undefined;
    if (focusCity && focusCity.hp <= focusCity.maxHp * 0.3) {
        return { mustAttack: true, reason: "City nearly captured!" };
    }

    // Override 3: Titan is attacking
    if (attack.attacker.type === UnitType.Titan) {
        return { mustAttack: true, reason: "Titan always attacks" };
    }

    // Override 4: Very high value target
    if (attack.wouldKill && attack.score > 200) {
        return { mustAttack: true, reason: "High value kill" };
    }

    // Override 5: Aggressive civ personality
    if (civAggression.waitThresholdMult <= 0.5) {
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

    // Evaluate wait conditions
    const conditions: WaitDecision[] = [
        checkReinforcementsIncoming(state, playerId, combatCenter),
        checkLocalPowerDisadvantage(state, playerId, combatCenter),
        checkNoKillPossible(allPlannedAttacks),
        checkExposureAfterAttack(state, playerId, attack),
        checkTerrainDisadvantage(state, attack)
    ];

    const totalWaitScore = conditions.reduce((sum, c) => sum + c.score, 0);
    const effectiveWaitScore = totalWaitScore * civAggression.waitThresholdMult;

    // Compare wait score to attack score
    // Wait only if wait score exceeds 60% of attack score 
    const waitThreshold = attack.score * 0.6;

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
