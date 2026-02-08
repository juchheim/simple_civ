/**
 * Advanced Military Tactics Module
 * 
 * Implements real military tactical concepts for intelligent offensive AI:
 * 
 * 1. PINCER MOVEMENT - Attack from multiple directions simultaneously
 * 2. ENCIRCLEMENT - Surround enemies to cut off retreat and reinforcement
 * 3. DEFEAT IN DETAIL - Attack isolated units before they can combine
 * 4. KILL CHAIN - Sequence attacks so one enables the next
 * 5. SCHWERPUNKT - Concentrate force at the decisive point
 * 6. HAMMER AND ANVIL - Pin with infantry, strike with cavalry
 */

import { GameState, Unit } from "../../../core/types.js";
import { hexDistance, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { isMilitary } from "../unit-roles.js";
import { getAiMemoryV2 } from "../memory.js";

// ============================================================================
// TYPES
// ============================================================================

export type TacticalSituation = {
    isolatedEnemies: IsolatedUnit[];      // Enemies cut off from support
    encircledEnemies: EncircledUnit[];    // Enemies we've surrounded
    pincerOpportunities: PincerTarget[];  // Targets we can pincer
    killChains: KillChain[];              // Attack sequences that enable kills
    weakPoints: WeakPoint[];              // Gaps in enemy line
    threatValue: number;                  // Total enemy threat
    ourStrength: number;                  // Our local strength
};

export type IsolatedUnit = {
    unit: Unit;
    nearestFriendlyDist: number;
    threateningUs: number;  // How many of our units can attack it
    isolationScore: number; // Higher = more isolated and vulnerable
};

export type EncircledUnit = {
    unit: Unit;
    surroundingAllies: number;  // How many of our units adjacent
    escapeRoutes: number;       // Empty adjacent tiles
    encirclementScore: number;  // Higher = more trapped
};

export type PincerTarget = {
    unit: Unit;
    attackers: Unit[];
    angles: number[];           // Directions of attack (0-5 for hex)
    spreadScore: number;        // How well spread the attackers are
    totalDamage: number;
};

export type KillChain = {
    attacks: KillChainLink[];
    totalKills: number;
    totalDamage: number;
    efficiency: number;         // Kills per attack
    isWorthIt: boolean;         // Trade efficiency (Value Killed > Value Lost)
};

export type KillChainLink = {
    attacker: Unit;
    target: Unit;
    damage: number;
    wouldKill: boolean;
    enablesNextKill: boolean;   // Does killing this enable next attack?
};

export type WeakPoint = {
    coord: { q: number; r: number };
    enemyDefense: number;
    nearbyAllies: number;
    breakthroughScore: number;  // How good for concentrated attack
};

// ============================================================================
// CORE ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze the tactical situation around a focus point
 */
export function analyzeTacticalSituation(
    state: GameState,
    playerId: string,
    focusCoord: { q: number; r: number },
    radius: number = 8
): TacticalSituation {
    const enemyIds = new Set(
        state.players
            .filter(p => p.id !== playerId && !p.isEliminated && state.diplomacy?.[playerId]?.[p.id] === "War")
            .map(p => p.id)
    );

    const ourUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, focusCoord) <= radius
    );

    const enemyUnits = state.units.filter(u =>
        enemyIds.has(u.ownerId) &&
        isMilitary(u) &&
        hexDistance(u.coord, focusCoord) <= radius
    );

    return {
        isolatedEnemies: findIsolatedUnits(state, enemyUnits, ourUnits, enemyIds),
        encircledEnemies: findEncircledUnits(state, enemyUnits, ourUnits),
        pincerOpportunities: findPincerOpportunities(state, enemyUnits, ourUnits),
        killChains: findKillChains(state, ourUnits, enemyUnits),
        weakPoints: findWeakPoints(state, focusCoord, ourUnits, enemyUnits),
        threatValue: enemyUnits.reduce((sum, u) => sum + UNITS[u.type].atk, 0),
        ourStrength: ourUnits.reduce((sum, u) => sum + UNITS[u.type].atk, 0),
    };
}

