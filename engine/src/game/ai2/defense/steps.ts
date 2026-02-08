import { GameState } from "../../../core/types.js";
import { planCapitalRingDefense } from "../defense-capital.js";
import { planCityGarrisons, planReinforceThreatenedCities } from "../defense-garrison.js";
import { DefenseMovePlan } from "../defense-actions.js";
import type { DefenseAssessment } from "./assessment.js";
import type { TacticalContext } from "../tactical-context.js";

type GetFlowField = TacticalContext["getFlowField"];

/**
 * Plan defense assignments via the unified planner.
 * Returns planned moves for city garrisons, capital ring, and reinforcements.
 */
export function planDefenseAssignments(
    state: GameState,
    playerId: string,
    assessment: DefenseAssessment,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>,
    getFlowField?: GetFlowField
): DefenseMovePlan[] {
    const plans: DefenseMovePlan[] = [];

    plans.push(...planCityGarrisons(state, playerId, assessment.cityThreats, assessment.cityCoords, reservedUnitIds, reservedCoords, getFlowField));
    plans.push(...planCapitalRingDefense(state, playerId, assessment.capital, assessment.cityCoords, reservedUnitIds, reservedCoords, getFlowField));
    plans.push(...planReinforceThreatenedCities(state, playerId, assessment.cityThreats, assessment.cityCoords, reservedUnitIds, reservedCoords));

    return plans;
}
