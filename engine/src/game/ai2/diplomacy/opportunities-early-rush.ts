import { GameState } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { estimateMilitaryPower } from "../../ai/goals.js";
import { getAiProfileV2 } from "../rules.js";
import { canDeclareWar } from "../../helpers/diplomacy.js";
import { EARLY_RUSH_SEED_MOD, OPPORTUNITY_EARLY_RUSH } from "./constants.js";
import { isMilitaryUnit } from "./opportunities-shared.js";

export type EarlyRushOpportunity = {
    targetId: string;
    priority: number;
};

export function detectEarlyRushOpportunity(
    state: GameState,
    playerId: string
): EarlyRushOpportunity | null {
    const profile = getAiProfileV2(state, playerId);
    if (!profile.diplomacy.canInitiateWars) return null;

    if (state.turn > OPPORTUNITY_EARLY_RUSH.maxTurn) return null;

    const rushChance = (profile as any).earlyRushChance || 0;
    if (rushChance <= 0) return null;

    const hash = playerId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const roll = ((state.turn * 7 + hash) % EARLY_RUSH_SEED_MOD) / EARLY_RUSH_SEED_MOD;
    if (roll > rushChance) return null;

    const myPower = estimateMilitaryPower(playerId, state);
    const myCities = state.cities.filter(c => c.ownerId === playerId);

    let bestTarget: EarlyRushOpportunity | null = null;

    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        if (!canDeclareWar(state, playerId, other.id)) continue;

        const theirPower = estimateMilitaryPower(other.id, state);
        const theirCities = state.cities.filter(c => c.ownerId === other.id);
        const theirMilitary = state.units.filter(u => u.ownerId === other.id && isMilitaryUnit(u));

        let priority = 0;

        if (myPower > theirPower * 1.5) priority += 15;
        if (myPower > theirPower * 2.0) priority += 15;

        const overExpansion = theirCities.length - theirMilitary.length;
        if (overExpansion > 0) priority += Math.min(20, overExpansion * 5);

        const theirCapital = theirCities.find(c => c.isCapital);
        if (theirCapital) {
            const capitalDefenders = theirMilitary.filter(u =>
                hexDistance(u.coord, theirCapital.coord) <= 2
            ).length;
            if (capitalDefenders === 0) priority += 25;
            else if (capitalDefenders === 1) priority += 15;
            else if (capitalDefenders === 2) priority += 5;
        }

        const myCapital = myCities.find(c => c.isCapital);
        if (myCapital && theirCapital) {
            const dist = hexDistance(myCapital.coord, theirCapital.coord);
            if (dist <= 8) priority += 15;
            else if (dist <= 12) priority += 10;
            else if (dist <= 16) priority += 5;
        }

        if (priority >= OPPORTUNITY_EARLY_RUSH.minimumPriority && (!bestTarget || priority > bestTarget.priority)) {
            bestTarget = { targetId: other.id, priority };
        }
    }

    return bestTarget;
}
