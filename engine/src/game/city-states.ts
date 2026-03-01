import {
    CITY_STATE_BASE_YIELD_BONUS,
    CITY_STATE_CHALLENGER_INVEST_BONUS,
    CITY_STATE_CHALLENGER_PRESSURE,
    CITY_STATE_CONTEST_MARGIN,
    CITY_STATE_CONTESTATION_DECAY_MAX,
    CITY_STATE_CONTESTATION_DECAY_PER_RIVAL,
    CITY_STATE_CONTESTATION_INTERVAL,
    CITY_STATE_CLEARER_INFLUENCE,
    CITY_STATE_FALLBACK_PREFIX,
    CITY_STATE_INVEST_BASE_COST,
    CITY_STATE_INVEST_COST_RAMP,
    CITY_STATE_INVEST_GAIN,
    CITY_STATE_INVEST_SUZERAIN_DISCOUNT,
    CITY_STATE_INVEST_SUZERAIN_RAMP_CAP,
    CITY_STATE_NAMES_BY_YIELD,
    CITY_STATE_REINFORCE_CAP,
    CITY_STATE_REINFORCE_INTERVAL,
    CITY_STATE_SAME_TYPE_ADDITIONAL_MULT,
    CITY_STATE_SAME_TYPE_SECONDARY_MULT,
    UNITS,
} from "../core/constants.js";
import {
    City,
    CityState,
    CityStateSuzerainChangeCause,
    CityStateYieldType,
    GameState,
    HexCoord,
    TerrainType,
    Unit,
    UnitDomain,
    UnitState,
    UnitType,
} from "../core/types.js";
import { getNeighbors, hexEquals, hexToString } from "../core/hex.js";
import { claimCityTerritory, createCity, ensureWorkedTiles } from "./helpers/cities.js";

const CITY_STATE_YIELD_ROTATION: CityStateYieldType[] = ["Science", "Production", "Food", "Gold"];
const ROTATION_LENGTH = CITY_STATE_YIELD_ROTATION.length;
const REINFORCEMENT_TURN_EARLY = 35;
const REINFORCEMENT_TURN_MID = 70;
const SUZERAIN_CHANGE_STREAK_WINDOW = 16;
const HOTSPOT_CHANGE_THRESHOLD = 3;
const HOTSPOT_STABILITY_MARGIN_STEP = 8;
const HOTSPOT_STABILITY_MARGIN_MAX = 24;
const SUZERAIN_PAIR_STREAK_WINDOW = 18;
const SUZERAIN_PAIR_RECAPTURE_MARGIN_BASE = 6;
const SUZERAIN_PAIR_RECAPTURE_MARGIN_STEP = 6;
const SUZERAIN_PAIR_RECAPTURE_MARGIN_MAX = 30;
const SUZERAIN_PAIR_RECLAIM_BONUS_REDUCTION_STEP = 4;
const SUZERAIN_PAIR_RECLAIM_BONUS_REDUCTION_MAX = 12;
const SUZERAIN_PAIR_RECLAIM_PRESSURE_REDUCTION_STEP = 3;
const SUZERAIN_PAIR_RECLAIM_PRESSURE_REDUCTION_MAX = 9;
const PASSIVE_CONTESTATION_CLOSE_RACE_EXTRA_DECAY = 1;
const PASSIVE_CONTESTATION_CLOSE_RACE_EXTRA_GAIN = 1;
const PASSIVE_CONTESTATION_CLOSE_RACE_FLIP_MARGIN = 1;
const INVESTMENT_CLOSE_RACE_FLIP_MARGIN = 1;
const CITY_STATE_PASSIVE_OPENING_WINDOW = 4;
const CITY_STATE_PASSIVE_OPENING_CHALLENGE_DISCOUNT = 0.8;

export type CityStateYieldBonuses = {
    Science: number;
    Production: number;
    Food: number;
    Gold: number;
};

function bumpSeed(state: GameState): number {
    const numericSeed = Number.isFinite(state.seed) ? state.seed : 1;
    const next = (numericSeed * 9301 + 49297) % 233280;
    state.seed = next;
    return Math.floor(next);
}

function collectUsedCityNames(state: GameState): Set<string> {
    const used = new Set<string>(state.usedCityNames ?? []);
    for (const city of state.cities) {
        used.add(city.name);
    }
    return used;
}

function isCityStateSpawnTileValid(state: GameState, coord: HexCoord, movingUnitId?: string): boolean {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return false;
    if (tile.terrain === TerrainType.Mountain || tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) return false;
    const occupant = state.units.find(u => hexEquals(u.coord, coord) && u.id !== movingUnitId);
    if (occupant) return false;
    const otherCity = state.cities.find(c => hexEquals(c.coord, coord));
    if (otherCity && !hexEquals(otherCity.coord, coord)) return false;
    return true;
}

