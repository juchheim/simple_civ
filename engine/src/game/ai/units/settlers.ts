import { aiLog, aiInfo } from "../debug-logging.js";
import { hexDistance, hexEquals, hexSpiral, getNeighbors, hexToString } from "../../../core/hex.js";
import {
    DiplomacyState,
    GameState,
    TerrainType,
    UnitType
} from "../../../core/types.js";
import {
    CITY_NAMES,
    TERRAIN,
    UNITS
} from "../../../core/constants.js";
import { getMinimumCityDistance } from "../../rules.js";
import { scoreCitySite } from "../../ai-heuristics.js";
import { tryAction } from "../shared/actions.js";
import { sortByDistance } from "../shared/metrics.js";
import { findPath } from "../../helpers/pathfinding.js";
import { getPersonalityForPlayer } from "../personality.js";

function validCityTile(tile: any, state: GameState, playerId: string): boolean {
    if (!tile) return false;
    if (tile.hasCityCenter) return false;
    if (tile.ownerId) return false;
    const terrain = tile.terrain as TerrainType;
    if (!TERRAIN[terrain].workable) return false;
    if (terrain === TerrainType.Coast || terrain === TerrainType.DeepSea) return false;

    const MIN_CITY_DISTANCE = getMinimumCityDistance(state, playerId);
    for (const city of state.cities) {
        const distance = hexDistance(tile.coord, city.coord);
        if (distance < MIN_CITY_DISTANCE) {
            return false;
        }
    }

    return true;
}

function settleHereIsBest(tile: any, state: GameState, playerId: string): boolean {
    const personality = getPersonalityForPlayer(state, playerId);
    const currentScore = scoreCitySite(tile, state, playerId, personality);
    const neighborScores = getNeighbors(tile.coord)
        .map(c => state.map.tiles.find(t => hexEquals(t.coord, c)))
        .filter((t): t is any => !!t && validCityTile(t, state, playerId))
        .map(t => scoreCitySite(t, state, playerId, personality));
    const bestNeighbor = neighborScores.length ? Math.max(...neighborScores) : -Infinity;
    return currentScore >= bestNeighbor - 1;
}

function assessSettlerSafety(
    settlerCoord: { q: number; r: number },
    playerId: string,
    state: GameState
): { isSafe: boolean; needsEscort: boolean; threatLevel: "none" | "low" | "high" } {
    const ownedCities = state.cities.filter(c => c.ownerId === playerId);
    const isInFriendlyBorders = ownedCities.some(city =>
        hexDistance(settlerCoord, city.coord) <= 2
    );

    const potentialThreats = state.players
        .filter(p => p.id !== playerId && !p.isEliminated)
        .map(p => p.id);

    // Check for enemies within a wider range (5 tiles)
    const nearbyEnemyMilitary = state.units.filter(u =>
        potentialThreats.includes(u.ownerId) &&
        UNITS[u.type].domain !== "Civilian" &&
        u.type !== UnitType.Scout && // v1.0 Fix: Ignore scouts so settlers don't freeze
        u.type !== UnitType.ArmyScout &&
        hexDistance(settlerCoord, u.coord) <= 3 // v1.0 Fix: Reduced from 5 to 3
    );

    const warEnemies = state.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);

    const warEnemyUnitsNearby = nearbyEnemyMilitary.filter(u =>
        warEnemies.includes(u.ownerId)
    );

    // Determine threat level
    let threatLevel: "none" | "low" | "high" = "none";

    if (warEnemyUnitsNearby.length > 0) {
        threatLevel = "high";
    } else if (nearbyEnemyMilitary.length > 0) {
        threatLevel = "low";
    } else if (!isInFriendlyBorders) {
        // v0.99 Update: Treat "Outside Friendly Borders" as inherently risky (Fog of War)
        // This forces settlers to wait for escorts before venturing into the unknown
        // v1.0 Tuning: Relax this for the first expansion to prevent early game stagnation
        // v0.99 Tuning: Relaxed from 2 to 4 cities to prevent early stagnation
        if (ownedCities.length < 4) {
            threatLevel = "none";
        } else {
            threatLevel = "low";
        }
    }

    const needsEscort = !isInFriendlyBorders || nearbyEnemyMilitary.length > 0;
    const isSafe = threatLevel === "none";

    return { isSafe, needsEscort, threatLevel };
}

