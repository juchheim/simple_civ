import { hexDistance, hexEquals, hexSpiral, getNeighbors } from "../../core/hex.js";
import {
    DiplomacyState,
    GameState,
    TerrainType,
    UnitType,
} from "../../core/types.js";
import { UNITS, TERRAIN } from "../../core/constants.js";
import { scoreCitySite } from "../ai-heuristics.js";
import { tryAction } from "./shared/actions.js";
import { nearestByDistance, sortByDistance } from "./shared/metrics.js";

function validCityTile(tile: any): boolean {
    if (!tile) return false;
    if (tile.hasCityCenter) return false;
    const terrain = tile.terrain as TerrainType;
    return (
        TERRAIN[terrain].workable &&
        terrain !== TerrainType.Coast &&
        terrain !== TerrainType.DeepSea
    );
}

function settleHereIsBest(tile: any, state: GameState, playerId: string): boolean {
    const currentScore = scoreCitySite(tile, state, playerId);
    const neighborScores = getNeighbors(tile.coord)
        .map(c => state.map.tiles.find(t => hexEquals(t.coord, c)))
        .filter((t): t is any => !!t && validCityTile(t))
        .map(t => scoreCitySite(t, state, playerId));
    const bestNeighbor = neighborScores.length ? Math.max(...neighborScores) : -Infinity;
    return currentScore >= bestNeighbor - 1;
}

function assessSettlerSafety(
    settlerCoord: { q: number; r: number },
    playerId: string,
    state: GameState
): { isSafe: boolean; needsEscort: boolean } {
    const ownedCities = state.cities.filter(c => c.ownerId === playerId);
    const isInFriendlyBorders = ownedCities.some(city =>
        hexDistance(settlerCoord, city.coord) <= 2
    );

    const warEnemies = state.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);

    const enemiesWithin3 = warEnemies.length > 0 && state.units
        .filter(u => warEnemies.includes(u.ownerId))
        .some(u => hexDistance(settlerCoord, u.coord) <= 3);

    const isSafe = isInFriendlyBorders && !enemiesWithin3;

    const enemiesWithin5 = warEnemies.length > 0 && state.units
        .filter(u => warEnemies.includes(u.ownerId))
        .some(u => hexDistance(settlerCoord, u.coord) <= 5);

    const needsEscort = !isInFriendlyBorders || enemiesWithin5;

    return { isSafe, needsEscort };
}

function detectNearbyDanger(
    settlerCoord: { q: number; r: number },
    playerId: string,
    state: GameState
): { coord: { q: number; r: number }; distance: number } | null {
    const warEnemies = state.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);

    if (warEnemies.length === 0) return null;

    const nearbyEnemies = state.units
        .filter(u => warEnemies.includes(u.ownerId))
        .map(u => ({ coord: u.coord, distance: hexDistance(settlerCoord, u.coord) }))
        .filter(({ distance }) => distance <= 3)
        .sort((a, b) => a.distance - b.distance);

    return nearbyEnemies.length > 0 ? nearbyEnemies[0] : null;
}

export function moveSettlersAndFound(state: GameState, playerId: string): GameState {
    let next = state;
    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);
    for (const settler of settlers) {
        const liveSettler = next.units.find(u => u.id === settler.id);
        if (!liveSettler) continue;

        let currentTile = next.map.tiles.find(t => hexEquals(t.coord, liveSettler.coord));
        if (!currentTile) continue;

        const danger = detectNearbyDanger(liveSettler.coord, playerId, next);
        if (danger) {
            const neighbors = getNeighbors(liveSettler.coord);
            const neighborsWithSafety = neighbors
                .map(coord => ({
                    coord,
                    distanceFromThreat: hexDistance(coord, danger.coord)
                }))
                .sort((a, b) => b.distanceFromThreat - a.distanceFromThreat);

            let escaped = false;
            for (const neighbor of neighborsWithSafety) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: liveSettler.id,
                    to: neighbor.coord
                });
                if (moveResult !== next) {
                    next = moveResult;
                    escaped = true;
                    break;
                }
            }

            if (escaped) continue;
        }

        if (validCityTile(currentTile) && settleHereIsBest(currentTile, next, playerId)) {
            const name = `AI City ${next.cities.length + 1}`;
            const afterFound = tryAction(next, { type: "FoundCity", playerId, unitId: liveSettler.id, name });
            if (afterFound !== next) {
                next = afterFound;
                continue;
            }
        }

        const searchRadius = 8;
        const nearbyCoords = hexSpiral(liveSettler.coord, searchRadius);
        const potentialSites = nearbyCoords
            .map(coord => ({ coord, tile: next.map.tiles.find(t => hexEquals(t.coord, coord)) }))
            .filter(({ coord, tile }) =>
                tile &&
                validCityTile(tile) &&
                !hexEquals(coord, liveSettler.coord)
            )
            .map(({ coord, tile }) => ({
                coord,
                tile,
                score: tile ? scoreCitySite(tile, next, playerId) : -Infinity,
                distance: hexDistance(liveSettler.coord, coord)
            }))
            .sort((a, b) => {
                if (Math.abs(a.score - b.score) > 0.1) {
                    return b.score - a.score;
                }
                return a.distance - b.distance;
            });

        let moved = false;
        for (const site of potentialSites) {
            const neighbors = getNeighbors(liveSettler.coord);
            const neighborsWithDistance = sortByDistance(site.coord, neighbors, coord => coord);
            for (const neighbor of neighborsWithDistance) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: liveSettler.id,
                    to: neighbor
                });
                if (moveResult !== next) {
                    next = moveResult;
                    moved = true;
                    break;
                }
            }

            if (moved) break;
        }

        if (!moved) {
            const neighborOptions = getNeighbors(liveSettler.coord)
                .map(coord => ({ coord, tile: next.map.tiles.find(t => hexEquals(t.coord, coord)) }))
                .filter(({ tile }) => tile && validCityTile(tile));
            const scored = neighborOptions
                .map(({ coord, tile }) => ({
                    coord,
                    score: tile ? scoreCitySite(tile, next, playerId) : -Infinity,
                }))
                .sort((a, b) => b.score - a.score);

            for (const candidate of scored) {
                const moveResult = tryAction(next, { type: "MoveUnit", playerId, unitId: liveSettler.id, to: candidate.coord });
                if (moveResult !== next) {
                    next = moveResult;
                    break;
                }
            }
        }

        const updatedSettler = next.units.find(u => u.id === settler.id);
        if (!updatedSettler) continue;

        currentTile = next.map.tiles.find(t => hexEquals(t.coord, updatedSettler.coord));
        if (currentTile && validCityTile(currentTile) && settleHereIsBest(currentTile, next, playerId)) {
            const name = `AI City ${next.cities.length + 1}`;
            next = tryAction(next, { type: "FoundCity", playerId, unitId: updatedSettler.id, name });
        }
    }
    return next;
}