// ============================================================================
// DEFEAT IN DETAIL - Find isolated enemies to destroy first
// ============================================================================

function findIsolatedUnits(
    state: GameState,
    enemies: Unit[],
    ourUnits: Unit[],
    enemyIds: Set<string>
): IsolatedUnit[] {
    const isolated: IsolatedUnit[] = [];

    for (const enemy of enemies) {
        // Find nearest friendly unit to this enemy
        const friendlyAllies = state.units.filter(u =>
            enemyIds.has(u.ownerId) &&
            u.id !== enemy.id &&
            isMilitary(u)
        );

        const nearestDist = friendlyAllies.length > 0
            ? Math.min(...friendlyAllies.map(u => hexDistance(u.coord, enemy.coord)))
            : 999;

        // Count our units that can attack this enemy
        const threateningUs = ourUnits.filter(u => {
            const range = UNITS[u.type].rng;
            return hexDistance(u.coord, enemy.coord) <= range;
        }).length;

        // Isolation score: high when far from friends, exposed to us
        const isolationScore = (nearestDist * 10) + (threateningUs * 15);

        if (nearestDist >= 3 || threateningUs >= 2) {
            isolated.push({
                unit: enemy,
                nearestFriendlyDist: nearestDist,
                threateningUs,
                isolationScore
            });
        }
    }

    return isolated.sort((a, b) => b.isolationScore - a.isolationScore);
}

// ============================================================================
// ENCIRCLEMENT - Find enemies we've surrounded
// ============================================================================

function findEncircledUnits(
    _state: GameState,
    enemies: Unit[],
    ourUnits: Unit[]
): EncircledUnit[] {
    const encircled: EncircledUnit[] = [];

    for (const enemy of enemies) {
        const neighbors = getNeighbors(enemy.coord);

        // Count our units adjacent to enemy
        const adjacentAllies = neighbors.filter(n =>
            ourUnits.some(u => hexDistance(u.coord, n) === 0)
        ).length;

        // Count empty tiles enemy could retreat to
        const escapeRoutes = neighbors.filter(n =>
            !ourUnits.some(u => hexDistance(u.coord, n) === 0)
        ).length;

        // Encirclement score: high when surrounded, few escapes
        const encirclementScore = (adjacentAllies * 20) - (escapeRoutes * 5);

        if (adjacentAllies >= 2) {
            encircled.push({
                unit: enemy,
                surroundingAllies: adjacentAllies,
                escapeRoutes,
                encirclementScore
            });
        }
    }

    return encircled.sort((a, b) => b.encirclementScore - a.encirclementScore);
}

// ============================================================================
// PINCER MOVEMENT - Find targets we can attack from multiple directions
// ============================================================================

export function getHexAngle(from: { q: number; r: number }, to: { q: number; r: number }): number {
    // Returns 0-5 representing the 6 hex directions
    const dq = to.q - from.q;
    const dr = to.r - from.r;

    if (dq > 0 && dr === 0) return 0;      // East
    if (dq > 0 && dr < 0) return 1;        // Northeast
    if (dq <= 0 && dr < 0) return 2;       // Northwest
    if (dq < 0 && dr === 0) return 3;      // West
    if (dq < 0 && dr > 0) return 4;        // Southwest
    return 5;                               // Southeast
}

function findPincerOpportunities(
    state: GameState,
    enemies: Unit[],
    ourUnits: Unit[]
): PincerTarget[] {
    const pincers: PincerTarget[] = [];

    for (const enemy of enemies) {
        // Find all our units that can attack this enemy
        const attackers = ourUnits.filter(u => {
            const range = UNITS[u.type].rng;
            return hexDistance(u.coord, enemy.coord) <= range && !u.hasAttacked;
        });

        if (attackers.length < 2) continue;

        // Calculate attack angles
        const angles = attackers.map(a => getHexAngle(a.coord, enemy.coord));
        const uniqueAngles = new Set(angles);

        // Spread score: higher when attackers are from opposite directions
        // A true pincer has attackers from opposite sides (angles differ by 3)
        let spreadScore = 0;
        for (let i = 0; i < angles.length; i++) {
            for (let j = i + 1; j < angles.length; j++) {
                const diff = Math.abs(angles[i] - angles[j]);
                const oppositeBonus = (diff === 3) ? 100 : diff * 15; // Perfect pincer = 100
                spreadScore += oppositeBonus;
            }
        }

        // Calculate combined damage
        let totalDamage = 0;
        for (const attacker of attackers) {
            const preview = getCombatPreviewUnitVsUnit(state, attacker, enemy);
            totalDamage += preview.estimatedDamage.avg;
        }

        if (uniqueAngles.size >= 2 && spreadScore >= 30) {
            pincers.push({
                unit: enemy,
                attackers,
                angles,
                spreadScore,
                totalDamage
            });
        }
    }

    return pincers.sort((a, b) => b.spreadScore - a.spreadScore);
}