function detectNearbyDanger(
    settlerCoord: { q: number; r: number },
    playerId: string,
    state: GameState
): { coord: { q: number; r: number }; distance: number; isWarEnemy: boolean } | null {
    const allOtherPlayers = state.players
        .filter(p => p.id !== playerId && !p.isEliminated)
        .map(p => p.id);

    const warEnemies = state.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);

    const nearbyEnemies = state.units
        .filter(u =>
            allOtherPlayers.includes(u.ownerId) &&
            UNITS[u.type].domain !== "Civilian"
        )
        .map(u => ({
            coord: u.coord,
            distance: hexDistance(settlerCoord, u.coord),
            isWarEnemy: warEnemies.includes(u.ownerId)
        }))
        .filter(({ distance }) => distance <= 3) // v1.0 Fix: Reduced from 5 to 3
        .sort((a, b) => {
            if (a.isWarEnemy !== b.isWarEnemy) return a.isWarEnemy ? -1 : 1;
            return a.distance - b.distance;
        });

    return nearbyEnemies.length > 0 ? nearbyEnemies[0] : null;
}

function hasLinkedEscort(state: GameState, settler: any): boolean {
    const linkedEscort = settler.linkedUnitId
        ? state.units.find(u => u.id === settler.linkedUnitId)
        : null;
    return !!(linkedEscort && hexEquals(linkedEscort.coord, settler.coord));
}

function hasNearbyEscort(state: GameState, settler: any, playerId: string, linkedEscortPresent: boolean): boolean {
    return linkedEscortPresent || state.units.some(u =>
        u.ownerId === playerId &&
        u.id !== settler.id &&
        UNITS[u.type].domain !== "Civilian" &&
        hexDistance(u.coord, settler.coord) <= 1 &&
        u.movesLeft > 0
    );
}

function tryFoundCityAt(
    next: GameState,
    playerId: string,
    settler: any
): { state: GameState; founded: boolean } {
    const currentTile = next.map.tiles.find(t => hexEquals(t.coord, settler.coord));
    if (!currentTile) return { state: next, founded: false };

    if (validCityTile(currentTile, next, playerId) && settleHereIsBest(currentTile, next, playerId)) {
        const player = next.players.find(p => p.id === playerId);
        const civNames = player ? CITY_NAMES[player.civName] : [];
        const usedNames = new Set(next.cities.map(c => c.name));
        const name = civNames?.find(n => !usedNames.has(n)) ?? `AI City ${next.cities.length + 1}`;

        const afterFound = tryAction(next, { type: "FoundCity", playerId, unitId: settler.id, name });
        if (afterFound !== next) {
            aiInfo(`[AI Found] ${playerId} founded ${name} at ${hexToString(settler.coord)}`);
            return { state: afterFound, founded: true };
        }
    }
    return { state: next, founded: false };
}

function tryFoundCityAfterMove(
    next: GameState,
    playerId: string,
    settlerId: string
): GameState {
    const updatedSettler = next.units.find(u => u.id === settlerId);
    if (!updatedSettler || updatedSettler.type !== UnitType.Settler) return next;

    const currentTile = next.map.tiles.find(t => hexEquals(t.coord, updatedSettler.coord));
    if (currentTile && validCityTile(currentTile, next, playerId) && settleHereIsBest(currentTile, next, playerId)) {
        const player = next.players.find(p => p.id === playerId);
        const civNames = player ? CITY_NAMES[player.civName] : [];
        const usedNames = new Set(next.cities.map(c => c.name));
        const name = civNames?.find(n => !usedNames.has(n)) ?? `AI City ${next.cities.length + 1}`;

        const after = tryAction(next, { type: "FoundCity", playerId, unitId: updatedSettler.id, name });
        if (after !== next) {
            aiInfo(`[AI Found] ${playerId} founded ${name} at ${hexToString(updatedSettler.coord)}`);
            return after;
        } else {
            aiInfo(`[AI Found Fail] ${playerId} could not found at ${hexToString(updatedSettler.coord)}`);
        }
    }
    return next;
}

