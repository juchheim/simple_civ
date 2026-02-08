import { City, GameState, Unit, UnitType } from "../../core/types.js";
import { hexDistance, hexSpiral, hexToString } from "../../core/hex.js";
import { OVERLAY, TERRAIN, UNITS } from "../../core/constants.js";
import { buildPerception, type AiPerception } from "./perception.js";
import { getCityValueProfile, getUnitThreatProfile } from "./tactical-threat.js";
import { clamp01 } from "./util.js";

export type InfluenceLayer = {
    name: string;
    values: Float32Array;
    max: number;
    get: (coord: { q: number; r: number }) => number;
};

export type InfluenceMaps = {
    width: number;
    height: number;
    indexByCoord: Map<string, number>;
    threat: InfluenceLayer;
    control: InfluenceLayer;
    border: InfluenceLayer;
    front: InfluenceLayer;
    pressure: InfluenceLayer;
    resource: InfluenceLayer;
    mobility: InfluenceLayer;
};

export type InfluenceBuildResult = {
    maps: InfluenceMaps | null;
    complete: boolean;
};

type InfluenceBuildPhase = "tiles" | "cities" | "enemyUnits" | "friendlyUnits" | "complete";

type InfluenceBuildProgress = {
    key: string;
    playerId: string;
    turn: number;
    width: number;
    height: number;
    tileCount: number;
    unitCount: number;
    cityCount: number;
    indexByCoord: Map<string, number>;
    threatValues: Float32Array;
    controlValues: Float32Array;
    borderValues: Float32Array;
    resourceValues: Float32Array;
    mobilityValues: Float32Array;
    tiles: GameState["map"]["tiles"];
    cities: GameState["cities"];
    enemyUnits: Unit[];
    friendlyUnits: Unit[];
    perception: AiPerception;
    phase: InfluenceBuildPhase;
    tileIndex: number;
    cityIndex: number;
    enemyIndex: number;
    friendlyIndex: number;
    maps?: InfluenceMaps;
};

type InfluenceBuildOptions = {
    budget?: number;
    forceFull?: boolean;
    perception?: AiPerception;
};

const UNIT_THREAT_SCALE = 0.08;
const UNIT_CONTROL_SCALE = 0.06;
const CITY_CONTROL_SCALE = 0.08;
const CITY_BORDER_SCALE = 0.05;
const CITY_RESOURCE_SCALE = 0.02;
const CITY_RESOURCE_RADIUS = 2;
const CITY_CONTROL_RADIUS = 3;
const CITY_BORDER_RADIUS = 5;

const influenceCache = new Map<string, InfluenceBuildProgress>();

function getIndex(indexByCoord: Map<string, number>, coord: { q: number; r: number }): number | null {
    const idx = indexByCoord.get(hexToString(coord));
    return idx === undefined ? null : idx;
}

function addRadialInfluence(
    values: Float32Array,
    indexByCoord: Map<string, number>,
    center: { q: number; r: number },
    radius: number,
    strength: number
): void {
    if (radius <= 0) {
        const idx = getIndex(indexByCoord, center);
        if (idx !== null) values[idx] += strength;
        return;
    }

    const coords = hexSpiral(center, radius);
    for (const coord of coords) {
        const idx = getIndex(indexByCoord, coord);
        if (idx === null) continue;
        const dist = hexDistance(center, coord);
        const falloff = clamp01(1 - dist / Math.max(1, radius));
        values[idx] += strength * falloff;
    }
}

function buildIndexByCoord(state: GameState): Map<string, number> {
    const indexByCoord = new Map<string, number>();
    state.map.tiles.forEach((tile, index) => {
        indexByCoord.set(hexToString(tile.coord), index);
    });
    return indexByCoord;
}

function computeLayerMax(values: Float32Array): number {
    let max = 0;
    for (const value of values) {
        if (value > max) max = value;
    }
    return max;
}

function makeLayer(
    name: string,
    values: Float32Array,
    indexByCoord: Map<string, number>
): InfluenceLayer {
    const max = computeLayerMax(values);
    return {
        name,
        values,
        max,
        get: (coord) => {
            const idx = getIndex(indexByCoord, coord);
            return idx === null ? 0 : values[idx];
        },
    };
}

