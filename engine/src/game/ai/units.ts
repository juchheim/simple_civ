import { hexDistance, hexEquals, hexSpiral, getNeighbors, hexToString } from "../../core/hex.js";
import {
    DiplomacyState,
    GameState,
    TerrainType,
    UnitType,
    BuildingType,
    UnitState,
} from "../../core/types.js";
import {
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    DAMAGE_BASE,
    DAMAGE_MAX,
    DAMAGE_MIN,
    UNITS,
    TERRAIN,
    CITY_NAMES,
} from "../../core/constants.js";
import { scoreCitySite } from "../ai-heuristics.js";
import { tryAction } from "./shared/actions.js";
import { nearestByDistance, sortByDistance } from "./shared/metrics.js";
import { findPath } from "../helpers/pathfinding.js";
import { getEffectiveUnitStats } from "../helpers/combat.js";
import { getPersonalityForPlayer } from "./personality.js";

const primarySiegeMemory = new Map<string, string>();

function cityIsCoastal(state: GameState, city: any): boolean {
    return getNeighbors(city.coord).some(c => {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, c));
        return tile && (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea);
    });
}

function validCityTile(tile: any, state: GameState): boolean {
    if (!tile) return false;
    if (tile.hasCityCenter) return false;
    if (tile.ownerId) return false; // Tile already owned - can't found here
    const terrain = tile.terrain as TerrainType;
    if (!TERRAIN[terrain].workable) return false;
    if (terrain === TerrainType.Coast || terrain === TerrainType.DeepSea) return false;
    
    // Check minimum distance to any existing city (distance 3 minimum)
    const MIN_CITY_DISTANCE = 3;
    for (const city of state.cities) {
        const distance = hexDistance(tile.coord, city.coord);
        if (distance < MIN_CITY_DISTANCE) {
            return false; // Too close to a city
        }
    }
    
    return true;
}

function settleHereIsBest(tile: any, state: GameState, playerId: string): boolean {
    const personality = getPersonalityForPlayer(state, playerId);
    const currentScore = scoreCitySite(tile, state, playerId, personality);
    const neighborScores = getNeighbors(tile.coord)
        .map(c => state.map.tiles.find(t => hexEquals(t.coord, c)))
        .filter((t): t is any => !!t && validCityTile(t, state))
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

    // Check ALL non-allied players, not just war enemies
    // Peace can turn to war on enemy's turn - be cautious!
    const potentialThreats = state.players
        .filter(p => p.id !== playerId && !p.isEliminated)
        .map(p => p.id);

    // Any military unit within 4 tiles is a threat (they can move 2 and attack)
    const nearbyEnemyMilitary = state.units.filter(u =>
        potentialThreats.includes(u.ownerId) &&
        UNITS[u.type].domain !== "Civilian" &&
        hexDistance(settlerCoord, u.coord) <= 4
    );

    // War enemies are a high threat
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
    const threatLevel: "none" | "low" | "high" = 
        warEnemyUnitsNearby.length > 0 ? "high" :
        nearbyEnemyMilitary.length > 0 ? "low" : "none";

    // ALWAYS need escort outside friendly borders or if ANY enemy military is within 4 tiles
    const needsEscort = !isInFriendlyBorders || nearbyEnemyMilitary.length > 0;
    
    // Only safe if in friendly borders AND no war enemies nearby
    const isSafe = isInFriendlyBorders && warEnemyUnitsNearby.length === 0;

    return { isSafe, needsEscort, threatLevel };
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

function isAtWar(state: GameState, playerId: string): boolean {
    return state.players.some(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    );
}

function isScoutType(unitType: UnitType): boolean {
    return unitType === UnitType.Scout || unitType === UnitType.ArmyScout;
}

function tileDefenseScore(state: GameState, coord: { q: number; r: number }): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -99;
    return TERRAIN[tile.terrain].defenseMod ?? 0;
}

function expectedDamageToUnit(attacker: any, defender: any, state: GameState): number {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    const defenseStats = getEffectiveUnitStats(defender, state);
    let defensePower = defenseStats.def;
    const tile = state.map.tiles.find(t => hexEquals(t.coord, defender.coord));
    if (tile) {
        defensePower += TERRAIN[tile.terrain].defenseMod;
    }
    if (defender.state === UnitState.Fortified) defensePower += 1;
    const attackPower = attackerStats.atk;
    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    return Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));
}

function expectedDamageToCity(attacker: any, city: any, state: GameState): number {
    const attackerStats = getEffectiveUnitStats(attacker, state);
    let defensePower = CITY_DEFENSE_BASE + Math.floor(city.pop / 2);
    if (city.buildings?.includes(BuildingType.CityWard)) {
        defensePower += CITY_WARD_DEFENSE_BONUS;
    }
    const attackPower = attackerStats.atk;
    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    return Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));
}

function expectedDamageFrom(defender: any, attacker: any, state: GameState): number {
    return expectedDamageToUnit(defender, attacker, state);
}