function attemptRetreatFromDanger(
    next: GameState,
    playerId: string,
    settler: any,
    safety: { threatLevel: "none" | "low" | "high" },
    myCities: any[],
    hasAdjacentEscort: boolean
): { state: GameState; retreated: boolean } {
    const danger = detectNearbyDanger(settler.coord, playerId, next);
    if (!danger) return { state: next, retreated: false };

    const neighbors = getNeighbors(settler.coord);

    const allNearbyEnemies = next.units
        .filter(u => u.ownerId !== playerId && UNITS[u.type].domain !== "Civilian")
        .map(u => ({ coord: u.coord, distance: hexDistance(settler.coord, u.coord) }))
        .filter(e => e.distance <= 4);

    const neighborsWithSafety = neighbors
        .map(coord => {
            const escortStaysClose = hasAdjacentEscort ? next.units.some(u =>
                u.ownerId === playerId &&
                u.id !== settler.id &&
                UNITS[u.type].domain !== "Civilian" &&
                hexDistance(u.coord, coord) <= 2
            ) : true;

            let retreatScore = 0;
            if (myCities.length > 0) {
                const distToCity = Math.min(...myCities.map(c => hexDistance(coord, c.coord)));
                retreatScore = -distToCity;
            }

            let totalThreatScore = 0;
            for (const enemy of allNearbyEnemies) {
                const distFromEnemy = hexDistance(coord, enemy.coord);
                if (distFromEnemy <= 1) {
                    totalThreatScore += 10;
                } else if (distFromEnemy <= 2) {
                    totalThreatScore += 3;
                } else if (distFromEnemy <= 3) {
                    totalThreatScore += 1;
                }
            }

            return {
                coord,
                distanceFromThreat: hexDistance(coord, danger.coord),
                escortStaysClose,
                retreatScore,
                totalThreatScore
            };
        })
        .sort((a, b) => {
            if (a.totalThreatScore !== b.totalThreatScore) {
                return a.totalThreatScore - b.totalThreatScore;
            }
            if (a.escortStaysClose !== b.escortStaysClose) {
                return a.escortStaysClose ? -1 : 1;
            }
            const scoreA = a.distanceFromThreat * 2 + a.retreatScore;
            const scoreB = b.distanceFromThreat * 2 + b.retreatScore;
            return scoreB - scoreA;
        });

    for (const neighbor of neighborsWithSafety) {
        if (settler.linkedUnitId) {
            const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, neighbor.coord));
            const hasMilitary = unitsOnTarget.some(u => UNITS[u.type].domain !== "Civilian");
            if (hasMilitary) continue;
        }

        const moveResult = tryAction(next, {
            type: "MoveUnit",
            playerId,
            unitId: settler.id,
            to: neighbor.coord
        });
        if (moveResult !== next) {
            return {
                state: moveResult,
                retreated: true
            };
        }
    }

    return { state: next, retreated: false };
}

function findPotentialSites(
    next: GameState,
    settler: any,
    playerId: string,
    personality: any,
    searchRadius: number
) {
    const nearbyCoords = hexSpiral(settler.coord, searchRadius);
    return nearbyCoords
        .map(coord => ({ coord, tile: next.map.tiles.find(t => hexEquals(t.coord, coord)) }))
        .filter(({ coord, tile }) =>
            tile &&
            validCityTile(tile, next, playerId) &&
            !hexEquals(coord, settler.coord)
        )
        .map(({ coord, tile }) => ({
            coord,
            tile,
            score: tile ? scoreCitySite(tile, next, playerId, personality) : -Infinity,
            distance: hexDistance(settler.coord, coord)
        }))
        .sort((a, b) => {
            if (Math.abs(a.score - b.score) > 1) {
                return b.score - a.score;
            }
            return a.distance - b.distance;
        });
}

