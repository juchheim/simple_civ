import { DiplomacyState, GameState } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { estimateMilitaryPower } from "../../ai/goals.js";
import type { InfluenceMaps } from "../influence-map.js";
import { getInfluenceRatio } from "../diplomacy-helpers.js";
import { DIPLOMACY_DISTANCE_FALLBACK_MAX, FRONT_DISTANCE_BONUS_SCALE } from "./constants.js";

export type DiplomacyOpponentContext = {
    stance: DiplomacyState;
    ratio: number;
    effectiveRatio: number;
    effectiveOffensiveRatio: number;
    theirAnchor?: GameState["cities"][number];
    dist: number;
    frontRatio: number;
    pressureRatio: number;
    frontDistanceBonus: number;
};

export function buildDiplomacyOpponentContext(input: {
    state: GameState;
    playerId: string;
    other: GameState["players"][number];
    myPower: number;
    myOffensivePower: number;
    myAnchor?: GameState["cities"][number];
    influence?: InfluenceMaps;
    humanBias: number;
}): DiplomacyOpponentContext {
    const stance = input.state.diplomacy?.[input.playerId]?.[input.other.id] ?? DiplomacyState.Peace;
    const theirPower = estimateMilitaryPower(input.other.id, input.state);
    const ratio = theirPower > 0 ? input.myPower / theirPower : Infinity;
    const offensiveRatio = theirPower > 0 ? input.myOffensivePower / theirPower : Infinity;

    const theirCities = input.state.cities.filter(c => c.ownerId === input.other.id);
    const theirAnchor = theirCities.find(c => c.isCapital) ?? theirCities[0];
    const dist = (input.myAnchor && theirAnchor)
        ? hexDistance(input.myAnchor.coord, theirAnchor.coord)
        : DIPLOMACY_DISTANCE_FALLBACK_MAX;
    const frontRatio = Math.max(
        getInfluenceRatio(input.influence?.front, input.myAnchor?.coord),
        getInfluenceRatio(input.influence?.front, theirAnchor?.coord)
    );
    const pressureRatio = Math.max(
        getInfluenceRatio(input.influence?.pressure, input.myAnchor?.coord),
        getInfluenceRatio(input.influence?.pressure, theirAnchor?.coord)
    );
    const frontDistanceBonus = Math.round(frontRatio * FRONT_DISTANCE_BONUS_SCALE);

    const bias = !input.other.isAI ? input.humanBias : 1.0;
    const effectiveRatio = ratio * bias;
    const effectiveOffensiveRatio = offensiveRatio * bias;

    return {
        stance,
        ratio,
        effectiveRatio,
        effectiveOffensiveRatio,
        theirAnchor,
        dist,
        frontRatio,
        pressureRatio,
        frontDistanceBonus,
    };
}
