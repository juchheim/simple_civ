import { Action, BuildingType, City, GameState, PlayerPhase, ProjectId, TechId, UnitState, UnitType } from "../core/types.js";
import {
    BASE_CITY_HP,
    CITY_HEAL_PER_TURN,
    HEAL_FRIENDLY_CITY,
    HEAL_FRIENDLY_TILE,
    PROJECTS,
    SETTLER_POP_LOSS_ON_BUILD,
    UNITS,
    CITY_WORK_RADIUS_RINGS,
} from "../core/constants.js";
import { getCityYields, getGrowthCost } from "./rules.js";
import { ensureWorkedTiles } from "./helpers/cities.js";
import { hexDistance, hexEquals } from "../core/hex.js";
import { Unit } from "../core/types.js";
import { refreshPlayerVision } from "./vision.js";

export function handleEndTurn(state: GameState, action: Extract<Action, { type: "EndTurn" }>): GameState {
    for (const unit of state.units.filter(u => u.ownerId === action.playerId)) {
        const stats = UNITS[unit.type];
        const stayed = !unit.hasAttacked && unit.movesLeft === stats.move;
        unit.state = stayed ? UnitState.Fortified : UnitState.Normal;
    }

    const pIdx = state.players.findIndex(p => p.id === action.playerId);
    const nextPIdx = (pIdx + 1) % state.players.length;
    const nextPlayer = state.players[nextPIdx];

    state.currentPlayerId = nextPlayer.id;

    if (nextPIdx === 0) {
        state.turn += 1;
        runEndOfRound(state);
    }

    return advancePlayerTurn(state, nextPlayer.id);
}

export function advancePlayerTurn(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    state.phase = PlayerPhase.StartOfTurn;

    healUnitsAtStart(state, playerId);

    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const unitStats = UNITS[unit.type];
        const wasJustCaptured = unit.capturedOnTurn != null && unit.capturedOnTurn > state.turn - 2;
        if (!wasJustCaptured) {
            unit.movesLeft = unitStats.move;
        }
        unit.hasAttacked = false;
    }

    for (const city of state.cities.filter(c => c.ownerId === playerId)) {
        city.hasFiredThisTurn = false;
    }

    refreshPlayerVision(state, playerId);

    for (const city of state.cities.filter(c => c.ownerId === playerId)) {
        city.workedTiles = ensureWorkedTiles(city, state);
        const yields = getCityYields(city, state);

        const maxHp = city.maxHp || BASE_CITY_HP;
        const wasRecentlyAttacked = city.lastDamagedOnTurn != null && city.lastDamagedOnTurn > state.turn - 2;
        if (city.hp < maxHp && !wasRecentlyAttacked) {
            console.log(`[TurnLoop] Healing city ${city.name} (${city.ownerId}) from ${city.hp} to ${Math.min(maxHp, city.hp + CITY_HEAL_PER_TURN)}`);
            city.hp = Math.min(maxHp, city.hp + CITY_HEAL_PER_TURN);
            if (!city.maxHp) city.maxHp = maxHp;
        }

        city.storedFood += yields.F;
        let growthCost = getGrowthCost(city.pop, city.buildings.includes(BuildingType.Farmstead));
        while (city.storedFood >= growthCost) {
            city.storedFood -= growthCost;
            city.pop += 1;
            city.workedTiles = ensureWorkedTiles(city, state);
            growthCost = getGrowthCost(city.pop, city.buildings.includes(BuildingType.Farmstead));
        }

        if (city.currentBuild) {
            city.buildProgress += yields.P;
            if (city.buildProgress >= city.currentBuild.cost) {
                completeBuild(state, city);
            }
        }
    }

    const totalScience = getSciencePerTurn(state, playerId);
    if (player.currentTech) {
        player.currentTech.progress += totalScience;
        if (player.currentTech.progress >= player.currentTech.cost) {
            player.techs.push(player.currentTech.id);
            player.currentTech = null;
        }
    }

    state.phase = PlayerPhase.Planning;
    return state;
}

