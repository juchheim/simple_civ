import { GameState } from "../../../core/types.js";
import { repositionRanged } from "../../ai/units/defense.js";
import { routeCityCapturesV2 } from "../siege-routing.js";
import { runSiegeAndRally } from "../siege-rally.js";
import { runTitanPhase } from "../titan-flow.js";
import type { TacticalContext } from "../tactical-context.js";

export function runPostAttackPhase(
    state: GameState,
    playerId: string,
    tacticalContext: TacticalContext
): GameState {
    let next = state;

    next = repositionRanged(next, playerId);
    next = routeCityCapturesV2(next, playerId, tacticalContext);
    next = runTitanPhase(next, playerId, tacticalContext);
    next = runSiegeAndRally(next, playerId);

    return next;
}
