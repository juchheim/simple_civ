import { GameState } from "../../core/types.js";
import { selectFocusTargetV2 } from "./strategy.js";
import { buildTacticalContext } from "./tactical-context.js";
import { runTacticsPreparation } from "./tactics/prep.js";
import { runAttackPhase } from "./tactics/attack.js";
import { runMoveAttackPhase } from "./tactics/move-attack.js";
import { runPostAttackPhase } from "./tactics/post-attack.js";

export function runTacticsV2(state: GameState, playerId: string): GameState {
    let next = state;

    // Ensure focus target exists (sets memory).
    const focused = selectFocusTargetV2(next, playerId);
    next = focused.state;
    const tacticalContext = buildTacticalContext(next, playerId);

    const preparation = runTacticsPreparation(next, playerId);
    next = preparation.state;

    next = runAttackPhase(next, playerId, tacticalContext, preparation.armyPhase);
    next = runMoveAttackPhase(next, playerId, preparation.armyPhase);
    next = runPostAttackPhase(next, playerId, tacticalContext);
    return next;
}
