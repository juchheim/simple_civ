import { GameState } from "../../core/types.js";
import { initValidationContext, clearValidationContext } from "../ai/shared/validation.js";
import { tryAction } from "../ai/shared/actions.js";
import { chooseVictoryGoalV2 } from "./strategy.js";
import { chooseTechV2 } from "./tech.js";
import { chooseCityBuildV2 } from "./production.js";
import { assignWorkedTilesV2 } from "./tiles.js";
import { decideDiplomacyActionsV2 } from "./diplomacy.js";
import { defendCitiesV2, runHomeDefenderCombat, coordinateDefensiveFocusFire, runDefensiveRingCombat, positionDefensiveRing, sendMutualDefenseReinforcements, runTacticalDefense, runLastStandAttacks } from "./defense.js";
import { runTacticsV2 } from "./tactics.js";
import { manageSettlerEscorts, moveSettlersAndFound } from "../ai/units/settlers.js";
// Scout exploration and camp clearing from Legacy
import { patrolAndExplore } from "../ai/units/exploration.js";
import { manageCampClearing } from "../ai/camp-clearing.js";
// City razing from Legacy
import { considerRazing } from "../ai/cities.js";

/**
 * Utility/Playstyle AI v2.
 * Standalone decision engine driven by per-civ profiles and utility scoring.
 */
export function runAiTurnSequenceV2(initialState: GameState, playerId: string): GameState {
    initValidationContext(initialState, playerId);

    let state = initialState;
    const goal = chooseVictoryGoalV2(state, playerId);

    // Tech selection
    const tech = chooseTechV2(state, playerId, goal);
    if (tech) {
        state = tryAction(state, { type: "ChooseTech", playerId, techId: tech });
    }

    // City builds
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    for (const city of myCities) {
        if (city.currentBuild) continue;
        const opt = chooseCityBuildV2(state, playerId, city, goal);
        if (!opt) continue;
        state = tryAction(state, { type: "SetCityBuild", playerId, cityId: city.id, buildType: opt.type, buildId: opt.id, markAsHomeDefender: opt.markAsHomeDefender });
    }

    // Tiles
    state = assignWorkedTilesV2(state, playerId, goal);

    // Expansion (reuse existing move/found + escort mechanics; decision layer is v2)
    state = manageSettlerEscorts(state, playerId);
    state = moveSettlersAndFound(state, playerId);

    // Camp clearing management (phase transitions, preparation)
    state = manageCampClearing(state, playerId);

    // Diplomacy
    const dip = decideDiplomacyActionsV2(state, playerId, goal);
    state = dip.state;
    for (const a of dip.actions) {
        state = tryAction(state, a);
    }

    // Defense + tactics
    state = defendCitiesV2(state, playerId);
    state = positionDefensiveRing(state, playerId); // v7.2: Position excess defenders in ring around city
    state = sendMutualDefenseReinforcements(state, playerId); // v7.2: Cities share defenders with threatened neighbors
    state = runHomeDefenderCombat(state, playerId); // v7.1: Home defenders attack enemies in territory
    state = coordinateDefensiveFocusFire(state, playerId); // v7.2: Coordinate defenders to kill enemies
    state = runDefensiveRingCombat(state, playerId); // v7.8: Ring defenders attack approaching enemies
    state = runLastStandAttacks(state, playerId); // v8.1: Cornered units fight back instead of dying passively
    state = runTacticalDefense(state, playerId); // v8.0: Situation-aware tactical defense (intercept, focus-fire, sortie)
    state = runTacticsV2(state, playerId);

    // City razing: consider consolidating poorly-situated captured cities
    state = considerRazing(state, playerId);

    // Scout exploration and idle military return (after combat is resolved)
    state = patrolAndExplore(state, playerId);

    clearValidationContext();
    return state;
}


