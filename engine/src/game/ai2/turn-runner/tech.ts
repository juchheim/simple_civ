import { AiVictoryGoal, GameState } from "../../../core/types.js";
import { tryAction } from "../../ai/shared/actions.js";
import { chooseTechV2 } from "../tech.js";

export function runTechSelection(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    const tech = chooseTechV2(state, playerId, goal);
    if (!tech) return state;
    return tryAction(state, { type: "ChooseTech", playerId, techId: tech });
}
