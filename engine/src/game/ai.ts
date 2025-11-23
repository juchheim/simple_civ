import { applyAction } from "./turn-loop.js";
import {
    Action,
    AiVictoryGoal,
    BuildingType,
    City,
    DiplomacyState,
    GameState,
    ProjectId,
    TechId,
    TerrainType,
    UnitType,
} from "../core/types.js";
import { aiChooseTech, aiVictoryBias, aiWarPeaceDecision } from "./ai-decisions.js";
import { scoreCitySite, tileWorkingPriority, tilesByPriority } from "./ai-heuristics.js";
import { canBuild } from "./rules.js";
import { UNITS, TERRAIN } from "../core/constants.js";
import { getNeighbors, hexDistance, hexEquals, hexSpiral } from "../core/hex.js";

function tryAction(state: GameState, action: Action): GameState {
    try {
        return applyAction(state, action);
    } catch {
        return state;
    }
}

function setAiGoal(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    return {
        ...state,
        players: state.players.map(p => (p.id === playerId ? { ...p, aiGoal: goal } : p)),
    };
}

function pickTech(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    const techId = aiChooseTech(playerId, state, goal);
    if (!techId) return state;
    return tryAction(state, { type: "ChooseTech", playerId, techId });
}

function buildPriorities(goal: AiVictoryGoal): { type: "Unit" | "Building" | "Project"; id: string }[] {
    const progress: { type: "Unit" | "Building" | "Project"; id: string }[] = [
        { type: "Project", id: ProjectId.Observatory },
        { type: "Project", id: ProjectId.GrandAcademy },
        { type: "Project", id: ProjectId.GrandExperiment },
        { type: "Building", id: BuildingType.Scriptorium },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Unit", id: UnitType.Settler },
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Unit", id: UnitType.Riders },
    ];
    const conquest: { type: "Unit" | "Building" | "Project"; id: string }[] = [
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Unit", id: UnitType.Riders },
        { type: "Unit", id: UnitType.BowGuard },
        { type: "Project", id: ProjectId.FormArmy_SpearGuard },
        { type: "Project", id: ProjectId.FormArmy_Riders },
        { type: "Project", id: ProjectId.FormArmy_BowGuard },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Unit", id: UnitType.Settler },
    ];
    const balanced: { type: "Unit" | "Building" | "Project"; id: string }[] = [
        { type: "Unit", id: UnitType.Settler },
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Building", id: BuildingType.Scriptorium },
        { type: "Unit", id: UnitType.Riders },
    ];

    if (goal === "Progress") return progress;
    if (goal === "Conquest") return conquest;
    return balanced;
}

function pickCityBuilds(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const cityOrder = next.cities.filter(c => c.ownerId === playerId);
    const priorities = buildPriorities(goal);
    for (const city of cityOrder) {
        if (city.currentBuild) continue;
        for (const option of priorities) {
            if (canBuild(city, option.type, option.id, next)) {
                next = tryAction(next, {
                    type: "SetCityBuild",
                    playerId,
                    cityId: city.id,
                    buildType: option.type,
                    buildId: option.id,
                });
                break;
            }
        }
    }
    return next;
}

function assignWorkedTiles(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const cities = next.cities.filter(c => c.ownerId === playerId);
    for (const city of cities) {
        const priority = tileWorkingPriority(goal, city, next);
        const sorted = tilesByPriority(city, next, priority);
        const worked: typeof city.workedTiles = [city.coord];
        for (const tile of sorted) {
            if (worked.length >= city.pop) break;
            if (hexEquals(tile.coord, city.coord)) continue;
            worked.push(tile.coord);
        }
        next = tryAction(next, {
            type: "SetWorkedTiles",
            playerId,
            cityId: city.id,
            tiles: worked,
        });
    }
    return next;
}

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

/**
 * Assess settler safety according to rulebook section 7.5.
 * Safe = within friendly borders (2 rings from owned city) AND no war enemies within 3 tiles.
 * Needs escort = traveling through non-friendly territory OR enemies within 5 tiles.
 */
function assessSettlerSafety(
    settlerCoord: { q: number; r: number },
    playerId: string,
    state: GameState
): { isSafe: boolean; needsEscort: boolean } {
    // Check if within friendly borders (2 rings from any owned city)
    const ownedCities = state.cities.filter(c => c.ownerId === playerId);
    const isInFriendlyBorders = ownedCities.some(city =>
        hexDistance(settlerCoord, city.coord) <= 2
    );

    // Check for war enemies within 3 tiles
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

    // Check if escorts are needed: not in friendly territory OR enemies within 5 tiles
    const enemiesWithin5 = warEnemies.length > 0 && state.units
        .filter(u => warEnemies.includes(u.ownerId))
        .some(u => hexDistance(settlerCoord, u.coord) <= 5);

    const needsEscort = !isInFriendlyBorders || enemiesWithin5;

    return { isSafe, needsEscort };
}

/**
 * Detect nearby enemy units that pose a threat to the settler.
 * Returns the closest enemy unit within 3 tiles if at war with that player.
 */