function addCityInfluence(
    layer: Float32Array,
    indexByCoord: Map<string, number>,
    city: City,
    value: number,
    radius: number
): void {
    addRadialInfluence(layer, indexByCoord, city.coord, radius, value);
}

function addUnitInfluence(
    layer: Float32Array,
    indexByCoord: Map<string, number>,
    unit: Unit,
    value: number
): void {
    const stats = UNITS[unit.type as UnitType];
    const radius = Math.max(2, (stats?.rng ?? 1) + 2);
    addRadialInfluence(layer, indexByCoord, unit.coord, radius, value);
}

function computeTileResourceValue(tile: GameState["map"]["tiles"][number]): number {
    const terrain = TERRAIN[tile.terrain];
    let value = terrain.yields.F + terrain.yields.P + terrain.yields.S;
    for (const overlay of tile.overlays ?? []) {
        const bonus = OVERLAY[overlay]?.yieldBonus;
        if (!bonus) continue;
        value += (bonus.F ?? 0) + (bonus.P ?? 0) + (bonus.S ?? 0);
    }
    return value;
}

function computeTileMobilityValue(tile: GameState["map"]["tiles"][number]): number {
    const terrain = TERRAIN[tile.terrain];
    const cost = terrain.moveCostLand ?? terrain.moveCostNaval;
    if (!cost) return 0;
    return 1 / cost;
}

function getEnemyUnits(state: GameState, playerId: string, perception: AiPerception): Unit[] {
    if (!perception.visibilityKnown) {
        return state.units.filter(u => u.ownerId !== playerId);
    }
    return perception.visibleUnits.filter(u => u.ownerId !== playerId);
}

function getFriendlyUnits(state: GameState, playerId: string): Unit[] {
    return state.units.filter(u => u.ownerId === playerId);
}

export function buildInfluenceMaps(
    state: GameState,
    playerId: string,
    perception?: AiPerception
): InfluenceMaps {
    const tiles = state.map.tiles;
    const indexByCoord = buildIndexByCoord(state);
    const threatValues = new Float32Array(tiles.length);
    const controlValues = new Float32Array(tiles.length);
    const borderValues = new Float32Array(tiles.length);
    const resourceValues = new Float32Array(tiles.length);
    const mobilityValues = new Float32Array(tiles.length);

    const localPerception = perception ?? buildPerception(state, playerId);

    tiles.forEach((tile, index) => {
        resourceValues[index] = computeTileResourceValue(tile);
        mobilityValues[index] = computeTileMobilityValue(tile);
    });

    for (const city of state.cities) {
        const cityValue = getCityValueProfile(state, playerId, city).totalValue;
        const controlValue = cityValue * CITY_CONTROL_SCALE * (city.ownerId === playerId ? 1 : -1);
        addCityInfluence(controlValues, indexByCoord, city, controlValue, CITY_CONTROL_RADIUS);

        const resourceBoost = cityValue * CITY_RESOURCE_SCALE;
        addCityInfluence(resourceValues, indexByCoord, city, resourceBoost, CITY_RESOURCE_RADIUS);

        if (city.ownerId !== playerId) {
            const borderValue = cityValue * CITY_BORDER_SCALE;
            addCityInfluence(borderValues, indexByCoord, city, borderValue, CITY_BORDER_RADIUS);
        }
    }

    for (const unit of getEnemyUnits(state, playerId, localPerception)) {
        const threat = getUnitThreatProfile(unit).totalThreat * UNIT_THREAT_SCALE;
        addUnitInfluence(threatValues, indexByCoord, unit, threat);
    }

    for (const unit of getFriendlyUnits(state, playerId)) {
        const control = getUnitThreatProfile(unit).totalThreat * UNIT_CONTROL_SCALE;
        addUnitInfluence(controlValues, indexByCoord, unit, control);
    }

    const pressureValues = new Float32Array(tiles.length);
    const frontValues = new Float32Array(tiles.length);
    for (let i = 0; i < tiles.length; i++) {
        const pressure = threatValues[i] - controlValues[i];
        pressureValues[i] = Math.max(0, pressure);
        frontValues[i] = Math.max(borderValues[i], pressureValues[i]);
    }

    return {
        width: state.map.width,
        height: state.map.height,
        indexByCoord,
        threat: makeLayer("threat", threatValues, indexByCoord),
        control: makeLayer("control", controlValues, indexByCoord),
        border: makeLayer("border", borderValues, indexByCoord),
        front: makeLayer("front", frontValues, indexByCoord),
        pressure: makeLayer("pressure", pressureValues, indexByCoord),
        resource: makeLayer("resource", resourceValues, indexByCoord),
        mobility: makeLayer("mobility", mobilityValues, indexByCoord),
    };
}