// ============================================================================
// KILL CHAINS - Sequence attacks to maximize kills
// ============================================================================

export function findKillChains(
    state: GameState,
    ourUnits: Unit[],
    enemies: Unit[]
): KillChain[] {
    const chains: KillChain[] = [];
    const availableAttackers = new Set(ourUnits.filter(u => !u.hasAttacked).map(u => u.id));

    // For each potential kill, see what it enables
    for (const target of enemies) {
        const chain: KillChainLink[] = [];
        const usedAttackers = new Set<string>();
        let currentTarget = target;
        let simulatedHp = target.hp;

        // Try to build a chain that kills this target
        for (const attacker of ourUnits) {
            if (!availableAttackers.has(attacker.id)) continue;
            if (usedAttackers.has(attacker.id)) continue;

            const range = UNITS[attacker.type].rng;
            if (hexDistance(attacker.coord, currentTarget.coord) > range) continue;

            const preview = getCombatPreviewUnitVsUnit(state, attacker, currentTarget);
            const damage = preview.estimatedDamage.avg;
            const wouldKill = damage >= simulatedHp;

            chain.push({
                attacker,
                target: currentTarget,
                damage,
                wouldKill,
                enablesNextKill: false
            });

            usedAttackers.add(attacker.id);
            simulatedHp -= damage;

            if (wouldKill) {
                // Mark previous link as enabling this kill
                if (chain.length > 1) {
                    chain[chain.length - 2].enablesNextKill = true;
                }

                // Look for next target to chain into
                const melee = UNITS[attacker.type].rng === 1;
                if (melee && wouldKill) {
                    // Melee unit advances after kill - look for adjacent target
                    const neighbors = getNeighbors(currentTarget.coord);
                    const nextTarget = enemies.find(e =>
                        e.id !== currentTarget.id &&
                        neighbors.some(n => hexDistance(e.coord, n) === 0)
                    );
                    if (nextTarget) {
                        currentTarget = nextTarget;
                        simulatedHp = nextTarget.hp;
                        continue;
                    }
                }
                break;
            }
        }

        if (chain.length >= 1) {
            const totalKills = chain.filter(l => l.wouldKill).length;
            const totalDamage = chain.reduce((sum, l) => sum + l.damage, 0);

            // TRADE EFFICIENCY CHECK
            // Prevent "trading a Knight for a Scout"
            // We assume attackers that take return damage might die
            // Simple heuristic: Total value of kills vs. Total value of attackers
            let valueKilled = 0;
            let valueRisked = 0;

            if (totalKills > 0) {
                // If we kill the target, we gain its value
                valueKilled = UNITS[target.type].cost;
            }

            // Estimate risk: assume 30% of attacker value is risked per attack
            for (const link of chain) {
                valueRisked += UNITS[link.attacker.type].cost * 0.3;
            }

            // Chain is worth it if we kill more value than we risk
            // Or if we get a kill with minimal risk
            const isWorthIt = valueKilled >= valueRisked * 0.8; // Allow slightly unfavorable trades if we secure a kill

            chains.push({
                attacks: chain,
                totalKills,
                totalDamage,
                efficiency: totalKills / chain.length,
                isWorthIt
            });
        }
    }

    return chains.sort((a, b) => {
        // Prioritize by kills, then efficiency
        if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
        return b.efficiency - a.efficiency;
    });
}