function getCityStateReinforcementPool(turn: number): UnitType[] {
    if (turn < REINFORCEMENT_TURN_EARLY) {
        return [UnitType.SpearGuard, UnitType.BowGuard];
    }
    if (turn < REINFORCEMENT_TURN_MID) {
        return [UnitType.Riders, UnitType.BowGuard];
    }
    return [UnitType.ArmySpearGuard, UnitType.ArmyBowGuard];
}

function getCityStateSpawnTarget(state: GameState, cityState: CityState): HexCoord | null {
    const city = state.cities.find(c => c.id === cityState.cityId);
    if (!city) return null;

    const candidates: HexCoord[] = [city.coord];
    const neighbors = getNeighbors(city.coord);
    for (const neighbor of neighbors) {
        candidates.push(neighbor);
    }

    for (const coord of candidates) {
        if (isCityStateSpawnTileValid(state, coord)) return coord;
    }
    return null;
}

function canUnitStandOnTile(unit: Unit, terrain: TerrainType): boolean {
    const stats = UNITS[unit.type];
    if (stats.domain === UnitDomain.Land) {
        return terrain !== TerrainType.Mountain && terrain !== TerrainType.Coast && terrain !== TerrainType.DeepSea;
    }
    if (stats.domain === UnitDomain.Naval) {
        return terrain === TerrainType.Coast || terrain === TerrainType.DeepSea;
    }
    return true;
}

function findNearestCityStateTile(state: GameState, cityState: CityState, unit: Unit): HexCoord | null {
    const start = unit.coord;
    const queue: HexCoord[] = [start];
    const visited = new Set<string>([hexToString(start)]);

    const isValidDestination = (coord: HexCoord): boolean => {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
        if (!tile) return false;
        if (tile.ownerId !== cityState.ownerId) return false;
        if (!canUnitStandOnTile(unit, tile.terrain)) return false;
        const blocker = state.units.find(u => u.id !== unit.id && hexEquals(u.coord, coord));
        return !blocker;
    };

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (isValidDestination(current)) {
            return current;
        }
        for (const neighbor of getNeighbors(current)) {
            const key = hexToString(neighbor);
            if (visited.has(key)) continue;
            const tile = state.map.tiles.find(t => hexEquals(t.coord, neighbor));
            if (!tile) continue;
            if (!canUnitStandOnTile(unit, tile.terrain)) continue;
            visited.add(key);
            queue.push(neighbor);
        }
    }

    return null;
}

function spawnCityStateUnit(state: GameState, cityState: CityState, ownerId: string, unitType: UnitType): Unit | null {
    const target = getCityStateSpawnTarget(state, cityState);
    if (!target) return null;
    const unitStats = UNITS[unitType];
    const seedValue = bumpSeed(state);
    const unitId = `u_${cityState.id}_${unitType}_${state.turn}_${seedValue}_${state.units.length}`;
    const unit: Unit = {
        id: unitId,
        type: unitType,
        ownerId,
        coord: target,
        hp: unitStats.hp,
        maxHp: unitStats.hp,
        movesLeft: unitStats.move,
        state: UnitState.Normal,
        hasAttacked: false,
        cityStateId: cityState.id,
        isCityStateLevy: ownerId !== cityState.ownerId,
        cityStateOriginalOwnerId: cityState.ownerId,
    };
    state.units.push(unit);
    return unit;
}

function transferCityStateUnitsToSuzerain(state: GameState, cityState: CityState, suzerainId: string): boolean {
    let changed = false;
    for (const unit of state.units) {
        if (unit.cityStateId !== cityState.id) continue;
        if (unit.ownerId === suzerainId && unit.isCityStateLevy) continue;
        if (unit.ownerId !== cityState.ownerId) continue;
        unit.ownerId = suzerainId;
        unit.isCityStateLevy = true;
        unit.cityStateOriginalOwnerId = cityState.ownerId;
        changed = true;
    }
    return changed;
}

function recallAndReleaseCityStateUnits(state: GameState, cityState: CityState): boolean {
    let changed = false;
    for (const unit of state.units) {
        if (unit.cityStateId !== cityState.id) continue;
        if (!unit.isCityStateLevy) continue;
        unit.ownerId = cityState.ownerId;
        unit.isCityStateLevy = false;
        unit.cityStateOriginalOwnerId = undefined;
        unit.hasAttacked = false;
        unit.state = UnitState.Normal;
        const recallCoord = findNearestCityStateTile(state, cityState, unit);
        if (recallCoord) {
            unit.coord = recallCoord;
            unit.movesLeft = 0;
        }
        changed = true;
    }
    return changed;
}

function getPlayerWarCountAgainstMajors(state: GameState, playerId: string): number {
    const relation = state.diplomacy[playerId] ?? {};
    let wars = 0;
    for (const other of state.players) {
        if (other.id === playerId || other.isEliminated) continue;
        if (relation[other.id] === "War") wars++;
    }
    return wars;
}

