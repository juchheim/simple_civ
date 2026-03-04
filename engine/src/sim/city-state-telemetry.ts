import {
    CITY_STATE_CONTEST_MARGIN,
    CITY_STATE_INVEST_BASE_COST,
    CITY_STATE_INVEST_COST_RAMP,
    CITY_STATE_INVEST_GAIN,
    CITY_STATE_INVEST_SUZERAIN_DISCOUNT,
    CITY_STATE_INVEST_SUZERAIN_RAMP_CAP,
} from "../core/constants.js";
import { UNITS } from "../core/constants.js";
import { CityState, CityStateSuzerainChangeCause, CityStateYieldType, GameState, HistoryEventType } from "../core/types.js";
import type { CampClearingPrep } from "../core/types.js";
import { hexDistance } from "../core/hex.js";
import { getCityStateInvestCost } from "../game/city-states.js";
import { getCampTargetDiagnostics } from "../game/ai/camp-clearing.js";
import type { CampClearingReadiness, CampTargetDiagnostics } from "../game/ai/camp-clearing.js";
import { computeEconomySnapshot } from "../game/ai2/economy/budget.js";
import { getAiMemoryV2 } from "../game/ai2/memory.js";
import { isScoutType } from "../game/ai/units/unit-helpers.js";

const CITY_STATE_TURNOVER_WINDOW = Math.ceil(CITY_STATE_INVEST_GAIN * 3);
const CITY_STATE_FLIP_WINDOW = Math.ceil(CITY_STATE_INVEST_GAIN * 1.5);
const CITY_STATE_SAFE_MAINTENANCE_LEAD = Math.ceil(CITY_STATE_INVEST_GAIN * 0.85);
const CITY_STATE_HOTSPOT_WINDOW = 16;
const CITY_STATE_HOTSPOT_THRESHOLD = 3;
const CITY_STATE_PASSIVE_ASSIST_WINDOW = 2;
const CAMP_READY_LOCAL_POWER_RADIUS = 5;
const CITY_STATE_PASSIVE_OPENING_RESERVE_MULT_BY_STATE = {
    Healthy: 0.5,
    Guarded: 0.64,
    Strained: 0.8,
    Crisis: 1,
} as const;

type SuzeraintyCauseCounter = Record<CityStateSuzerainChangeCause, number>;
type OwnershipPairCounter = Record<string, number>;
type CampPrepPhase = CampClearingPrep["state"];

export type CampClearingEpisodeOutcome =
    | "ClearedBySelf"
    | "ClearedByOther"
    | "TimedOut"
    | "WarPrepCancelled"
    | "WartimeEmergencyCancelled"
    | "CampVanished"
    | "Retargeted"
    | "Eliminated"
    | "OtherCancelled"
    | "StillActive";

export type CityStatePlayerInvestmentTelemetry = {
    actions: number;
    goldSpent: number;
    maintenanceActions: number;
    maintenanceGoldSpent: number;
    safeMaintenanceActions: number;
    safeMaintenanceGoldSpent: number;
    turnoverActions: number;
    turnoverGoldSpent: number;
    flipWindowActions: number;
    flipWindowGoldSpent: number;
    deepChallengeActions: number;
    deepChallengeGoldSpent: number;
    neutralClaimActions: number;
    neutralClaimGoldSpent: number;
    pairFatigueActions: number;
    pairFatigueGoldSpent: number;
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
    turnoverWindowTurns: number;
    flipWindowTurns: number;
    safeLeadTurns: number;
    hotspotTurns: number;
    passiveContestationTurns: number;
    passiveCloseRaceTurns: number;
    passiveOpenings: number;
    passiveOpeningTurnDelayTotal: number;
    passiveOpeningsTreasuryAffordable: number;
    passiveOpeningsReserveSafe: number;
    passiveOpeningsAttemptedByNominated: number;
    passiveOpeningAttemptTurnDelayTotal: number;
    passiveOpeningAttemptTurnDelaySamples: number;
    passiveOpeningsNoAttempt: number;
    passiveOpeningsNoAttemptTreasuryBlocked: number;
    passiveOpeningsNoAttemptReserveBlocked: number;
    passiveOpeningsNoAttemptDespiteCapacity: number;
    passiveOpeningsResolved: number;
    passiveOpeningsResolvedByCause: SuzeraintyCauseCounter;
    passiveOpeningsWonByNominated: number;
    passiveOpeningsWonByNominatedByCause: SuzeraintyCauseCounter;
    passiveOpeningsLost: number;
    passiveOpeningsExpired: number;
    passiveAssistedSuzerainChanges: number;
    passiveAssistedSuzerainChangesByCause: SuzeraintyCauseCounter;
    passiveAssistedOwnershipTurnovers: number;
    passiveAssistedOwnershipTurnoversByCause: SuzeraintyCauseCounter;
    suzerainTurnsByPlayer: Record<string, number>;
    focusTurnsByPlayer: Record<string, number>;
    focusChallengeTurnsByPlayer: Record<string, number>;
    focusMaintenanceTurnsByPlayer: Record<string, number>;
    investmentByPlayer: Record<string, CityStatePlayerInvestmentTelemetry>;
    suzerainChanges: number;
    suzerainChangesByCause: SuzeraintyCauseCounter;
    ownershipTurnovers: number;
    ownershipTurnoversByCause: SuzeraintyCauseCounter;
    ownershipTurnoversByPair: OwnershipPairCounter;
    pairFatigueActions: number;
    pairFatigueGoldSpent: number;
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
    safeMaintenanceGoldSpent: number;
    safeMaintenanceActions: number;
    turnoverGoldSpent: number;
    turnoverActions: number;
    flipWindowGoldSpent: number;
    flipWindowActions: number;
    deepChallengeGoldSpent: number;
    deepChallengeActions: number;
    neutralClaimGoldSpent: number;
    neutralClaimActions: number;
    pairFatigueGoldSpent: number;
    pairFatigueActions: number;
    focusTurns: number;
    focusChallengeTurns: number;
    focusMaintenanceTurns: number;
    focusAssignments: number;
    focusSwitches: number;
};