function captureIfPossible(state: GameState, playerId: string, unitId: string): GameState {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return state;
    const stats = UNITS[unit.type];
    if (!stats.canCaptureCity || stats.domain === "Civilian") return state;

    const adjCities = state.cities.filter(
        c => c.ownerId !== playerId && hexDistance(c.coord, unit.coord) === 1 && c.hp <= 0
    );
    for (const city of adjCities) {
        const moved = tryAction(state, { type: "MoveUnit", playerId, unitId: unit.id, to: city.coord });
        if (moved !== state) return moved;
    }
    return state;
}

export function manageSettlerEscorts(state: GameState, playerId: string): GameState {
    let next = state;

    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);
    const settlersNeedingEscorts = settlers
        .map(settler => ({
            settler,
            safety: assessSettlerSafety(settler.coord, playerId, next)
        }))
        .filter(({ safety }) => safety.needsEscort);

    if (settlersNeedingEscorts.length === 0) return next;

    const militaryUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        u.movesLeft > 0
    );

    const escortAssignments = new Map<string, string>();

    for (const { settler } of settlersNeedingEscorts) {
        const availableUnits = militaryUnits.filter(u => !escortAssignments.has(u.id));
        if (availableUnits.length === 0) break;

        const closestUnit = nearestByDistance(
            settler.coord,
            availableUnits,
            unit => unit.coord
        );

        if (closestUnit) {
            escortAssignments.set(closestUnit.id, settler.id);
        }
    }

    for (const [escortId, settlerId] of escortAssignments.entries()) {
        const escort = next.units.find(u => u.id === escortId);
        const settler = next.units.find(u => u.id === settlerId);

        if (!escort || !settler || escort.movesLeft <= 0) continue;

        const distance = hexDistance(escort.coord, settler.coord);

        if (distance <= 2) {
            continue;
        }

        const neighbors = getNeighbors(escort.coord);
        const neighborsWithDistance = sortByDistance(
            settler.coord,
            neighbors,
            coord => coord
        );

        for (const neighbor of neighborsWithDistance) {
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

    return next;
}

export function attackTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const units = next.units.filter(u => u.ownerId === playerId && u.type !== UnitType.Settler);
    for (const unit of units) {
        const stats = UNITS[unit.type];
        if (unit.hasAttacked) continue;

        const cityTargets = next.cities
            .filter(c => c.ownerId !== playerId && hexDistance(c.coord, unit.coord) <= stats.rng)
            .sort((a, b) => a.hp - b.hp);
        let acted = false;
        for (const city of cityTargets) {
            const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: city.id, targetType: "City" });
            if (attacked !== next) {
                next = attacked;
                next = captureIfPossible(next, playerId, unit.id);
                acted = true;
                break;
            }
        }
        if (acted) continue;

        const enemyUnits = next.units
            .filter(u => u.ownerId !== playerId)
            .map(u => ({ u, d: hexDistance(u.coord, unit.coord) }))
            .filter(({ d }) => d <= stats.rng)
            .sort((a, b) => a.d - b.d);
        const target = enemyUnits[0];
        if (target) {
            const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: target.u.id, targetType: "Unit" });
            if (attacked !== next) {
                next = attacked;
            }
        }
    }
    return next;
}

export function moveMilitaryTowardTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const warTargets = next.players.filter(
        p => p.id !== playerId && next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War && !p.isEliminated
    );
    if (!warTargets.length) return next;

    const targetCities = next.cities.filter(c => warTargets.some(w => w.id === c.ownerId));
    const armyUnits = next.units.filter(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");

    for (const unit of armyUnits) {
        let current = unit;
        let safety = 0;
        while (safety < 3) {
            safety++;
            next = captureIfPossible(next, playerId, current.id);
            const updated = next.units.find(u => u.id === current.id);
            if (!updated) break;
            current = updated;
            if (current.movesLeft <= 0) break;

            const nearest = nearestByDistance(
                current.coord,
                targetCities,
                city => city.coord
            );
            if (!nearest) break;
            if (hexDistance(nearest.coord, current.coord) === 0) break;

            const neighbors = getNeighbors(current.coord)
                .map(coord => ({ coord, dist: hexDistance(coord, nearest.coord) }));
            const ordered = neighbors.sort((a, b) => a.dist - b.dist);
            let moved = false;
            for (const n of ordered) {
                const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: n.coord });
                if (attempt !== next) {
                    next = attempt;
                    moved = true;
                    break;
                }
            }
            if (!moved) break;
        }
    }
    return next;
}
