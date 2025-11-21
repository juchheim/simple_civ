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
import { getNeighbors, hexDistance, hexEquals } from "../core/hex.js";

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

function settleHereIsBest(tile: any, state: GameState): boolean {
    const currentScore = scoreCitySite(tile, state);
    const neighborScores = getNeighbors(tile.coord)
        .map(c => state.map.tiles.find(t => hexEquals(t.coord, c)))
        .filter((t): t is any => !!t && validCityTile(t))
        .map(t => scoreCitySite(t, state));
    const bestNeighbor = neighborScores.length ? Math.max(...neighborScores) : -Infinity;
    return currentScore >= bestNeighbor - 1;
}

function moveSettlersAndFound(state: GameState, playerId: string): GameState {
    let next = state;
    const settlers = next.units.filter(u => u.ownerId === playerId && u.type === UnitType.Settler);
    for (const settler of settlers) {
        let currentTile = next.map.tiles.find(t => hexEquals(t.coord, settler.coord));
        if (!currentTile) continue;
        if (validCityTile(currentTile) && settleHereIsBest(currentTile, next)) {
            const name = `AI City ${next.cities.length + 1}`;
            const afterFound = tryAction(next, { type: "FoundCity", playerId, unitId: settler.id, name });
            if (afterFound !== next) {
                next = afterFound;
                continue;
            }
        }

        const neighborOptions = getNeighbors(settler.coord)
            .map(coord => ({ coord, tile: next.map.tiles.find(t => hexEquals(t.coord, coord)) }))
            .filter(({ tile }) => tile && validCityTile(tile));
        const scored = neighborOptions
            .map(({ coord, tile }) => ({
                coord,
                score: tile ? scoreCitySite(tile, next) : -Infinity,
            }))
            .sort((a, b) => b.score - a.score);

        for (const candidate of scored) {
            const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: settler.id, to: candidate.coord });
            if (moved !== next) {
                next = moved;
                break;
            }
        }

        currentTile = next.map.tiles.find(t => hexEquals(t.coord, settler.coord));
        if (currentTile && validCityTile(currentTile) && settleHereIsBest(currentTile, next)) {
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
    state = handleDiplomacy(state, playerId);
    state = attackTargets(state, playerId);
    state = moveMilitaryTowardTargets(state, playerId);

    state = tryAction(state, { type: "EndTurn", playerId });
    return state;
}
