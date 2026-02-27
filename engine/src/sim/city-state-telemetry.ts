import {
    CITY_STATE_CONTEST_MARGIN,
    CITY_STATE_INVEST_BASE_COST,
    CITY_STATE_INVEST_COST_RAMP,
    CITY_STATE_INVEST_GAIN,
    CITY_STATE_INVEST_SUZERAIN_DISCOUNT,
} from "../core/constants.js";
import { CityState, CityStateYieldType, GameState } from "../core/types.js";

export type CityStatePlayerInvestmentTelemetry = {
    actions: number;
    goldSpent: number;
    maintenanceActions: number;
    maintenanceGoldSpent: number;
    influenceGained: number;
};

export type CityStateEntryTelemetry = {
    cityStateId: string;
    cityName: string;
    yieldType: CityStateYieldType;
    createdTurn: number;
    removedTurn: number | null;
    activeTurns: number;
    contestedTurns: number;
    noSuzerainContestedTurns: number;
    closeRaceContestedTurns: number;
    suzerainTurnsByPlayer: Record<string, number>;
    investmentByPlayer: Record<string, CityStatePlayerInvestmentTelemetry>;
    suzerainChanges: number;
    uniqueSuzerainCount: number;
    finalSuzerainId?: string;
};

export type CityStatePlayerTelemetry = {
    civName: string;
    suzerainTurns: number;
    investedGold: number;
    maintenanceGoldSpent: number;
    investmentActions: number;
    maintenanceInvestmentActions: number;
};

export type CityStateSimulationTelemetry = {
    sampledTurns: number;
    totalCityStateActiveTurns: number;
    totalCityStatesCreated: number;
    survivingCityStates: number;
    byPlayer: Record<string, CityStatePlayerTelemetry>;
    cityStates: CityStateEntryTelemetry[];
};

export type CityStateTelemetryTracker = {
    observe: (state: GameState) => void;
    sampleTurn: (state: GameState) => void;
    finalize: (state: GameState) => CityStateSimulationTelemetry;
};

type CityStateSnapshot = {
    suzerainId?: string;
    investmentCountByPlayer: Record<string, number>;
};

function createInvestmentTelemetry(): CityStatePlayerInvestmentTelemetry {
    return {
        actions: 0,
        goldSpent: 0,
        maintenanceActions: 0,
        maintenanceGoldSpent: 0,
        influenceGained: 0,
    };
}

function createPlayerTelemetry(civName: string): CityStatePlayerTelemetry {
    return {
        civName,
        suzerainTurns: 0,
        investedGold: 0,
        maintenanceGoldSpent: 0,
        investmentActions: 0,
        maintenanceInvestmentActions: 0,
    };
}

function snapshotCityStates(cityStates: ReadonlyArray<CityState>): Map<string, CityStateSnapshot> {
    const snapshot = new Map<string, CityStateSnapshot>();
    for (const cityState of cityStates) {
        snapshot.set(cityState.id, {
            suzerainId: cityState.suzerainId,
            investmentCountByPlayer: { ...cityState.investmentCountByPlayer },
        });
    }
    return snapshot;
}

function investmentCostAtPurchaseIndex(purchaseIndex: number, isMaintenance: boolean): number {
    const scaledCost = CITY_STATE_INVEST_BASE_COST * Math.pow(1 + CITY_STATE_INVEST_COST_RAMP, purchaseIndex);
    const discount = isMaintenance ? CITY_STATE_INVEST_SUZERAIN_DISCOUNT : 1;
    return Math.max(1, Math.ceil(scaledCost * discount));
}

function investmentCostDelta(previousCount: number, delta: number, isMaintenance: boolean): number {
    let cost = 0;
    for (let i = 0; i < delta; i++) {
        cost += investmentCostAtPurchaseIndex(previousCount + i, isMaintenance);
    }
    return cost;
}

function resolveCivName(state: GameState, playerId: string): string {
    const player = state.players.find(p => p.id === playerId);
    return player?.civName ?? playerId;
}