function recordSuzerainChangeMetadata(
    state: GameState,
    cityState: CityState,
    cause: CityStateSuzerainChangeCause,
    previousSuzerainId: string | undefined,
    nextSuzerainId: string | undefined,
): void {
    const lastChangeTurn = cityState.lastSuzerainChangeTurn;
    const recentCount = cityState.recentSuzerainChangeCount ?? 0;
    cityState.recentSuzerainChangeCount = lastChangeTurn !== undefined
        && (state.turn - lastChangeTurn) <= SUZERAIN_CHANGE_STREAK_WINDOW
        ? recentCount + 1
        : 1;
    cityState.lastSuzerainChangeTurn = state.turn;
    cityState.lastSuzerainChangeCause = cause;

    if (previousSuzerainId && nextSuzerainId && previousSuzerainId !== nextSuzerainId) {
        const pairKey = [previousSuzerainId, nextSuzerainId].sort().join("|");
        const lastPairKey = cityState.recentSuzerainPairKey;
        const lastPairTurn = cityState.recentSuzerainPairTurn;
        const lastPairCount = cityState.recentSuzerainPairChangeCount ?? 0;
        cityState.recentSuzerainPairChangeCount = lastPairTurn !== undefined
            && (state.turn - lastPairTurn) <= SUZERAIN_PAIR_STREAK_WINDOW
            && lastPairKey === pairKey
            ? lastPairCount + 1
            : 1;
        cityState.recentSuzerainPairKey = pairKey;
        cityState.recentSuzerainPairTurn = state.turn;
        cityState.lastSuzerainHolderId = previousSuzerainId;
        return;
    }

    if (previousSuzerainId !== nextSuzerainId) {
        cityState.lastSuzerainHolderId = previousSuzerainId;
    }
}

function applyCityStateSuzerainChange(
    state: GameState,
    cityState: CityState,
    nextSuzerainId: string | undefined,
    cause: CityStateSuzerainChangeCause,
): boolean {
    if (cityState.suzerainId === nextSuzerainId) return false;
    const previousSuzerainId = cityState.suzerainId;
    cityState.suzerainId = nextSuzerainId;
    recordSuzerainChangeMetadata(state, cityState, cause, previousSuzerainId, nextSuzerainId);
    return true;
}

function getHotspotStabilityMargin(
    state: GameState,
    cityState: CityState,
    incumbentId: string | undefined,
    challengerId: string,
): number {
    if (!incumbentId || challengerId === incumbentId) return 0;
    const lastChangeTurn = cityState.lastSuzerainChangeTurn;
    const recentCount = cityState.recentSuzerainChangeCount ?? 0;
    if (lastChangeTurn === undefined) return 0;
    if ((state.turn - lastChangeTurn) > SUZERAIN_CHANGE_STREAK_WINDOW) return 0;
    if (recentCount < HOTSPOT_CHANGE_THRESHOLD) return 0;

    const streakDepth = recentCount - HOTSPOT_CHANGE_THRESHOLD + 1;
    return Math.min(HOTSPOT_STABILITY_MARGIN_MAX, HOTSPOT_STABILITY_MARGIN_STEP * streakDepth);
}

function getPairRecaptureStabilityMargin(
    state: GameState,
    cityState: CityState,
    incumbentId: string | undefined,
    challengerId: string,
): number {
    if (!incumbentId || challengerId === incumbentId) return 0;
    if (cityState.lastSuzerainHolderId !== challengerId) return 0;
    const pairTurn = cityState.recentSuzerainPairTurn;
    const pairKey = cityState.recentSuzerainPairKey;
    const pairCount = cityState.recentSuzerainPairChangeCount ?? 0;
    if (pairTurn === undefined) return 0;
    if ((state.turn - pairTurn) > SUZERAIN_PAIR_STREAK_WINDOW) return 0;
    if (!pairKey || pairKey !== [challengerId, incumbentId].sort().join("|")) return 0;

    return Math.min(
        SUZERAIN_PAIR_RECAPTURE_MARGIN_MAX,
        SUZERAIN_PAIR_RECAPTURE_MARGIN_BASE + (Math.max(0, pairCount - 1) * SUZERAIN_PAIR_RECAPTURE_MARGIN_STEP),
    );
}

function getPairReclaimFatigue(
    state: GameState,
    cityState: CityState,
    incumbentId: string | undefined,
    challengerId: string,
): { bonusReduction: number; pressureReduction: number } {
    if (!incumbentId || challengerId === incumbentId) {
        return { bonusReduction: 0, pressureReduction: 0 };
    }
    if (cityState.lastSuzerainHolderId !== challengerId) {
        return { bonusReduction: 0, pressureReduction: 0 };
    }

    const pairTurn = cityState.recentSuzerainPairTurn;
    const pairKey = cityState.recentSuzerainPairKey;
    const pairCount = cityState.recentSuzerainPairChangeCount ?? 0;
    if (pairTurn === undefined || pairCount <= 0) {
        return { bonusReduction: 0, pressureReduction: 0 };
    }
    if ((state.turn - pairTurn) > SUZERAIN_PAIR_STREAK_WINDOW) {
        return { bonusReduction: 0, pressureReduction: 0 };
    }
    if (!pairKey || pairKey !== [challengerId, incumbentId].sort().join("|")) {
        return { bonusReduction: 0, pressureReduction: 0 };
    }

    return {
        bonusReduction: Math.min(
            SUZERAIN_PAIR_RECLAIM_BONUS_REDUCTION_MAX,
            pairCount * SUZERAIN_PAIR_RECLAIM_BONUS_REDUCTION_STEP,
        ),
        pressureReduction: Math.min(
            SUZERAIN_PAIR_RECLAIM_PRESSURE_REDUCTION_MAX,
            pairCount * SUZERAIN_PAIR_RECLAIM_PRESSURE_REDUCTION_STEP,
        ),
    };
}

