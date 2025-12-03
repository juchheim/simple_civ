import { hexDistance, getNeighbors } from "../../../core/hex.js";
import { DiplomacyState, GameState, UnitType } from "../../../core/types.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../shared/actions.js";
import { findPath } from "../../helpers/pathfinding.js";

export function titanRampage(state: GameState, playerId: string): GameState {
    let next = state;

    const titans = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Titan);
    if (titans.length === 0) return next;

    const player = next.players.find(p => p.id === playerId);
    if (!player) return next;

    const warEnemies = next.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );

    const enemyCities = next.cities
        .filter(c => warEnemies.some(e => e.id === c.ownerId))
        .sort((a, b) => {
            if (a.isCapital !== b.isCapital) return a.isCapital ? -1 : 1;
            return a.hp - b.hp;
        });

    // v1.2: Titan Capital Rush - Strictly prioritize Capitals
    const knownCapital = enemyCities.find(c => c.isCapital);

    // If we know a capital, IGNORE all other cities.
    // If we don't know a capital, use closest enemy city as a waypoint to find it.
    // If no enemy cities known, explore.
    let targetCity = knownCapital;
    if (!targetCity && enemyCities.length > 0) {
        // No capital known, target closest enemy city as waypoint
        // But do NOT prioritize it over finding the capital if we see one later
        targetCity = enemyCities[0];
    }

    if (!targetCity) {
        // No targets? Explore!
        // Use existing auto-explore logic or move towards center?
        // For now, let's just move towards the nearest unknown tile or enemy unit
        console.info(`[AI Titan] ${playerId} Titan has no known targets - hunting...`);
        // Fallback to simple unit hunting if no cities
        const nearestEnemy = next.units.find(u =>
            warEnemies.some(e => e.id === u.ownerId) &&
            hexDistance(u.coord, titans[0].coord) < 10
        );

        if (nearestEnemy) {
            // Hunt units if no cities
            // Logic below handles unit attacks, so we just let it fall through
        } else {
            // Truly nothing known. Move randomly/explore.
            // We'll rely on the default "move to random neighbor" if no path found below
        }
    }

    for (const titan of titans) {
        let liveTitan = next.units.find(u => u.id === titan.id);
        if (!liveTitan) continue;

        let safety = 0;
        while (safety < 5 && liveTitan && liveTitan.movesLeft > 0) {
            safety++;

            // 1. Check for immediate capture of TARGET ONLY
            if (targetCity && targetCity.hp <= 0 && hexDistance(liveTitan.coord, targetCity.coord) === 1) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: liveTitan.id,
                    to: targetCity.coord
                });
                if (moveResult !== next) {
                    console.info(`[AI Titan] ${playerId} Titan capturing ${targetCity.name}!`);
                    next = moveResult;
                    liveTitan = next.units.find(u => u.id === titan.id);
                    break;
                }
            }

            // 2. Move towards TARGET
            if (targetCity) {
                // If we are adjacent to the target city, attack it!
                if (hexDistance(liveTitan.coord, targetCity.coord) <= UNITS[UnitType.Titan].rng) {
                    // Attack logic handled below
                } else {
                    // Move towards it
                    const path = findPath(liveTitan.coord, targetCity.coord, liveTitan, next);
                    if (path && path.length > 0) {
                        // Move one step
                        const nextStep = path[0];
                        const moveResult = tryAction(next, {
                            type: "MoveUnit",
                            playerId,
                            unitId: liveTitan.id,
                            to: nextStep
                        });
                        if (moveResult !== next) {
                            next = moveResult;
                            liveTitan = next.units.find(u => u.id === titan.id);
                            // Continue loop to attack or move again
                            continue;
                        }
                    }
                }
            }

            if (!liveTitan || liveTitan.movesLeft <= 0) break;

            if (!liveTitan.hasAttacked) {
                // 3. Attack Logic - STRICTLY TARGET FOCUSED
                // Only attack the target city OR units blocking us.
                // Do NOT attack random cities unless they are the target.

                let attackTargetId: string | undefined;
                let targetType: "Unit" | "City" = "Unit";

                // A. Priority: Target City
                if (targetCity && targetCity.hp > 0 && hexDistance(liveTitan.coord, targetCity.coord) <= UNITS[UnitType.Titan].rng) {
                    attackTargetId = targetCity.id;
                    targetType = "City";
                }

                // B. Secondary: Units in range (Self-defense / Clearing path)
                if (!attackTargetId) {
                    const enemyUnit = next.units.find(u =>
                        warEnemies.some(e => e.id === u.ownerId) &&
                        hexDistance(u.coord, liveTitan!.coord) <= UNITS[UnitType.Titan].rng
                    );
                    if (enemyUnit) {
                        attackTargetId = enemyUnit.id;
                        targetType = "Unit";
                    }
                }

                if (attackTargetId) {
                    const attackResult = tryAction(next, {
                        type: "Attack",
                        playerId,
                        attackerId: liveTitan.id,
                        targetId: attackTargetId,
                        targetType
                    });
                    if (attackResult !== next) {
                        console.info(`[AI Titan] ${playerId} Titan attacking ${targetType} ${attackTargetId}`);
                        next = attackResult;
                        liveTitan = next.units.find(u => u.id === titan.id);

                        // If we killed a city (0 HP), capture logic will handle it next loop
                        continue;
                    }
                }

                // If we have moves left but no target and no attack, break to prevent infinite loop
                break;
            }

            // If we did nothing this loop, break
            break;
        }
    }

    return next;
}
