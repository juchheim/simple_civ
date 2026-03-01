import { AiVictoryGoal, GameState } from "../../../core/types.js";
import { CITY_STATE_INVEST_GAIN } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getAiMemoryV2, setAiMemoryV2 } from "../memory.js";
import { decideDiplomacyActionsV2 } from "../diplomacy.js";
import { getHotspotIncumbentPairLoopCount, isCityStateTurnoverCandidate, pickCityStateInvestmentTarget } from "../city-state-policy.js";
import { computeEconomySnapshot, type EconomySnapshot } from "../economy/budget.js";

const CITY_STATE_FOCUS_STALE_TURNS = 24;
const CITY_STATE_MAX_INVESTMENTS_PER_TURN = 6;
const CITY_STATE_CADENCE_BONUS_CHANCE = 0.16;
const CITY_STATE_CADENCE_FLIP_BONUS_CHANCE = 0.24;
const CITY_STATE_STALE_CHALLENGER_WINDOW_MULT = 2.5;
const CITY_STATE_HOTSPOT_PAIR_LOOP_DEFENSIVE_FOCUS_MULT = 0.45;
const CITY_STATE_HOTSPOT_PAIR_LOOP_DEFENSIVE_PRESSURE_MULT = 0.6;
const CITY_STATE_DEFENSIVE_FOCUS_MULT = 0.65;
const CITY_STATE_DEFENSIVE_PRESSURE_MULT = 1.15;
const CITY_STATE_MEANINGFUL_DEFENSIVE_RIVAL_MULT = 0.15;

type CityStatePressureSnapshot = {
    contestedTotal: number;
    defensiveRaces: number;
    challengerRaces: number;
    flipWindowRaces: number;
};