function friendlyAdjacencyCount(state: GameState, playerId: string, coord: { q: number; r: number }): number {
    return getNeighbors(coord).filter(n =>
        state.units.some(u => u.ownerId === playerId && hexEquals(u.coord, n))
    ).length;
}

function enemiesWithin(state: GameState, playerId: string, coord: { q: number; r: number }, radius: number): number {
    return state.units.filter(u =>
        u.ownerId !== playerId &&
        hexDistance(u.coord, coord) <= radius
    ).length;
}

function selectPrimarySiegeCity(state: GameState, playerId: string, units: any[], warCities: any[]): any | null {
    const storedId = primarySiegeMemory.get(playerId);
    const stored = warCities.find(c => c.id === storedId);
    if (stored) return stored;

    if (!warCities.length) {
        primarySiegeMemory.delete(playerId);
        return null;
    }

    const candidate = warCities
        .map(c => ({
            city: c,
            hp: c.hp,
            dist: Math.min(...units.map(u => hexDistance(u.coord, c.coord)))
        }))
        .sort((a, b) => {
            if (a.hp !== b.hp) return a.hp - b.hp;
            return a.dist - b.dist;
        })[0].city;

    primarySiegeMemory.set(playerId, candidate.id);
    return candidate;
}

function stepToward(
    state: GameState,
    playerId: string,
    unitId: string,
    target: { q: number; r: number }
): GameState {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || unit.movesLeft <= 0) return state;

    if (hexDistance(unit.coord, target) === 1) {
        const movedDirect = tryAction(state, {
            type: "MoveUnit",
            playerId,
            unitId,
            to: target
        });
        if (movedDirect !== state) return movedDirect;
    }

    const neighbors = getNeighbors(unit.coord);
    const ordered = sortByDistance(target, neighbors, coord => coord);
    for (const neighbor of ordered) {
        const moved = tryAction(state, {
            type: "MoveUnit",
            playerId,
            unitId,
            to: neighbor
        });
        if (moved !== state) return moved;
    }

    return state;
}

export function patrolAndExplore(state: GameState, playerId: string): GameState {
    if (isAtWar(state, playerId)) return state;

    let next = state;
    const playerCities = next.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return next;

    const revealed = new Set(next.revealed[playerId] ?? []);
    const unseenTiles = next.map.tiles.filter(t => !revealed.has(hexToString(t.coord)));

    const scouts = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        isScoutType(u.type)
    );

    for (const scout of scouts) {
        const live = next.units.find(u => u.id === scout.id);
        if (!live || live.movesLeft <= 0) continue;

        const targetTile = unseenTiles.length
            ? nearestByDistance(live.coord, unseenTiles, t => t.coord)
            : null;
        if (!targetTile) continue;

        const path = findPath(live.coord, targetTile.coord, live, next);
        const step = path[0];
        if (step) {
            const provocative = next.cities.some(c =>
                c.ownerId !== playerId && hexDistance(c.coord, step) <= 1
            );
            if (provocative) continue;

            const moved = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: live.id,
                to: step
            });
            if (moved !== next) {
                next = moved;
            }
        }
    }

    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);

    const defenders = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        !isScoutType(u.type) &&
        UNITS[u.type].domain !== "Civilian"
    );

    for (const unit of defenders) {
        const live = next.units.find(u => u.id === unit.id);
        if (!live || live.movesLeft <= 0) continue;

        const onCity = next.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, live.coord));
        if (onCity) continue;

        const nearSettler = settlers.some(s => hexDistance(s.coord, live.coord) <= 2);
        if (nearSettler) continue;

        const nearestCity = nearestByDistance(live.coord, playerCities, c => c.coord);
        if (!nearestCity) continue;

        if (hexDistance(live.coord, nearestCity.coord) > 2) {
            next = stepToward(next, playerId, live.id, nearestCity.coord);
        }
    }

    return next;
}

