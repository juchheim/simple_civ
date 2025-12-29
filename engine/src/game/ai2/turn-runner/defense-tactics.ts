import { GameState } from "../../../core/types.js";
import {
    defendCitiesV2,
    runHomeDefenderCombat,
    coordinateDefensiveFocusFire,
    runDefensiveRingCombat,
    positionDefensiveRing,
    sendMutualDefenseReinforcements,
    runTacticalDefense,
    runLastStandAttacks
} from "../defense.js";
import { runTacticsV2 } from "../tactics.js";

export function runDefenseAndTactics(state: GameState, playerId: string): GameState {
    let next = state;

    next = defendCitiesV2(next, playerId);
    next = positionDefensiveRing(next, playerId);
    next = sendMutualDefenseReinforcements(next, playerId);
    next = runHomeDefenderCombat(next, playerId);
    next = coordinateDefensiveFocusFire(next, playerId);
    next = runDefensiveRingCombat(next, playerId);
    next = runLastStandAttacks(next, playerId);
    next = runTacticalDefense(next, playerId);
    next = runTacticsV2(next, playerId);

    return next;
}
