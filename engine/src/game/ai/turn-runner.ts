import { GameState } from "../../core/types.js";
import { aiVictoryBias, setAiGoal } from "./goals.js";
import { pickTech, chooseFallbackTech } from "./tech.js";
import { assignWorkedTiles, pickCityBuilds, considerRazing } from "./cities.js";
import { moveSettlersAndFound, manageSettlerEscorts, patrolAndExplore, defendCities, rotateGarrisons, retreatWounded, repositionRanged, routeCityCaptures, attackTargets, moveMilitaryTowardTargets, titanRampage } from "./units.js";
import { handleDiplomacy } from "./diplomacy.js";
import { TraceEntry, safeClone } from "./trace.js";
import { setTraceContext, clearTraceContext } from "./shared/actions.js";
import { tryAction } from "./shared/actions.js";
import { initValidationContext, clearValidationContext } from "./shared/validation.js";

export function runAiTurnSequence(initialState: GameState, playerId: string): GameState {
    // Initialize validation context for efficient pre-checks
    initValidationContext(initialState, playerId);
    
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
    // CRITICAL: Manage escorts BEFORE settlers move, so settlers have protection
    state = manageSettlerEscorts(state, playerId);
    state = moveSettlersAndFound(state, playerId);
    state = patrolAndExplore(state, playerId);
    state = defendCities(state, playerId);
    state = rotateGarrisons(state, playerId);
    state = handleDiplomacy(state, playerId);
    state = retreatWounded(state, playerId);
    state = repositionRanged(state, playerId);
    state = routeCityCaptures(state, playerId);
    state = attackTargets(state, playerId);
    state = moveMilitaryTowardTargets(state, playerId);
    
    // v0.97: Titan Rampage - aggressive city capture for AetherianVanguard
    state = titanRampage(state, playerId);
    
    // Consider razing poorly situated cities (v0.96 balance)
    state = considerRazing(state, playerId);

    // Clear validation context at end of turn
    clearValidationContext();
    
    return state;
}

export function runAiTurnSequenceWithTrace(initialState: GameState, playerId: string, trace: TraceEntry[], options?: { skipDiplomacy?: boolean }): GameState {
    // Initialize validation context for efficient pre-checks
    initValidationContext(initialState, playerId);
    
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
    // CRITICAL: Manage escorts BEFORE settlers move, so settlers have protection
    state = manageSettlerEscorts(state, playerId);
    state = moveSettlersAndFound(state, playerId);
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
    
    // v0.97: Titan Rampage - aggressive city capture for AetherianVanguard
    state = titanRampage(state, playerId);
    
    // Consider razing poorly situated cities (v0.96 balance)
    state = considerRazing(state, playerId);

    trace.push({ playerId, action: { type: "EndTurn" }, before: safeClone(initialState), after: safeClone(state) });
    clearTraceContext();
    
    // Clear validation context at end of turn
    clearValidationContext();
    
    return state;
}