// ============================================================================
// SCHWERPUNKT - Find weak points for concentrated breakthrough
// ============================================================================

function findWeakPoints(
    state: GameState,
    focusCoord: { q: number; r: number },
    ourUnits: Unit[],
    enemies: Unit[]
): WeakPoint[] {
    const weakPoints: WeakPoint[] = [];

    // Look at tiles between us and the target
    for (const tile of state.map.tiles) {
        const distToFocus = hexDistance(tile.coord, focusCoord);
        if (distToFocus > 5 || distToFocus < 1) continue;

        // Count enemy units near this tile
        const nearbyEnemies = enemies.filter(e => hexDistance(e.coord, tile.coord) <= 2);
        const enemyDefense = nearbyEnemies.reduce((sum, e) => sum + UNITS[e.type].def, 0);

        // Count our units that could reach this tile
        const nearbyAllies = ourUnits.filter(u => hexDistance(u.coord, tile.coord) <= 2).length;

        // Breakthrough score: high when few enemies, many of our units
        const breakthroughScore = (nearbyAllies * 15) - (enemyDefense * 2) - (distToFocus * 5);

        if (nearbyAllies >= 2 && enemyDefense <= 10) {
            weakPoints.push({
                coord: tile.coord,
                enemyDefense,
                nearbyAllies,
                breakthroughScore
            });
        }
    }

    return weakPoints.sort((a, b) => b.breakthroughScore - a.breakthroughScore);
}

// ============================================================================
// TACTICAL PRIORITY SCORING
// ============================================================================

export type TacticalPriorityTarget = {
    unit: Unit;
    totalScore: number;
    reasons: string[];

    isolationBonus: number;
    encirclementBonus: number;
    pincerBonus: number;
    killChainBonus: number;
    weakPointBonus: number;
};

/**
 * Get prioritized attack targets based on tactical situation
 */
export function getTacticalPriorityTargets(
    state: GameState,
    playerId: string,
    focusCoord: { q: number; r: number }
): TacticalPriorityTarget[] {
    const situation = analyzeTacticalSituation(state, playerId, focusCoord);
    const targetScores = new Map<string, TacticalPriorityTarget>();

    // Process isolated units - DEFEAT IN DETAIL
    for (const isolated of situation.isolatedEnemies) {
        const entry = getOrCreateTarget(targetScores, isolated.unit);
        entry.isolationBonus = isolated.isolationScore;
        entry.reasons.push(`Isolated (${isolated.nearestFriendlyDist} tiles from friends)`);
    }

    // Process encircled units - ENCIRCLEMENT
    for (const encircled of situation.encircledEnemies) {
        const entry = getOrCreateTarget(targetScores, encircled.unit);
        entry.encirclementBonus = encircled.encirclementScore;
        entry.reasons.push(`Encircled (${encircled.surroundingAllies} adjacent allies)`);
    }

    // Process pincer opportunities - PINCER MOVEMENT
    for (const pincer of situation.pincerOpportunities) {
        const entry = getOrCreateTarget(targetScores, pincer.unit);
        entry.pincerBonus = pincer.spreadScore;
        entry.reasons.push(`Pincer (${pincer.attackers.length} attackers from ${new Set(pincer.angles).size} directions)`);
    }

    // Process kill chains - KILL CHAIN
    for (const chain of situation.killChains) {
        if (chain.attacks.length === 0) continue;
        const firstTarget = chain.attacks[0].target;
        const entry = getOrCreateTarget(targetScores, firstTarget);
        entry.killChainBonus = chain.totalKills * 50 + chain.efficiency * 30;
        entry.reasons.push(`Kill chain (${chain.totalKills} kills possible)`);
    }

    // Calculate total scores
    const results: TacticalPriorityTarget[] = [];
    for (const entry of targetScores.values()) {
        entry.totalScore =
            entry.isolationBonus +
            entry.encirclementBonus +
            entry.pincerBonus +
            entry.killChainBonus +
            entry.weakPointBonus;
        results.push(entry);
    }

    return results.sort((a, b) => b.totalScore - a.totalScore);
}

