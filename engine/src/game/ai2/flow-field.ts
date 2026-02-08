import { GameState, UnitDomain } from "../../core/types.js";
import { getNeighbors, hexToString } from "../../core/hex.js";
import { TERRAIN } from "../../core/constants.js";

export type FlowField = {
    width: number;
    height: number;
    target: { q: number; r: number };
    indexByCoord: Map<string, number>;
    costs: Float32Array;
    getCost: (coord: { q: number; r: number }) => number;
    nextStep: (from: { q: number; r: number }) => { q: number; r: number } | null;
};

export type FlowFieldOptions = {
    domain?: UnitDomain;
    costBias?: (coord: { q: number; r: number }) => number;
};

export type FlowFieldCacheOptions = FlowFieldOptions & {
    cacheKey?: string;
    cache?: boolean;
};

export type FlowFieldBiasLayers = {
    threat?: { get: (coord: { q: number; r: number }) => number; max: number };
    pressure?: { get: (coord: { q: number; r: number }) => number; max: number };
    control?: { get: (coord: { q: number; r: number }) => number; max: number };
};

export function makeInfluenceBias(
    layers?: FlowFieldBiasLayers,
    weights?: { threat?: number; pressure?: number; control?: number }
): ((coord: { q: number; r: number }) => number) | undefined {
    if (!layers) return undefined;
    const threat = layers.threat;
    const pressure = layers.pressure;
    const control = layers.control;
    const threatW = weights?.threat ?? 0.4;
    const pressureW = weights?.pressure ?? 0.3;
    const controlW = weights?.control ?? -0.2;

    return (coord) => {
        let bias = 0;
        if (threat && threat.max > 0) {
            bias += (threat.get(coord) / threat.max) * threatW;
        }
        if (pressure && pressure.max > 0) {
            bias += (pressure.get(coord) / pressure.max) * pressureW;
        }
        if (control && control.max > 0) {
            bias += (control.get(coord) / control.max) * controlW;
        }
        return bias;
    };
}

export function combineCostBias(
    base?: (coord: { q: number; r: number }) => number,
    extra?: (coord: { q: number; r: number }) => number
): ((coord: { q: number; r: number }) => number) | undefined {
    if (!base && !extra) return undefined;
    if (!base) return extra;
    if (!extra) return base;
    return (coord) => base(coord) + extra(coord);
}

const flowFieldCache = new Map<string, FlowField>();

function buildIndexByCoord(state: GameState): Map<string, number> {
    const indexByCoord = new Map<string, number>();
    state.map.tiles.forEach((tile, index) => {
        indexByCoord.set(hexToString(tile.coord), index);
    });
    return indexByCoord;
}

function getMoveCost(
    state: GameState,
    index: number,
    domain: UnitDomain
): number | null {
    const tile = state.map.tiles[index];
    const terrain = TERRAIN[tile.terrain];
    if (domain === UnitDomain.Air) return 1;
    if (domain === UnitDomain.Naval) {
        const cost = terrain.moveCostNaval;
        return cost ?? null;
    }
    const cost = terrain.moveCostLand;
    return cost ?? null;
}

function makeCacheKey(
    state: GameState,
    playerId: string,
    target: { q: number; r: number },
    options: FlowFieldCacheOptions
): string {
    const domain = options.domain ?? UnitDomain.Land;
    const key = options.cacheKey ?? "base";
    return `${playerId}:${state.turn}:${state.map.width}x${state.map.height}:${state.map.tiles.length}:${domain}:${target.q},${target.r}:${key}`;
}

export function getFlowFieldCached(
    state: GameState,
    playerId: string,
    target: { q: number; r: number },
    options: FlowFieldCacheOptions = {}
): FlowField {
    const shouldCache = options.cache !== false && (!options.costBias || options.cacheKey);
    if (!shouldCache) {
        return buildFlowField(state, target, options);
    }

    const cacheKey = makeCacheKey(state, playerId, target, options);
    const cached = flowFieldCache.get(cacheKey);
    if (cached) return cached;

    const flow = buildFlowField(state, target, options);
    flowFieldCache.set(cacheKey, flow);
    return flow;
}

export function clearFlowFieldCache(playerId?: string): void {
    if (!playerId) {
        flowFieldCache.clear();
        return;
    }
    for (const key of flowFieldCache.keys()) {
        if (key.startsWith(`${playerId}:`)) {
            flowFieldCache.delete(key);
        }
    }
}

export function buildFlowField(
    state: GameState,
    target: { q: number; r: number },
    options: FlowFieldOptions = {}
): FlowField {
    const tiles = state.map.tiles;
    const width = state.map.width;
    const height = state.map.height;
    const indexByCoord = buildIndexByCoord(state);
    const costs = new Float32Array(tiles.length);
    costs.fill(Number.POSITIVE_INFINITY);

    const targetIndex = indexByCoord.get(hexToString(target));
    const domain = options.domain ?? UnitDomain.Land;
    const costBias = options.costBias;

    if (targetIndex !== undefined) {
        const targetCost = getMoveCost(state, targetIndex, domain);
        if (targetCost !== null) {
            costs[targetIndex] = 0;
            const open: number[] = [targetIndex];

            while (open.length > 0) {
                let bestIdx = 0;
                let bestCost = costs[open[0]];
                for (let i = 1; i < open.length; i++) {
                    const idx = open[i];
                    const cost = costs[idx];
                    if (cost < bestCost) {
                        bestCost = cost;
                        bestIdx = i;
                        bestCost = cost;
                    }
                }

                const currentIndex = open[bestIdx];
                open.splice(bestIdx, 1);
                const currentCoord = tiles[currentIndex].coord;

                for (const neighbor of getNeighbors(currentCoord)) {
                    const neighborIndex = indexByCoord.get(hexToString(neighbor));
                    if (neighborIndex === undefined) continue;
                    const moveCost = getMoveCost(state, neighborIndex, domain);
                    if (moveCost === null) continue;
                    const bias = costBias ? costBias(neighbor) : 0;
                    const nextCost = costs[currentIndex] + moveCost + bias;
                    if (nextCost < costs[neighborIndex]) {
                        costs[neighborIndex] = nextCost;
                        open.push(neighborIndex);
                    }
                }
            }
        }
    }

    const getCost = (coord: { q: number; r: number }): number => {
        const idx = indexByCoord.get(hexToString(coord));
        return idx === undefined ? Number.POSITIVE_INFINITY : costs[idx];
    };

    const nextStep = (from: { q: number; r: number }): { q: number; r: number } | null => {
        const currentCost = getCost(from);
        if (!Number.isFinite(currentCost)) return null;
        let bestNeighbor: { q: number; r: number } | null = null;
        let bestCost = currentCost;
        for (const neighbor of getNeighbors(from)) {
            const neighborCost = getCost(neighbor);
            if (neighborCost < bestCost) {
                bestCost = neighborCost;
                bestNeighbor = neighbor;
            }
        }
        return bestNeighbor;
    };

    return {
        width,
        height,
        target,
        indexByCoord,
        costs,
        getCost,
        nextStep,
    };
}
