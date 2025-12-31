/**
 * v8.0: Defense Situation Assessment System
 * 
 * Evaluates the tactical situation around each city and recommends
 * coordinated defensive responses.
 */

import { GameState, Unit, City } from "../../core/types.js";
import { buildDefenseSnapshot } from "./defense-situation/assessment.js";
import {
    computeDefenseScore,
    computeThreatScore,
    determineThreatLevel,
    recommendDefenseAction,
    selectFocusTarget
} from "./defense-situation/scoring.js";
import { getTacticalTuning } from "./tuning.js";

// Threat levels
export type ThreatLevel = "none" | "probe" | "raid" | "assault";

// Recommended defensive actions
export type DefenseAction = "hold" | "intercept" | "focus-fire" | "sortie" | "retreat";

export interface DefenseSituation {
    city: City;
    threatLevel: ThreatLevel;
    recommendedAction: DefenseAction;
    nearbyEnemies: Unit[];
    nearbyFriendlies: Unit[];
    garrison: Unit | null;
    ringUnits: Unit[];
    focusTarget: Unit | null;  // Best target for focus fire
    threatScore: number;       // Numeric threat assessment
    defenseScore: number;      // Our defensive strength
}

/**
 * Assess the defensive situation around a city.
 */
export function assessCitySituation(
    state: GameState,
    city: City,
    playerId: string
): DefenseSituation {
    const tuning = getTacticalTuning(state, playerId);
    const DETECTION_RANGE = tuning.defense.detectionRange;
    const RING_RANGE = tuning.ring.ringRadius;
    const snapshot = buildDefenseSnapshot(state, city, playerId, DETECTION_RANGE, RING_RANGE);
    const threatScore = computeThreatScore(state, city, snapshot.nearbyEnemies, DETECTION_RANGE);
    const defenseScore = computeDefenseScore(state, city, snapshot.garrison, snapshot.ringUnits, tuning);
    const threatLevel = determineThreatLevel(snapshot.nearbyEnemies, threatScore, defenseScore, tuning);
    const focusTarget = selectFocusTarget(
        state,
        playerId,
        city,
        snapshot.nearbyEnemies,
        snapshot.nearbyFriendlies
    );
    const recommendedAction = recommendDefenseAction({
        threatLevel,
        focusTarget,
        ringUnits: snapshot.ringUnits,
        nearbyFriendlies: snapshot.nearbyFriendlies,
        defenseScore,
        threatScore,
        city,
        tuning,
    });

    return {
        city,
        threatLevel,
        recommendedAction,
        nearbyEnemies: snapshot.nearbyEnemies,
        nearbyFriendlies: snapshot.nearbyFriendlies,
        garrison: snapshot.garrison,
        ringUnits: snapshot.ringUnits,
        focusTarget,
        threatScore,
        defenseScore,
    };
}

/**
 * Assess defense situation for all cities belonging to a player.
 */
export function assessDefenseSituation(
    state: GameState,
    playerId: string
): DefenseSituation[] {
    const myCities = state.cities.filter(c => c.ownerId === playerId);
    return myCities.map(city => assessCitySituation(state, city, playerId));
}