export function ensureCityStateState(state: GameState): void {
    if (!state.cityStates) state.cityStates = [];
    if (state.cityStateTypeCycleIndex === undefined) state.cityStateTypeCycleIndex = 0;
}

export function isCityStateOwnerId(state: GameState, ownerId: string | undefined): boolean {
    if (!ownerId) return false;
    ensureCityStateState(state);
    return (state.cityStates ?? []).some(cs => cs.ownerId === ownerId);
}

export function getCityStateByOwnerId(state: GameState, ownerId: string): CityState | undefined {
    ensureCityStateState(state);
    return (state.cityStates ?? []).find(cs => cs.ownerId === ownerId);
}

export function getCityStateById(state: GameState, cityStateId: string): CityState | undefined {
    ensureCityStateState(state);
    return (state.cityStates ?? []).find(cs => cs.id === cityStateId);
}

export function isCityStateRecentPassiveOpening(
    state: GameState,
    cityState: CityState,
    maxAge = CITY_STATE_PASSIVE_OPENING_WINDOW,
): boolean {
    const lastCloseRaceTurn = cityState.lastPassiveContestationCloseRaceTurn;
    if (lastCloseRaceTurn === undefined) return false;
    if ((state.turn - lastCloseRaceTurn) > maxAge) return false;
    return true;
}

function getCityStateEffectivePurchaseCount(
    cityState: CityState,
    playerId: string,
    applySuzerainRampCap = true,
): number {
    const purchaseCount = cityState.investmentCountByPlayer[playerId] ?? 0;
    if (!applySuzerainRampCap) return purchaseCount;
    if (cityState.suzerainId !== playerId) return purchaseCount;
    return Math.min(purchaseCount, CITY_STATE_INVEST_SUZERAIN_RAMP_CAP);
}

function computeCityStateInvestCost(
    cityState: CityState,
    playerId: string,
    state: GameState | undefined,
    applySuzerainRampCap: boolean,
): number {
    const purchaseCount = getCityStateEffectivePurchaseCount(cityState, playerId, applySuzerainRampCap);
    const scaledCost = CITY_STATE_INVEST_BASE_COST * Math.pow(1 + CITY_STATE_INVEST_COST_RAMP, purchaseCount);
    const maintenanceDiscount = cityState.suzerainId === playerId ? CITY_STATE_INVEST_SUZERAIN_DISCOUNT : 1;
    const passiveOpeningDiscount = state
        && cityState.suzerainId !== playerId
        && isCityStateRecentPassiveOpening(state, cityState)
        ? CITY_STATE_PASSIVE_OPENING_CHALLENGE_DISCOUNT
        : 1;
    return Math.max(1, Math.ceil(scaledCost * maintenanceDiscount * passiveOpeningDiscount));
}

export function getCityStateInvestCost(cityState: CityState, playerId: string, state?: GameState): number {
    return computeCityStateInvestCost(cityState, playerId, state, true);
}

export function getCityStateInvestDecisionCost(cityState: CityState, playerId: string, state?: GameState): number {
    return computeCityStateInvestCost(cityState, playerId, state, false);
}

export function getCityStateName(state: GameState, yieldType: CityStateYieldType): string {
    const pool = CITY_STATE_NAMES_BY_YIELD[yieldType] ?? [];
    const used = collectUsedCityNames(state);
    const cityStateCount = state.cityStates?.length ?? 0;

    if (pool.length > 0) {
        const seedStart = Math.abs(Math.floor(state.seed) + state.turn + cityStateCount * 17) % pool.length;
        for (let i = 0; i < pool.length; i++) {
            const idx = (seedStart + i) % pool.length;
            const candidate = pool[idx];
            if (!used.has(candidate)) return candidate;
        }
    }

    const prefix = CITY_STATE_FALLBACK_PREFIX[yieldType] ?? "Free City";
    let counter = 1;
    let fallback = `${prefix} ${counter}`;
    while (used.has(fallback)) {
        counter++;
        fallback = `${prefix} ${counter}`;
    }
    return fallback;
}

