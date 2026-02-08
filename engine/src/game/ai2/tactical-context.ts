import { GameState } from "../../core/types.js";
import { getNeighbors, hexToString } from "../../core/hex.js";
import { buildLookupCache, LookupCache } from "../helpers/lookup-cache.js";
import { getAiProfileV2 } from "./rules.js";
import { getAiMemoryV2 } from "./memory.js";
import { warEnemyIds } from "./enemies.js";
import { buildPerception, type AiPerception } from "./perception.js";
import { getInfluenceMapsCached, type InfluenceMaps } from "./influence-map.js";
import { combineCostBias, makeInfluenceBias, getFlowFieldCached, type FlowField, type FlowFieldCacheOptions } from "./flow-field.js";

export type TacticalContext = {
    playerId: string;
    profile: ReturnType<typeof getAiProfileV2>;
    memory: ReturnType<typeof getAiMemoryV2>;
    enemyIds: Set<string>;
    perception: AiPerception;
    influence?: InfluenceMaps;
    myCities: GameState["cities"];
    myCityCoords: Set<string>;
    myRingCoords: Set<string>;
    createLookupCache: (state: GameState) => LookupCache;
    getFlowField: (target: { q: number; r: number }, options?: FlowFieldCacheOptions) => FlowField;
};

export function buildTacticalContext(state: GameState, playerId: string): TacticalContext {
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    const myCityCoords = new Set(myCities.map(c => hexToString(c.coord)));

    const myRingCoords = new Set<string>();
    for (const city of myCities) {
        for (const n of getNeighbors(city.coord)) {
            myRingCoords.add(hexToString(n));
        }
    }

    const enemyIds = warEnemyIds(state, playerId);
    const perception = buildPerception(state, playerId);
    const influence = state.map?.tiles?.length
        ? (getInfluenceMapsCached(state, playerId, { budget: 600 }).maps ?? undefined)
        : undefined;
    const influenceBias = makeInfluenceBias(
        influence ? { threat: influence.threat, pressure: influence.pressure, control: influence.control } : undefined,
        { threat: 0.45, pressure: 0.35, control: -0.2 }
    );

    return {
        playerId,
        profile: getAiProfileV2(state, playerId),
        memory: getAiMemoryV2(state, playerId),
        enemyIds,
        perception,
        influence,
        myCities,
        myCityCoords,
        myRingCoords,
        createLookupCache: (s: GameState) => buildLookupCache(s),
        getFlowField: (target, options) => {
            const costBias = combineCostBias(options?.costBias, influenceBias);
            const cacheKey = costBias ? (options?.cacheKey ?? "influence") : options?.cacheKey;
            return getFlowFieldCached(state, playerId, target, { ...options, costBias, cacheKey });
        }
    };
}
