import { AiVictoryGoal, GameState } from "../../../core/types.js";
import { CITY_STATE_INVEST_GAIN } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getAiMemoryV2, setAiMemoryV2 } from "../memory.js";
import { decideDiplomacyActionsV2 } from "../diplomacy.js";
import { isCityStateTurnoverCandidate, pickCityStateInvestmentTarget } from "../city-state-policy.js";
import { computeEconomySnapshot, type EconomySnapshot } from "../economy/budget.js";

const CITY_STATE_FOCUS_STALE_TURNS = 24;
const CITY_STATE_MAX_INVESTMENTS_PER_TURN = 6;

type CityStatePressureSnapshot = {
    contestedTotal: number;
    defensiveRaces: number;
    challengerRaces: number;
    flipWindowRaces: number;
};

function getTopRivalInfluence(state: GameState, playerId: string, cityStateId: string): number {
    const cityState = (state.cityStates ?? []).find(cs => cs.id === cityStateId);
    if (!cityState) return 0;
    let top = 0;
    for (const rival of state.players) {
        if (rival.id === playerId || rival.isEliminated) continue;
        if (cityState.warByPlayer[rival.id]) continue;
        const influence = cityState.influenceByPlayer[rival.id] ?? 0;
        if (influence > top) top = influence;
    }
    return top;
}

function sanitizeCityStateFocusId(
    state: GameState,
    playerId: string,
    focusId: string | undefined,
    focusSetTurn: number | undefined,
): string | undefined {
    if (!focusId) return undefined;
    const cityState = (state.cityStates ?? []).find(cs => cs.id === focusId);
    if (!cityState) return undefined;
    if (!cityState.discoveredByPlayer[playerId]) return undefined;
    if (cityState.warByPlayer[playerId]) return undefined;
    if ((cityState.lastInvestTurnByPlayer[playerId] ?? -1) === state.turn) return undefined;

    if (focusSetTurn !== undefined && (state.turn - focusSetTurn) > CITY_STATE_FOCUS_STALE_TURNS) {
        const lastInvestTurn = cityState.lastInvestTurnByPlayer[playerId] ?? -1;
        const persistTurnoverCampaign = isCityStateTurnoverCandidate(cityState, playerId, 3.25);
        if (lastInvestTurn < (state.turn - 3) && !persistTurnoverCampaign) return undefined;
    }

    if (cityState.suzerainId === playerId) {
        const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
        const topRivalInfluence = getTopRivalInfluence(state, playerId, cityState.id);
        if ((myInfluence - topRivalInfluence) > Math.ceil(CITY_STATE_INVEST_GAIN * 0.65)) {
            return undefined;
        }
    }

    return focusId;
}

function summarizeCityStatePressure(state: GameState, playerId: string): CityStatePressureSnapshot {
    let contestedTotal = 0;
    let defensiveRaces = 0;
    let challengerRaces = 0;
    let flipWindowRaces = 0;

    for (const cityState of state.cityStates ?? []) {
        if (!cityState.discoveredByPlayer[playerId]) continue;
        if (cityState.warByPlayer[playerId]) continue;

        const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
        const topInfluence = Math.max(...Object.values(cityState.influenceByPlayer));
        const topRivalInfluence = getTopRivalInfluence(state, playerId, cityState.id);
        const isSuzerain = cityState.suzerainId === playerId;

        if (isSuzerain) {
            const lead = myInfluence - topRivalInfluence;
            if (topRivalInfluence > 0 && lead <= Math.ceil(CITY_STATE_INVEST_GAIN * 1.15)) {
                contestedTotal++;
                defensiveRaces++;
            }
            continue;
        }

        const gap = topInfluence - myInfluence;
        if (gap <= (CITY_STATE_INVEST_GAIN * 3)) {
            contestedTotal++;
            challengerRaces++;
            if (isCityStateTurnoverCandidate(cityState, playerId, 1.5)) {
                flipWindowRaces++;
            }
        }
    }

    return {
        contestedTotal,
        defensiveRaces,
        challengerRaces,
        flipWindowRaces,
    };
}

