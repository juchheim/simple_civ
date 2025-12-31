import { GameState } from "../../core/types.js";
import { getWarEnemyIds } from "./schema.js";

export function warEnemyIds(state: GameState, playerId: string): Set<string> {
    return getWarEnemyIds(state, playerId);
}