export type CampClearingEpisodeTelemetry = {
    playerId: string;
    civName: string;
    campId: string;
    campCoordKey?: string;
    sightedTurn?: number;
    prepStartedTurn: number;
    firstReadyTurn?: number;
    campClearedTurn?: number;
    endedTurn: number;
    readinessAtStart: CampClearingReadiness;
    initialPrepState: CampPrepPhase;
    initialScore?: number;
    initialNearestCityDist?: number;
    initialRequiredMilitary?: number;
    initialMilitaryCount?: number;
    buildupTurns: number;
    gatheringTurns: number;
    positioningTurns: number;
    readyTurns: number;
    readyTurnsWithoutContact: number;
    readyTurnsWithAdjacentContact: number;
    readyTurnsWithAttackOpportunity: number;
    readyTurnsWithNoProgressOpportunity: number;
    readyTurnsWithPowerDisadvantage: number;
    readyTurnsWithProgress: number;
    totalPrepTurns: number;
    outcome: CampClearingEpisodeOutcome;
    resolvedByPlayerId?: string;
};

export type CampClearingSimulationTelemetry = {
    episodes: CampClearingEpisodeTelemetry[];
};

export type CityStateSimulationTelemetry = {
    sampledTurns: number;
    totalCityStateActiveTurns: number;
    totalCityStatesCreated: number;
    survivingCityStates: number;
    byPlayer: Record<string, CityStatePlayerTelemetry>;
    cityStates: CityStateEntryTelemetry[];
    campClearing: CampClearingSimulationTelemetry;
};

export type CityStateTelemetryTracker = {
    observe: (state: GameState, previousState?: GameState, actedPlayerId?: string) => void;
    sampleTurn: (state: GameState) => void;
    finalize: (state: GameState) => CityStateSimulationTelemetry;
};

type CityStateSnapshot = {
    suzerainId?: string;
    investmentCountByPlayer: Record<string, number>;
    turnoverWindow: boolean;
    flipWindow: boolean;
    safeMaintenance: boolean;
    lastSuzerainChangeTurn?: number;
    lastSuzerainChangeCause?: CityStateSuzerainChangeCause;
    recentSuzerainChangeCount: number;
    lastPassiveContestationTurn?: number;
    lastPassiveContestationCloseRaceTurn?: number;
};

type PassiveOpeningTracker = {
    key: string;
    cityStateId: string;
    challengerId: string;
    createdTurn: number;
    turnOrderDelay: number;
    treasuryAffordable: boolean;
    reserveSafe: boolean;
    attemptedByNominated: boolean;
    firstAttemptTurn?: number;
};

type ActiveCampClearingEpisode = Omit<CampClearingEpisodeTelemetry, "endedTurn" | "outcome"> & {
    currentPhase: CampPrepPhase;
};

type ReadyTurnDiagnostics = {
    adjacentContact: boolean;
    attackOpportunity: boolean;
    powerDisadvantage: boolean;
    madeProgress: boolean;
};

function createSuzeraintyCauseCounter(): SuzeraintyCauseCounter {
    return {
        Investment: 0,
        PassiveContestation: 0,
        WartimeRelease: 0,
        WarBreak: 0,
        Other: 0,
    };
}

function createOwnershipPairCounter(): OwnershipPairCounter {
    return {};
}

function createInvestmentTelemetry(): CityStatePlayerInvestmentTelemetry {
    return {
        actions: 0,
        goldSpent: 0,
        maintenanceActions: 0,
        maintenanceGoldSpent: 0,
        safeMaintenanceActions: 0,
        safeMaintenanceGoldSpent: 0,
        turnoverActions: 0,
        turnoverGoldSpent: 0,
        flipWindowActions: 0,
        flipWindowGoldSpent: 0,
        deepChallengeActions: 0,
        deepChallengeGoldSpent: 0,
        neutralClaimActions: 0,
        neutralClaimGoldSpent: 0,
        pairFatigueActions: 0,
        pairFatigueGoldSpent: 0,
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
        safeMaintenanceGoldSpent: 0,
        safeMaintenanceActions: 0,
        turnoverGoldSpent: 0,
        turnoverActions: 0,
        flipWindowGoldSpent: 0,
        flipWindowActions: 0,
        deepChallengeGoldSpent: 0,
        deepChallengeActions: 0,
        neutralClaimGoldSpent: 0,
        neutralClaimActions: 0,
        pairFatigueGoldSpent: 0,
        pairFatigueActions: 0,
        focusTurns: 0,
        focusChallengeTurns: 0,
        focusMaintenanceTurns: 0,
        focusAssignments: 0,
        focusSwitches: 0,
    };
}

function classifyCityStatePressure(state: GameState, cityState: CityState): {
    turnoverWindow: boolean;
    flipWindow: boolean;
    safeMaintenance: boolean;
} {
    const suzerainId = cityState.suzerainId;
    if (!suzerainId) {
        return {
            turnoverWindow: false,
            flipWindow: false,
            safeMaintenance: false,
        };
    }

    const suzerainInfluence = cityState.influenceByPlayer[suzerainId] ?? 0;
    let topRivalInfluence = 0;
    for (const player of state.players) {
        if (player.id === suzerainId || player.isEliminated) continue;
        if (cityState.warByPlayer[player.id]) continue;
        topRivalInfluence = Math.max(topRivalInfluence, cityState.influenceByPlayer[player.id] ?? 0);
    }

    const lead = suzerainInfluence - topRivalInfluence;
    const turnoverWindow = topRivalInfluence > 0 && lead <= CITY_STATE_TURNOVER_WINDOW;
    const flipWindow = topRivalInfluence > 0 && lead <= CITY_STATE_FLIP_WINDOW;
    const safeMaintenance = topRivalInfluence <= 0 || lead > CITY_STATE_SAFE_MAINTENANCE_LEAD;

    return {
        turnoverWindow,
        flipWindow,
        safeMaintenance,
    };
}

function snapshotCityStates(state: GameState, cityStates: ReadonlyArray<CityState>): Map<string, CityStateSnapshot> {
    const snapshot = new Map<string, CityStateSnapshot>();
    for (const cityState of cityStates) {
        const pressure = classifyCityStatePressure(state, cityState);
        snapshot.set(cityState.id, {
            suzerainId: cityState.suzerainId,
            investmentCountByPlayer: { ...cityState.investmentCountByPlayer },
            turnoverWindow: pressure.turnoverWindow,
            flipWindow: pressure.flipWindow,
            safeMaintenance: pressure.safeMaintenance,
            lastSuzerainChangeTurn: cityState.lastSuzerainChangeTurn,
            lastSuzerainChangeCause: cityState.lastSuzerainChangeCause,
            recentSuzerainChangeCount: cityState.recentSuzerainChangeCount ?? 0,
            lastPassiveContestationTurn: cityState.lastPassiveContestationTurn,
            lastPassiveContestationCloseRaceTurn: cityState.lastPassiveContestationCloseRaceTurn,
        });
    }
    return snapshot;
}