export function computeCityStateInvestmentCadence(
    state: GameState,
    playerId: string,
    focusCityStateId: string | undefined,
    economy?: EconomySnapshot,
): number {
    const cityStates = (state.cityStates ?? [])
        .filter(cityState => cityState.discoveredByPlayer[playerId])
        .filter(cityState => !cityState.warByPlayer[playerId])
        .filter(cityState => (cityState.lastInvestTurnByPlayer[playerId] ?? -1) !== state.turn);
    if (cityStates.length === 0) return 0;

    const snapshot = economy ?? computeEconomySnapshot(state, playerId);
    const controlledCityStates = (state.cityStates ?? []).filter(
        cityState => cityState.suzerainId === playerId && cityState.discoveredByPlayer[playerId],
    ).length;
    let maxInvestments = snapshot.economyState === "Healthy" ? 3 : 1;

    if (snapshot.economyState === "Healthy" && snapshot.spendableTreasury >= 180 && snapshot.netGold >= 6) {
        maxInvestments += 1;
    }
    if (snapshot.economyState === "Healthy" && snapshot.spendableTreasury >= 320 && snapshot.netGold >= 10) {
        maxInvestments += 1;
    }
    if (snapshot.economyState === "Guarded" && snapshot.spendableTreasury >= 220 && snapshot.netGold >= 8) {
        maxInvestments += 1;
    }
    if (snapshot.economyState === "Guarded" && snapshot.spendableTreasury >= 360 && snapshot.netGold >= 12) {
        maxInvestments += 1;
    }

    const pressure = summarizeCityStatePressure(state, playerId);
    if (snapshot.economyState !== "Crisis" && (focusCityStateId || pressure.contestedTotal >= 1)) {
        maxInvestments = Math.max(maxInvestments, 2);
    }
    if (snapshot.economyState === "Healthy" && pressure.challengerRaces >= 2) {
        maxInvestments = Math.max(maxInvestments, 5);
    }
    if (snapshot.economyState === "Guarded" && pressure.challengerRaces >= 2) {
        maxInvestments = Math.max(maxInvestments, 3);
    }
    if (snapshot.economyState === "Strained" && pressure.challengerRaces >= 2 && snapshot.spendableTreasury >= 140) {
        maxInvestments = Math.max(maxInvestments, 2);
    }
    if (snapshot.economyState === "Healthy" && pressure.flipWindowRaces >= 1) {
        maxInvestments = Math.max(maxInvestments, 4);
    }
    if (snapshot.economyState === "Guarded" && pressure.flipWindowRaces >= 1) {
        maxInvestments = Math.max(maxInvestments, 3);
    }
    if (
        snapshot.economyState === "Healthy" &&
        pressure.challengerRaces >= 4 &&
        snapshot.spendableTreasury >= 420 &&
        snapshot.netGold >= 12
    ) {
        maxInvestments = Math.max(maxInvestments, 6);
    }

    if (snapshot.economyState === "Crisis") {
        maxInvestments = Math.min(maxInvestments, 1);
    }
    if (
        controlledCityStates > 0 &&
        !focusCityStateId &&
        pressure.contestedTotal === 0 &&
        pressure.challengerRaces === 0
    ) {
        maxInvestments = Math.min(maxInvestments, snapshot.economyState === "Healthy" ? 2 : 1);
    }

    return Math.max(1, Math.min(maxInvestments, CITY_STATE_MAX_INVESTMENTS_PER_TURN, cityStates.length));
}

function maybeInvestInCityState(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    if (!player || player.isEliminated) return next;

    const cityStates = next.cityStates ?? [];
    if (cityStates.length === 0) return next;

    const memory = getAiMemoryV2(next, playerId);
    let focusCityStateId = sanitizeCityStateFocusId(
        next,
        playerId,
        memory.cityStateFocusId,
        memory.cityStateFocusSetTurn,
    );
    const economy = computeEconomySnapshot(next, playerId);
    const maxInvestments = computeCityStateInvestmentCadence(next, playerId, focusCityStateId, economy);
    if (maxInvestments <= 0) return next;
    let investedAny = false;

    for (let i = 0; i < maxInvestments; i++) {
        const prioritizeTurnover = economy.economyState !== "Crisis" && !focusCityStateId && i === 0;
        let best = pickCityStateInvestmentTarget(next, playerId, goal, focusCityStateId, {
            preferTurnover: prioritizeTurnover,
        });
        if (!best && prioritizeTurnover) {
            best = pickCityStateInvestmentTarget(next, playerId, goal, focusCityStateId);
        }
        if (!best) break;

        const invested = tryAction(next, {
            type: "InvestCityStateInfluence",
            playerId,
            cityStateId: best.cityStateId,
        });
        if (invested === next) break;
        next = invested;
        investedAny = true;
        focusCityStateId = best.cityStateId;
    }

    focusCityStateId = sanitizeCityStateFocusId(
        next,
        playerId,
        focusCityStateId,
        investedAny ? next.turn : memory.cityStateFocusSetTurn,
    );
    const focusSetTurn = focusCityStateId
        ? (investedAny ? next.turn : memory.cityStateFocusSetTurn)
        : undefined;

    if (
        memory.cityStateFocusId !== focusCityStateId ||
        memory.cityStateFocusSetTurn !== focusSetTurn
    ) {
        next = setAiMemoryV2(next, playerId, {
            ...memory,
            cityStateFocusId: focusCityStateId,
            cityStateFocusSetTurn: focusSetTurn,
        });
    }

    return next;
}

export function runDiplomacy(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const dip = decideDiplomacyActionsV2(next, playerId, goal);
    next = dip.state;
    for (const action of dip.actions) {
        next = tryAction(next, action);
    }
    next = maybeInvestInCityState(next, playerId, goal);
    return next;
}
