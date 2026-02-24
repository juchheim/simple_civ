import { BuildingType, City, GameState, HexCoord, OverlayType, TerrainType } from "../../core/types.js";
import { CAPTURED_CITY_HP_RESET, CITY_WORK_RADIUS_RINGS, TERRAIN, CITY_NAMES } from "../../core/constants.js";
import { hexDistance, hexEquals, hexSpiral, hexToString } from "../../core/hex.js";
import { getTileYields } from "../rules.js";
import { isTileAdjacentToRiver } from "../../map/rivers.js";

const GAME_LOG_ENABLED = typeof process !== "undefined" && process.env.DEBUG_GAME_LOGS === "true";
const gameLog = (...args: unknown[]): void => {
    if (GAME_LOG_ENABLED) console.info(...args);
};

export function maxClaimableRing(city: City): number {
    if (city.pop >= 3) return Math.min(2, CITY_WORK_RADIUS_RINGS);
    return 1;
}

export function getClaimedRing(city: City, state: GameState): number {
    const ownedTiles = state.map.tiles.filter(t => t.ownerCityId === city.id);
    if (ownedTiles.length === 0) return 0;
    return Math.min(
        CITY_WORK_RADIUS_RINGS,
        Math.max(...ownedTiles.map(t => hexDistance(t.coord, city.coord)))
    );
}

import { expelUnitsFromTerritory } from "./movement.js";

export function claimCityTerritory(city: City, state: GameState, ownerId: string, maxRing: number = CITY_WORK_RADIUS_RINGS) {
    const territory = hexSpiral(city.coord, Math.min(maxRing, CITY_WORK_RADIUS_RINGS));
    const newlyClaimedTiles: HexCoord[] = [];

    for (const coord of territory) {
        const tile = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (tile) {
            // Skip tiles owned by OTHER PLAYERS (enemy cities block territory)
            const ownedByEnemy = tile.ownerId && tile.ownerId !== ownerId;
            if (ownedByEnemy) continue;

            // Skip tiles already owned by another of this player's cities (don't reassign)
            const ownedByFriendlyCity = tile.ownerCityId && tile.ownerCityId !== city.id && tile.ownerId === ownerId;
            if (ownedByFriendlyCity) continue;

            if (tile.ownerId !== ownerId) {
                newlyClaimedTiles.push(coord);
            }

            tile.ownerId = ownerId;
            tile.ownerCityId = city.id;
            tile.hasCityCenter = hexEquals(coord, city.coord);
        }
    }

    // v7.11: Trigger expulsion for any units caught in the newly claimed territory
    // We only need to check units that are on the newly claimed tiles
    if (newlyClaimedTiles.length > 0) {
        const affectedUnitOwners = new Set<string>();
        for (const u of state.units) {
            if (u.ownerId !== ownerId && newlyClaimedTiles.some(t => hexEquals(t, u.coord))) {
                affectedUnitOwners.add(u.ownerId);
            }
        }
        for (const foreignPid of affectedUnitOwners) {
            // Only expel if we are NOT at war (if at war, they can stay/attack)
            const diplomacy = state.diplomacy[ownerId]?.[foreignPid];
            if (diplomacy !== "War") {
                expelUnitsFromTerritory(state, foreignPid, ownerId);
            }
        }
    }
}

export function clearCityTerritory(city: City, state: GameState) {
    const territory = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS);
    for (const coord of territory) {
        const tile = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (tile) {
            tile.ownerId = undefined;
            tile.ownerCityId = undefined;
            if (tile.hasCityCenter) tile.hasCityCenter = false;
        }
    }
}

