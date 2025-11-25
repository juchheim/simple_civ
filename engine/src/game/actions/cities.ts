import {
    BuildingType,
    City,
    GameState,
    HexCoord,
    ProjectId,
    TerrainType,
    UnitState,
    UnitType,
} from "../../core/types.js";
import {
    ATTACK_RANDOM_BAND,
    CITY_ATTACK_BASE,
    CITY_WARD_ATTACK_BONUS,
    CITY_WORK_RADIUS_RINGS,
    DAMAGE_BASE,
    DAMAGE_MAX,
    DAMAGE_MIN,
    TERRAIN,
    BUILDINGS,
    PROJECTS,
    UNITS,
} from "../../core/constants.js";
import { hexEquals, hexDistance, hexSpiral } from "../../core/hex.js";
import { getEffectiveUnitStats, hasClearLineOfSight } from "../helpers/combat.js";
import { claimCityTerritory, clearCityTerritory, ensureWorkedTiles, getCityName } from "../helpers/cities.js";
import { canBuild } from "../rules.js";

export function handleCityAttack(state: GameState, action: { type: "CityAttack"; playerId: string; cityId: string; targetUnitId: string }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");
    if (city.hasFiredThisTurn) throw new Error("City already attacked this turn");

    const garrison = state.units.find(u => hexEquals(u.coord, city.coord) && u.ownerId === action.playerId);
    if (!garrison) throw new Error("No garrison present");

    const target = state.units.find(u => u.id === action.targetUnitId);
    if (!target) throw new Error("Target not found");
    if (target.ownerId === action.playerId) throw new Error("Cannot target own unit");

    const dist = hexDistance(city.coord, target.coord);
    if (dist > 2) throw new Error("Target out of range");
    if (!hasClearLineOfSight(state, city.coord, target.coord)) throw new Error("Line of sight blocked");

    const randIdx = Math.floor(state.seed % 3);
    state.seed = (state.seed * 9301 + 49297) % 233280;
    const randomMod = ATTACK_RANDOM_BAND[randIdx];

    const attackPower = CITY_ATTACK_BASE + (city.buildings.includes(BuildingType.CityWard) ? CITY_WARD_ATTACK_BONUS : 0) + randomMod;
    let defensePower = getEffectiveUnitStats(target, state).def;
    const tile = state.map.tiles.find(t => hexEquals(t.coord, target.coord));
    if (tile) defensePower += TERRAIN[tile.terrain].defenseMod;
    if (target.state === UnitState.Fortified) defensePower += 1;

    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

    target.hp -= damage;
    if (target.hp <= 0) {
        state.units = state.units.filter(u => u.id !== target.id);
    }

    city.hasFiredThisTurn = true;
    return state;
}

export function handleFoundCity(state: GameState, action: { type: "FoundCity"; playerId: string; unitId: string; name: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.type !== UnitType.Settler) throw new Error("Not a settler");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");
    if (unit.movesLeft <= 0) throw new Error("No moves left");

    const tile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
    if (!tile) throw new Error("Invalid tile");
    if (tile.terrain === TerrainType.Mountain || tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) {
        throw new Error("Invalid terrain for city");
    }

    const territory = hexSpiral(unit.coord, CITY_WORK_RADIUS_RINGS);
    for (const coord of territory) {
        const t = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (t?.ownerId) {
            if (t.ownerId === action.playerId) {
                throw new Error("Too close to friendly city");
            } else {
                throw new Error("Too close to enemy territory");
            }
        }
    }

    const cityId = `c_${action.playerId}_${Date.now()}`;
    const newCity: City = {
        id: cityId,
        name: action.name || getCityName(state, state.players.find(p => p.id === action.playerId)?.civName || "", action.playerId),
        ownerId: action.playerId,
        coord: unit.coord,
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [unit.coord],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: state.cities.filter(c => c.ownerId === action.playerId).length === 0,
        hasFiredThisTurn: false,
        milestones: [],
    };

    claimCityTerritory(newCity, state, action.playerId, 1);
    newCity.workedTiles = ensureWorkedTiles(newCity, state);
    state.cities.push(newCity);
    state.units = state.units.filter(u => u.id !== unit.id);

    return state;
}

export function handleSetCityBuild(state: GameState, action: { type: "SetCityBuild"; playerId: string; cityId: string; buildType: "Unit" | "Building" | "Project"; buildId: string }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");

    if (city.currentBuild) throw new Error("City already building something");

    if (!canBuild(city, action.buildType, action.buildId, state)) {
        throw new Error("Cannot build this item");
    }

    let cost = 0;
    if (action.buildType === "Unit") cost = UNITS[action.buildId as UnitType].cost;
    if (action.buildType === "Building") cost = BUILDINGS[action.buildId as BuildingType].cost;
    if (action.buildType === "Project") cost = PROJECTS[action.buildId as ProjectId].cost;

    city.currentBuild = {
        type: action.buildType,
        id: action.buildId,
        cost,
    };

    return state;
}

export function handleRazeCity(state: GameState, action: { type: "RazeCity"; playerId: string; cityId: string }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");

    const hasGarrison = state.units.some(u => u.ownerId === action.playerId && hexEquals(u.coord, city.coord));
    if (!hasGarrison) throw new Error("No garrison present to raze the city");

    clearCityTerritory(city, state);
    state.cities = state.cities.filter(c => c.id !== city.id);
    return state;
}

export function handleSetWorkedTiles(state: GameState, action: { type: "SetWorkedTiles"; playerId: string; cityId: string; tiles: HexCoord[] }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");

    const allowed = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS);
    const coords = action.tiles;
    if (coords.length > city.pop) throw new Error("Too many tiles for population");
    const center = coords.find(c => hexEquals(c, city.coord));
    if (!center) throw new Error("Worked tiles must include city center");

    for (const coord of coords) {
        const owned = state.map.tiles.find(t => hexEquals(t.coord, coord) && t.ownerId === city.ownerId);
        if (!owned) throw new Error("Tile not owned by city owner");
        if (!allowed.some(c => hexEquals(c, coord))) throw new Error("Tile outside city radius");
        if (!TERRAIN[owned.terrain].workable) throw new Error("Tile not workable");
    }

    city.workedTiles = ensureWorkedTiles({ ...city, workedTiles: coords }, state);
    return state;
}