function investmentCostAtPurchaseIndex(purchaseIndex: number, isMaintenance: boolean): number {
    const effectivePurchaseIndex = isMaintenance
        ? Math.min(purchaseIndex, CITY_STATE_INVEST_SUZERAIN_RAMP_CAP)
        : purchaseIndex;
    const scaledCost = CITY_STATE_INVEST_BASE_COST * Math.pow(1 + CITY_STATE_INVEST_COST_RAMP, effectivePurchaseIndex);
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

function coordKey(coord: { q: number; r: number } | undefined): string | undefined {
    if (!coord) return undefined;
    return `${coord.q},${coord.r}`;
}

function isMilitaryCampUnit(unit: GameState["units"][number]): boolean {
    return unit.ownerId !== "natives"
        && !isScoutType(unit.type)
        && UNITS[unit.type].domain !== "Civilian";
}

function estimateUnitPower(type: GameState["units"][number]["type"]): number {
    const stats = UNITS[type];
    return (stats.atk * 1.8) + (stats.def * 1.1) + (stats.hp * 0.12) + (stats.rng * 1.25);
}

function getCampDefenders(state: GameState, campId: string): GameState["units"] {
    return state.units.filter(unit => unit.campId === campId);
}

function getCampReadyTurnDiagnostics(
    beforeState: GameState,
    afterState: GameState,
    playerId: string,
    campId: string,
): ReadyTurnDiagnostics {
    const beforeDefenders = getCampDefenders(beforeState, campId);
    const afterDefenders = getCampDefenders(afterState, campId);
    if (beforeDefenders.length === 0) {
        return {
            adjacentContact: false,
            attackOpportunity: false,
            powerDisadvantage: false,
            madeProgress: afterDefenders.length < beforeDefenders.length,
        };
    }

    const camp = beforeState.nativeCamps.find(entry => entry.id === campId)
        || afterState.nativeCamps.find(entry => entry.id === campId);
    const friendlyUnits = beforeState.units.filter(unit => unit.ownerId === playerId && isMilitaryCampUnit(unit));
    const localFriendlyUnits = camp
        ? friendlyUnits.filter(unit => hexDistance(unit.coord, camp.coord) <= CAMP_READY_LOCAL_POWER_RADIUS)
        : friendlyUnits;

    const adjacentContact = localFriendlyUnits.some(unit =>
        beforeDefenders.some(defender => hexDistance(unit.coord, defender.coord) <= 1)
    );
    const attackOpportunity = friendlyUnits.some(unit =>
        !unit.hasAttacked && beforeDefenders.some(defender => hexDistance(unit.coord, defender.coord) <= UNITS[unit.type].rng)
    );
    const localFriendlyPower = localFriendlyUnits.reduce((sum, unit) => sum + estimateUnitPower(unit.type), 0);
    const defenderPower = beforeDefenders.reduce((sum, unit) => sum + estimateUnitPower(unit.type), 0);
    const powerDisadvantage = beforeDefenders.length > 0 && localFriendlyPower < defenderPower;
    const beforeDefenderHp = beforeDefenders.reduce((sum, unit) => sum + unit.hp, 0);
    const afterDefenderHp = afterDefenders.reduce((sum, unit) => sum + unit.hp, 0);
    const madeProgress = afterDefenders.length < beforeDefenders.length || afterDefenderHp < beforeDefenderHp;

    return {
        adjacentContact,
        attackOpportunity,
        powerDisadvantage,
        madeProgress,
    };
}

function recordReadyTurnDiagnostics(
    activeEpisode: ActiveCampClearingEpisode,
    diagnostics: ReadyTurnDiagnostics,
): void {
    if (diagnostics.adjacentContact) {
        activeEpisode.readyTurnsWithAdjacentContact += 1;
    } else {
        activeEpisode.readyTurnsWithoutContact += 1;
    }
    if (diagnostics.attackOpportunity) {
        activeEpisode.readyTurnsWithAttackOpportunity += 1;
        if (!diagnostics.madeProgress) {
            activeEpisode.readyTurnsWithNoProgressOpportunity += 1;
        }
    }
    if (diagnostics.powerDisadvantage) {
        activeEpisode.readyTurnsWithPowerDisadvantage += 1;
    }
    if (diagnostics.madeProgress) {
        activeEpisode.readyTurnsWithProgress += 1;
    }
}

function campVisionKey(playerId: string, campId: string): string {
    return `${playerId}|${campId}`;
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
        turnoverWindowTurns: 0,
        flipWindowTurns: 0,
        safeLeadTurns: 0,
        hotspotTurns: 0,
        passiveContestationTurns: 0,
        passiveCloseRaceTurns: 0,
        passiveOpenings: 0,
        passiveOpeningTurnDelayTotal: 0,
        passiveOpeningsTreasuryAffordable: 0,
        passiveOpeningsReserveSafe: 0,
        passiveOpeningsAttemptedByNominated: 0,
        passiveOpeningAttemptTurnDelayTotal: 0,
        passiveOpeningAttemptTurnDelaySamples: 0,
        passiveOpeningsNoAttempt: 0,
        passiveOpeningsNoAttemptTreasuryBlocked: 0,
        passiveOpeningsNoAttemptReserveBlocked: 0,
        passiveOpeningsNoAttemptDespiteCapacity: 0,
        passiveOpeningsResolved: 0,
        passiveOpeningsResolvedByCause: createSuzeraintyCauseCounter(),
        passiveOpeningsWonByNominated: 0,
        passiveOpeningsWonByNominatedByCause: createSuzeraintyCauseCounter(),
        passiveOpeningsLost: 0,
        passiveOpeningsExpired: 0,
        passiveAssistedSuzerainChanges: 0,
        passiveAssistedSuzerainChangesByCause: createSuzeraintyCauseCounter(),
        passiveAssistedOwnershipTurnovers: 0,
        passiveAssistedOwnershipTurnoversByCause: createSuzeraintyCauseCounter(),
        suzerainTurnsByPlayer: {},
        focusTurnsByPlayer: {},
        focusChallengeTurnsByPlayer: {},
        focusMaintenanceTurnsByPlayer: {},
        investmentByPlayer: {},
        suzerainChanges: 0,
        suzerainChangesByCause: createSuzeraintyCauseCounter(),
        ownershipTurnovers: 0,
        ownershipTurnoversByCause: createSuzeraintyCauseCounter(),
        ownershipTurnoversByPair: createOwnershipPairCounter(),
        pairFatigueActions: 0,
        pairFatigueGoldSpent: 0,
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

function incrementTurnCounter(counter: Record<string, number>, playerId: string, amount = 1): void {
    counter[playerId] = (counter[playerId] ?? 0) + amount;
}

function incrementCauseCounter(
    counter: SuzeraintyCauseCounter,
    cause: CityStateSuzerainChangeCause,
    amount = 1,
): void {
    counter[cause] += amount;
}

function makeOwnershipPairKey(a: string, b: string): string {
    return [a, b].sort().join("|");
}

function incrementPairCounter(counter: OwnershipPairCounter, pairKey: string, amount = 1): void {
    counter[pairKey] = (counter[pairKey] ?? 0) + amount;
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

function classifySuzerainChangeCause(
    state: GameState,
    cityState: CityState,
    previousSnapshot: CityStateSnapshot,
): CityStateSuzerainChangeCause {
    if (cityState.lastSuzerainChangeTurn === state.turn) {
        return cityState.lastSuzerainChangeCause ?? "Other";
    }
    if (previousSnapshot.lastSuzerainChangeTurn === state.turn) {
        return previousSnapshot.lastSuzerainChangeCause ?? "Other";
    }
    return "Other";
}

function isHotspotState(state: GameState, cityState: CityState): boolean {
    const lastChangeTurn = cityState.lastSuzerainChangeTurn;
    if (lastChangeTurn === undefined) return false;
    if ((state.turn - lastChangeTurn) > CITY_STATE_HOTSPOT_WINDOW) return false;
    return (cityState.recentSuzerainChangeCount ?? 0) >= CITY_STATE_HOTSPOT_THRESHOLD;
}

function getPassiveAssistTurnsSince(
    state: GameState,
    cityState: CityState,
    previousSnapshot: CityStateSnapshot,
): number | undefined {
    const latestPassiveCloseRaceTurn = Math.max(
        cityState.lastPassiveContestationCloseRaceTurn ?? Number.NEGATIVE_INFINITY,
        previousSnapshot.lastPassiveContestationCloseRaceTurn ?? Number.NEGATIVE_INFINITY,
    );
    if (!Number.isFinite(latestPassiveCloseRaceTurn)) {
        return undefined;
    }
    return state.turn - latestPassiveCloseRaceTurn;
}

function getTurnOrderDelay(state: GameState, playerId: string): number {
    const currentIndex = state.players.findIndex(player => player.id === state.currentPlayerId);
    const targetIndex = state.players.findIndex(player => player.id === playerId);
    if (currentIndex < 0 || targetIndex < 0) return 0;
    if (targetIndex >= currentIndex) return targetIndex - currentIndex;
    return (state.players.length - currentIndex) + targetIndex;
}

function getTopRivalPlayerId(state: GameState, cityState: CityState, suzerainId: string): string | undefined {
    let bestPlayerId: string | undefined;
    let bestInfluence = 0;
    for (const player of state.players) {
        if (player.id === suzerainId || player.isEliminated) continue;
        if (cityState.warByPlayer[player.id]) continue;
        const influence = cityState.influenceByPlayer[player.id] ?? 0;
        if (influence > bestInfluence || (influence === bestInfluence && bestPlayerId && player.id.localeCompare(bestPlayerId) < 0)) {
            bestInfluence = influence;
            bestPlayerId = influence > 0 ? player.id : bestPlayerId;
        }
    }
    return bestPlayerId;
}

function makePassiveOpeningKey(cityStateId: string, createdTurn: number, challengerId: string): string {
    return `${cityStateId}|${createdTurn}|${challengerId}`;
}

function markPassiveOpeningNoAttempt(entry: CityStateEntryTelemetry, tracker: PassiveOpeningTracker): void {
    entry.passiveOpeningsNoAttempt += 1;
    if (!tracker.treasuryAffordable) {
        entry.passiveOpeningsNoAttemptTreasuryBlocked += 1;
        return;
    }
    if (!tracker.reserveSafe) {
        entry.passiveOpeningsNoAttemptReserveBlocked += 1;
        return;
    }
    entry.passiveOpeningsNoAttemptDespiteCapacity += 1;
}

function recordPassiveOpeningResolved(
    entry: CityStateEntryTelemetry,
    tracker: PassiveOpeningTracker,
    cause: CityStateSuzerainChangeCause,
    resolvedSuzerainId: string | undefined,
): void {
    entry.passiveOpeningsResolved += 1;
    incrementCauseCounter(entry.passiveOpeningsResolvedByCause, cause);
    if (resolvedSuzerainId === tracker.challengerId) {
        entry.passiveOpeningsWonByNominated += 1;
        incrementCauseCounter(entry.passiveOpeningsWonByNominatedByCause, cause);
    } else {
        entry.passiveOpeningsLost += 1;
    }
    if (!tracker.attemptedByNominated) {
        markPassiveOpeningNoAttempt(entry, tracker);
    }
}

function recordPassiveOpeningExpired(
    entry: CityStateEntryTelemetry,
    tracker: PassiveOpeningTracker,
): void {
    entry.passiveOpeningsExpired += 1;
    if (!tracker.attemptedByNominated) {
        markPassiveOpeningNoAttempt(entry, tracker);
    }
}

function maybeCreatePassiveOpeningTracker(
    state: GameState,
    cityState: CityState,
    entry: CityStateEntryTelemetry,
): PassiveOpeningTracker | undefined {
    if (cityState.lockedControllerId) return undefined;
    const suzerainId = cityState.suzerainId;
    if (!suzerainId) return undefined;
    const challengerId = getTopRivalPlayerId(state, cityState, suzerainId);
    if (!challengerId) return undefined;

    const player = state.players.find(candidate => candidate.id === challengerId);
    if (!player || player.isEliminated) return undefined;

    const cost = getCityStateInvestCost(cityState, challengerId, state);
    const economy = computeEconomySnapshot(state, challengerId);
    const treasuryAffordable = (player.treasury ?? 0) >= cost;
    const reserveFloor = Math.ceil(
        economy.reserveFloor * CITY_STATE_PASSIVE_OPENING_RESERVE_MULT_BY_STATE[economy.economyState]
    );
    const reserveSafe = ((player.treasury ?? 0) - cost) >= reserveFloor;
    const turnOrderDelay = getTurnOrderDelay(state, challengerId);

    entry.passiveOpenings += 1;
    entry.passiveOpeningTurnDelayTotal += turnOrderDelay;
    if (treasuryAffordable) entry.passiveOpeningsTreasuryAffordable += 1;
    if (reserveSafe) entry.passiveOpeningsReserveSafe += 1;

    return {
        key: makePassiveOpeningKey(cityState.id, state.turn, challengerId),
        cityStateId: cityState.id,
        challengerId,
        createdTurn: state.turn,
        turnOrderDelay,
        treasuryAffordable,
        reserveSafe,
        attemptedByNominated: false,
    };
}

function createCampClearingEpisode(
    state: GameState,
    playerId: string,
    prep: CampClearingPrep,
    diagnostics: CampTargetDiagnostics | null,
    sightedTurn?: number,
): ActiveCampClearingEpisode | null {
    const player = state.players.find(entry => entry.id === playerId);
    if (!player) return null;
    const camp = state.nativeCamps.find(entry => entry.id === prep.targetCampId);

    return {
        playerId,
        civName: player.civName,
        campId: prep.targetCampId,
        campCoordKey: coordKey(camp?.coord),
        sightedTurn,
        prepStartedTurn: prep.startedTurn,
        firstReadyTurn: prep.state === "Ready" ? state.turn : undefined,
        campClearedTurn: undefined,
        readinessAtStart: diagnostics?.readiness ?? "PreArmy",
        initialPrepState: prep.state,
        initialScore: diagnostics?.score,
        initialNearestCityDist: diagnostics?.nearestCityDist,
        initialRequiredMilitary: diagnostics?.requiredMilitary,
        initialMilitaryCount: diagnostics?.militaryCount,
        buildupTurns: 0,
        gatheringTurns: 0,
        positioningTurns: 0,
        readyTurns: 0,
        readyTurnsWithoutContact: 0,
        readyTurnsWithAdjacentContact: 0,
        readyTurnsWithAttackOpportunity: 0,
        readyTurnsWithNoProgressOpportunity: 0,
        readyTurnsWithPowerDisadvantage: 0,
        readyTurnsWithProgress: 0,
        totalPrepTurns: 0,
        resolvedByPlayerId: undefined,
        currentPhase: prep.state,
    };
}

function finalizeCampClearingEpisode(
    activeEpisode: ActiveCampClearingEpisode,
    endedTurn: number,
    outcome: CampClearingEpisodeOutcome,
    overrides?: Partial<Pick<CampClearingEpisodeTelemetry, "campClearedTurn" | "resolvedByPlayerId">>,
): CampClearingEpisodeTelemetry {
    return {
        playerId: activeEpisode.playerId,
        civName: activeEpisode.civName,
        campId: activeEpisode.campId,
        campCoordKey: activeEpisode.campCoordKey,
        sightedTurn: activeEpisode.sightedTurn,
        prepStartedTurn: activeEpisode.prepStartedTurn,
        firstReadyTurn: activeEpisode.firstReadyTurn,
        campClearedTurn: overrides?.campClearedTurn ?? activeEpisode.campClearedTurn,
        endedTurn,
        readinessAtStart: activeEpisode.readinessAtStart,
        initialPrepState: activeEpisode.initialPrepState,
        initialScore: activeEpisode.initialScore,
        initialNearestCityDist: activeEpisode.initialNearestCityDist,
        initialRequiredMilitary: activeEpisode.initialRequiredMilitary,
        initialMilitaryCount: activeEpisode.initialMilitaryCount,
        buildupTurns: activeEpisode.buildupTurns,
        gatheringTurns: activeEpisode.gatheringTurns,
        positioningTurns: activeEpisode.positioningTurns,
        readyTurns: activeEpisode.readyTurns,
        readyTurnsWithoutContact: activeEpisode.readyTurnsWithoutContact,
        readyTurnsWithAdjacentContact: activeEpisode.readyTurnsWithAdjacentContact,
        readyTurnsWithAttackOpportunity: activeEpisode.readyTurnsWithAttackOpportunity,
        readyTurnsWithNoProgressOpportunity: activeEpisode.readyTurnsWithNoProgressOpportunity,
        readyTurnsWithPowerDisadvantage: activeEpisode.readyTurnsWithPowerDisadvantage,
        readyTurnsWithProgress: activeEpisode.readyTurnsWithProgress,
        totalPrepTurns: activeEpisode.totalPrepTurns,
        outcome,
        resolvedByPlayerId: overrides?.resolvedByPlayerId ?? activeEpisode.resolvedByPlayerId,
    };
}

export function createCityStateTelemetryTracker(initialState: GameState): CityStateTelemetryTracker {
    const entries = new Map<string, CityStateEntryTelemetry>();
    const byPlayer = new Map<string, CityStatePlayerTelemetry>();
    const previousFocusByPlayer = new Map<string, string | undefined>();
    const activeCampEpisodesByPlayer = new Map<string, ActiveCampClearingEpisode>();
    const finalizedCampEpisodes: CampClearingEpisodeTelemetry[] = [];
    const firstVisibleTurnByPlayerCamp = new Map<string, number>();
    const passiveOpenings = new Map<string, PassiveOpeningTracker>();
    let sampledTurns = 0;
    let totalCityStateActiveTurns = 0;
    let lastProcessedHistoryIndex = initialState.history?.events?.length ?? 0;

    function recordVisibleCamps(state: GameState): void {
        for (const player of state.players) {
            const visibleKeys = new Set(state.visibility?.[player.id] || []);
            const revealedKeys = new Set(state.revealed?.[player.id] || []);
            for (const camp of state.nativeCamps ?? []) {
                const key = coordKey(camp.coord);
                if (!key) continue;
                if (!visibleKeys.has(key) && !revealedKeys.has(key)) continue;
                const visionKey = campVisionKey(player.id, camp.id);
                if (!firstVisibleTurnByPlayerCamp.has(visionKey)) {
                    firstVisibleTurnByPlayerCamp.set(visionKey, state.turn);
                }
            }
        }
    }

    for (const player of initialState.players) {
        ensurePlayerTelemetry(byPlayer, player.id, player.civName);
    }

    recordVisibleCamps(initialState);

    for (const player of initialState.players) {
        if (!player.campClearingPrep) continue;
        const diagnostics = getCampTargetDiagnostics(initialState, player.id, player.campClearingPrep.targetCampId);
        const episode = createCampClearingEpisode(
            initialState,
            player.id,
            player.campClearingPrep,
            diagnostics,
            firstVisibleTurnByPlayerCamp.get(campVisionKey(player.id, player.campClearingPrep.targetCampId)),
        );
        if (episode) {
            activeCampEpisodesByPlayer.set(player.id, episode);
        }
    }

    const initialCityStates = initialState.cityStates ?? [];
    for (const cityState of initialCityStates) {
        ensureCityStateEntry(entries, cityState, initialState.turn);
    }

    let previous = snapshotCityStates(initialState, initialCityStates);

    function processCampClearingHistory(state: GameState): void {
        const historyEvents = state.history?.events ?? [];
        for (let i = lastProcessedHistoryIndex; i < historyEvents.length; i++) {
            const event = historyEvents[i];
            if (!event) continue;

            if (event.type === HistoryEventType.CampClearingStarted) {
                const prepState = (event.data?.prepState ?? "Buildup") as CampPrepPhase;
                const campId = event.data?.campId as string | undefined;
                if (!campId) continue;
                const sightedTurn = firstVisibleTurnByPlayerCamp.get(campVisionKey(event.playerId, campId));
                const diagnostics: CampTargetDiagnostics | null = {
                    readiness: (event.data?.readiness ?? "PreArmy") as CampClearingReadiness,
                    score: Number.isFinite(Number(event.data?.score)) ? Number(event.data.score) : 0,
                    nearestCityDist: Number.isFinite(Number(event.data?.nearestCityDist)) ? Number(event.data.nearestCityDist) : 0,
                    requiredMilitary: Number.isFinite(Number(event.data?.requiredMilitary)) ? Number(event.data.requiredMilitary) : 0,
                    militaryCount: Number.isFinite(Number(event.data?.militaryCount)) ? Number(event.data.militaryCount) : 0,
                };
                const episode = createCampClearingEpisode(
                    state,
                    event.playerId,
                    {
                        targetCampId: campId,
                        state: prepState,
                        startedTurn: event.turn,
                    },
                    diagnostics,
                    sightedTurn,
                );
                if (episode) {
                    const eventCoordKey = coordKey(event.data?.campCoord);
                    if (eventCoordKey) {
                        episode.campCoordKey = eventCoordKey;
                    }
                    activeCampEpisodesByPlayer.set(event.playerId, episode);
                }
                continue;
            }

            if (event.type === HistoryEventType.CampClearingStateChanged) {
                const episode = activeCampEpisodesByPlayer.get(event.playerId);
                if (!episode) continue;
                const nextState = (event.data?.toState ?? episode.currentPhase) as CampPrepPhase;
                episode.currentPhase = nextState;
                if (nextState === "Ready" && episode.firstReadyTurn === undefined) {
                    episode.firstReadyTurn = event.turn;
                }
                continue;
            }

            if (event.type === HistoryEventType.CampClearingEnded) {
                const episode = activeCampEpisodesByPlayer.get(event.playerId);
                if (!episode) continue;
                const outcome = (event.data?.outcome ?? "OtherCancelled") as CampClearingEpisodeOutcome;
                const eventCoordKey = coordKey(event.data?.campCoord);
                if (eventCoordKey && !episode.campCoordKey) {
                    episode.campCoordKey = eventCoordKey;
                }
                finalizedCampEpisodes.push(
                    finalizeCampClearingEpisode(episode, event.turn, outcome, {
                        campClearedTurn: outcome === "ClearedBySelf" || outcome === "ClearedByOther" || outcome === "CampVanished"
                            ? event.turn
                            : undefined,
                        resolvedByPlayerId: event.data?.resolvedByPlayerId,
                    }),
                );
                activeCampEpisodesByPlayer.delete(event.playerId);
            }
        }
        lastProcessedHistoryIndex = historyEvents.length;
    }

    function observe(state: GameState, previousState?: GameState, actedPlayerId?: string): void {
        recordVisibleCamps(state);

        for (const player of state.players) {
            ensurePlayerTelemetry(byPlayer, player.id, player.civName);
        }

        if (previousState && actedPlayerId) {
            const previousPlayer = previousState.players.find(player => player.id === actedPlayerId);
            const activeEpisode = activeCampEpisodesByPlayer.get(actedPlayerId);
            if (previousPlayer?.campClearingPrep?.state === "Ready" && activeEpisode) {
                recordReadyTurnDiagnostics(
                    activeEpisode,
                    getCampReadyTurnDiagnostics(
                        previousState,
                        state,
                        actedPlayerId,
                        previousPlayer.campClearingPrep.targetCampId,
                    ),
                );
            }
        }

        processCampClearingHistory(state);

        const currentCityStates = state.cityStates ?? [];
        const currentById = new Map(currentCityStates.map(cityState => [cityState.id, cityState]));

        for (const cityState of currentCityStates) {
            const entry = ensureCityStateEntry(entries, cityState, state.turn);
            const prev = previous.get(cityState.id);

            if (!prev) {
                entry.removedTurn = null;
                continue;
            }

            if (
                cityState.lastPassiveContestationTurn !== undefined
                && cityState.lastPassiveContestationTurn !== prev.lastPassiveContestationTurn
            ) {
                entry.passiveContestationTurns += 1;
            }
            if (
                cityState.lastPassiveContestationCloseRaceTurn !== undefined
                && cityState.lastPassiveContestationCloseRaceTurn !== prev.lastPassiveContestationCloseRaceTurn
            ) {
                entry.passiveCloseRaceTurns += 1;
                if (prev.suzerainId === cityState.suzerainId) {
                    for (const tracker of passiveOpenings.values()) {
                        if (tracker.cityStateId !== cityState.id) continue;
                        recordPassiveOpeningExpired(entry, tracker);
                        passiveOpenings.delete(tracker.key);
                    }
                    const tracker = maybeCreatePassiveOpeningTracker(state, cityState, entry);
                    if (tracker) {
                        passiveOpenings.set(tracker.key, tracker);
                    }
                }
            }

            if (prev.suzerainId !== cityState.suzerainId) {
                const changeCause = classifySuzerainChangeCause(state, cityState, prev);
                const passiveAssistTurnsSince = getPassiveAssistTurnsSince(state, cityState, prev);
                const passiveAssisted = changeCause !== "PassiveContestation"
                    && passiveAssistTurnsSince !== undefined
                    && passiveAssistTurnsSince <= CITY_STATE_PASSIVE_ASSIST_WINDOW;
                entry.suzerainChanges += 1;
                incrementCauseCounter(entry.suzerainChangesByCause, changeCause);
                if (passiveAssisted) {
                    entry.passiveAssistedSuzerainChanges += 1;
                    incrementCauseCounter(entry.passiveAssistedSuzerainChangesByCause, changeCause);
                }
                if (prev.suzerainId && cityState.suzerainId && prev.suzerainId !== cityState.suzerainId) {
                    entry.ownershipTurnovers += 1;
                    incrementCauseCounter(entry.ownershipTurnoversByCause, changeCause);
                    if (passiveAssisted) {
                        entry.passiveAssistedOwnershipTurnovers += 1;
                        incrementCauseCounter(entry.passiveAssistedOwnershipTurnoversByCause, changeCause);
                    }
                    incrementPairCounter(
                        entry.ownershipTurnoversByPair,
                        makeOwnershipPairKey(prev.suzerainId, cityState.suzerainId),
                    );
                }
                for (const tracker of Array.from(passiveOpenings.values())) {
                    if (tracker.cityStateId !== cityState.id) continue;
                    if ((state.turn - tracker.createdTurn) > CITY_STATE_PASSIVE_ASSIST_WINDOW) continue;
                    recordPassiveOpeningResolved(entry, tracker, changeCause, cityState.suzerainId);
                    passiveOpenings.delete(tracker.key);
                }
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
                const pairFatigueTriggered = (cityState.lastPairFatigueTurnByPlayer?.[playerId] ?? -1) === state.turn;

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
                    if (prev.safeMaintenance) {
                        investmentTelemetry.safeMaintenanceActions += delta;
                        investmentTelemetry.safeMaintenanceGoldSpent += goldSpent;
                        playerTelemetry.safeMaintenanceActions += delta;
                        playerTelemetry.safeMaintenanceGoldSpent += goldSpent;
                    }
                } else if (prev.suzerainId) {
                    if (prev.turnoverWindow) {
                        investmentTelemetry.turnoverActions += delta;
                        investmentTelemetry.turnoverGoldSpent += goldSpent;
                        playerTelemetry.turnoverActions += delta;
                        playerTelemetry.turnoverGoldSpent += goldSpent;
                        if (prev.flipWindow) {
                            investmentTelemetry.flipWindowActions += delta;
                            investmentTelemetry.flipWindowGoldSpent += goldSpent;
                            playerTelemetry.flipWindowActions += delta;
                            playerTelemetry.flipWindowGoldSpent += goldSpent;
                        }
                    } else {
                        investmentTelemetry.deepChallengeActions += delta;
                        investmentTelemetry.deepChallengeGoldSpent += goldSpent;
                        playerTelemetry.deepChallengeActions += delta;
                        playerTelemetry.deepChallengeGoldSpent += goldSpent;
                    }
                } else {
                    investmentTelemetry.neutralClaimActions += delta;
                    investmentTelemetry.neutralClaimGoldSpent += goldSpent;
                    playerTelemetry.neutralClaimActions += delta;
                    playerTelemetry.neutralClaimGoldSpent += goldSpent;
                }

                if (pairFatigueTriggered) {
                    investmentTelemetry.pairFatigueActions += delta;
                    investmentTelemetry.pairFatigueGoldSpent += goldSpent;
                    playerTelemetry.pairFatigueActions += delta;
                    playerTelemetry.pairFatigueGoldSpent += goldSpent;
                    entry.pairFatigueActions += delta;
                    entry.pairFatigueGoldSpent += goldSpent;
                }

                for (const tracker of passiveOpenings.values()) {
                    if (tracker.cityStateId !== cityState.id) continue;
                    if (tracker.challengerId !== playerId) continue;
                    if (tracker.attemptedByNominated) continue;
                    tracker.attemptedByNominated = true;
                    tracker.firstAttemptTurn = state.turn;
                    entry.passiveOpeningsAttemptedByNominated += 1;
                    entry.passiveOpeningAttemptTurnDelayTotal += (state.turn - tracker.createdTurn);
                    entry.passiveOpeningAttemptTurnDelaySamples += 1;
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

        for (const tracker of Array.from(passiveOpenings.values())) {
            const cityState = currentById.get(tracker.cityStateId);
            const entry = entries.get(tracker.cityStateId);
            if (!entry) {
                passiveOpenings.delete(tracker.key);
                continue;
            }
            if (!cityState || (state.turn - tracker.createdTurn) > CITY_STATE_PASSIVE_ASSIST_WINDOW) {
                recordPassiveOpeningExpired(entry, tracker);
                passiveOpenings.delete(tracker.key);
            }
        }

        previous = snapshotCityStates(state, currentCityStates);
    }

    function sampleTurn(state: GameState): void {
        sampledTurns += 1;
        const cityStates = state.cityStates ?? [];
        const cityStateById = new Map(cityStates.map(cityState => [cityState.id, cityState]));

        for (const episode of activeCampEpisodesByPlayer.values()) {
            episode.totalPrepTurns += 1;
            if (episode.currentPhase === "Buildup") {
                episode.buildupTurns += 1;
            } else if (episode.currentPhase === "Gathering") {
                episode.gatheringTurns += 1;
            } else if (episode.currentPhase === "Positioning") {
                episode.positioningTurns += 1;
            } else if (episode.currentPhase === "Ready") {
                episode.readyTurns += 1;
            }
        }

        for (const cityState of cityStates) {
            const entry = ensureCityStateEntry(entries, cityState, state.turn);
            const pressure = classifyCityStatePressure(state, cityState);
            entry.activeTurns += 1;
            totalCityStateActiveTurns += 1;
            if (pressure.turnoverWindow) entry.turnoverWindowTurns += 1;
            if (pressure.flipWindow) entry.flipWindowTurns += 1;
            if (pressure.safeMaintenance) entry.safeLeadTurns += 1;
            if (isHotspotState(state, cityState)) entry.hotspotTurns += 1;

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

        for (const player of state.players) {
            if (player.isEliminated) {
                previousFocusByPlayer.set(player.id, undefined);
                continue;
            }
            const currentFocusId = getAiMemoryV2(state, player.id).cityStateFocusId;
            const previousFocusId = previousFocusByPlayer.get(player.id);
            const playerTelemetry = ensurePlayerTelemetry(byPlayer, player.id, player.civName);

            if (currentFocusId && cityStateById.has(currentFocusId)) {
                playerTelemetry.focusTurns += 1;
                if (currentFocusId !== previousFocusId) {
                    playerTelemetry.focusAssignments += 1;
                    if (previousFocusId) {
                        playerTelemetry.focusSwitches += 1;
                    }
                }

                const focusCityState = cityStateById.get(currentFocusId)!;
                const entry = ensureCityStateEntry(entries, focusCityState, state.turn);
                incrementTurnCounter(entry.focusTurnsByPlayer, player.id);
                if (focusCityState.suzerainId === player.id) {
                    playerTelemetry.focusMaintenanceTurns += 1;
                    incrementTurnCounter(entry.focusMaintenanceTurnsByPlayer, player.id);
                } else {
                    playerTelemetry.focusChallengeTurns += 1;
                    incrementTurnCounter(entry.focusChallengeTurnsByPlayer, player.id);
                }
            }

            previousFocusByPlayer.set(player.id, currentFocusId);
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

        for (const tracker of passiveOpenings.values()) {
            const entry = entries.get(tracker.cityStateId);
            if (!entry) continue;
            recordPassiveOpeningExpired(entry, tracker);
        }
        passiveOpenings.clear();

        for (const [playerId, episode] of activeCampEpisodesByPlayer.entries()) {
            finalizedCampEpisodes.push(
                finalizeCampClearingEpisode(episode, state.turn, "StillActive"),
            );
            activeCampEpisodesByPlayer.delete(playerId);
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
                safeMaintenanceGoldSpent: telemetry.safeMaintenanceGoldSpent,
                safeMaintenanceActions: telemetry.safeMaintenanceActions,
                turnoverGoldSpent: telemetry.turnoverGoldSpent,
                turnoverActions: telemetry.turnoverActions,
                flipWindowGoldSpent: telemetry.flipWindowGoldSpent,
                flipWindowActions: telemetry.flipWindowActions,
                deepChallengeGoldSpent: telemetry.deepChallengeGoldSpent,
                deepChallengeActions: telemetry.deepChallengeActions,
                neutralClaimGoldSpent: telemetry.neutralClaimGoldSpent,
                neutralClaimActions: telemetry.neutralClaimActions,
                pairFatigueGoldSpent: telemetry.pairFatigueGoldSpent,
                pairFatigueActions: telemetry.pairFatigueActions,
                focusTurns: telemetry.focusTurns,
                focusChallengeTurns: telemetry.focusChallengeTurns,
                focusMaintenanceTurns: telemetry.focusMaintenanceTurns,
                focusAssignments: telemetry.focusAssignments,
                focusSwitches: telemetry.focusSwitches,
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
                turnoverWindowTurns: entry.turnoverWindowTurns,
                flipWindowTurns: entry.flipWindowTurns,
                safeLeadTurns: entry.safeLeadTurns,
                hotspotTurns: entry.hotspotTurns,
                passiveContestationTurns: entry.passiveContestationTurns,
                passiveCloseRaceTurns: entry.passiveCloseRaceTurns,
                passiveOpenings: entry.passiveOpenings,
                passiveOpeningTurnDelayTotal: entry.passiveOpeningTurnDelayTotal,
                passiveOpeningsTreasuryAffordable: entry.passiveOpeningsTreasuryAffordable,
                passiveOpeningsReserveSafe: entry.passiveOpeningsReserveSafe,
                passiveOpeningsAttemptedByNominated: entry.passiveOpeningsAttemptedByNominated,
                passiveOpeningAttemptTurnDelayTotal: entry.passiveOpeningAttemptTurnDelayTotal,
                passiveOpeningAttemptTurnDelaySamples: entry.passiveOpeningAttemptTurnDelaySamples,
                passiveOpeningsNoAttempt: entry.passiveOpeningsNoAttempt,
                passiveOpeningsNoAttemptTreasuryBlocked: entry.passiveOpeningsNoAttemptTreasuryBlocked,
                passiveOpeningsNoAttemptReserveBlocked: entry.passiveOpeningsNoAttemptReserveBlocked,
                passiveOpeningsNoAttemptDespiteCapacity: entry.passiveOpeningsNoAttemptDespiteCapacity,
                passiveOpeningsResolved: entry.passiveOpeningsResolved,
                passiveOpeningsResolvedByCause: { ...entry.passiveOpeningsResolvedByCause },
                passiveOpeningsWonByNominated: entry.passiveOpeningsWonByNominated,
                passiveOpeningsWonByNominatedByCause: { ...entry.passiveOpeningsWonByNominatedByCause },
                passiveOpeningsLost: entry.passiveOpeningsLost,
                passiveOpeningsExpired: entry.passiveOpeningsExpired,
                passiveAssistedSuzerainChanges: entry.passiveAssistedSuzerainChanges,
                passiveAssistedSuzerainChangesByCause: { ...entry.passiveAssistedSuzerainChangesByCause },
                passiveAssistedOwnershipTurnovers: entry.passiveAssistedOwnershipTurnovers,
                passiveAssistedOwnershipTurnoversByCause: { ...entry.passiveAssistedOwnershipTurnoversByCause },
                suzerainTurnsByPlayer: { ...entry.suzerainTurnsByPlayer },
                focusTurnsByPlayer: { ...entry.focusTurnsByPlayer },
                focusChallengeTurnsByPlayer: { ...entry.focusChallengeTurnsByPlayer },
                focusMaintenanceTurnsByPlayer: { ...entry.focusMaintenanceTurnsByPlayer },
                investmentByPlayer: Object.fromEntries(
                    Object.entries(entry.investmentByPlayer).map(([playerId, investment]) => [
                        playerId,
                        { ...investment },
                    ])
                ),
                suzerainChanges: entry.suzerainChanges,
                suzerainChangesByCause: { ...entry.suzerainChangesByCause },
                ownershipTurnovers: entry.ownershipTurnovers,
                ownershipTurnoversByCause: { ...entry.ownershipTurnoversByCause },
                ownershipTurnoversByPair: { ...entry.ownershipTurnoversByPair },
                pairFatigueActions: entry.pairFatigueActions,
                pairFatigueGoldSpent: entry.pairFatigueGoldSpent,
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
            campClearing: {
                episodes: finalizedCampEpisodes
                    .slice()
                    .sort((a, b) => a.prepStartedTurn - b.prepStartedTurn || a.civName.localeCompare(b.civName) || a.campId.localeCompare(b.campId)),
            },
        };
    }

    return { observe, sampleTurn, finalize };
}