export function assignNextCityStateYieldType(state: GameState): CityStateYieldType {
    ensureCityStateState(state);
    const cursor = state.cityStateTypeCycleIndex ?? 0;
    const nextType = CITY_STATE_YIELD_ROTATION[cursor % ROTATION_LENGTH];
    state.cityStateTypeCycleIndex = cursor + 1;
    return nextType;
}

export function resolveCityStateSuzerain(
    state: GameState,
    cityStateId: string,
    cause: CityStateSuzerainChangeCause = "Other",
): string | undefined {
    const cityState = getCityStateById(state, cityStateId);
    if (!cityState) return undefined;
    if (cityState.lockedControllerId) return cityState.suzerainId;

    const contenders = state.players
        .filter(p => !p.isEliminated)
        .filter(p => !cityState.warByPlayer[p.id])
        .map(p => ({
            playerId: p.id,
            influence: cityState.influenceByPlayer[p.id] ?? 0,
        }));

    if (contenders.length === 0) {
        applyCityStateSuzerainChange(state, cityState, undefined, cause);
        return undefined;
    }

    const maxInfluence = Math.max(...contenders.map(c => c.influence));
    if (maxInfluence <= 0) {
        applyCityStateSuzerainChange(state, cityState, undefined, cause);
        return undefined;
    }

    const ranked = [...contenders].sort((a, b) => b.influence - a.influence || a.playerId.localeCompare(b.playerId));
    const topEntry = ranked[0];
    const second = ranked[1];
    const incumbent = cityState.suzerainId && !cityState.warByPlayer[cityState.suzerainId]
        ? cityState.suzerainId
        : undefined;
    const hotspotStabilityMargin = getHotspotStabilityMargin(state, cityState, incumbent, topEntry.playerId);
    const pairRecaptureMargin = getPairRecaptureStabilityMargin(state, cityState, incumbent, topEntry.playerId);
    const challengerStabilityMargin = hotspotStabilityMargin + pairRecaptureMargin;
    if (incumbent && topEntry.playerId !== incumbent && challengerStabilityMargin > 0) {
        const incumbentInfluence = cityState.influenceByPlayer[incumbent] ?? 0;
        if (topEntry.influence < (incumbentInfluence + challengerStabilityMargin)) {
            return incumbent;
        }
    }
    if (second && second.influence > 0) {
        const lead = topEntry.influence - second.influence;
        if (lead <= CITY_STATE_CONTEST_MARGIN) {
            const minimumContestControlInfluence = Math.max(6, Math.floor(CITY_STATE_INVEST_GAIN / 2));
            const topIsMeaningful = topEntry.influence >= minimumContestControlInfluence;
            if (incumbent) {
                const incumbentInfluence = cityState.influenceByPlayer[incumbent] ?? 0;
                const turnoverMargin = cause === "PassiveContestation" && challengerStabilityMargin === 0
                    ? PASSIVE_CONTESTATION_CLOSE_RACE_FLIP_MARGIN
                    : cause === "Investment" && challengerStabilityMargin === 0
                        ? INVESTMENT_CLOSE_RACE_FLIP_MARGIN
                    : Math.max(1, Math.ceil(CITY_STATE_CONTEST_MARGIN / 4));
                if (
                    topEntry.playerId !== incumbent &&
                    (cause !== "PassiveContestation" || topIsMeaningful) &&
                    topEntry.influence >= (incumbentInfluence + turnoverMargin + challengerStabilityMargin)
                ) {
                    applyCityStateSuzerainChange(state, cityState, topEntry.playerId, cause);
                    return topEntry.playerId;
                }
                cityState.suzerainId = incumbent;
                return incumbent;
            }
            if (topIsMeaningful) {
                applyCityStateSuzerainChange(state, cityState, topEntry.playerId, cause);
                return topEntry.playerId;
            }
            applyCityStateSuzerainChange(state, cityState, undefined, cause);
            return undefined;
        }
    }

    const top = contenders.filter(c => c.influence === maxInfluence).map(c => c.playerId);
    if (top.length === 1) {
        applyCityStateSuzerainChange(state, cityState, top[0], cause);
        return top[0];
    }

    if (incumbent && top.includes(incumbent)) {
        return incumbent;
    }

    for (const player of state.players) {
        if (top.includes(player.id)) {
            applyCityStateSuzerainChange(state, cityState, player.id, cause);
            return player.id;
        }
    }

    applyCityStateSuzerainChange(state, cityState, undefined, cause);
    return undefined;
}

export function updateCityStateDiscoveryForPlayer(state: GameState, playerId: string, visibleKeys: Set<string>): void {
    ensureCityStateState(state);
    for (const cityState of state.cityStates ?? []) {
        if (cityState.discoveredByPlayer[playerId] === undefined) {
            cityState.discoveredByPlayer[playerId] = false;
        }
        if (cityState.discoveredByPlayer[playerId]) continue;
        const cityVisible = visibleKeys.has(hexToString(cityState.coord));
        if (cityVisible) {
            cityState.discoveredByPlayer[playerId] = true;
            continue;
        }
        const unitVisible = state.units.some(unit =>
            unit.cityStateId === cityState.id &&
            visibleKeys.has(hexToString(unit.coord))
        );
        if (unitVisible) {
            cityState.discoveredByPlayer[playerId] = true;
        }
    }
}