export function ensureWorkedTiles(
    city: City,
    state: GameState,
    opts: { pinned?: HexCoord[]; excluded?: HexCoord[]; fillMissing?: boolean } = {},
): HexCoord[] {
    const ownedCoords = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS).filter(coord => {
        const t = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        return t && t.ownerId === city.ownerId && TERRAIN[t.terrain].workable;
    });

    const allowed = new Set(ownedCoords.map(c => hexToString(c)));
    const centerKey = hexToString(city.coord);
    const popSlots = Math.max(1, city.pop);

    const pinned = opts.pinned ?? city.manualWorkedTiles ?? [];
    const excluded = opts.excluded ?? city.manualExcludedTiles ?? [];
    const fillMissing = opts.fillMissing ?? true;
    const pinnedValid = pinned
        .filter(c => allowed.has(hexToString(c)))
        .reduce<HexCoord[]>((acc, coord) => {
            const key = hexToString(coord);
            if (acc.some(c => hexToString(c) === key)) return acc;
            acc.push(coord);
            return acc;
        }, []);

    if (!pinnedValid.some(c => hexEquals(c, city.coord)) && allowed.has(centerKey)) {
        pinnedValid.unshift(city.coord);
    }

    const excludedKeys = new Set(
        excluded
            .filter(c => !hexEquals(c, city.coord))
            .map(c => hexToString(c)),
    );

    if (!fillMissing) {
        const trimmed = pinnedValid.slice(0, popSlots);
        if (!trimmed.some(c => hexEquals(c, city.coord)) && allowed.has(centerKey)) {
            trimmed.unshift(city.coord);
        }
        while (trimmed.length > popSlots) trimmed.pop();
        return trimmed;
    }

    const scored = ownedCoords
        .map(coord => ({ coord, score: tileScore(coord, state, city) }))
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.coord);

    const worked: HexCoord[] = [];
    const workedKeys = new Set<string>();

    for (const coord of pinnedValid) {
        if (worked.length >= popSlots) break;
        const key = hexToString(coord);
        if (workedKeys.has(key)) continue;
        workedKeys.add(key);
        worked.push(coord);
    }

    for (const coord of scored) {
        if (worked.length >= popSlots) break;
        const key = hexToString(coord);
        if (workedKeys.has(key)) continue;
        if (excludedKeys.has(key)) continue;
        workedKeys.add(key);
        worked.push(coord);
    }

    if (!worked.some(c => hexEquals(c, city.coord)) && allowed.has(centerKey)) {
        worked.unshift(city.coord);
        while (worked.length > popSlots) worked.pop();
    }

    return worked;
}

export function tileScore(coord: HexCoord, state: GameState, city: City): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -999;
    const base = getTileYields(tile);
    const player = state.players.find(p => p.id === city.ownerId);
    const civ = player?.civName;

    let food = base.F;
    let production = base.P;
    const science = base.S;
    let gold = base.G;

    const adjRiver = isTileAdjacentToRiver(state.map, coord);
    if (adjRiver) {
        food += 1; // Base river adjacency bonus applied during city yield calc
    }
    if (civ === "RiverLeague" && adjRiver) {
        food += 1;
        // v0.99 TWEAK: Value river tiles at +0.5 Prod to chase the 2-tile bonus
        production += 0.5;
    }
    if (civ === "ForgeClans" && tile.terrain === TerrainType.Hills) {
        production += 1;
    }

    const isMarketHallGrowthPush = city.pop < 5 && (
        city.buildings.includes(BuildingType.MarketHall) ||
        (city.currentBuild?.type === "Building" && city.currentBuild.id === BuildingType.MarketHall)
    );
    if (isMarketHallGrowthPush) {
        food += 1;
    }

    const hasOrBuildingBank = city.buildings.includes(BuildingType.Bank) ||
        (city.currentBuild?.type === "Building" && city.currentBuild.id === BuildingType.Bank);
    if (hasOrBuildingBank && tile.overlays.includes(OverlayType.OreVein)) {
        production += 0.5;
        gold += 2;
    }

    const netGold = player?.netGold ?? 0;
    const treasury = player?.treasury ?? 0;
    const underEconomicPressure = !!player?.austerityActive || netGold < 0 || treasury <= 20;
    const goldWeight = underEconomicPressure ? 2 : 1;

    const total = food + production + science + (gold * goldWeight);

    // Prioritize overall yield; tie-breaker prefers Food, then Production, then Gold, then Science.
    return total * 100 + food * 10 + production * 2 + gold * 2 + science;
}

