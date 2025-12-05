import {
    BuildingType,
    City,
    GameState,
    HexCoord,
    ProjectId,
    TerrainType,
    UnitState,
    UnitType,
    DiplomacyState,
    HistoryEventType,
} from "../../core/types.js";
import { logEvent } from "../history.js";
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
    UNITS,
    FORGE_CLANS_MILITARY_DISCOUNT,
} from "../../core/constants.js";
import { hexEquals, hexDistance, hexSpiral, hexToString } from "../../core/hex.js";
import { getEffectiveUnitStats, hasClearLineOfSight } from "../helpers/combat.js";
import { claimCityTerritory, clearCityTerritory, ensureWorkedTiles, getCityName } from "../helpers/cities.js";
import { expelUnitsFromTerritory } from "../helpers/movement.js";
import { canBuild, getMinimumCityDistance, getProjectCost } from "../rules.js";
import { getUnitCost } from "../units.js";

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

    const targetKey = hexToString(target.coord);
    if (state.visibility[action.playerId] && !state.visibility[action.playerId].includes(targetKey)) {
        throw new Error("Target not visible");
    }

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

// export function handleCityAttack(state: GameState, action: { type: "CityAttack"; playerId: string; cityId: string; targetUnitId: string }): GameState {
//     const city = state.cities.find(c => c.id === action.cityId);
//     if (!city) throw new Error("City not found");
//     if (city.ownerId !== action.playerId) throw new Error("Not your city");
//     if (city.hasFiredThisTurn) throw new Error("City already attacked this turn");

//     const garrison = state.units.find(u => hexEquals(u.coord, city.coord) && u.ownerId === action.playerId);
//     if (!garrison) throw new Error("No garrison present");

//     const target = state.units.find(u => u.id === action.targetUnitId);
//     if (!target) throw new Error("Target not found");
//     if (target.ownerId === action.playerId) throw new Error("Cannot target own unit");

//     const dist = hexDistance(city.coord, target.coord);
//     if (dist > 2) throw new Error("Target out of range");
//     if (!hasClearLineOfSight(state, city.coord, target.coord)) throw new Error("Line of sight blocked");

//     // v0.99 Fix: Strictly enforce visibility check
//     const targetKey = hexToString(target.coord);
//     if (state.visibility[action.playerId] && !state.visibility[action.playerId].includes(targetKey)) {
//         throw new Error("Target not visible");
//     }

//     const randIdx = Math.floor(state.seed % 3);
//     state.seed = (state.seed * 9301 + 49297) % 233280;
//     const randomMod = ATTACK_RANDOM_BAND[randIdx];

//     const attackPower = CITY_ATTACK_BASE + (city.buildings.includes(BuildingType.CityWard) ? CITY_WARD_ATTACK_BONUS : 0) + randomMod;
//     let defensePower = getEffectiveUnitStats(target, state).def;
//     const tile = state.map.tiles.find(t => hexEquals(t.coord, target.coord));
//     if (tile) defensePower += TERRAIN[tile.terrain].defenseMod;
//     if (target.state === UnitState.Fortified) defensePower += 1;

//     const delta = attackPower - defensePower;
//     const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
//     const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

//     target.hp -= damage;
//     if (target.hp <= 0) {
//         state.units = state.units.filter(u => u.id !== target.id);
//     }

//     city.hasFiredThisTurn = true;
//     return state;
// }

export function handleFoundCity(state: GameState, action: { type: "FoundCity"; playerId: string; unitId: string; name: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.type !== UnitType.Settler) throw new Error("Not a settler");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");

    const tile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
    if (!tile) throw new Error("Invalid tile");
    if (tile.terrain === TerrainType.Mountain || tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) {
        throw new Error("Invalid terrain for city");
    }

    // Check if founding tile is owned or has a city center
    if (tile.ownerId) throw new Error("Tile already owned");
    if (tile.hasCityCenter) throw new Error("City already exists here");

    // Check minimum distance to any existing city (distance 3 minimum)
    const MIN_CITY_DISTANCE = getMinimumCityDistance(state, action.playerId);
    for (const city of state.cities) {
        const distance = hexDistance(unit.coord, city.coord);
        if (distance < MIN_CITY_DISTANCE) {
            if (city.ownerId === action.playerId) {
                throw new Error("Too close to friendly city");
            } else {
                throw new Error("Too close to enemy city");
            }
        }
    }

    // Generate unique ID using seed
    const rand = Math.floor(state.seed * 10000);
    state.seed = (state.seed * 9301 + 49297) % 233280;
    const cityId = `c_${action.playerId}_${Date.now()}_${rand}`;
    const player = state.players.find(p => p.id === action.playerId);

    // JadeCovenant "Bountiful Harvest" passive: Cities start with +5 stored Food
    const startingFood = player?.civName === "JadeCovenant" ? 5 : 0;

    if (player) {
        player.hasFoundedFirstCity = true;
    }

    const newCity: City = {
        id: cityId,
        name: action.name || getCityName(state, player?.civName || "", action.playerId),
        ownerId: action.playerId,
        coord: unit.coord,
        pop: 1,
        storedFood: startingFood,
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
        savedProduction: {},
    };

    // Track used city name
    if (!state.usedCityNames) state.usedCityNames = [];
    if (!state.usedCityNames.includes(newCity.name)) {
        state.usedCityNames.push(newCity.name);
    }

    claimCityTerritory(newCity, state, action.playerId, 1);
    newCity.workedTiles = ensureWorkedTiles(newCity, state);
    state.cities.push(newCity);
    state.units = state.units.filter(u => u.id !== unit.id);

    // Expel units from other players if not at war
    for (const otherPlayer of state.players) {
        if (otherPlayer.id === action.playerId) continue;

        const isAtWar = state.diplomacy[action.playerId]?.[otherPlayer.id] === DiplomacyState.War;
        if (!isAtWar) {
            expelUnitsFromTerritory(state, otherPlayer.id, action.playerId);
        }
    }

    logEvent(state, HistoryEventType.CityFounded, action.playerId, { cityId: newCity.id, cityName: newCity.name, coord: newCity.coord });

    return state;
}