export function ensureCityStateWar(state: GameState, cityStateOwnerId: string, playerId: string): boolean {
    const cityState = getCityStateByOwnerId(state, cityStateOwnerId);
    if (!cityState) return false;
    if (!cityState.warByPlayer[playerId]) {
        cityState.warByPlayer[playerId] = true;
    }
    if (cityState.suzerainId === playerId) {
        applyCityStateSuzerainChange(state, cityState, undefined, "WarBreak");
    }
    if (!cityState.lockedControllerId) {
        resolveCityStateSuzerain(state, cityState.id, "WarBreak");
    }
    return true;
}

export function createCityStateFromClearedCamp(
    state: GameState,
    coord: HexCoord,
    killerPlayerId: string,
    startingProduction: number,
): CityState | null {
    ensureCityStateState(state);
    const killer = state.players.find(p => p.id === killerPlayerId && !p.isEliminated);
    if (!killer) return null;

    const yieldType = assignNextCityStateYieldType(state);
    const name = getCityStateName(state, yieldType);
    const ownerId = `citystate_owner_${state.turn}_${state.cityStates?.length ?? 0}_${Math.abs(coord.q)}_${Math.abs(coord.r)}`;
    const city = createCity(state, ownerId, coord, {
        name,
        storedProduction: startingProduction,
        isCapitalOverride: false,
    });
    city.isCapital = false;
    claimCityTerritory(city, state, ownerId, 1);
    city.workedTiles = ensureWorkedTiles(city, state);
    state.cities.push(city);

    const influenceByPlayer: Record<string, number> = {};
    const investmentCountByPlayer: Record<string, number> = {};
    const lastInvestTurnByPlayer: Record<string, number> = {};
    const discoveredByPlayer: Record<string, boolean> = {};
    const warByPlayer: Record<string, boolean> = {};
    const lastPairFatigueTurnByPlayer: Record<string, number> = {};
    const lastPairFatigueBonusReductionByPlayer: Record<string, number> = {};
    const lastPairFatiguePressureReductionByPlayer: Record<string, number> = {};
    for (const player of state.players) {
        influenceByPlayer[player.id] = 0;
        investmentCountByPlayer[player.id] = 0;
        lastInvestTurnByPlayer[player.id] = -1;
        discoveredByPlayer[player.id] = false;
        warByPlayer[player.id] = false;
        lastPairFatigueTurnByPlayer[player.id] = -1;
        lastPairFatigueBonusReductionByPlayer[player.id] = 0;
        lastPairFatiguePressureReductionByPlayer[player.id] = 0;
    }
    influenceByPlayer[killerPlayerId] = CITY_STATE_CLEARER_INFLUENCE;
    discoveredByPlayer[killerPlayerId] = true;

    const cityStateId = `citystate_${state.turn}_${state.cityStates?.length ?? 0}_${bumpSeed(state)}`;
    const cityState: CityState = {
        id: cityStateId,
        ownerId,
        cityId: city.id,
        coord,
        name,
        yieldType,
        influenceByPlayer,
        investmentCountByPlayer,
        lastInvestTurnByPlayer,
        suzerainId: killerPlayerId,
        lockedControllerId: undefined,
        discoveredByPlayer,
        lastReinforcementTurn: state.turn,
        warByPlayer,
        lastSuzerainChangeTurn: undefined,
        recentSuzerainChangeCount: 0,
        lastSuzerainChangeCause: undefined,
        lastSuzerainHolderId: undefined,
        recentSuzerainPairKey: undefined,
        recentSuzerainPairChangeCount: 0,
        recentSuzerainPairTurn: undefined,
        lastPassiveContestationTurn: undefined,
        lastPassiveContestationCloseRaceTurn: undefined,
        lastPairFatigueTurnByPlayer,
        lastPairFatigueBonusReductionByPlayer,
        lastPairFatiguePressureReductionByPlayer,
    };
    state.cityStates?.push(cityState);

    const initialPool = getCityStateReinforcementPool(state.turn);
    spawnCityStateUnit(state, cityState, cityState.ownerId, initialPool[0]);
    spawnCityStateUnit(state, cityState, cityState.ownerId, initialPool[Math.min(1, initialPool.length - 1)]);

    return cityState;
}

