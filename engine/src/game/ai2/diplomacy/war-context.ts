import type { AiVictoryGoal, GameState } from "../../../core/types.js";
import type { AiPlayerMemoryV2 } from "../memory.js";
import {
    getWarEscalationFactor,
    hasUnitType,
    isConquestThreat,
    isProgressCiv,
    isProgressThreat,
    stanceDurationOk
} from "./utils.js";
import { WAR_THREAT_DISTANCE_OVERRIDE } from "./constants.js";

export type WarPreflightContext = {
    isAetherianPreTitan: boolean;
    needsCities: boolean;
    targetHasWeakCity: boolean;
    overwhelmingPeace: boolean;
    progressThreat: boolean;
    conquestThreat: boolean;
    hasTitanNow: boolean;
    isAetherian: boolean;
    requiredRatio: number;
    escalatedRatio: number;
    effectiveDist: number;
    allowDistance: number;
};

export function buildWarPreflightContext(input: {
    state: GameState;
    playerId: string;
    targetId: string;
    goal: AiVictoryGoal;
    civName: string;
    canInitiateWars: boolean;
    warPowerRatio: number;
    minStanceTurns: number;
    warDistanceMax: number;
    ratio: number;
    dist: number;
    frontDistanceBonus: number;
    memory: AiPlayerMemoryV2;
}): WarPreflightContext {
    const hasTitanNow = hasUnitType(input.state, input.playerId, "Titan");
    const isAetherian = input.civName === "AetherianVanguard";
    const isAetherianPreTitan = isAetherian && !hasTitanNow;

    const myCityCount = input.state.cities.filter(c => c.ownerId === input.playerId).length;
    const needsCities = myCityCount < 4;
    const targetHasWeakCity = input.state.cities.some(c =>
        c.ownerId === input.targetId && c.hp <= 0
    );

    const overwhelmingPeace = input.ratio >= 3 &&
        !stanceDurationOk(
            input.state,
            input.playerId,
            input.targetId,
            Math.ceil(input.minStanceTurns * 0.4),
            input.memory
        );

    const progressThreat =
        isProgressThreat(input.state, input.targetId) &&
        input.canInitiateWars &&
        (input.goal === "Conquest" || input.warPowerRatio <= 1.35);

    const conquestThreat =
        isConquestThreat(input.state, input.targetId) &&
        input.canInitiateWars;

    const requiredRatio = (hasTitanNow && isAetherian)
        ? Math.min(input.warPowerRatio, 0.9)
        : (progressThreat
            ? Math.min(input.warPowerRatio * 0.7, 1.0)
            : (conquestThreat ? 0.4 : input.warPowerRatio));

    const escalationFactor = getWarEscalationFactor(input.state.turn);
    const escalatedRatio = requiredRatio * escalationFactor;

    const myPlayer = input.state.players.find(p => p.id === input.playerId);
    const iAmProgressCiv = myPlayer?.civName === "ScholarKingdoms" || myPlayer?.civName === "StarborneSeekers";
    const targetIsProgressCiv = isProgressCiv(input.state, input.targetId);
    const progressCivDistanceBonus = (!iAmProgressCiv && targetIsProgressCiv) ? 6 : 0;
    const effectiveDist = Math.max(1, input.dist - progressCivDistanceBonus - input.frontDistanceBonus);
    const allowDistance = (progressThreat || conquestThreat)
        ? Math.max(input.warDistanceMax, WAR_THREAT_DISTANCE_OVERRIDE)
        : input.warDistanceMax;

    return {
        isAetherianPreTitan,
        needsCities,
        targetHasWeakCity,
        overwhelmingPeace,
        progressThreat,
        conquestThreat,
        hasTitanNow,
        isAetherian,
        requiredRatio,
        escalatedRatio,
        effectiveDist,
        allowDistance,
    };
}