function makeCacheKey(state: GameState, playerId: string): string {
    return `${playerId}:${state.turn}:${state.map.width}x${state.map.height}:${state.map.tiles.length}`;
}

function initBuildProgress(
    state: GameState,
    playerId: string,
    options?: InfluenceBuildOptions
): InfluenceBuildProgress {
    const tiles = state.map.tiles;
    const indexByCoord = buildIndexByCoord(state);
    const localPerception = options?.perception ?? buildPerception(state, playerId);
    const enemyUnits = getEnemyUnits(state, playerId, localPerception);
    const friendlyUnits = getFriendlyUnits(state, playerId);

    return {
        key: makeCacheKey(state, playerId),
        playerId,
        turn: state.turn,
        width: state.map.width,
        height: state.map.height,
        tileCount: tiles.length,
        unitCount: state.units.length,
        cityCount: state.cities.length,
        indexByCoord,
        threatValues: new Float32Array(tiles.length),
        controlValues: new Float32Array(tiles.length),
        borderValues: new Float32Array(tiles.length),
        resourceValues: new Float32Array(tiles.length),
        mobilityValues: new Float32Array(tiles.length),
        tiles,
        cities: state.cities,
        enemyUnits,
        friendlyUnits,
        perception: localPerception,
        phase: "tiles",
        tileIndex: 0,
        cityIndex: 0,
        enemyIndex: 0,
        friendlyIndex: 0,
    };
}

function finalizeInfluenceMaps(progress: InfluenceBuildProgress): InfluenceMaps {
    const pressureValues = new Float32Array(progress.tileCount);
    const frontValues = new Float32Array(progress.tileCount);
    for (let i = 0; i < progress.tileCount; i++) {
        const pressure = progress.threatValues[i] - progress.controlValues[i];
        pressureValues[i] = Math.max(0, pressure);
        frontValues[i] = Math.max(progress.borderValues[i], pressureValues[i]);
    }

    return {
        width: progress.width,
        height: progress.height,
        indexByCoord: progress.indexByCoord,
        threat: makeLayer("threat", progress.threatValues, progress.indexByCoord),
        control: makeLayer("control", progress.controlValues, progress.indexByCoord),
        border: makeLayer("border", progress.borderValues, progress.indexByCoord),
        front: makeLayer("front", frontValues, progress.indexByCoord),
        pressure: makeLayer("pressure", pressureValues, progress.indexByCoord),
        resource: makeLayer("resource", progress.resourceValues, progress.indexByCoord),
        mobility: makeLayer("mobility", progress.mobilityValues, progress.indexByCoord),
    };
}

