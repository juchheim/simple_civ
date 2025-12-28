import { GameState } from "../../core/types.js";
import { getNeighbors, hexToString } from "../../core/hex.js";
import { buildLookupCache, LookupCache } from "../helpers/lookup-cache.js";
import { getAiProfileV2 } from "./rules.js";
import { getAiMemoryV2 } from "./memory.js";
import { warEnemyIds } from "./enemies.js";

export type TacticalContext = {
    playerId: string;
    profile: ReturnType<typeof getAiProfileV2>;
    memory: ReturnType<typeof getAiMemoryV2>;
    enemyIds: Set<string>;
    myCities: GameState["cities"];
    myCityCoords: Set<string>;
    myRingCoords: Set<string>;
    createLookupCache: (state: GameState) => LookupCache;
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

    return {
        playerId,
        profile: getAiProfileV2(state, playerId),
        memory: getAiMemoryV2(state, playerId),
        enemyIds,
        myCities,
        myCityCoords,
        myRingCoords,
        createLookupCache: (s: GameState) => buildLookupCache(s)
    };
}
