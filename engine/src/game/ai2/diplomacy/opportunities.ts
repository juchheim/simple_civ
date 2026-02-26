import { GameState } from "../../../core/types.js";
import { canDeclareWar } from "../../helpers/diplomacy.js";
import { OPPORTUNITY_PUNITIVE_STRIKE_MIN_FREE_UNITS } from "./constants.js";
import { detectCounterAttackOpportunity } from "./opportunities-counter-attack.js";
import { detectEarlyRushOpportunity } from "./opportunities-early-rush.js";
import { findVulnerableCity, isMilitaryUnit } from "./opportunities-shared.js";

export { hasUnitsStaged } from "./opportunities-staging.js";
export { detectEarlyRushOpportunity } from "./opportunities-early-rush.js";
export { detectCounterAttackOpportunity } from "./opportunities-counter-attack.js";

export type TacticalOpportunity = {
    targetId: string;
    focusCity?: { q: number; r: number; name: string; id: string };
    reason: string;
};

export function checkTacticalOpportunity(
    state: GameState,
    playerId: string
): TacticalOpportunity | null {
    const earlyRush = detectEarlyRushOpportunity(state, playerId);
    if (earlyRush) {
        const targetCities = state.cities.filter(c => c.ownerId === earlyRush.targetId);
        const focusCity = targetCities.find(c => c.isCapital) || targetCities[0];
        if (focusCity) {
            return {
                targetId: earlyRush.targetId,
                focusCity: { q: focusCity.coord.q, r: focusCity.coord.r, name: focusCity.name, id: focusCity.id },
                reason: `Early Rush (priority ${earlyRush.priority})`
            };
        }
    }

    const counterAttack = detectCounterAttackOpportunity(state, playerId);
    if (counterAttack) {
        return {
            targetId: counterAttack.targetId,
            focusCity: counterAttack.vulnerableCity,
            reason: `Counter-Attack (priority ${counterAttack.priority})`
        };
    }

    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        if (!canDeclareWar(state, playerId, other.id)) continue;

        const vulnerable = findVulnerableCity(state, other.id, 0);
        if (vulnerable) {
            const myCityCoordsSet = new Set(
                state.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`)
            );
            const freeUnits = state.units.filter(u =>
                u.ownerId === playerId &&
                isMilitaryUnit(u) &&
                !u.isHomeDefender &&
                !myCityCoordsSet.has(`${u.coord.q},${u.coord.r}`)
            );

            if (freeUnits.length >= OPPORTUNITY_PUNITIVE_STRIKE_MIN_FREE_UNITS) {
                return {
                    targetId: other.id,
                    focusCity: vulnerable,
                    reason: `Punitive Strike (0 defenders on ${vulnerable.name})`
                };
            }
        }
    }

    return null;
}