function advanceBuild(
    progress: InfluenceBuildProgress,
    state: GameState,
    playerId: string,
    budget: number
): void {
    let remaining = budget;
    while (remaining > 0 && progress.phase !== "complete") {
        if (progress.phase === "tiles") {
            const start = progress.tileIndex;
            const end = Math.min(progress.tiles.length, start + remaining);
            for (let i = start; i < end; i++) {
                const tile = progress.tiles[i];
                progress.resourceValues[i] = computeTileResourceValue(tile);
                progress.mobilityValues[i] = computeTileMobilityValue(tile);
            }
            const processed = end - start;
            progress.tileIndex = end;
            remaining -= processed;
            if (progress.tileIndex >= progress.tiles.length) {
                progress.phase = "cities";
            }
            continue;
        }

        if (progress.phase === "cities") {
            if (progress.cityIndex >= progress.cities.length) {
                progress.phase = "enemyUnits";
                continue;
            }
            const city = progress.cities[progress.cityIndex];
            const cityValue = getCityValueProfile(state, playerId, city).totalValue;
            const controlValue = cityValue * CITY_CONTROL_SCALE * (city.ownerId === playerId ? 1 : -1);
            addCityInfluence(progress.controlValues, progress.indexByCoord, city, controlValue, CITY_CONTROL_RADIUS);
            const resourceBoost = cityValue * CITY_RESOURCE_SCALE;
            addCityInfluence(progress.resourceValues, progress.indexByCoord, city, resourceBoost, CITY_RESOURCE_RADIUS);
            if (city.ownerId !== playerId) {
                const borderValue = cityValue * CITY_BORDER_SCALE;
                addCityInfluence(progress.borderValues, progress.indexByCoord, city, borderValue, CITY_BORDER_RADIUS);
            }
            progress.cityIndex += 1;
            remaining -= 1;
            continue;
        }

        if (progress.phase === "enemyUnits") {
            if (progress.enemyIndex >= progress.enemyUnits.length) {
                progress.phase = "friendlyUnits";
                continue;
            }
            const unit = progress.enemyUnits[progress.enemyIndex];
            const threat = getUnitThreatProfile(unit).totalThreat * UNIT_THREAT_SCALE;
            addUnitInfluence(progress.threatValues, progress.indexByCoord, unit, threat);
            progress.enemyIndex += 1;
            remaining -= 1;
            continue;
        }

        if (progress.phase === "friendlyUnits") {
            if (progress.friendlyIndex >= progress.friendlyUnits.length) {
                progress.phase = "complete";
                continue;
            }
            const unit = progress.friendlyUnits[progress.friendlyIndex];
            const control = getUnitThreatProfile(unit).totalThreat * UNIT_CONTROL_SCALE;
            addUnitInfluence(progress.controlValues, progress.indexByCoord, unit, control);
            progress.friendlyIndex += 1;
            remaining -= 1;
            continue;
        }
    }

    if (progress.phase === "complete" && !progress.maps) {
        progress.maps = finalizeInfluenceMaps(progress);
    }
}

export function getInfluenceMapsCached(
    state: GameState,
    playerId: string,
    options?: InfluenceBuildOptions
): InfluenceBuildResult {
    const key = makeCacheKey(state, playerId);
    const budget = options?.forceFull ? Number.MAX_SAFE_INTEGER : (options?.budget ?? Number.MAX_SAFE_INTEGER);
    let progress = influenceCache.get(key);

    if (progress) {
        const stateMismatch = progress.turn !== state.turn ||
            progress.tileCount !== state.map.tiles.length ||
            progress.cityCount !== state.cities.length ||
            progress.unitCount !== state.units.length;
        if (stateMismatch) {
            progress = undefined;
            influenceCache.delete(key);
        }
    }

    if (!progress) {
        progress = initBuildProgress(state, playerId, options);
        influenceCache.set(key, progress);
    }

    if (!progress.maps || options?.forceFull || options?.budget !== undefined) {
        advanceBuild(progress, state, playerId, budget);
    }

    if (progress.maps) {
        return { maps: progress.maps, complete: true };
    }

    return { maps: null, complete: false };
}

export function clearInfluenceMapCache(playerId?: string): void {
    if (!playerId) {
        influenceCache.clear();
        return;
    }
    for (const key of influenceCache.keys()) {
        if (key.startsWith(`${playerId}:`)) {
            influenceCache.delete(key);
        }
    }
}

export function sumInfluenceInRadius(
    layer: InfluenceLayer,
    indexByCoord: Map<string, number>,
    center: { q: number; r: number },
    radius: number
): number {
    if (radius <= 0) return layer.get(center);

    let total = 0;
    const coords = hexSpiral(center, radius);
    for (const coord of coords) {
        const idx = indexByCoord.get(hexToString(coord));
        if (idx === undefined) continue;
        total += layer.values[idx];
    }
    return total;
}