function ensureCityStateEntry(
    entries: Map<string, CityStateEntryTelemetry>,
    cityState: CityState,
    turn: number
): CityStateEntryTelemetry {
    const existing = entries.get(cityState.id);
    if (existing) {
        existing.cityName = cityState.name;
        existing.yieldType = cityState.yieldType;
        existing.createdTurn = Math.min(existing.createdTurn, turn);
        return existing;
    }

    const created: CityStateEntryTelemetry = {
        cityStateId: cityState.id,
        cityName: cityState.name,
        yieldType: cityState.yieldType,
        createdTurn: turn,
        removedTurn: null,
        activeTurns: 0,
        contestedTurns: 0,
        noSuzerainContestedTurns: 0,
        closeRaceContestedTurns: 0,
        suzerainTurnsByPlayer: {},
        investmentByPlayer: {},
        suzerainChanges: 0,
        uniqueSuzerainCount: cityState.suzerainId ? 1 : 0,
        finalSuzerainId: cityState.suzerainId,
    };
    entries.set(cityState.id, created);
    return created;
}

function ensurePlayerTelemetry(
    byPlayer: Map<string, CityStatePlayerTelemetry>,
    playerId: string,
    civName: string
): CityStatePlayerTelemetry {
    const existing = byPlayer.get(playerId);
    if (existing) {
        if (!existing.civName || existing.civName === playerId) {
            existing.civName = civName;
        }
        return existing;
    }
    const created = createPlayerTelemetry(civName);
    byPlayer.set(playerId, created);
    return created;
}

function ensureInvestmentByPlayer(
    entry: CityStateEntryTelemetry,
    playerId: string
): CityStatePlayerInvestmentTelemetry {
    if (!entry.investmentByPlayer[playerId]) {
        entry.investmentByPlayer[playerId] = createInvestmentTelemetry();
    }
    return entry.investmentByPlayer[playerId];
}

function isCloseRaceContested(state: GameState, cityState: CityState): boolean {
    const contenderInfluences = state.players
        .filter(player => !player.isEliminated)
        .filter(player => !cityState.warByPlayer[player.id])
        .map(player => cityState.influenceByPlayer[player.id] ?? 0)
        .sort((a, b) => b - a);

    if (contenderInfluences.length < 2) return false;
    const top = contenderInfluences[0];
    const second = contenderInfluences[1];
    if (top <= 0 || second <= 0) return false;
    return (top - second) <= CITY_STATE_CONTEST_MARGIN;
}

function countUniqueSuzerains(entry: CityStateEntryTelemetry): number {
    const ids = new Set<string>();
    for (const [playerId, turns] of Object.entries(entry.suzerainTurnsByPlayer)) {
        if ((turns ?? 0) > 0) {
            ids.add(playerId);
        }
    }
    if (entry.finalSuzerainId) {
        ids.add(entry.finalSuzerainId);
    }
    return ids.size;
}

