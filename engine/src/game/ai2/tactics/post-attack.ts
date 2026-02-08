import { GameState } from "../../../core/types.js";
import { repositionRanged } from "../../ai/units/defense.js";
import { getAiMemoryV2, setAiMemoryV2 } from "../memory.js";
import { routeCityCapturesV2 } from "../siege-routing.js";
import { runSiegeAndRally } from "../siege-rally.js";
import { updateSiegeWaveMemory } from "../siege-wave.js";
import { runTitanPhase } from "../titan-flow.js";
import type { TacticalContext } from "../tactical-context.js";

export function runPostAttackPhase(
    state: GameState,
    playerId: string,
    tacticalContext: TacticalContext
): GameState {
    const next = state;
    const ownersBefore = new Map(state.cities.map(c => [c.id, c.ownerId]));

    next = updateSiegeWaveMemory(next, playerId, tacticalContext);
    next = repositionRanged(next, playerId);
    next = routeCityCapturesV2(next, playerId, tacticalContext);
    next = runTitanPhase(next, playerId, tacticalContext);
    next = runSiegeAndRally(next, playerId);

    next = resetSiegeFailuresOnCapture(next, playerId, ownersBefore);

    return next;
}

function resetSiegeFailuresOnCapture(
    state: GameState,
    playerId: string,
    ownersBefore: Map<string, string>
): GameState {
    const next = state;
    const captured = state.cities.filter(c => ownersBefore.get(c.id) !== c.ownerId && c.ownerId === playerId);
    if (captured.length === 0) return next;

    const memory = getAiMemoryV2(next, playerId);
    const updated = { ...memory };

    for (const city of captured) {
        const previousOwner = ownersBefore.get(city.id);
        if (previousOwner) {
            updated.lastCityCaptureTurn = {
                ...(updated.lastCityCaptureTurn ?? {}),
                [previousOwner]: next.turn
            };
        }
        if (updated.siegeFailureCount?.[city.id] !== undefined) {
            const nextFailures = { ...(updated.siegeFailureCount ?? {}) };
            delete nextFailures[city.id];
            updated.siegeFailureCount = nextFailures;
        }
        if (updated.focusCityId === city.id) {
            updated.siegeWaveActive = false;
            updated.siegeWaveStartTurn = undefined;
            updated.siegeLastProgressTurn = undefined;
            updated.siegeMinHpThisWave = undefined;
        }
    }

    return setAiMemoryV2(next, playerId, updated);
}