export function getCityStateYieldBonusesForPlayer(state: GameState, playerId: string): CityStateYieldBonuses {
    ensureCityStateState(state);
    const controlled = (state.cityStates ?? []).filter(cs => cs.suzerainId === playerId);
    const byType: Record<CityStateYieldType, number> = {
        Science: 0,
        Production: 0,
        Food: 0,
        Gold: 0,
    };
    const seenByType: Record<CityStateYieldType, number> = {
        Science: 0,
        Production: 0,
        Food: 0,
        Gold: 0,
    };

    for (const cityState of controlled) {
        const rank = seenByType[cityState.yieldType];
        const multiplier = rank === 0
            ? 1
            : rank === 1
                ? CITY_STATE_SAME_TYPE_SECONDARY_MULT
                : CITY_STATE_SAME_TYPE_ADDITIONAL_MULT;
        byType[cityState.yieldType] += CITY_STATE_BASE_YIELD_BONUS * multiplier;
        seenByType[cityState.yieldType] = rank + 1;
    }

    return byType;
}

export function getFoodProductionTargetCity(state: GameState, playerId: string): City | undefined {
    const owned = state.cities.filter(c => c.ownerId === playerId);
    if (owned.length === 0) return undefined;
    const capital = owned.find(c => c.isCapital);
    if (capital) return capital;
    const sorted = [...owned].sort((a, b) => b.pop - a.pop);
    return sorted[0];
}

export function processCityStateReinforcement(state: GameState): void {
    ensureCityStateState(state);
    for (const cityState of state.cityStates ?? []) {
        if (cityState.lockedControllerId) continue;
        const turnsSince = state.turn - (cityState.lastReinforcementTurn ?? 0);
        if (turnsSince < CITY_STATE_REINFORCE_INTERVAL) continue;

        const defenders = state.units.filter(unit =>
            unit.cityStateId === cityState.id &&
            unit.ownerId === cityState.ownerId
        );
        if (defenders.length >= CITY_STATE_REINFORCE_CAP) continue;

        const pool = getCityStateReinforcementPool(state.turn);
        const nextType = pool[defenders.length % pool.length];
        const spawned = spawnCityStateUnit(state, cityState, cityState.ownerId, nextType);
        if (spawned) {
            cityState.lastReinforcementTurn = state.turn;
        }
    }
}

export function processCityStateInfluenceContestation(state: GameState): void {
    ensureCityStateState(state);
    if (state.turn % CITY_STATE_CONTESTATION_INTERVAL !== 0) return;

    for (const cityState of state.cityStates ?? []) {
        const suzerainId = cityState.suzerainId;
        if (!suzerainId) continue;

        const contenders = state.players
            .filter(player => !player.isEliminated)
            .filter(player => !cityState.warByPlayer[player.id])
            .map(player => ({
                playerId: player.id,
                influence: cityState.influenceByPlayer[player.id] ?? 0,
            }));

        const rivals = contenders
            .filter(entry => entry.playerId !== suzerainId)
            .filter(entry => entry.influence > 0);
        if (rivals.length === 0) continue;

        const rankedRivals = [...rivals].sort((a, b) => b.influence - a.influence || a.playerId.localeCompare(b.playerId));
        const topRival = rankedRivals[0];
        const currentSuzerainInfluence = cityState.influenceByPlayer[suzerainId] ?? 0;
        const leadBeforePressure = currentSuzerainInfluence - topRival.influence;
        const nearTurnover = leadBeforePressure <= (CITY_STATE_CONTEST_MARGIN + CITY_STATE_INVEST_GAIN);
        const hotspotProtected = getHotspotStabilityMargin(state, cityState, suzerainId, topRival.playerId) > 0
            || getPairRecaptureStabilityMargin(state, cityState, suzerainId, topRival.playerId) > 0;
        const nonHotspotCloseRace = !hotspotProtected && leadBeforePressure <= CITY_STATE_CONTEST_MARGIN;

        const baseDecay = Math.min(
            CITY_STATE_CONTESTATION_DECAY_MAX,
            rivals.length * CITY_STATE_CONTESTATION_DECAY_PER_RIVAL,
        );
        const contestedDecayBonus = nearTurnover
            ? Math.min(3, Math.max(1, Math.ceil(rivals.length / 2)))
            : 0;
        const wartimeLockPressure = cityState.lockedControllerId ? 1 : 0;
        const decay = baseDecay
            + contestedDecayBonus
            + wartimeLockPressure
            + (nonHotspotCloseRace ? PASSIVE_CONTESTATION_CLOSE_RACE_EXTRA_DECAY : 0);
        cityState.influenceByPlayer[suzerainId] = Math.max(0, currentSuzerainInfluence - decay);

        const topRivalGain = (nearTurnover ? 2 : 1)
            + wartimeLockPressure
            + (nonHotspotCloseRace ? PASSIVE_CONTESTATION_CLOSE_RACE_EXTRA_GAIN : 0);
        cityState.influenceByPlayer[topRival.playerId] = (cityState.influenceByPlayer[topRival.playerId] ?? 0) + topRivalGain;

        cityState.lastPassiveContestationTurn = state.turn;
        cityState.lastPassiveContestationCloseRaceTurn = nonHotspotCloseRace ? state.turn : undefined;

        if (nearTurnover && rankedRivals.length > 1 && !nonHotspotCloseRace) {
            const secondRival = rankedRivals[1];
            cityState.influenceByPlayer[secondRival.playerId] = (cityState.influenceByPlayer[secondRival.playerId] ?? 0) + 1;
        }

        resolveCityStateSuzerain(state, cityState.id, "PassiveContestation");
    }
}