function tryMoveTowardSite(
    next: GameState,
    playerId: string,
    settler: any,
    siteCoord: { q: number; r: number }
): { state: GameState; moved: boolean } {
    const neighbors = getNeighbors(settler.coord);
    const neighborsWithDistance = sortByDistance(siteCoord, neighbors, coord => coord);
    for (const neighbor of neighborsWithDistance) {
        if (settler.linkedUnitId) {
            const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, neighbor));
            const hasMilitary = unitsOnTarget.some(u => UNITS[u.type].domain !== "Civilian");
            if (hasMilitary) continue;
        }

        const moveResult = tryAction(next, {
            type: "MoveUnit",
            playerId,
            unitId: settler.id,
            to: neighbor
        });
        if (moveResult !== next) {
            return { state: moveResult, moved: true };
        }
    }
    return { state: next, moved: false };
}

function moveTowardBestNeighboringSite(
    next: GameState,
    playerId: string,
    settler: any,
    personality: any
): GameState {
    const neighborOptions = getNeighbors(settler.coord)
        .map(coord => ({ coord, tile: next.map.tiles.find(t => hexEquals(t.coord, coord)) }))
        .filter(({ tile }) => tile && validCityTile(tile, next, playerId));
    const scored = neighborOptions
        .map(({ coord, tile }) => ({
            coord,
            score: tile ? scoreCitySite(tile, next, playerId, personality) : -Infinity,
        }))
        .sort((a, b) => b.score - a.score);

    for (const candidate of scored) {
        if (settler.linkedUnitId) {
            const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, candidate.coord));
            const hasMilitary = unitsOnTarget.some(u => UNITS[u.type].domain !== "Civilian");
            if (hasMilitary) continue;
        }

        const moveResult = tryAction(next, { type: "MoveUnit", playerId, unitId: settler.id, to: candidate.coord });
        if (moveResult !== next) {
            return moveResult;
        }
    }
    return next;
}

export function moveSettlersAndFound(state: GameState, playerId: string): GameState {
    let next = state;
    const personality = getPersonalityForPlayer(next, playerId);
    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);

    // Find nearest friendly city for retreat logic
    const myCities = next.cities.filter(c => c.ownerId === playerId);

    for (const settler of settlers) {
        const liveSettler = next.units.find(u => u.id === settler.id);
        if (!liveSettler) continue;

        const currentTile = next.map.tiles.find(t => hexEquals(t.coord, liveSettler.coord));
        if (!currentTile) continue;

        const safety = assessSettlerSafety(liveSettler.coord, playerId, next);

        const hasLinkedEscortFlag = hasLinkedEscort(next, liveSettler);
        const hasAdjacentEscort = hasNearbyEscort(next, liveSettler, playerId, hasLinkedEscortFlag);

        // Safety Check: Wait for escort if threatened or outside borders
        if (safety.threatLevel !== "none" && !hasLinkedEscortFlag && !hasAdjacentEscort) {
            // If we are in danger and have no escort, we should RETREAT, not just wait.
            // Waiting just makes us a sitting duck.
            const danger = detectNearbyDanger(liveSettler.coord, playerId, next);
            if (danger) {
                // Active retreat logic handled below
            } else {
                // No visible danger, but we are "unsafe" (e.g. outside borders).
                // Wait for escort.
                aiInfo(`[AI Settler] ${playerId} settler at ${hexToString(liveSettler.coord)} waiting for escort (${safety.threatLevel} threat, no escort)`);
                continue;
            }
        }

        if (safety.threatLevel === "high" && !hasLinkedEscortFlag) {
            aiInfo(`[AI Settler] ${playerId} settler at ${hexToString(liveSettler.coord)} waiting for linked escort (high threat)`);
            continue;
        }

        const retreatAttempt = attemptRetreatFromDanger(next, playerId, liveSettler, safety, myCities, hasAdjacentEscort);
        next = retreatAttempt.state;
        if (retreatAttempt.retreated) continue;

        if (liveSettler.type !== UnitType.Settler) continue;

        const currentFound = tryFoundCityAt(next, playerId, liveSettler);
        next = currentFound.state;
        if (currentFound.founded) continue;

        const searchRadius = 9; // v0.99 Tuning: Increased from 6 to 9 to find better spots
        const potentialSites = findPotentialSites(next, liveSettler, playerId, personality, searchRadius);

        let moved = false;
        for (const site of potentialSites) {
            const towardSite = tryMoveTowardSite(next, playerId, liveSettler, site.coord);
            next = towardSite.state;
            moved = towardSite.moved;

            if (moved) break;
        }

        if (!moved) {
            next = moveTowardBestNeighboringSite(next, playerId, liveSettler, personality);
        }

        next = tryFoundCityAfterMove(next, playerId, settler.id);
    }
    return next;
}