function completeBuild(state: GameState, city: City) {
    if (!city.currentBuild) return;

    const build = city.currentBuild;
    const overflow = city.buildProgress - build.cost;

    if (build.type === "Unit") {
        const uType = build.id as UnitType;
        state.units.push({
            id: `u_${city.ownerId}_${Date.now()}`,
            type: uType,
            ownerId: city.ownerId,
            coord: city.coord,
            hp: UNITS[uType].hp,
            maxHp: UNITS[uType].hp,
            movesLeft: UNITS[uType].move,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        if (uType === UnitType.Settler) {
            city.pop = Math.max(1, city.pop - SETTLER_POP_LOSS_ON_BUILD);
            city.workedTiles = ensureWorkedTiles(city, state);
        }
    } else if (build.type === "Building") {
        city.buildings.push(build.id as BuildingType);
    } else if (build.type === "Project") {
        const pId = build.id as ProjectId;
        const player = state.players.find(p => p.id === city.ownerId);
        if (player) player.completedProjects.push(pId);
        if (PROJECTS[pId].onComplete.type === "Victory") {
            state.winnerId = player?.id;
        }
        if (pId === ProjectId.Observatory) {
            city.milestones.push(pId);
        }
        if (pId === ProjectId.GrandAcademy && player && !player.completedProjects.includes(ProjectId.GrandAcademy)) {
            city.milestones.push(pId);
        }
        if (pId.startsWith("FormArmy")) {
            const payload = PROJECTS[pId].onComplete.payload;
            const baseType = payload.baseUnit as UnitType;
            const armyType = payload.armyUnit as UnitType;
            const candidate = state.units.find(u =>
                u.ownerId === city.ownerId &&
                u.type === baseType &&
                u.hp === u.maxHp &&
                hexDistance(u.coord, city.coord) <= CITY_WORK_RADIUS_RINGS
            );
            if (candidate) {
                candidate.type = armyType;
                candidate.maxHp = UNITS[armyType].hp;
                candidate.hp = candidate.maxHp;
                candidate.movesLeft = UNITS[armyType].move;
            }
        }
    }

    city.currentBuild = null;
    city.buildProgress = overflow;
}

export function runEndOfRound(state: GameState) {
    if (state.winnerId) return;
    const progressWinner = checkProgressVictory(state);
    if (progressWinner) {
        state.winnerId = progressWinner;
        return;
    }
    const conquestWinner = checkConquestVictory(state);
    if (conquestWinner) {
        state.winnerId = conquestWinner;
    }
    eliminationSweep(state);
}

function checkProgressVictory(state: GameState): string | null {
    for (const player of state.players) {
        const hasProject = player.completedProjects.includes(ProjectId.GrandExperiment);
        const ownsCity = state.cities.some(c => c.ownerId === player.id);
        if (hasProject && ownsCity) return player.id;
    }
    return null;
}

function checkConquestVictory(state: GameState): string | null {
    const alivePlayers = state.players.filter(p => !p.isEliminated);
    for (const p of alivePlayers) {
        const ownsAllCapitals = state.cities.filter(c => c.isCapital).every(c => c.ownerId === p.id);
        if (ownsAllCapitals && state.cities.some(c => c.ownerId === p.id)) {
            return p.id;
        }
    }
    return null;
}

function eliminationSweep(state: GameState) {
    for (const player of state.players) {
        if (player.isEliminated) continue;
        const hasCity = state.cities.some(c => c.ownerId === player.id);
        const hasSettler = state.units.some(u => u.ownerId === player.id && u.type === UnitType.Settler);
        if (!hasCity && !hasSettler) {
            player.isEliminated = true;
            state.units = state.units.filter(u => u.ownerId !== player.id);
        }
    }
}

function healUnitsAtStart(state: GameState, playerId: string) {
    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const stats = UNITS[unit.type];
        const rested = unit.hasAttacked === false && unit.movesLeft === stats.move;
        if (!rested) continue;

        const tile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
        if (!tile || tile.ownerId !== playerId) continue;

        const inCity = state.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, unit.coord));
        const heal = inCity ? HEAL_FRIENDLY_CITY : HEAL_FRIENDLY_TILE;
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
    }
}

function getSciencePerTurn(state: GameState, playerId: string): number {
    const cities = state.cities.filter(c => c.ownerId === playerId);
    const player = state.players.find(p => p.id === playerId);
    const baseScience = cities.reduce((sum, c) => sum + getCityYields(c, state).S, 0);
    const signalRelayBonus = player?.techs.includes(TechId.SignalRelay) ? cities.length : 0;
    const grandAcademyBonus = player?.completedProjects.includes(ProjectId.GrandAcademy) ? cities.length : 0;
    return baseScience + signalRelayBonus + grandAcademyBonus;
}