export function syncCityStateWarTransfers(state: GameState): boolean {
    ensureCityStateState(state);
    let changed = false;

    for (const cityState of state.cityStates ?? []) {
        if (cityState.suzerainId && cityState.warByPlayer[cityState.suzerainId]) {
            applyCityStateSuzerainChange(state, cityState, undefined, "WarBreak");
            changed = true;
        }

        const suzerainId = cityState.suzerainId;
        const hasMajorWar = suzerainId ? getPlayerWarCountAgainstMajors(state, suzerainId) > 0 : false;

        if (suzerainId && hasMajorWar) {
            if (!cityState.lockedControllerId) {
                cityState.lockedControllerId = suzerainId;
                changed = true;
            }
            if (cityState.lockedControllerId) {
                changed = transferCityStateUnitsToSuzerain(state, cityState, cityState.lockedControllerId) || changed;
            }
            continue;
        }

        if (cityState.lockedControllerId) {
            changed = recallAndReleaseCityStateUnits(state, cityState) || changed;
            cityState.lockedControllerId = undefined;
            changed = true;
            resolveCityStateSuzerain(state, cityState.id, "WartimeRelease");
        }
    }

    return changed;
}

export function removeCityStateByCityId(state: GameState, cityId: string): void {
    ensureCityStateState(state);
    const match = (state.cityStates ?? []).find(cs => cs.cityId === cityId);
    if (!match) return;
    state.units = state.units.filter(u => u.cityStateId !== match.id);
    state.cityStates = (state.cityStates ?? []).filter(cs => cs.id !== match.id);
}

export function investInCityState(state: GameState, playerId: string, cityStateId: string): number {
    ensureCityStateState(state);
    const player = state.players.find(p => p.id === playerId);
    if (!player) throw new Error("Player not found");
    if (player.isEliminated) throw new Error("Eliminated player cannot invest");

    const cityState = getCityStateById(state, cityStateId);
    if (!cityState) throw new Error("City-state not found");
    if (!cityState.discoveredByPlayer[playerId]) throw new Error("City-state not discovered");
    if (cityState.warByPlayer[playerId]) throw new Error("Cannot invest while at war with this city-state");

    const lastTurn = cityState.lastInvestTurnByPlayer[playerId] ?? -1;
    if (lastTurn === state.turn) throw new Error("Already invested in this city-state this turn");

    const cost = getCityStateInvestCost(cityState, playerId, state);
    const treasury = player.treasury ?? 0;
    if (treasury < cost) throw new Error("Not enough gold to invest");

    const incumbentId = cityState.suzerainId;
    const isChallengingIncumbent = !!incumbentId && incumbentId !== playerId;
    const reclaimFatigue = isChallengingIncumbent
        ? getPairReclaimFatigue(state, cityState, incumbentId, playerId)
        : { bonusReduction: 0, pressureReduction: 0 };
    const challengerBonus = isChallengingIncumbent
        ? Math.max(0, CITY_STATE_CHALLENGER_INVEST_BONUS - reclaimFatigue.bonusReduction)
        : 0;
    const influenceGain = CITY_STATE_INVEST_GAIN + challengerBonus;

    player.treasury = treasury - cost;
    cityState.influenceByPlayer[playerId] = (cityState.influenceByPlayer[playerId] ?? 0) + influenceGain;
    if (isChallengingIncumbent && incumbentId) {
        cityState.influenceByPlayer[incumbentId] = Math.max(
            0,
            (cityState.influenceByPlayer[incumbentId] ?? 0) - Math.max(0, CITY_STATE_CHALLENGER_PRESSURE - reclaimFatigue.pressureReduction),
        );
    }
    cityState.investmentCountByPlayer[playerId] = (cityState.investmentCountByPlayer[playerId] ?? 0) + 1;
    cityState.lastInvestTurnByPlayer[playerId] = state.turn;
    if (!cityState.lastPairFatigueTurnByPlayer) cityState.lastPairFatigueTurnByPlayer = {};
    if (!cityState.lastPairFatigueBonusReductionByPlayer) cityState.lastPairFatigueBonusReductionByPlayer = {};
    if (!cityState.lastPairFatiguePressureReductionByPlayer) cityState.lastPairFatiguePressureReductionByPlayer = {};
    if (reclaimFatigue.bonusReduction > 0 || reclaimFatigue.pressureReduction > 0) {
        cityState.lastPairFatigueTurnByPlayer[playerId] = state.turn;
        cityState.lastPairFatigueBonusReductionByPlayer[playerId] = reclaimFatigue.bonusReduction;
        cityState.lastPairFatiguePressureReductionByPlayer[playerId] = reclaimFatigue.pressureReduction;
    }

    resolveCityStateSuzerain(state, cityState.id, "Investment");
    return cost;
}
