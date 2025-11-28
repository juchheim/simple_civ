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
    
    if (enemyCities.length === 0) {
        console.info(`[AI Titan] ${playerId} Titan has no war targets - waiting for war declaration`);
        return next;
    }
    
    for (const titan of titans) {
        let liveTitan = next.units.find(u => u.id === titan.id);
        if (!liveTitan) continue;
        
        let safety = 0;
        while (safety < 5 && liveTitan && liveTitan.movesLeft > 0) {
            safety++;
            
            const capturable = enemyCities.filter(c => c.hp <= 0);
            for (const city of capturable) {
                if (hexDistance(liveTitan.coord, city.coord) === 1) {
                    const moveResult = tryAction(next, {
                        type: "MoveUnit",
                        playerId,
                        unitId: liveTitan.id,
                        to: city.coord
                    });
                    if (moveResult !== next) {
                        console.info(`[AI Titan] ${playerId} Titan capturing ${city.name}!`);
                        next = moveResult;
                        liveTitan = next.units.find(u => u.id === titan.id);
                        break;
                    }
                }
            }
            if (!liveTitan || liveTitan.movesLeft <= 0) break;
            
            if (!liveTitan.hasAttacked) {
                const cityInRange = enemyCities.find(c => 
                    c.hp > 0 && hexDistance(liveTitan!.coord, c.coord) <= UNITS[UnitType.Titan].rng
                );
                if (cityInRange) {
                    const attackResult = tryAction(next, {
                        type: "Attack",
                        playerId,
                        attackerId: liveTitan.id,
                        targetId: cityInRange.id,
                        targetType: "City"
                    });
                    if (attackResult !== next) {
                        console.info(`[AI Titan] ${playerId} Titan attacking ${cityInRange.name} (HP: ${cityInRange.hp})`);
                        next = attackResult;
                        liveTitan = next.units.find(u => u.id === titan.id);
                        
                        const updatedCity = next.cities.find(c => c.id === cityInRange.id);
                        if (updatedCity && updatedCity.hp <= 0 && liveTitan && hexDistance(liveTitan.coord, updatedCity.coord) === 1) {
                            const captureResult = tryAction(next, {
                                type: "MoveUnit",
                                playerId,
                                unitId: liveTitan.id,
                                to: updatedCity.coord
                            });
                            if (captureResult !== next) {
                                console.info(`[AI Titan] ${playerId} Titan capturing ${updatedCity.name}!`);
                                next = captureResult;
                                liveTitan = next.units.find(u => u.id === titan.id);
                            }
                        }
                        continue;
                    }
                }
                
                const enemyUnitsNearby = next.units
                    .filter(u => 
                        warEnemies.some(e => e.id === u.ownerId) &&
                        hexDistance(u.coord, liveTitan!.coord) <= 1
                    )
                    .sort((a, b) => a.hp - b.hp);
                
                if (enemyUnitsNearby.length > 0) {
                    const target = enemyUnitsNearby[0];
                    const attackResult = tryAction(next, {
                        type: "Attack",
                        playerId,
                        attackerId: liveTitan.id,
                        targetId: target.id,
                        targetType: "Unit"
                    });
                    if (attackResult !== next) {
                        console.info(`[AI Titan] ${playerId} Titan crushing ${target.type}!`);
                        next = attackResult;
                        liveTitan = next.units.find(u => u.id === titan.id);
                        continue;
                    }
                }
            }
            
            const nearestCity = [...enemyCities]
                .map(c => ({ city: c, dist: hexDistance(liveTitan!.coord, c.coord) }))
                .sort((a, b) => {
                    if (a.city.isCapital !== b.city.isCapital) return a.city.isCapital ? -1 : 1;
                    return a.dist - b.dist;
                })[0];
            
            if (nearestCity && nearestCity.dist > 1) {
                const path = findPath(liveTitan.coord, nearestCity.city.coord, liveTitan, next);
                if (path.length > 0) {
                    const moveResult = tryAction(next, {
                        type: "MoveUnit",
                        playerId,
                        unitId: liveTitan.id,
                        to: path[0]
                    });
                    if (moveResult !== next) {
                        next = moveResult;
                        liveTitan = next.units.find(u => u.id === titan.id);
                        continue;
                    }
                }
                
                const neighbors = getNeighbors(liveTitan.coord);
                const bestNeighbor = neighbors
                    .map(coord => ({ coord, dist: hexDistance(coord, nearestCity.city.coord) }))
                    .sort((a, b) => a.dist - b.dist)[0];
                
                if (bestNeighbor) {
                    const moveResult = tryAction(next, {
                        type: "MoveUnit",
                        playerId,
                        unitId: liveTitan.id,
                        to: bestNeighbor.coord
                    });
                    if (moveResult !== next) {
                        next = moveResult;
                        liveTitan = next.units.find(u => u.id === titan.id);
                        continue;
                    }
                }
            }
            
            break;
        }
    }
    
    return next;
}