function detectNearbyDanger(
    settlerCoord: { q: number; r: number },
    playerId: string,
    state: GameState
): { coord: { q: number; r: number }; distance: number } | null {
    // Find all enemy players we're at war with
    const warEnemies = state.players
        .filter(p =>
            p.id !== playerId &&
            !p.isEliminated &&
            state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
        )
        .map(p => p.id);

    if (warEnemies.length === 0) return null;

    // Find enemy units belonging to war enemies within 3 tiles
    const nearbyEnemies = state.units
        .filter(u => warEnemies.includes(u.ownerId))
        .map(u => ({ coord: u.coord, distance: hexDistance(settlerCoord, u.coord) }))
        .filter(({ distance }) => distance <= 3)
        .sort((a, b) => a.distance - b.distance);

    return nearbyEnemies.length > 0 ? nearbyEnemies[0] : null;
}

function moveSettlersAndFound(state: GameState, playerId: string): GameState {
    let next = state;
    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);
    for (const settler of settlers) {
        let currentTile = next.map.tiles.find(t => hexEquals(t.coord, settler.coord));
        if (!currentTile) continue;

        // PRIORITY 1: Danger avoidance - if enemy units are nearby during war, flee!
        const danger = detectNearbyDanger(settler.coord, playerId, next);
        if (danger) {
            // Move away from the threat - pick neighbor that maximizes distance from enemy
            const neighbors = getNeighbors(settler.coord);
            const neighborsWithSafety = neighbors
                .map(coord => ({
                    coord,
                    distanceFromThreat: hexDistance(coord, danger.coord)
                }))
                .sort((a, b) => b.distanceFromThreat - a.distanceFromThreat); // furthest first

            let escaped = false;
            for (const neighbor of neighborsWithSafety) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: settler.id,
                    to: neighbor.coord
                });
                if (moveResult !== next) {
                    next = moveResult;
                    escaped = true;
                    break;
                }
            }

            // If we successfully escaped, continue to next settler
            if (escaped) continue;
        }

        // PRIORITY 2: If current tile is already good enough, settle here
        if (validCityTile(currentTile) && settleHereIsBest(currentTile, next, playerId)) {
            const name = `AI City ${next.cities.length + 1}`;
            const afterFound = tryAction(next, { type: "FoundCity", playerId, unitId: settler.id, name });
            if (afterFound !== next) {
                next = afterFound;
                continue;
            }
        }

        // Strategic movement: Search 8-tile radius for good city sites
        const searchRadius = 8;
        const nearbyCoords = hexSpiral(settler.coord, searchRadius);
        const potentialSites = nearbyCoords
            .map(coord => ({ coord, tile: next.map.tiles.find(t => hexEquals(t.coord, coord)) }))
            .filter(({ coord, tile }) =>
                tile &&
                validCityTile(tile) &&
                !hexEquals(coord, settler.coord) // exclude current position
            )
            .map(({ coord, tile }) => ({
                coord,
                tile,
                score: tile ? scoreCitySite(tile, next, playerId) : -Infinity,
                distance: hexDistance(settler.coord, coord)
            }))
            .sort((a, b) => {
                // Prioritize by score, then by closer distance as tiebreaker
                if (Math.abs(a.score - b.score) > 0.1) {
                    return b.score - a.score;
                }
                return a.distance - b.distance;
            });

        // Try to move toward the best site found
        let moved = false;
        for (const site of potentialSites) {
            // Try to move toward this site by picking the neighbor that gets us closer
            const neighbors = getNeighbors(settler.coord);
            const neighborsWithDistance = neighbors
                .map(coord => ({
                    coord,
                    distanceToSite: hexDistance(coord, site.coord)
                }))
                .sort((a, b) => a.distanceToSite - b.distanceToSite);

            // Try to move to the neighbor closest to the target site
            for (const neighbor of neighborsWithDistance) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: settler.id,
                    to: neighbor.coord
                });
                if (moveResult !== next) {
                    next = moveResult;
                    moved = true;
                    break;
                }
            }

            if (moved) break;
        }

        // If we couldn't move toward any strategic site, fall back to immediate neighbors
        if (!moved) {
            const neighborOptions = getNeighbors(settler.coord)
                .map(coord => ({ coord, tile: next.map.tiles.find(t => hexEquals(t.coord, coord)) }))
                .filter(({ tile }) => tile && validCityTile(tile));
            const scored = neighborOptions
                .map(({ coord, tile }) => ({
                    coord,
                    score: tile ? scoreCitySite(tile, next, playerId) : -Infinity,
                }))
                .sort((a, b) => b.score - a.score);

            for (const candidate of scored) {
                const moveResult = tryAction(next, { type: "MoveUnit", playerId, unitId: settler.id, to: candidate.coord });
                if (moveResult !== next) {
                    next = moveResult;
                    break;
                }
            }
        }

        // After moving, check if we should settle at the new position
        currentTile = next.map.tiles.find(t => hexEquals(t.coord, settler.coord));
        if (currentTile && validCityTile(currentTile) && settleHereIsBest(currentTile, next, playerId)) {
            const name = `AI City ${next.cities.length + 1}`;
            next = tryAction(next, { type: "FoundCity", playerId, unitId: settler.id, name });
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

/**
 * Assign escorts to settlers that need protection and move escorts toward their settlers.
 * Per rulebook 7.5: assigns nearby military units to protect settlers in dangerous territory.
 */
function manageSettlerEscorts(state: GameState, playerId: string): GameState {
    let next = state;

    // Find all settlers and their safety status
    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);
    const settlersNeedingEscorts = settlers
        .map(settler => ({
            settler,
            safety: assessSettlerSafety(settler.coord, playerId, next)
        }))
        .filter(({ safety }) => safety.needsEscort);

    if (settlersNeedingEscorts.length === 0) return next;

    // Find available military units (not actively in combat zones)
    const militaryUnits = next.units.filter(u =>
        u.ownerId === playerId &&
        UNITS[u.type].domain !== "Civilian" &&
        u.movesLeft > 0
    );

    // Track which units are assigned as escorts
    const escortAssignments = new Map<string, string>(); // militaryUnitId -> settlerUnitId

    // Assign escorts: for each settler needing escort, find the closest available military unit
    for (const { settler } of settlersNeedingEscorts) {
        const availableUnits = militaryUnits.filter(u => !escortAssignments.has(u.id));

        if (availableUnits.length === 0) break; // No more units to assign

        // Find closest military unit
        const closestUnit = availableUnits
            .map(u => ({ unit: u, distance: hexDistance(u.coord, settler.coord) }))
            .sort((a, b) => a.distance - b.distance)[0];

        // Only assign if reasonably close (within 10 tiles)
        if (closestUnit && closestUnit.distance <= 10) {
            escortAssignments.set(closestUnit.unit.id, settler.id);
        }
    }

    // Move escorts toward their assigned settlers
    for (const [escortId, settlerId] of escortAssignments.entries()) {
        const escort = next.units.find(u => u.id === escortId);
        const settler = next.units.find(u => u.id === settlerId);

        if (!escort || !settler || escort.movesLeft <= 0) continue;

        const distance = hexDistance(escort.coord, settler.coord);

        // If escort is already near settler (within 2 tiles), stay put or fortify
        if (distance <= 2) {
            // Don't move - escort is in good position
            continue;
        }

        // Move toward settler
        const neighbors = getNeighbors(escort.coord);
        const neighborsWithDistance = neighbors
            .map(coord => ({
                coord,
                distanceToSettler: hexDistance(coord, settler.coord)
            }))
            .sort((a, b) => a.distanceToSettler - b.distanceToSettler);

        // Try to move closer to settler
        for (const neighbor of neighborsWithDistance) {
            const moveResult = tryAction(next, {
                type: "MoveUnit",
                playerId,
                unitId: escort.id,
                to: neighbor.coord
            });
            if (moveResult !== next) {
                next = moveResult;
                break;
            }
        }
    }

    return next;
}