export function manageSettlerEscorts(state: GameState, playerId: string): GameState {
    let next = state;

    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);

    const settlersWithSafety = settlers.map(settler => ({
        settler,
        safety: assessSettlerSafety(settler.coord, playerId, next)
    }));

    const sortedSettlers = settlersWithSafety.sort((a, b) => {
        const threatOrder = { high: 0, low: 1, none: 2 };
        return threatOrder[a.safety.threatLevel] - threatOrder[b.safety.threatLevel];
    });

    const garrisonedCities = new Set(
        next.cities.filter(c => c.ownerId === playerId).map(c => hexToString(c.coord))
    );

    const militaryUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        u.movesLeft > 0 &&
        !u.linkedUnitId
    );

    const nonGarrisonUnits = militaryUnits.filter(u => !garrisonedCities.has(hexToString(u.coord)));
    const garrisonUnits = militaryUnits.filter(u => garrisonedCities.has(hexToString(u.coord)));

    const escortAssignments = new Map<string, string>();

    for (const { settler: staleSettler, safety } of sortedSettlers) {
        const settler = next.units.find(u => u.id === staleSettler.id);
        if (!settler) continue;
        if (settler.linkedUnitId) {
            const linkedEscort = next.units.find(u => u.id === settler.linkedUnitId);
            if (linkedEscort && hexEquals(linkedEscort.coord, settler.coord)) {
                continue;
            }
        }

        const adjacentEscort = next.units.find(u =>
            u.ownerId === playerId &&
            u.id !== settler.id &&
            UNITS[u.type].domain !== "Civilian" &&
            UNITS[u.type].move > 0 &&  // v5.2: Exclude immobile units like Bulwark
            hexEquals(u.coord, settler.coord) &&
            !u.linkedUnitId
        );

        if (adjacentEscort && !settler.linkedUnitId && !adjacentEscort.linkedUnitId) {
            if (hexEquals(adjacentEscort.coord, settler.coord)) {
                if (adjacentEscort.id === settler.id) {
                    console.error(`[AI Escort Error] Attempted to link unit ${adjacentEscort.id} to itself`);
                    continue;
                }
                const linkResult = tryAction(next, {
                    type: "LinkUnits",
                    playerId,
                    unitId: adjacentEscort.id,
                    partnerId: settler.id
                });
                if (linkResult !== next) {
                    next = linkResult;
                    aiInfo(`[AI Escort] ${playerId} linked ${adjacentEscort.type} to settler at ${hexToString(settler.coord)}`);
                    continue;
                }
            }
        }

        const nearbyEscort = next.units.find(u =>
            u.ownerId === playerId &&
            u.id !== settler.id &&
            UNITS[u.type].domain !== "Civilian" &&
            hexDistance(u.coord, settler.coord) === 1 &&
            u.movesLeft > 0 &&
            !u.linkedUnitId
        );

        if (nearbyEscort) {
            const moveResult = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: nearbyEscort.id,
                to: settler.coord
            });
            if (moveResult !== next) {
                next = moveResult;
                const liveEscort = next.units.find(u => u.id === nearbyEscort.id);
                const liveSettler = next.units.find(u => u.id === settler.id);
                if (liveEscort && liveSettler && hexEquals(liveEscort.coord, liveSettler.coord) &&
                    !liveEscort.linkedUnitId && !liveSettler.linkedUnitId) {
                    if (hexEquals(liveEscort.coord, liveSettler.coord)) {
                        if (liveEscort.id === liveSettler.id) {
                            console.error(`[AI Escort Error] Attempted to link unit ${liveEscort.id} to itself`);
                        } else {
                            const linkResult = tryAction(next, {
                                type: "LinkUnits",
                                playerId,
                                unitId: liveEscort.id,
                                partnerId: liveSettler.id
                            });
                            if (linkResult !== next) {
                                next = linkResult;
                                aiInfo(`[AI Escort] ${playerId} linked ${liveEscort.type} to settler at ${hexToString(liveSettler.coord)}`);
                            }
                        }
                    }
                }
                continue;
            }
        }

        const availableUnits = nonGarrisonUnits.filter(u => !escortAssignments.has(u.id));

        // v1.1: REMOVED garrison fallback - never pull garrisons to escort settlers
        // If no non-garrison units are available, settler must wait

        if (availableUnits.length === 0) continue;

        const scoredUnits = availableUnits.map(u => ({
            unit: u,
            score: -hexDistance(settler.coord, u.coord) + UNITS[u.type].move
        })).sort((a, b) => b.score - a.score);

        if (scoredUnits.length > 0) {
            escortAssignments.set(scoredUnits[0].unit.id, settler.id);
        }
    }

    for (const [escortId, settlerId] of escortAssignments.entries()) {
        const escort = next.units.find(u => u.id === escortId);
        const settler = next.units.find(u => u.id === settlerId);

        if (!escort || !settler || escort.movesLeft <= 0) continue;

        const distance = hexDistance(escort.coord, settler.coord);

        if (distance === 0) {
            if (!escort.linkedUnitId && !settler.linkedUnitId) {
                if (hexEquals(escort.coord, settler.coord)) {
                    if (escort.id === settler.id) {
                        console.error(`[AI Escort Error] Attempted to link unit ${escort.id} to itself`);
                    } else {
                        const linkResult = tryAction(next, {
                            type: "LinkUnits",
                            playerId,
                            unitId: escort.id,
                            partnerId: settler.id
                        });
                        if (linkResult !== next) {
                            next = linkResult;
                            aiInfo(`[AI Escort] ${playerId} linked ${escort.type} to settler at ${hexToString(settler.coord)}`);
                        }
                    }
                }
            }
            continue;
        }

        const path = findPath(escort.coord, settler.coord, escort, next);
        let moved = false;

        if (path.length > 0) {
            // Check for stacking violation
            const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, path[0]));
            const hasMilitary = unitsOnTarget.some(u => UNITS[u.type].domain !== "Civilian");

            if (!hasMilitary) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: escort.id,
                    to: path[0]
                });
                if (moveResult !== next) {
                    next = moveResult;
                    moved = true;
                    const liveEscort = next.units.find(u => u.id === escort.id);
                    const liveSettler = next.units.find(u => u.id === settler.id);
                    if (liveEscort && liveSettler && hexEquals(liveEscort.coord, liveSettler.coord) &&
                        !liveEscort.linkedUnitId && !liveSettler.linkedUnitId) {
                        if (hexEquals(liveEscort.coord, liveSettler.coord)) {
                            if (liveEscort.id === liveSettler.id) {
                                console.error(`[AI Escort Error] Attempted to link unit ${liveEscort.id} to itself`);
                            } else {
                                const linkResult = tryAction(next, {
                                    type: "LinkUnits",
                                    playerId,
                                    unitId: liveEscort.id,
                                    partnerId: liveSettler.id
                                });
                                if (linkResult !== next) {
                                    next = linkResult;
                                    aiInfo(`[AI Escort] ${playerId} linked ${liveEscort.type} to settler at ${hexToString(liveSettler.coord)}`);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!moved) {
            const neighbors = getNeighbors(escort.coord);
            const neighborsWithDistance = sortByDistance(
                settler.coord,
                neighbors,
                coord => coord
            );

            for (const neighbor of neighborsWithDistance) {
                // Check for stacking violation
                const unitsOnTarget = next.units.filter(u => hexEquals(u.coord, neighbor));
                const hasMilitary = unitsOnTarget.some(u => UNITS[u.type].domain !== "Civilian");
                if (hasMilitary) continue;

                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: escort.id,
                    to: neighbor
                });
                if (moveResult !== next) {
                    next = moveResult;
                    break;
                }
            }
        }
    }

    return next;
}