export function moveSettlersAndFound(state: GameState, playerId: string): GameState {
    let next = state;
    const personality = getPersonalityForPlayer(next, playerId);
    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);
    for (const settler of settlers) {
        const liveSettler = next.units.find(u => u.id === settler.id);
        if (!liveSettler) continue;

        let currentTile = next.map.tiles.find(t => hexEquals(t.coord, liveSettler.coord));
        if (!currentTile) continue;

        // Check safety status using the enhanced assessment
        const safety = assessSettlerSafety(liveSettler.coord, playerId, next);
        
        // Find adjacent escort (distance 1)
        const hasAdjacentEscort = next.units.some(u =>
            u.ownerId === playerId &&
            u.id !== liveSettler.id &&
            UNITS[u.type].domain !== "Civilian" &&
            hexDistance(u.coord, liveSettler.coord) <= 1 &&
            u.movesLeft > 0
        );

        // If high threat and no adjacent escort, DON'T MOVE - wait for escort
        if (safety.threatLevel === "high" && !hasAdjacentEscort) {
            console.info(`[AI Settler] ${playerId} settler at ${hexToString(liveSettler.coord)} waiting for escort (high threat, no adjacent escort)`);
            continue;
        }

        const danger = detectNearbyDanger(liveSettler.coord, playerId, next);
        if (danger) {
            // Even when fleeing, prefer to stay with escort if possible
            const neighbors = getNeighbors(liveSettler.coord);
            const neighborsWithSafety = neighbors
                .map(coord => {
                    // Check if escort would still be adjacent after move
                    const escortStaysClose = hasAdjacentEscort ? next.units.some(u =>
                        u.ownerId === playerId &&
                        u.id !== liveSettler.id &&
                        UNITS[u.type].domain !== "Civilian" &&
                        hexDistance(u.coord, coord) <= 2
                    ) : true; // If no escort, don't factor this in
                    return {
                        coord,
                        distanceFromThreat: hexDistance(coord, danger.coord),
                        escortStaysClose
                    };
                })
                .sort((a, b) => {
                    // Prioritize: escortStaysClose > distanceFromThreat
                    if (a.escortStaysClose !== b.escortStaysClose) {
                        return a.escortStaysClose ? -1 : 1;
                    }
                    return b.distanceFromThreat - a.distanceFromThreat;
                });

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

        // Verify unit is still a settler before attempting to found
        if (liveSettler.type !== UnitType.Settler) continue;
        
        if (validCityTile(currentTile, next) && settleHereIsBest(currentTile, next, playerId)) {
            const player = next.players.find(p => p.id === playerId);
            const civNames = player ? CITY_NAMES[player.civName] : [];
            const usedNames = new Set(next.cities.map(c => c.name));
            const name = civNames?.find(n => !usedNames.has(n)) ?? `AI City ${next.cities.length + 1}`;

            const afterFound = tryAction(next, { type: "FoundCity", playerId, unitId: liveSettler.id, name });
            if (afterFound !== next) {
                console.info(`[AI Found] ${playerId} founded ${name} at ${hexToString(liveSettler.coord)}`);
                next = afterFound;
                continue;
            }
        }

        const searchRadius = 6;
        const nearbyCoords = hexSpiral(liveSettler.coord, searchRadius);
        const potentialSites = nearbyCoords
            .map(coord => ({ coord, tile: next.map.tiles.find(t => hexEquals(t.coord, coord)) }))
            .filter(({ coord, tile }) =>
                tile &&
                validCityTile(tile, next) &&
                !hexEquals(coord, liveSettler.coord)
            )
            .map(({ coord, tile }) => ({
                coord,
                tile,
                score: tile ? scoreCitySite(tile, next, playerId, personality) : -Infinity,
                distance: hexDistance(liveSettler.coord, coord)
            }))
            .sort((a, b) => {
                if (Math.abs(a.score - b.score) > 1) {
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
                .filter(({ tile }) => tile && validCityTile(tile, next));
            const scored = neighborOptions
                .map(({ coord, tile }) => ({
                    coord,
                    score: tile ? scoreCitySite(tile, next, playerId, personality) : -Infinity,
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
        
        // Verify unit is still a settler before attempting to found
        if (updatedSettler.type !== UnitType.Settler) continue;

        currentTile = next.map.tiles.find(t => hexEquals(t.coord, updatedSettler.coord));
        if (currentTile && validCityTile(currentTile, next) && settleHereIsBest(currentTile, next, playerId)) {
            const player = next.players.find(p => p.id === playerId);
            const civNames = player ? CITY_NAMES[player.civName] : [];
            const usedNames = new Set(next.cities.map(c => c.name));
            const name = civNames?.find(n => !usedNames.has(n)) ?? `AI City ${next.cities.length + 1}`;

            const after = tryAction(next, { type: "FoundCity", playerId, unitId: updatedSettler.id, name });
            if (after !== next) {
                console.info(`[AI Found] ${playerId} founded ${name} at ${hexToString(updatedSettler.coord)}`);
                next = after;
            } else {
                console.info(`[AI Found Fail] ${playerId} could not found at ${hexToString(updatedSettler.coord)}`);
            }
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
    if (adjCities.length > 0) {
        console.info(`[AI CAPTURE ATTEMPT] ${playerId} ${unit.type} attempting to capture ${adjCities.length} cities at HP <=0`);
    }
    for (const city of adjCities) {
        const unitsOnCity = state.units.filter(u => hexEquals(u.coord, city.coord));
        console.info(`[AI CAPTURE] ${playerId} ${unit.type} capturing ${city.name} (${city.ownerId}) at ${city.hp} HP. Units on city: ${unitsOnCity.map(u => u.type).join(", ") || "None"}`);
        const moved = tryAction(state, { type: "MoveUnit", playerId, unitId: unit.id, to: city.coord });
        if (moved !== state) return moved;
    }
    return state;
}

export function manageSettlerEscorts(state: GameState, playerId: string): GameState {
    let next = state;

    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);
    
    // ALL settlers need escorts assigned, prioritize those in danger
    const settlersWithSafety = settlers.map(settler => ({
        settler,
        safety: assessSettlerSafety(settler.coord, playerId, next)
    }));
    
    // Sort: high threat first, then low threat, then none
    const sortedSettlers = settlersWithSafety.sort((a, b) => {
        const threatOrder = { high: 0, low: 1, none: 2 };
        return threatOrder[a.safety.threatLevel] - threatOrder[b.safety.threatLevel];
    });

    // Get available military units - prefer not to pull garrisons
    const garrisonedCities = new Set(
        next.cities.filter(c => c.ownerId === playerId).map(c => hexToString(c.coord))
    );
    
    const militaryUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        u.movesLeft > 0
    );
    
    // Separate garrison and non-garrison units
    const nonGarrisonUnits = militaryUnits.filter(u => !garrisonedCities.has(hexToString(u.coord)));
    const garrisonUnits = militaryUnits.filter(u => garrisonedCities.has(hexToString(u.coord)));

    const escortAssignments = new Map<string, string>();

    for (const { settler, safety } of sortedSettlers) {
        // Check if already has adjacent escort
        const hasAdjacentEscort = next.units.some(u =>
            u.ownerId === playerId &&
            u.id !== settler.id &&
            UNITS[u.type].domain !== "Civilian" &&
            hexDistance(u.coord, settler.coord) <= 1
        );
        
        if (hasAdjacentEscort) continue; // Already escorted

        // Try to assign from non-garrison units first
        let availableUnits = nonGarrisonUnits.filter(u => !escortAssignments.has(u.id));
        
        // If high threat and no non-garrison available, pull from garrison
        if (availableUnits.length === 0 && safety.threatLevel === "high") {
            availableUnits = garrisonUnits.filter(u => !escortAssignments.has(u.id));
        }
        
        if (availableUnits.length === 0) continue;

        // Prefer units that are close AND fast
        const scoredUnits = availableUnits.map(u => ({
            unit: u,
            score: -hexDistance(settler.coord, u.coord) + UNITS[u.type].move
        })).sort((a, b) => b.score - a.score);

        if (scoredUnits.length > 0) {
            escortAssignments.set(scoredUnits[0].unit.id, settler.id);
        }
    }

    // Move escorts to their settlers - MUST be adjacent (distance 1), not 2
    for (const [escortId, settlerId] of escortAssignments.entries()) {
        const escort = next.units.find(u => u.id === escortId);
        const settler = next.units.find(u => u.id === settlerId);

        if (!escort || !settler || escort.movesLeft <= 0) continue;

        const distance = hexDistance(escort.coord, settler.coord);

        // Must be ADJACENT (distance 1), not just "within 2"
        if (distance <= 1) {
            continue; // Already adjacent, good to go
        }

        // Use pathfinding to get to settler's tile or adjacent to it
        const path = findPath(escort.coord, settler.coord, escort, next);
        if (path.length > 0) {
            const moveResult = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: escort.id,
                to: path[0]
            });
            if (moveResult !== next) {
                next = moveResult;
            }
        } else {
            // Fallback: step toward settler
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
    }

    return next;
}

export function defendCities(state: GameState, playerId: string): GameState {
    let next = state;
    const playerCities = next.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return next;

    const warEnemyIds = next.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);

    const reserved = new Set<string>();

    for (const city of playerCities) {
        const hasGarrison = next.units.some(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
        const available = next.units.filter(u =>
            u.ownerId === playerId &&
            u.movesLeft > 0 &&
            !reserved.has(u.id) &&
            u.type !== UnitType.Settler
        );

        if (!hasGarrison) {
            const combatReady = available.filter(u => UNITS[u.type].domain !== "Civilian");
            const pool = combatReady.length ? combatReady : available;
            const adjacent = pool.find(u => hexDistance(u.coord, city.coord) === 1);
            if (adjacent) {
                const movedDirect = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: adjacent.id,
                    to: city.coord
                });
                if (movedDirect !== next) {
                    next = movedDirect;
                    reserved.add(adjacent.id);
                }
            }
            if (next.units.some(u => u.ownerId === playerId && hexEquals(u.coord, city.coord))) continue;

            const candidate = nearestByDistance(city.coord, pool, u => u.coord);
            if (candidate) {
                const moved = stepToward(next, playerId, candidate.id, city.coord);
                if (moved !== next) {
                    next = moved;
                    reserved.add(candidate.id);
                } else if (hexDistance(candidate.coord, city.coord) === 1) {
                    const direct = tryAction(next, {
                        type: "MoveUnit",
                        playerId,
                        unitId: candidate.id,
                        to: city.coord
                    });
                    if (direct !== next) {
                        next = direct;
                        reserved.add(candidate.id);
                    }
                }
            }
        }

        if (!warEnemyIds.length) continue;

        const enemiesNear = next.units.filter(u =>
            warEnemyIds.includes(u.ownerId) && hexDistance(u.coord, city.coord) <= 3
        );
        if (!enemiesNear.length) continue;

        const defendersInRing = next.units.filter(u =>
            u.ownerId === playerId &&
            UNITS[u.type].domain !== "Civilian" &&
            hexDistance(u.coord, city.coord) <= 2
        );
        if (defendersInRing.length > 0) continue;

        const remaining = next.units.filter(u =>
            u.ownerId === playerId &&
            u.movesLeft > 0 &&
            !reserved.has(u.id) &&
            UNITS[u.type].domain !== "Civilian"
        );
        if (!remaining.length) continue;

        const targetEnemy = nearestByDistance(city.coord, enemiesNear, u => u.coord);
        const interceptSpots = getNeighbors(city.coord);
        const orderedSpots = sortByDistance(targetEnemy?.coord ?? city.coord, interceptSpots, coord => coord);

        const defender = nearestByDistance(city.coord, remaining, u => u.coord);
        if (defender) {
            for (const spot of orderedSpots) {
                const moved = stepToward(next, playerId, defender.id, spot);
                if (moved !== next) {
                    next = moved;
                    reserved.add(defender.id);
                    break;
                }
            }
        }
    }

    return next;
}

export function rotateGarrisons(state: GameState, playerId: string): GameState {
    if (!isAtWar(state, playerId)) return state;
    let next = state;
    const playerCities = next.cities.filter(c => c.ownerId === playerId);
    if (!playerCities.length) return next;

    const warEnemyIds = next.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);
    const enemyUnits = next.units.filter(u => warEnemyIds.includes(u.ownerId));

    const reserved = new Set<string>();

    for (const city of playerCities) {
        const garrison = next.units.find(u => u.ownerId === playerId && hexEquals(u.coord, city.coord));
        if (!garrison) continue;
        if (garrison.hp > 4) continue;
        if (garrison.movesLeft <= 0) continue;

        const candidates = next.units.filter(u =>
            u.ownerId === playerId &&
            u.id !== garrison.id &&
            !reserved.has(u.id) &&
            UNITS[u.type].domain !== "Civilian" &&
            u.movesLeft > 0 &&
            u.hp > garrison.hp &&
            hexDistance(u.coord, city.coord) === 1
        );
        if (candidates.length === 0) {
            const ring2 = next.units.filter(u =>
                u.ownerId === playerId &&
                u.id !== garrison.id &&
                !reserved.has(u.id) &&
                UNITS[u.type].domain !== "Civilian" &&
                u.movesLeft > 0 &&
                u.hp > garrison.hp &&
                hexDistance(u.coord, city.coord) === 2
            );
            if (ring2.length) {
                const bringer = ring2.sort((a, b) => b.hp - a.hp)[0];
                // avoid pulling a defender that is pinning nearby enemies
                const engaged = enemiesWithin(next, playerId, bringer.coord, 2) > 0;
                if (!engaged) {
                    next = stepToward(next, playerId, bringer.id, city.coord);
                }
                continue;
            }

            const ring3 = next.units.filter(u =>
                u.ownerId === playerId &&
                u.id !== garrison.id &&
                !reserved.has(u.id) &&
                UNITS[u.type].domain !== "Civilian" &&
                u.movesLeft > 0 &&
                u.hp > garrison.hp &&
                hexDistance(u.coord, city.coord) === 3
            );
            if (ring3.length) {
                const bringer = ring3.sort((a, b) => b.hp - a.hp)[0];
                const engaged3 = enemiesWithin(next, playerId, bringer.coord, 2) > 0;
                if (!engaged3) {
                    next = stepToward(next, playerId, bringer.id, city.coord);
                }
            }
            continue;
        }

        const replacement = candidates.sort((a, b) => b.hp - a.hp)[0];

        const neighbors = getNeighbors(city.coord)
            .map(coord => {
                const occupant = next.units.find(u => hexEquals(u.coord, coord));
                const enemyDist = enemyUnits.length
                    ? Math.min(...enemyUnits.map(e => hexDistance(e.coord, coord)))
                    : Number.POSITIVE_INFINITY;
                return { coord, occupant, enemyDist };
            })
            .filter(n => !n.occupant || n.occupant.id === garrison.id)
            .sort((a, b) => {
                if (a.enemyDist !== b.enemyDist) return b.enemyDist - a.enemyDist;
                const aTile = next.map.tiles.find(t => hexEquals(t.coord, a.coord));
                const bTile = next.map.tiles.find(t => hexEquals(t.coord, b.coord));
                const aFriendly = aTile?.ownerId === playerId ? 1 : 0;
                const bFriendly = bTile?.ownerId === playerId ? 1 : 0;
                if (aFriendly !== bFriendly) return bFriendly - aFriendly;
                return 0;
            });

        let swapped = false;
        for (const neighbor of neighbors) {
            const movedOut = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: garrison.id,
                to: neighbor.coord
            });
            if (movedOut === next) continue;
            next = movedOut;

            const liveReplacement = next.units.find(u => u.id === replacement.id);
            if (!liveReplacement) break;

            const movedIn = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: liveReplacement.id,
                to: city.coord
            });
            if (movedIn !== next) {
                next = movedIn;
                reserved.add(liveReplacement.id);
                swapped = true;
            }
            break;
        }

        if (swapped) continue;
    }

    return next;
}