export function captureCity(state: GameState, city: City, newOwnerId: string) {
    gameLog(`[GAME] City Captured: ${city.name} (${city.ownerId} -> ${newOwnerId})`);
    city.ownerId = newOwnerId;
    city.hp = CAPTURED_CITY_HP_RESET;
    city.pop = Math.max(1, city.pop - 1);
    city.currentBuild = null;
    city.buildProgress = 0;
    city.manualWorkedTiles = undefined;
    city.manualExcludedTiles = undefined;

    const currentRing = getClaimedRing(city, state);
    const targetRing = Math.max(currentRing, maxClaimableRing(city));
    // v6.8: Clear old owner's territory before claiming for new owner
    clearCityTerritory(city, state);
    claimCityTerritory(city, state, newOwnerId, targetRing);
    city.workedTiles = ensureWorkedTiles(city, state);
    city.hasFiredThisTurn = false;
}

export function getCityName(state: GameState, civName: string, ownerId: string): string {
    const playerCities = state.cities.filter(c => c.ownerId === ownerId);
    const nameList = CITY_NAMES[civName] || [];

    // First city is always the Capital (first name in list)
    // UNLESS it's already been used (e.g. lost capital and founding new one? No, capital is special)
    // Actually, if we lost our capital, we might want to reclaim it or found a new one.
    // But for unique names, we should just check the used list.

    // Initialize if missing
    if (!state.usedCityNames) state.usedCityNames = [];

    // If this is the player's first city ever (no cities, no used names for this player?), 
    // we might want to ensure they get their capital name if available.
    // But simplest logic is: pick first available name from list.

    const usedNames = new Set(state.usedCityNames);

    // Also include current cities just in case sync is off, though usedCityNames should cover it
    state.cities.forEach(c => usedNames.add(c.name));

    const availableNames = nameList.filter(name => !usedNames.has(name));

    if (availableNames.length > 0) {
        // If it's the very first city for this player, try to give them the first name (Capital)
        // if it's available.
        if (playerCities.length === 0 && availableNames.includes(nameList[0])) {
            return nameList[0];
        }

        // Otherwise pick random available
        const randomIndex = Math.floor(Math.random() * availableNames.length);
        return availableNames[randomIndex];
    }

    // Fallback if all names used
    let counter = playerCities.length + 1;
    let fallbackName = `New ${nameList[0] || "City"} ${counter}`;
    while (usedNames.has(fallbackName)) {
        counter++;
        fallbackName = `New ${nameList[0] || "City"} ${counter}`;
    }
    return fallbackName;
}

export function createCity(
    state: GameState,
    ownerId: string,
    coord: HexCoord,
    options: { name?: string; storedProduction?: number; startingFood?: number } = {},
): City {
    const player = state.players.find(p => p.id === ownerId);
    const playerCities = state.cities.filter(c => c.ownerId === ownerId);

    // Generate unique ID using seed
    const rand = Math.floor(state.seed * 10000);
    state.seed = (state.seed * 9301 + 49297) % 233280;
    const cityId = `c_${ownerId}_${Date.now()}_${rand}`;

    const name = options.name && options.name.trim().length > 0
        ? options.name
        : getCityName(state, player?.civName || "", ownerId);

    // Jade start-food bonus disabled; handled via other civ balance levers.
    const startingFood = options.startingFood ?? 0;

    // v6.8: Calculate isCapital BEFORE setting hasFoundedFirstCity
    // The first city for a player is their capital
    const isCapital = playerCities.length === 0 && !player?.hasFoundedFirstCity;

    if (player) {
        player.hasFoundedFirstCity = true;
    }

    const newCity: City = {
        id: cityId,
        name,
        ownerId,
        coord,
        pop: 1,
        storedFood: startingFood,
        storedProduction: options.storedProduction ?? 0,
        buildings: [],
        workedTiles: [coord],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital,
        originalOwnerId: ownerId, // v6.7: Track original founder for capital recapture AI
        hasFiredThisTurn: false,
        milestones: [],
        savedProduction: {},
    };

    // Track used city name
    if (!state.usedCityNames) state.usedCityNames = [];
    if (!state.usedCityNames.includes(newCity.name)) {
        state.usedCityNames.push(newCity.name);
    }

    return newCity;
}
