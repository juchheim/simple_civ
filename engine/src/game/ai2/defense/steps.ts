import { GameState } from "../../../core/types.js";
import { defendCapitalRing } from "../defense-capital.js";
import { ensureCityGarrisons, reinforceThreatenedCities } from "../defense-garrison.js";
import type { DefenseAssessment } from "./assessment.js";

export function runDefenseAssignments(
    state: GameState,
    playerId: string,
    assessment: DefenseAssessment
): GameState {
    let next = state;

    next = ensureCityGarrisons(next, playerId, assessment.cityThreats, assessment.cityCoords);
    next = defendCapitalRing(next, playerId, assessment.capital, assessment.cityCoords);
    next = reinforceThreatenedCities(next, playerId, assessment.cityThreats, assessment.cityCoords);

    return next;
}