export function createCityStateTelemetryTracker(initialState: GameState): CityStateTelemetryTracker {
    const entries = new Map<string, CityStateEntryTelemetry>();
    const byPlayer = new Map<string, CityStatePlayerTelemetry>();
    let sampledTurns = 0;
    let totalCityStateActiveTurns = 0;

    for (const player of initialState.players) {
        ensurePlayerTelemetry(byPlayer, player.id, player.civName);
    }

    const initialCityStates = initialState.cityStates ?? [];
    for (const cityState of initialCityStates) {
        ensureCityStateEntry(entries, cityState, initialState.turn);
    }

    let previous = snapshotCityStates(initialCityStates);

    function observe(state: GameState): void {
        for (const player of state.players) {
            ensurePlayerTelemetry(byPlayer, player.id, player.civName);
        }

        const currentCityStates = state.cityStates ?? [];
        const currentById = new Map(currentCityStates.map(cityState => [cityState.id, cityState]));

        for (const cityState of currentCityStates) {
            const entry = ensureCityStateEntry(entries, cityState, state.turn);
            const prev = previous.get(cityState.id);

            if (!prev) {
                entry.removedTurn = null;
                continue;
            }

            if (prev.suzerainId !== cityState.suzerainId) {
                entry.suzerainChanges += 1;
            }

            for (const player of state.players) {
                const playerId = player.id;
                const prevCount = prev.investmentCountByPlayer[playerId] ?? 0;
                const currentCount = cityState.investmentCountByPlayer[playerId] ?? 0;
                if (currentCount <= prevCount) continue;

                const delta = currentCount - prevCount;
                const isMaintenance = prev.suzerainId === playerId;
                const goldSpent = investmentCostDelta(prevCount, delta, isMaintenance);
                const civName = resolveCivName(state, playerId);
                const playerTelemetry = ensurePlayerTelemetry(byPlayer, playerId, civName);
                const investmentTelemetry = ensureInvestmentByPlayer(entry, playerId);

                investmentTelemetry.actions += delta;
                investmentTelemetry.goldSpent += goldSpent;
                investmentTelemetry.influenceGained += delta * CITY_STATE_INVEST_GAIN;

                playerTelemetry.investmentActions += delta;
                playerTelemetry.investedGold += goldSpent;

                if (isMaintenance) {
                    investmentTelemetry.maintenanceActions += delta;
                    investmentTelemetry.maintenanceGoldSpent += goldSpent;
                    playerTelemetry.maintenanceInvestmentActions += delta;
                    playerTelemetry.maintenanceGoldSpent += goldSpent;
                }
            }

            entry.uniqueSuzerainCount = countUniqueSuzerains(entry);
        }

        for (const [cityStateId] of previous.entries()) {
            if (currentById.has(cityStateId)) continue;
            const entry = entries.get(cityStateId);
            if (entry && entry.removedTurn === null) {
                entry.removedTurn = state.turn;
            }
        }

        previous = snapshotCityStates(currentCityStates);
    }

    function sampleTurn(state: GameState): void {
        sampledTurns += 1;
        const cityStates = state.cityStates ?? [];

        for (const cityState of cityStates) {
            const entry = ensureCityStateEntry(entries, cityState, state.turn);
            entry.activeTurns += 1;
            totalCityStateActiveTurns += 1;

            const suzerainId = cityState.suzerainId;
            if (suzerainId) {
                entry.suzerainTurnsByPlayer[suzerainId] = (entry.suzerainTurnsByPlayer[suzerainId] ?? 0) + 1;
                const civName = resolveCivName(state, suzerainId);
                const playerTelemetry = ensurePlayerTelemetry(byPlayer, suzerainId, civName);
                playerTelemetry.suzerainTurns += 1;
                if (isCloseRaceContested(state, cityState)) {
                    entry.closeRaceContestedTurns += 1;
                    entry.contestedTurns += 1;
                }
            } else {
                entry.noSuzerainContestedTurns += 1;
                entry.contestedTurns += 1;
            }
            entry.uniqueSuzerainCount = countUniqueSuzerains(entry);
        }
    }

    function finalize(state: GameState): CityStateSimulationTelemetry {
        const finalCityStates = state.cityStates ?? [];
        const finalById = new Map(finalCityStates.map(cityState => [cityState.id, cityState]));

        for (const entry of entries.values()) {
            const finalCityState = finalById.get(entry.cityStateId);
            if (finalCityState) {
                entry.cityName = finalCityState.name;
                entry.yieldType = finalCityState.yieldType;
                entry.finalSuzerainId = finalCityState.suzerainId;
                entry.removedTurn = null;
            }
            entry.uniqueSuzerainCount = countUniqueSuzerains(entry);
        }

        const byPlayerObj: Record<string, CityStatePlayerTelemetry> = {};
        for (const [playerId, telemetry] of byPlayer.entries()) {
            byPlayerObj[playerId] = {
                civName: telemetry.civName,
                suzerainTurns: telemetry.suzerainTurns,
                investedGold: telemetry.investedGold,
                maintenanceGoldSpent: telemetry.maintenanceGoldSpent,
                investmentActions: telemetry.investmentActions,
                maintenanceInvestmentActions: telemetry.maintenanceInvestmentActions,
            };
        }

        const cityStates = Array.from(entries.values())
            .sort((a, b) => a.createdTurn - b.createdTurn || a.cityName.localeCompare(b.cityName))
            .map(entry => ({
                cityStateId: entry.cityStateId,
                cityName: entry.cityName,
                yieldType: entry.yieldType,
                createdTurn: entry.createdTurn,
                removedTurn: entry.removedTurn,
                activeTurns: entry.activeTurns,
                contestedTurns: entry.contestedTurns,
                noSuzerainContestedTurns: entry.noSuzerainContestedTurns,
                closeRaceContestedTurns: entry.closeRaceContestedTurns,
                suzerainTurnsByPlayer: { ...entry.suzerainTurnsByPlayer },
                investmentByPlayer: Object.fromEntries(
                    Object.entries(entry.investmentByPlayer).map(([playerId, investment]) => [
                        playerId,
                        { ...investment },
                    ])
                ),
                suzerainChanges: entry.suzerainChanges,
                uniqueSuzerainCount: entry.uniqueSuzerainCount,
                finalSuzerainId: entry.finalSuzerainId,
            }));

        return {
            sampledTurns,
            totalCityStateActiveTurns,
            totalCityStatesCreated: cityStates.length,
            survivingCityStates: finalCityStates.length,
            byPlayer: byPlayerObj,
            cityStates,
        };
    }

    return { observe, sampleTurn, finalize };
}