function attackTargets(state: GameState, playerId: string): GameState {
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

function moveMilitaryTowardTargets(state: GameState, playerId: string): GameState {
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

            const nearest = targetCities
                .map(c => ({ c, d: hexDistance(c.coord, current.coord) }))
                .sort((a, b) => a.d - b.d)[0];
            if (!nearest) break;
            if (nearest.d === 0) break;

            const neighbors = getNeighbors(current.coord)
                .map(coord => ({ coord, dist: hexDistance(coord, nearest.c.coord) }));
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

function handleDiplomacy(state: GameState, playerId: string): GameState {
    let next = state;
    for (const other of next.players) {
        if (other.id === playerId || other.isEliminated) continue;
        const decision = aiWarPeaceDecision(playerId, other.id, next);
        if (decision === "DeclareWar") {
            next = tryAction(next, { type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
        } else if (decision === "ProposePeace") {
            next = tryAction(next, { type: "ProposePeace", playerId, targetPlayerId: other.id });
        } else if (decision === "AcceptPeace") {
            next = tryAction(next, { type: "AcceptPeace", playerId, targetPlayerId: other.id });
        }
    }
    return next;
}

export function runAiTurn(initialState: GameState, playerId: string): GameState {
    let state = initialState;
    const goal = aiVictoryBias(playerId, state);
    state = setAiGoal(state, playerId, goal);

    state = pickTech(state, playerId, goal);
    state = pickCityBuilds(state, playerId, goal);
    state = assignWorkedTiles(state, playerId, goal);
    state = moveSettlersAndFound(state, playerId);
    state = manageSettlerEscorts(state, playerId); // Assign and move escorts
    state = handleDiplomacy(state, playerId);
    state = attackTargets(state, playerId);
    state = moveMilitaryTowardTargets(state, playerId);

    state = tryAction(state, { type: "EndTurn", playerId });
    return state;
}
