import { GameState } from "../../core/types.js";
import { aiVictoryBias, setAiGoal } from "./goals.js";
import { pickTech, chooseFallbackTech } from "./tech.js";
import { assignWorkedTiles, pickCityBuilds } from "./cities.js";
import { moveSettlersAndFound, manageSettlerEscorts, patrolAndExplore, defendCities, rotateGarrisons, retreatWounded, repositionRanged, routeCityCaptures, attackTargets, moveMilitaryTowardTargets } from "./units.js";
import { handleDiplomacy } from "./diplomacy.js";
import { tracedApply, TraceEntry, safeClone } from "./trace.js";
import { setTraceContext, clearTraceContext } from "./shared/actions.js";
import { tryAction } from "./shared/actions.js";

export function runAiTurnSequence(initialState: GameState, playerId: string): GameState {
    let state = initialState;
    const goal = aiVictoryBias(playerId, state);
    state = setAiGoal(state, playerId, goal);

    state = pickTech(state, playerId, goal);
    const player = state.players.find(p => p.id === playerId);
    if (player?.isAI && !player.currentTech) {
        const fallbackTech = chooseFallbackTech(playerId, state);
        if (fallbackTech) {
            state = tryAction(state, { type: "ChooseTech", playerId, techId: fallbackTech });
        }
    }
    state = pickCityBuilds(state, playerId, goal);
    state = assignWorkedTiles(state, playerId, goal);
    state = moveSettlersAndFound(state, playerId);
    state = manageSettlerEscorts(state, playerId);
    state = patrolAndExplore(state, playerId);
    state = defendCities(state, playerId);
    state = rotateGarrisons(state, playerId);
    state = handleDiplomacy(state, playerId);
    state = retreatWounded(state, playerId);
    state = repositionRanged(state, playerId);
    state = routeCityCaptures(state, playerId);
    state = attackTargets(state, playerId);
    state = moveMilitaryTowardTargets(state, playerId);

    return state;
}

export function runAiTurnSequenceWithTrace(initialState: GameState, playerId: string, trace: TraceEntry[], options?: { skipDiplomacy?: boolean }): GameState {
    let state = initialState;
    trace.push({ playerId, action: { type: "StartTurn" }, before: safeClone(state), after: safeClone(state) });
    setTraceContext(trace, playerId);
    const goal = aiVictoryBias(playerId, state);
    state = setAiGoal(state, playerId, goal);

    // Tech / cities / tiles
    state = pickTech(state, playerId, goal);
    state = pickCityBuilds(state, playerId, goal);
    state = assignWorkedTiles(state, playerId, goal);

    // Units + diplomacy (wrapped via traced actions where applicable)
    state = moveSettlersAndFound(state, playerId);
    state = manageSettlerEscorts(state, playerId);
    state = patrolAndExplore(state, playerId);
    state = defendCities(state, playerId);
    state = rotateGarrisons(state, playerId);
    if (!options?.skipDiplomacy) {
        state = handleDiplomacy(state, playerId);
    }
    state = retreatWounded(state, playerId);
    state = repositionRanged(state, playerId);
    state = routeCityCaptures(state, playerId);
    state = attackTargets(state, playerId);
    state = moveMilitaryTowardTargets(state, playerId);

    trace.push({ playerId, action: { type: "EndTurn" }, before: safeClone(initialState), after: safeClone(state) });
    clearTraceContext();
    return state;
}