export function retreatWounded(state: GameState, playerId: string): GameState {
    if (!isAtWar(state, playerId)) return state;
    let next = state;

    const friendlyCities = next.cities.filter(c => c.ownerId === playerId);
    if (!friendlyCities.length) return next;

    const units = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        u.hp <= 4 &&
        UNITS[u.type].domain !== "Civilian"
    );

    for (const unit of units) {
        const onCity = friendlyCities.some(c => hexEquals(c.coord, unit.coord));
        if (onCity) continue;

        const targetCity = nearestByDistance(unit.coord, friendlyCities, c => c.coord);
        if (!targetCity) continue;

        next = stepToward(next, playerId, unit.id, targetCity.coord);
    }

    return next;
}

export function repositionRanged(state: GameState, playerId: string): GameState {
    if (!isAtWar(state, playerId)) return state;
    let next = state;
    const rangedUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].rng > 1 &&
        u.movesLeft > 0
    );

    for (const unit of rangedUnits) {
        const enemyAdj = enemiesWithin(next, playerId, unit.coord, 1);
        const crowd = friendlyAdjacencyCount(next, playerId, unit.coord);
        if (enemyAdj === 0 && crowd <= 2) continue;

        const candidates = getNeighbors(unit.coord)
            .map(coord => ({
                coord,
                enemyDist: enemiesWithin(next, playerId, coord, 1),
                crowd: friendlyAdjacencyCount(next, playerId, coord),
                distToEnemies: (() => {
                    const enemies = next.units.filter(u => u.ownerId !== playerId);
                    if (!enemies.length) return Number.POSITIVE_INFINITY;
                    return Math.min(...enemies.map(u => hexDistance(u.coord, coord)));
                })(),
                defense: tileDefenseScore(next, coord)
            }))
            .filter(c => c.enemyDist === 0);

        candidates.sort((a, b) => {
            if (a.crowd !== b.crowd) return a.crowd - b.crowd;
            if (a.distToEnemies !== b.distToEnemies) return b.distToEnemies - a.distToEnemies;
            return b.defense - a.defense;
        });

        for (const cand of candidates) {
            const moved = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: unit.id,
                to: cand.coord
            });
            if (moved !== next) {
                next = moved;
                break;
            }
        }
    }

    return next;
}

