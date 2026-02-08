import { GameState } from "../../core/types.js";
import { initValidationContext, clearValidationContext } from "../ai/shared/validation.js";
import { chooseVictoryGoalV2 } from "./strategy.js";
import { runTechSelection } from "./turn-runner/tech.js";
import { runCityBuilds } from "./turn-runner/production.js";
import { runTileAssignments } from "./turn-runner/tiles.js";
import { runExpansion } from "./turn-runner/expansion.js";
import { runCampClearing } from "./turn-runner/camp-clearing.js";
import { runDiplomacy } from "./turn-runner/diplomacy.js";
import { runDefenseAndTactics } from "./turn-runner/defense-tactics.js";
import { runPostCombat } from "./turn-runner/post-combat.js";
import { runTheaterManager } from "./theater-manager.js";
import { clearInfluenceMapCache, getInfluenceMapsCached } from "./influence-map.js";
import { clearFlowFieldCache } from "./flow-field.js";

const INFLUENCE_BUDGET_EARLY = 400;
const INFLUENCE_BUDGET_MID = 700;
const INFLUENCE_BUDGET_LATE = 1200;

function primeInfluenceCache(state: GameState, playerId: string, budget: number): void {
    if (!state.map?.tiles || state.map.tiles.length === 0) return;
    getInfluenceMapsCached(state, playerId, { budget });
}

/**
 * Utility/Playstyle AI v2.
 * Standalone decision engine driven by per-civ profiles and utility scoring.
 */
export function runAiTurnSequenceV2(initialState: GameState, playerId: string): GameState {
    initValidationContext(initialState, playerId);
    clearInfluenceMapCache(playerId);
    clearFlowFieldCache(playerId);

    let state = initialState;
    const goal = chooseVictoryGoalV2(state, playerId);

    // Tech selection
    state = runTechSelection(state, playerId, goal);

    // City builds
    primeInfluenceCache(state, playerId, INFLUENCE_BUDGET_EARLY);
    state = runCityBuilds(state, playerId, goal);

    // Tiles
    state = runTileAssignments(state, playerId, goal);

    // Expansion (reuse existing move/found + escort mechanics; decision layer is v2)
    state = runExpansion(state, playerId);
    clearInfluenceMapCache(playerId);
    primeInfluenceCache(state, playerId, INFLUENCE_BUDGET_MID);

    // Camp clearing management (phase transitions, preparation)
    state = runCampClearing(state, playerId);

    // Diplomacy
    state = runDiplomacy(state, playerId, goal);

    // Operational theater manager (front clustering + objective assignment)
    primeInfluenceCache(state, playerId, INFLUENCE_BUDGET_LATE);
    state = runTheaterManager(state, playerId);

    // Defense + tactics
    state = runDefenseAndTactics(state, playerId);

    // City razing + scout exploration (after combat is resolved)
    state = runPostCombat(state, playerId);

    clearValidationContext();
    return state;
}
