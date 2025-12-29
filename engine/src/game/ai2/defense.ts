import { GameState } from "../../core/types.js";
import { buildDefenseAssessment } from "./defense/assessment.js";
import { runDefenseAssignments } from "./defense/steps.js";

export {
    runHomeDefenderCombat,
    coordinateDefensiveFocusFire,
    runDefensiveRingCombat,
    runLastStandAttacks,
    runTacticalDefense
} from "./defense-combat.js";
export { positionDefensiveRing } from "./defense-ring.js";
export { sendMutualDefenseReinforcements } from "./defense-mutual-defense.js";
export { isPerimeterCity } from "./defense-perimeter.js";

export function defendCitiesV2(state: GameState, playerId: string): GameState {
    const assessment = buildDefenseAssessment(state, playerId);
    if (!assessment) return state;
    return runDefenseAssignments(state, playerId, assessment);
}