export function routeCityCaptures(state: GameState, playerId: string): GameState {
    let next = state;
    const captureCities = next.cities.filter(c => c.ownerId !== playerId && c.hp <= 0);
    if (!captureCities.length) return next;

    const captureUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        UNITS[u.type].canCaptureCity
    );
    if (!captureUnits.length) return next;

    const assigned = new Set<string>();

    for (const city of captureCities) {
        const candidates = captureUnits.filter(u => !assigned.has(u.id));
        if (!candidates.length) break;

        const unit = nearestByDistance(city.coord, candidates, u => u.coord);
        if (!unit) continue;

        const path = findPath(unit.coord, city.coord, unit, next);
        const step = path[0];
        if (step) {
            const moved = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: unit.id,
                to: step
            });
            if (moved !== next) {
                next = moved;
                assigned.add(unit.id);
                continue;
            }
        }

        next = stepToward(next, playerId, unit.id, city.coord);
        assigned.add(unit.id);
    }

    return next;
}

export function attackTargets(state: GameState, playerId: string): GameState {
    let next = state;
    const units = next.units.filter(u => u.ownerId === playerId && u.type !== UnitType.Settler);
    const warCities = next.cities.filter(c => c.ownerId !== playerId);
    const primaryCity = selectPrimarySiegeCity(next, playerId, units, warCities);
    for (const unit of units) {
        const stats = UNITS[unit.type];
        if (unit.hasAttacked) continue;

        const cityTargets = warCities
            .filter(c => hexDistance(c.coord, unit.coord) <= stats.rng && c.hp > 0)
            .map(c => ({ city: c, dmg: expectedDamageToCity(unit, c, next) }))
            .sort((a, b) => {
                const aKill = a.dmg >= a.city.hp ? 0 : 1;
                const bKill = b.dmg >= b.city.hp ? 0 : 1;
                if (aKill !== bKill) return aKill - bKill;
                if (primaryCity) {
                    const aPrimary = a.city.id === primaryCity.id ? -1 : 0;
                    const bPrimary = b.city.id === primaryCity.id ? -1 : 0;
                    if (aPrimary !== bPrimary) return aPrimary - bPrimary;
                }
                return a.city.hp - b.city.hp;
            });
        let acted = false;
        for (const { city, dmg } of cityTargets) {
            // ALWAYS attack cities when in range - even with low damage!
            // Cities are the primary objective, chip away at them
            const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: city.id, targetType: "City" });
            if (attacked !== next) {
                console.info(`[AI ATTACK CITY] ${playerId} attacks ${city.name} (${city.ownerId}) with ${unit.type}, dealing ${dmg} damage (HP: ${city.hp}→${city.hp - dmg})`);
                next = attacked;
                next = captureIfPossible(next, playerId, unit.id);
                acted = true;
                break;
            }
        }
        if (acted) continue;

        const enemyUnits = next.units
            .filter(u => u.ownerId !== playerId)
            .map(u => ({
                u,
                d: hexDistance(u.coord, unit.coord),
                dmg: expectedDamageToUnit(unit, u, next),
                counter: expectedDamageFrom(u, unit, next),
                isSettler: u.type === UnitType.Settler
            }))
            .filter(({ d, isSettler }) => {
                // Settlers require adjacency (distance 1) to attack
                if (isSettler) return d === 1;
                // Other units can attack within range
                return d <= stats.rng;
            })
            .sort((a, b) => {
                const aKill = a.dmg >= a.u.hp ? 0 : 1;
                const bKill = b.dmg >= b.u.hp ? 0 : 1;
                if (aKill !== bKill) return aKill - bKill;
                // Prioritize settlers (they're valuable captures)
                if (a.isSettler !== b.isSettler) return a.isSettler ? -1 : 1;
                if (a.d !== b.d) return a.d - b.d;
                return a.u.hp - b.u.hp;
            });
        const target = enemyUnits[0];
        const adjEnemies = enemiesWithin(next, playerId, unit.coord, 1);
        const rangedAndUnsafe = UNITS[unit.type].rng > 1 && adjEnemies > 0 && target && target.dmg < target.u.hp;
        if (target && (
            target.dmg >= target.u.hp ||
            (target.dmg >= 2 && target.dmg >= target.counter) ||
            (unit.hp > target.counter + 2 && target.dmg >= 2)
        ) && !rangedAndUnsafe) {
            // If target is a settler and we're not adjacent, move adjacent first
            if (target.isSettler && target.d > 1 && unit.movesLeft > 0) {
                const neighbors = getNeighbors(target.u.coord);
                const bestNeighbor = neighbors
                    .map(coord => ({
                        coord,
                        dist: hexDistance(unit.coord, coord),
                        path: findPath(unit.coord, coord, unit, next)
                    }))
                    .filter(n => n.path.length > 0)
                    .sort((a, b) => a.dist - b.dist)[0];
                
                if (bestNeighbor) {
                    const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: bestNeighbor.coord });
                    if (moved !== next) {
                        next = moved;
                        // Get updated unit and target after move
                        const updatedUnit = next.units.find(u => u.id === unit.id);
                        const updatedTarget = next.units.find(u => u.id === target.u.id);
                        if (!updatedUnit || updatedUnit.movesLeft <= 0 || !updatedTarget) continue;
                        // Recalculate distance after move
                        const newDist = hexDistance(updatedUnit.coord, updatedTarget.coord);
                        if (newDist > 1) continue; // Still not adjacent, skip this turn
                        // Recalculate target info with updated positions
                        const newTarget = {
                            u: updatedTarget,
                            d: newDist,
                            dmg: expectedDamageToUnit(updatedUnit, updatedTarget, next),
                            counter: expectedDamageFrom(updatedTarget, updatedUnit, next),
                            isSettler: true
                        };
                        // Now attempt attack with updated unit
                        const attacked = tryAction(next, { type: "Attack", playerId, attackerId: updatedUnit.id, targetId: updatedTarget.id, targetType: "Unit" });
                        if (attacked !== next) {
                            console.info(`[AI ATTACK UNIT] ${playerId} ${updatedUnit.type} attacks ${updatedTarget.ownerId} ${updatedTarget.type}, dealing ${newTarget.dmg} damage (HP: ${updatedTarget.hp})`);
                            next = attacked;
                            const finalUnit = next.units.find(u => u.id === unit.id);
                            if (finalUnit) {
                                const adjAfter = enemiesWithin(next, playerId, finalUnit.coord, 1);
                                if (UNITS[finalUnit.type].rng > 1 && adjAfter > 0) {
                                    next = repositionRanged(next, playerId);
                                }
                            }
                        }
                        continue; // Skip the normal attack path since we handled it
                    }
                }
            }
            
            // Normal attack path (not a settler, or already adjacent to settler)
            const attacked = tryAction(next, { type: "Attack", playerId, attackerId: unit.id, targetId: target.u.id, targetType: "Unit" });
            if (attacked !== next) {
                console.info(`[AI ATTACK UNIT] ${playerId} ${unit.type} attacks ${target.u.ownerId} ${target.u.type}, dealing ${target.dmg} damage (HP: ${target.u.hp})`);
                next = attacked;
                const updatedUnitAfterAttack = next.units.find(u => u.id === unit.id);
                if (updatedUnitAfterAttack) {
                    const adjAfter = enemiesWithin(next, playerId, updatedUnitAfterAttack.coord, 1);
                    if (UNITS[updatedUnitAfterAttack.type].rng > 1 && adjAfter > 0) {
                        next = repositionRanged(next, playerId);
                    }
                }
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

    const targetCities = next.cities
        .filter(c => warTargets.some(w => w.id === c.ownerId))
        .sort((a, b) => a.hp - b.hp);
    const armyUnits = next.units.filter(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");

    // Debug: Count unit types
    const unitCounts = armyUnits.reduce((acc, u) => {
        acc[u.type] = (acc[u.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    if (targetCities.some(c => c.hp <= 0)) {
        console.info(`[AI SIEGE DEBUG] ${playerId} has units: ${JSON.stringify(unitCounts)}. Targets with <=0 HP: ${targetCities.filter(c => c.hp <= 0).map(c => c.name).join(", ")}`);
    }

    const rangedIds = new Set(
        armyUnits.filter(u => UNITS[u.type].rng > 1).map(u => u.id)
    );
    const primaryCity = selectPrimarySiegeCity(next, playerId, armyUnits, targetCities);

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

            // Do not move units off friendly cities if already garrisoning
            const onFriendlyCity = next.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, current.coord));
            if (onFriendlyCity) break;

            const unitTargets = UNITS[current.type].domain === "Naval"
                ? targetCities.filter(c => cityIsCoastal(next, c))
                : targetCities;

            // Priority 1: Capture 0 HP cities if we can
            let nearest: any = null;
            if (UNITS[current.type].canCaptureCity) {
                const capturable = unitTargets.filter(c => c.hp <= 0);
                if (capturable.length > 0) {
                    nearest = nearestByDistance(current.coord, capturable, city => city.coord);
                    console.info(`[AI CAPTURE MOVE] ${playerId} ${current.type} moving to capture ${nearest.name} (HP ${nearest.hp})`);
                }
            }

            // Priority 2: Primary siege target or nearest target
            if (!nearest) {
                nearest = nearestByDistance(
                    current.coord,
                    primaryCity ? [primaryCity] : unitTargets,
                    city => city.coord
                );
            }

            if (!nearest) break;
            if (hexDistance(nearest.coord, current.coord) === 0) break;

            let path = findPath(current.coord, nearest.coord, current, next);

            // If direct path is blocked (e.g. garrisoned city), try to move adjacent
            if (path.length === 0 && hexDistance(current.coord, nearest.coord) > 1) {
                const neighbors = getNeighbors(nearest.coord);
                const validNeighbors = neighbors
                    .map(n => ({ coord: n, path: findPath(current.coord, n, current, next) }))
                    .filter(n => n.path.length > 0)
                    .sort((a, b) => a.path.length - b.path.length);

                if (validNeighbors.length > 0) {
                    path = validNeighbors[0].path;
                }
            }

            let moved = false;
            if (path.length > 0) {
                const step = path[0];
                const desiredRange = UNITS[current.type].rng;
                const currentDist = hexDistance(current.coord, nearest.coord);

                // Count nearby friendly units to ensure we form a siege group
                const friendliesNearTarget = armyUnits.filter(u =>
                    hexDistance(u.coord, nearest.coord) <= 3
                ).length;

                // Ranged units: only hold position if we have a siege group (3+ units)
                // Otherwise keep moving to converge on the target
                if (rangedIds.has(current.id) && currentDist <= desiredRange && currentDist >= 2 && friendliesNearTarget >= 3) {
                    // Siege group formed, hold position
                    console.info(`[AI SIEGE] ${playerId} ${current.type} holding at range ${currentDist} from ${nearest.name} (${friendliesNearTarget} units nearby)`);
                    moved = true;
                } else {
                    // Not enough units yet, keep moving
                    if (rangedIds.has(current.id) && currentDist <= desiredRange) {
                        console.info(`[AI SIEGE] ${playerId} ${current.type} at range ${currentDist} from ${nearest.name}, waiting for group (${friendliesNearTarget}/3 units)`);
                    }
                    const stepDist = hexDistance(step, nearest.coord);
                    if (rangedIds.has(current.id) && desiredRange > 1 && stepDist === 0) {
                        // avoid stepping adjacent if ranged can soon fire
                        moved = false;
                    } else {
                        const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: step });
                        if (attempt !== next) {
                            next = attempt;
                            moved = true;
                        }
                    }
                }
            }
            if (!moved) {
                const neighbors = getNeighbors(current.coord)
                    .map(coord => ({
                        coord,
                        dist: hexDistance(coord, nearest.coord),
                        defense: tileDefenseScore(next, coord),
                        friendlyNearby: friendlyAdjacencyCount(next, playerId, coord)
                    }))
                    .filter(n => n.friendlyNearby <= 2);
                const ordered = neighbors.sort((a, b) => {
                    const desiredRange = UNITS[current.type].rng;
                    const aRangeScore = rangedIds.has(current.id) && desiredRange > 1
                        ? Math.abs(desiredRange - a.dist)
                        : a.dist;
                    const bRangeScore = rangedIds.has(current.id) && desiredRange > 1
                        ? Math.abs(desiredRange - b.dist)
                        : b.dist;
                    if (aRangeScore !== bRangeScore) return aRangeScore - bRangeScore;
                    if (a.friendlyNearby !== b.friendlyNearby) return a.friendlyNearby - b.friendlyNearby;
                    return b.defense - a.defense;
                });
                for (const n of ordered) {
                    const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: current.id, to: n.coord });
                    if (attempt !== next) {
                        next = attempt;
                        moved = true;
                        break;
                    }
                }
            }
            if (!moved) break;
        }
    }
    return next;
}
