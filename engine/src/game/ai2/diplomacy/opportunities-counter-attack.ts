import { GameState } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { getAiProfileV2 } from "../rules.js";
import { canDeclareWar } from "../../helpers/diplomacy.js";
import { OPPORTUNITY_COUNTER_ATTACK } from "./constants.js";
import { isMilitaryUnit } from "./opportunities-shared.js";

type CounterAttackVulnerableCity = {
    q: number;
    r: number;
    name: string;
    id: string;
};

export type CounterAttackOpportunity = {
    targetId: string;
    priority: number;
    vulnerableCity: CounterAttackVulnerableCity;
};

export function detectCounterAttackOpportunity(
    state: GameState,
    playerId: string
): CounterAttackOpportunity | null {
    const profile = getAiProfileV2(state, playerId);
    if (!profile.diplomacy.canInitiateWars) return null;

    const myMilitary = state.units.filter(u => u.ownerId === playerId && isMilitaryUnit(u));

    let bestOpportunity: CounterAttackOpportunity | null = null;

    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        if (!canDeclareWar(state, playerId, other.id)) continue;

        const theirCities = state.cities.filter(c => c.ownerId === other.id);
        const theirMilitary = state.units.filter(u => u.ownerId === other.id && isMilitaryUnit(u));

        if (theirCities.length === 0 || theirMilitary.length === 0) continue;

        let mostVulnerable: { city: typeof theirCities[0]; defenders: number } | null = null;
        for (const city of theirCities) {
            const defenders = theirMilitary.filter(u => hexDistance(u.coord, city.coord) <= 2).length;
            if (!mostVulnerable || defenders < mostVulnerable.defenders) {
                mostVulnerable = { city, defenders };
            }
        }

        if (!mostVulnerable) continue;

        let totalDistFromHome = 0;
        for (const unit of theirMilitary) {
            let minDistToCity = Infinity;
            for (const city of theirCities) {
                const dist = hexDistance(unit.coord, city.coord);
                if (dist < minDistToCity) minDistToCity = dist;
            }
            totalDistFromHome += minDistToCity;
        }
        const avgDistFromHome = totalDistFromHome / theirMilitary.length;

        let priority = 0;

        priority += (3 - mostVulnerable.defenders) * 10;

        const nearbyFriendlies = myMilitary.filter(u =>
            hexDistance(u.coord, mostVulnerable!.city.coord) <= 5
        ).length;
        priority += Math.min(20, nearbyFriendlies * 5);

        if (avgDistFromHome >= 5) priority += 15;
        if (avgDistFromHome >= 8) priority += 10;

        if (mostVulnerable.city.isCapital) priority += 10;

        if (priority >= OPPORTUNITY_COUNTER_ATTACK.minimumPriority && (!bestOpportunity || priority > bestOpportunity.priority)) {
            bestOpportunity = {
                targetId: other.id,
                priority,
                vulnerableCity: {
                    q: mostVulnerable.city.coord.q,
                    r: mostVulnerable.city.coord.r,
                    name: mostVulnerable.city.name,
                    id: mostVulnerable.city.id
                }
            };
        }
    }

    return bestOpportunity;
}