export function handleSetCityBuild(state: GameState, action: { type: "SetCityBuild"; playerId: string; cityId: string; buildType: "Unit" | "Building" | "Project"; buildId: string }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");

    // if (city.currentBuild) throw new Error("City already building something");
    // Change: Allow switching production. Save progress if switching.

    if (!canBuild(city, action.buildType, action.buildId, state)) {
        throw new Error("Cannot build this item");
    }

    // Save current progress if exists
    if (city.currentBuild) {
        const key = `${city.currentBuild.type}:${city.currentBuild.id}`;
        if (!city.savedProduction) city.savedProduction = {};
        city.savedProduction[key] = city.buildProgress;
    }

    const player = state.players.find(p => p.id === action.playerId);
    let cost = 0;
    if (action.buildType === "Unit") {
        const unitType = action.buildId as UnitType;
        cost = getUnitCost(unitType, state.turn);

        // v0.98 Update 5: ForgeClans "Forged Arms" - 20% cheaper military units
        // Only applies to non-civilian units
        if (player?.civName === "ForgeClans" && UNITS[unitType].domain !== "Civilian") {
            cost = Math.floor(cost * FORGE_CLANS_MILITARY_DISCOUNT);
        }

        // v0.98 Update 9: JadeCovenant "Expansionist" - 30% cheaper Settlers
        if (player?.civName === "JadeCovenant" && unitType === UnitType.Settler) {
            cost = Math.floor(cost * 0.7);
        }
    }
    if (action.buildType === "Building") cost = BUILDINGS[action.buildId as BuildingType].cost;
    if (action.buildType === "Project") cost = getProjectCost(action.buildId as ProjectId, state.turn);

    // Restore saved progress if exists
    const newKey = `${action.buildType}:${action.buildId}`;
    let savedProgress = 0;
    if (city.savedProduction && city.savedProduction[newKey]) {
        savedProgress = city.savedProduction[newKey];
        delete city.savedProduction[newKey]; // Remove from saved since it's now active
    }

    city.currentBuild = {
        type: action.buildType,
        id: action.buildId,
        cost,
    };
    city.buildProgress = savedProgress;

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

    logEvent(state, HistoryEventType.CityRazed, action.playerId, { cityId: city.id, cityName: city.name, coord: city.coord });

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

    const pinned = coords.reduce<HexCoord[]>((acc, coord) => {
        const key = hexToString(coord);
        if (acc.some(c => hexToString(c) === key)) return acc;
        acc.push(coord);
        return acc;
    }, []);

    const previousPinned = city.manualWorkedTiles ?? [];
    const previousExcluded = city.manualExcludedTiles ?? [];
    const removedFromCurrent = city.workedTiles.filter(c => !coords.some(nc => hexEquals(nc, c)));
    const removedFromPinned = previousPinned.filter(c => !coords.some(nc => hexEquals(nc, c)));

    const nextExcluded: HexCoord[] = [];
    const pushUnique = (coord: HexCoord) => {
        if (nextExcluded.some(c => hexEquals(c, coord))) return;
        nextExcluded.push(coord);
    };
    [...previousExcluded, ...removedFromCurrent, ...removedFromPinned].forEach(pushUnique);

    // Do not exclude pins that are explicitly re-selected
    const finalExcluded = nextExcluded.filter(c => !pinned.some(p => hexEquals(p, c)));

    city.manualWorkedTiles = pinned;
    city.manualExcludedTiles = finalExcluded;
    city.workedTiles = ensureWorkedTiles(
        { ...city, workedTiles: coords, manualWorkedTiles: pinned, manualExcludedTiles: finalExcluded },
        state,
        { pinned, excluded: finalExcluded, fillMissing: false },
    );
    return state;
}
