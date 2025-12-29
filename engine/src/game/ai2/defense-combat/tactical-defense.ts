import { GameState } from "../../../core/types.js";
import { hexDistance, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { assessDefenseSituation, DefenseSituation } from "../defense-situation.js";

/**
 * v8.0: Tactical Defense System
 * 
 * Uses defense situation assessment to execute intelligent defensive actions:
 * - Intercept: Melee units pursue ranged enemies
 * - Focus-fire: Coordinate multiple units on weakest enemy
 * - Sortie: Counter-attack when we have advantage
 */
export function runTacticalDefense(state: GameState, playerId: string): GameState {
    let next = state;

    // Assess situation for all cities
    const situations = assessDefenseSituation(next, playerId);

    // Process each city based on its situation
    for (const situation of situations) {
        if (situation.threatLevel === "none") continue;

        aiInfo(`[TACTICAL] ${situation.city.name}: ${situation.threatLevel} threat, recommending ${situation.recommendedAction}`);

        switch (situation.recommendedAction) {
            case "intercept":
                next = executeIntercept(next, playerId, situation);
                break;
            case "focus-fire":
                next = executeFocusFire(next, playerId, situation);
                break;
            case "sortie":
                next = executeSortie(next, playerId, situation);
                break;
            case "retreat":
                // Retreat handled by existing logic
                break;
            case "hold":
            default:
                // Just hold position
                break;
        }
    }

    return next;
}

/**
 * Execute intercept action: Melee units move toward and attack ranged enemies
 * v8.1: Only intercept if we can ACTUALLY attack this turn (move + attack)
 */
function executeIntercept(state: GameState, playerId: string, situation: DefenseSituation): GameState {
    let next = state;

    // Find ranged enemies threatening the city
    const rangedEnemies = situation.nearbyEnemies.filter(e => UNITS[e.type]?.rng > 1);
    if (rangedEnemies.length === 0) return next;

    // v8.1: Check if any enemies are close to city - if so, prioritize defending ring
    const enemiesNearCity = situation.nearbyEnemies.filter(e =>
        hexDistance(e.coord, situation.city.coord) <= 2
    );
    if (enemiesNearCity.length > 0) {
        aiInfo(`[INTERCEPT] Skipping intercept - ${enemiesNearCity.length} enemies near city, holding ring`);
        return next; // Don't move ring defenders when city is actively threatened
    }

    // Sort by distance (closest first)
    rangedEnemies.sort((a, b) =>
        hexDistance(a.coord, situation.city.coord) - hexDistance(b.coord, situation.city.coord)
    );

    // Get melee units that can intercept
    const meleeUnits = situation.ringUnits.filter(u => {
        const liveUnit = next.units.find(lu => lu.id === u.id);
        if (!liveUnit || liveUnit.movesLeft <= 0) return false;
        return UNITS[liveUnit.type]?.rng === 1;
    });

    for (const target of rangedEnemies) {
        for (const melee of meleeUnits) {
            const liveUnit = next.units.find(u => u.id === melee.id);
            if (!liveUnit || liveUnit.movesLeft <= 0) continue;

            const dist = hexDistance(liveUnit.coord, target.coord);
            if (dist === 1) {
                // Can attack directly
                const result = tryAction(next, {
                    type: "Attack",
                    playerId,
                    attackerId: liveUnit.id,
                    targetId: target.id,
                    targetType: "Unit"
                });
                if (result !== next) {
                    next = result;
                    aiInfo(`[INTERCEPT] ${liveUnit.type} attacking ${target.type}`);
                    break;
                }
            } else if (dist === 2 && liveUnit.movesLeft >= 1) {
                // v8.1: Only move if we can attack in the SAME turn (distance exactly 2)
                // This prevents shuffling toward enemies we can't hit
                const neighbors = getNeighbors(target.coord);
                for (const neighbor of neighbors) {
                    const moveDist = hexDistance(liveUnit.coord, neighbor);
                    if (moveDist === 1) { // Must be exactly 1 step away
                        const moveResult = tryAction(next, {
                            type: "MoveUnit",
                            playerId,
                            unitId: liveUnit.id,
                            to: neighbor
                        });
                        if (moveResult !== next) {
                            next = moveResult;
                            // Now try to attack
                            const liveAfterMove = next.units.find(u => u.id === liveUnit.id);
                            if (liveAfterMove && !liveAfterMove.hasAttacked) {
                                const attackResult = tryAction(next, {
                                    type: "Attack",
                                    playerId,
                                    attackerId: liveAfterMove.id,
                                    targetId: target.id,
                                    targetType: "Unit"
                                });
                                if (attackResult !== next) {
                                    next = attackResult;
                                    aiInfo(`[INTERCEPT] ${liveUnit.type} moved and attacked ${target.type}`);
                                }
                            }
                            break;
                        }
                    }
                }
            }
            // v8.1: Removed else case - don't move toward enemies if we can't attack this turn
        }
    }

    return next;
}

/**
 * Execute focus-fire: Coordinate multiple units to eliminate single target
 */
function executeFocusFire(state: GameState, playerId: string, situation: DefenseSituation): GameState {
    let next = state;

    const target = situation.focusTarget;
    if (!target) return next;

    const liveTarget = next.units.find(u => u.id === target.id);
    if (!liveTarget) return next;

    aiInfo(`[FOCUS-FIRE] Targeting ${liveTarget.type} (HP: ${liveTarget.hp})`);

    // Get all units that can attack the target
    const attackers = [...situation.ringUnits];
    if (situation.garrison) attackers.push(situation.garrison);

    for (const attacker of attackers) {
        const liveAttacker = next.units.find(u => u.id === attacker.id);
        const currentTarget = next.units.find(u => u.id === target.id);

        if (!liveAttacker || !currentTarget || liveAttacker.movesLeft <= 0) continue;
        if (currentTarget.hp <= 0) break; // Target eliminated

        const dist = hexDistance(liveAttacker.coord, currentTarget.coord);
        const range = UNITS[liveAttacker.type]?.rng || 1;

        if (dist <= range) {
            const result = tryAction(next, {
                type: "Attack",
                playerId,
                attackerId: liveAttacker.id,
                targetId: currentTarget.id,
                targetType: "Unit"
            });
            if (result !== next) {
                next = result;
                aiInfo(`[FOCUS-FIRE] ${liveAttacker.type} attacked ${currentTarget.type}`);
            }
        }
    }

    return next;
}

/**
 * Execute sortie: Counter-attack when we have advantage
 */
function executeSortie(state: GameState, playerId: string, situation: DefenseSituation): GameState {
    let next = state;

    // Only sortie if we have significant advantage
    if (situation.defenseScore < situation.threatScore * 1.2) return next;
    if (situation.ringUnits.length < 3) return next;

    aiInfo(`[SORTIE] ${situation.city.name} counter-attacking!`);

    // Attack weakest enemies first
    const sortedEnemies = [...situation.nearbyEnemies].sort((a, b) => a.hp - b.hp);

    for (const enemy of sortedEnemies) {
        const liveEnemy = next.units.find(u => u.id === enemy.id);
        if (!liveEnemy) continue;

        for (const unit of situation.ringUnits) {
            const liveUnit = next.units.find(u => u.id === unit.id);
            if (!liveUnit || liveUnit.movesLeft <= 0) continue;

            const dist = hexDistance(liveUnit.coord, liveEnemy.coord);
            const range = UNITS[liveUnit.type]?.rng || 1;

            if (dist <= range) {
                const result = tryAction(next, {
                    type: "Attack",
                    playerId,
                    attackerId: liveUnit.id,
                    targetId: liveEnemy.id,
                    targetType: "Unit"
                });
                if (result !== next) {
                    next = result;
                    aiInfo(`[SORTIE] ${liveUnit.type} attacked ${liveEnemy.type}`);
                }
            }
        }
    }

    return next;
}