function getOrCreateTarget(map: Map<string, TacticalPriorityTarget>, unit: Unit): TacticalPriorityTarget {
    let entry = map.get(unit.id);
    if (!entry) {
        entry = {
            unit,
            totalScore: 0,
            reasons: [],
            isolationBonus: 0,
            encirclementBonus: 0,
            pincerBonus: 0,
            killChainBonus: 0,
            weakPointBonus: 0
        };
        map.set(unit.id, entry);
    }
    return entry;
}

// ============================================================================
// ATTACK PLAN ENHANCEMENT
// ============================================================================

/**
 * Reorder planned attacks based on tactical priority
 * This is the main integration point for the tactical planner
 */
export function enhanceAttackPlanWithTactics(
    state: GameState,
    playerId: string,
    plannedAttacks: { attacker: Unit; targetId: string; targetType: "Unit" | "City"; score: number }[]
): typeof plannedAttacks {
    const memory = getAiMemoryV2(state, playerId);
    const focusCity = memory.focusCityId
        ? state.cities.find(c => c.id === memory.focusCityId)
        : undefined;

    if (!focusCity) return plannedAttacks;

    const priorities = getTacticalPriorityTargets(state, playerId, focusCity.coord);
    const priorityMap = new Map(priorities.map(p => [p.unit.id, p.totalScore]));

    // Enhance scores based on tactical priority
    const enhanced = plannedAttacks.map(attack => {
        const tacticalBonus = priorityMap.get(attack.targetId) ?? 0;
        return {
            ...attack,
            score: attack.score + tacticalBonus
        };
    });

    // Reorder by enhanced scores
    return enhanced.sort((a, b) => b.score - a.score);
}

// ============================================================================
// COORDINATED ATTACK PLANNING
// ============================================================================

export type CoordinatedAttackPlan = {
    primaryTarget: Unit;
    attackSequence: { attacker: Unit; isRanged: boolean; estimatedDamage: number }[];
    totalDamage: number;
    willKill: boolean;
    tacticalType: "pincer" | "encirclement" | "focused" | "chain";
};

/**
 * Plan a coordinated attack on a high-priority target
 * Implements HAMMER AND ANVIL: ranged first, then melee
 */
export function planCoordinatedAttack(
    state: GameState,
    playerId: string,
    target: Unit,
    availableAttackers: Unit[]
): CoordinatedAttackPlan | null {
    // Find all attackers that can hit this target
    const attackersInRange = availableAttackers.filter(a => {
        const range = UNITS[a.type].rng;
        return hexDistance(a.coord, target.coord) <= range && !a.hasAttacked;
    });

    if (attackersInRange.length === 0) return null;

    // Sort: RANGED FIRST (hammer and anvil - soften before melee commits)
    const sortedAttackers = attackersInRange.sort((a, b) => {
        const aRng = UNITS[a.type].rng;
        const bRng = UNITS[b.type].rng;
        return bRng - aRng; // Higher range first
    });

    const sequence: CoordinatedAttackPlan["attackSequence"] = [];
    let simulatedHp = target.hp;
    let totalDamage = 0;

    for (const attacker of sortedAttackers) {
        if (simulatedHp <= 0) break;

        const preview = getCombatPreviewUnitVsUnit(state, attacker, target);
        const damage = preview.estimatedDamage.avg;

        sequence.push({
            attacker,
            isRanged: UNITS[attacker.type].rng > 1,
            estimatedDamage: damage
        });

        totalDamage += damage;
        simulatedHp -= damage;
    }

    // Determine tactical type
    let tacticalType: CoordinatedAttackPlan["tacticalType"] = "focused";
    const angles = new Set(sequence.map(s => getHexAngle(s.attacker.coord, target.coord)));
    if (angles.size >= 3) tacticalType = "encirclement";
    else if (angles.has(0) && angles.has(3) || angles.has(1) && angles.has(4) || angles.has(2) && angles.has(5)) {
        tacticalType = "pincer";
    }

    return {
        primaryTarget: target,
        attackSequence: sequence,
        totalDamage,
        willKill: totalDamage >= target.hp,
        tacticalType
    };
}