function hashString32(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function seededRandom01(state: GameState, playerId: string, salt: string): number {
    const seed = Number.isFinite(state.seed) ? Math.floor(state.seed) : 1;
    const hash = hashString32(`${seed}|${state.turn}|${playerId}|${salt}`);
    return hash / 4294967296;
}

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

function getDefensiveLeadLimit(
    state: GameState,
    cityState: NonNullable<GameState["cityStates"]>[number],
    playerId: string,
    defaultMult: number,
    hotspotMult: number,
): number {
    return Math.ceil(
        CITY_STATE_INVEST_GAIN
        * (getHotspotIncumbentPairLoopCount(state, cityState, playerId) > 0 ? hotspotMult : defaultMult)
    );
}

function getMeaningfulDefensiveRivalFloor(): number {
    return Math.ceil(CITY_STATE_INVEST_GAIN * CITY_STATE_MEANINGFUL_DEFENSIVE_RIVAL_MULT);
}

function sanitizeCityStateFocusId(
    state: GameState,
    playerId: string,
    focusId: string | undefined,
    focusSetTurn: number | undefined,
    allowInvestedThisTurn = false,
): string | undefined {
    if (!focusId) return undefined;
    const cityState = (state.cityStates ?? []).find(cs => cs.id === focusId);
    if (!cityState) return undefined;
    if (!cityState.discoveredByPlayer[playerId]) return undefined;
    if (cityState.warByPlayer[playerId]) return undefined;
    if (!allowInvestedThisTurn && (cityState.lastInvestTurnByPlayer[playerId] ?? -1) === state.turn) return undefined;

    if (focusSetTurn !== undefined && (state.turn - focusSetTurn) > CITY_STATE_FOCUS_STALE_TURNS) {
        const lastInvestTurn = cityState.lastInvestTurnByPlayer[playerId] ?? -1;
        if (cityState.suzerainId === playerId) {
            const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
            const topRivalInfluence = getTopRivalInfluence(state, playerId, cityState.id);
            if (topRivalInfluence < getMeaningfulDefensiveRivalFloor()) {
                return undefined;
            }
            const lead = myInfluence - topRivalInfluence;
            const focusLeadLimit = getDefensiveLeadLimit(
                state,
                cityState,
                playerId,
                CITY_STATE_DEFENSIVE_FOCUS_MULT,
                CITY_STATE_HOTSPOT_PAIR_LOOP_DEFENSIVE_FOCUS_MULT,
            );
            if (lastInvestTurn < (state.turn - 2) || lead > focusLeadLimit) {
                return undefined;
            }
        } else {
            const persistTurnoverCampaign = isCityStateTurnoverCandidate(
                cityState,
                playerId,
                CITY_STATE_STALE_CHALLENGER_WINDOW_MULT,
            );
            if (lastInvestTurn < (state.turn - 4) && !persistTurnoverCampaign) return undefined;
        }
    }

    if (cityState.suzerainId === playerId) {
        const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
        const topRivalInfluence = getTopRivalInfluence(state, playerId, cityState.id);
        if (topRivalInfluence < getMeaningfulDefensiveRivalFloor()) {
            return undefined;
        }
        const focusLeadLimit = getDefensiveLeadLimit(
            state,
            cityState,
            playerId,
            CITY_STATE_DEFENSIVE_FOCUS_MULT,
            CITY_STATE_HOTSPOT_PAIR_LOOP_DEFENSIVE_FOCUS_MULT,
        );
        if ((myInfluence - topRivalInfluence) > focusLeadLimit) {
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
            if (topRivalInfluence < getMeaningfulDefensiveRivalFloor()) {
                continue;
            }
            const defensivePressureLimit = getDefensiveLeadLimit(
                state,
                cityState,
                playerId,
                CITY_STATE_DEFENSIVE_PRESSURE_MULT,
                CITY_STATE_HOTSPOT_PAIR_LOOP_DEFENSIVE_PRESSURE_MULT,
            );
            if (topRivalInfluence > 0 && lead <= defensivePressureLimit) {
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

function shouldPersistDefensiveFocus(state: GameState, playerId: string, cityStateId: string): boolean {
    const cityState = (state.cityStates ?? []).find(cs => cs.id === cityStateId);
    if (!cityState) return false;
    if (cityState.suzerainId !== playerId) return false;
    const myInfluence = cityState.influenceByPlayer[playerId] ?? 0;
    const topRivalInfluence = getTopRivalInfluence(state, playerId, cityState.id);
    if (topRivalInfluence < getMeaningfulDefensiveRivalFloor()) return false;
    const focusLeadLimit = getDefensiveLeadLimit(
        state,
        cityState,
        playerId,
        CITY_STATE_DEFENSIVE_FOCUS_MULT,
        CITY_STATE_HOTSPOT_PAIR_LOOP_DEFENSIVE_FOCUS_MULT,
    );
    return (myInfluence - topRivalInfluence) <= focusLeadLimit;
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
    const focusCityState = focusCityStateId
        ? (state.cityStates ?? []).find(cityState => cityState.id === focusCityStateId)
        : undefined;
    const focusIsDefensive = !!focusCityState && focusCityState.suzerainId === playerId;
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
    const hasOffensivePressure = pressure.challengerRaces >= 1 || pressure.flipWindowRaces >= 1 || (!!focusCityStateId && !focusIsDefensive);
    const hasHeavyDefensivePressure = pressure.defensiveRaces >= 2 || (!!focusIsDefensive && pressure.defensiveRaces >= 1);
    if (snapshot.economyState !== "Crisis" && hasOffensivePressure) {
        maxInvestments = Math.max(maxInvestments, 2);
    }
    if (
        snapshot.economyState === "Healthy"
        && hasHeavyDefensivePressure
        && snapshot.spendableTreasury >= 260
        && snapshot.netGold >= 8
    ) {
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

    if (
        snapshot.economyState !== "Crisis" &&
        pressure.challengerRaces >= 1 &&
        snapshot.spendableTreasury >= 180 &&
        snapshot.netGold >= 4
    ) {
        const bonusChance = pressure.flipWindowRaces > 0
            ? CITY_STATE_CADENCE_FLIP_BONUS_CHANCE
            : CITY_STATE_CADENCE_BONUS_CHANCE;
        const cadenceRoll = seededRandom01(
            state,
            playerId,
            `city-state-cadence-bonus:${pressure.challengerRaces}:${pressure.flipWindowRaces}`,
        );
        if (cadenceRoll < bonusChance) {
            maxInvestments += 1;
        }
    }

    if (snapshot.economyState === "Crisis") {
        maxInvestments = Math.min(maxInvestments, 1);
    }
    if (focusIsDefensive && pressure.challengerRaces === 0 && pressure.flipWindowRaces === 0) {
        const defensiveCap = snapshot.economyState === "Healthy"
            && hasHeavyDefensivePressure
            && snapshot.spendableTreasury >= 260
            && snapshot.netGold >= 8
            ? 2
            : 1;
        maxInvestments = Math.min(maxInvestments, defensiveCap);
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
    let storedFocusCityStateId = focusCityStateId;
    let lastInvestedCityStateId: string | undefined;

    for (let i = 0; i < maxInvestments; i++) {
        const prioritizeTurnover = economy.economyState !== "Crisis" && !focusCityStateId && i < 2;
        let best = pickCityStateInvestmentTarget(next, playerId, goal, focusCityStateId, {
            preferTurnover: prioritizeTurnover,
        });
        if (!best && prioritizeTurnover) {
            best = pickCityStateInvestmentTarget(next, playerId, goal, focusCityStateId);
        }
        if (!best) break;
        lastInvestedCityStateId = best.cityStateId;

        const invested = tryAction(next, {
            type: "InvestCityStateInfluence",
            playerId,
            cityStateId: best.cityStateId,
        });
        if (invested === next) break;
        next = invested;
        investedAny = true;
        const investedCityState = (next.cityStates ?? []).find(cityState => cityState.id === best.cityStateId);
        const investedIsTurnover = investedCityState
            ? isCityStateTurnoverCandidate(investedCityState, playerId)
            : false;
        const investedNeedsDefense = shouldPersistDefensiveFocus(next, playerId, best.cityStateId);
        const storedFocusCityState = storedFocusCityStateId
            ? (next.cityStates ?? []).find(cityState => cityState.id === storedFocusCityStateId)
            : undefined;
        const storedFocusStillTurnover = storedFocusCityState
            ? isCityStateTurnoverCandidate(storedFocusCityState, playerId)
            : false;
        const storedFocusNeedsDefense = storedFocusCityStateId
            ? shouldPersistDefensiveFocus(next, playerId, storedFocusCityStateId)
            : false;
        if (
            !storedFocusCityStateId ||
            storedFocusCityStateId === best.cityStateId ||
            (
                !storedFocusStillTurnover &&
                !storedFocusNeedsDefense &&
                (investedIsTurnover || investedNeedsDefense)
            )
        ) {
            storedFocusCityStateId = best.cityStateId;
        }
        focusCityStateId = storedFocusCityStateId;
    }

    if (!storedFocusCityStateId && lastInvestedCityStateId) {
        storedFocusCityStateId = lastInvestedCityStateId;
    }

    focusCityStateId = sanitizeCityStateFocusId(
        next,
        playerId,
        storedFocusCityStateId,
        investedAny ? next.turn : memory.cityStateFocusSetTurn,
        true,
    );
    const focusCityState = focusCityStateId
        ? (next.cityStates ?? []).find(cityState => cityState.id === focusCityStateId)
        : undefined;
    const focusSetTurn = focusCityStateId
        ? (focusCityStateId === memory.cityStateFocusId
            ? (focusCityState?.suzerainId === playerId
                ? (memory.cityStateFocusSetTurn ?? next.turn)
                : (investedAny ? next.turn : memory.cityStateFocusSetTurn))
            : next.turn)
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
