import { DiplomacyState, GameState, HistoryEventType } from "../../core/types.js";
import { logEvent } from "../history.js";
import { MIN_PEACE_DURATION } from "../../core/constants.js";

/**
 * Check if a player can declare war on another player.
 * Returns false if peace was established less than MIN_PEACE_DURATION turns ago.
 */
export function canDeclareWar(state: GameState, a: string, b: string): boolean {
    const currentStance = state.diplomacy?.[a]?.[b] ?? DiplomacyState.Peace;

    // If already at war, no restriction
    if (currentStance === DiplomacyState.War) {
        return true;
    }

    // Check when peace was established
    const peaceEstablishedTurn = state.diplomacyChangeTurn?.[a]?.[b] ?? 0;

    // If no record, assume peace existed from game start (turn 0) - allow war
    if (peaceEstablishedTurn === 0) {
        return true;
    }

    const turnsSincePeace = state.turn - peaceEstablishedTurn;
    return turnsSincePeace >= MIN_PEACE_DURATION;
}

/**
 * Get the number of turns remaining until war can be declared.
 */
export function getTurnsUntilWarAllowed(state: GameState, a: string, b: string): number {
    const currentStance = state.diplomacy?.[a]?.[b] ?? DiplomacyState.Peace;

    if (currentStance === DiplomacyState.War) {
        return 0;
    }

    const peaceEstablishedTurn = state.diplomacyChangeTurn?.[a]?.[b] ?? 0;

    if (peaceEstablishedTurn === 0) {
        return 0;
    }

    const turnsSincePeace = state.turn - peaceEstablishedTurn;
    return Math.max(0, MIN_PEACE_DURATION - turnsSincePeace);
}

export type BorderViolation = {
    enemyId: string;
    count: number;
};

export function findBorderViolators(state: GameState, playerId: string): BorderViolation[] {
    const myTerritory = new Set(
        state.map.tiles
            .filter(tile => tile.ownerId === playerId)
            .map(tile => `${tile.coord.q},${tile.coord.r}`)
    );

    const counts = new Map<string, number>();

    for (const unit of state.units) {
        if (unit.ownerId === playerId) continue;
        const enemy = state.players.find(p => p.id === unit.ownerId);
        if (!enemy || enemy.isEliminated) continue;
        const stance = state.diplomacy?.[playerId]?.[unit.ownerId] ?? DiplomacyState.Peace;
        if (stance === DiplomacyState.War) continue;
        if (!myTerritory.has(`${unit.coord.q},${unit.coord.r}`)) continue;

        counts.set(unit.ownerId, (counts.get(unit.ownerId) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([enemyId, count]) => ({ enemyId, count }));
}

function ensureContactMaps(state: GameState, a: string, b: string) {
    if (!state.contacts[a]) state.contacts[a] = {} as any;
    if (!state.contacts[b]) state.contacts[b] = {} as any;
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;
}

export function setContact(state: GameState, a: string, b: string) {
    ensureContactMaps(state, a, b);
    const wasKnown = !!state.contacts[a]?.[b];
    const now = state.turn ?? 0;
    state.contacts[a][b] = true;
    state.contacts[b][a] = true;
    (state.contacts[a] as any)[`metTurn_${b}`] = (state.contacts[a] as any)[`metTurn_${b}`] ?? now;
    (state.contacts[b] as any)[`metTurn_${a}`] = (state.contacts[b] as any)[`metTurn_${a}`] ?? now;
    if (!state.diplomacy[a][b]) state.diplomacy[a][b] = DiplomacyState.Peace;
    if (!state.diplomacy[b][a]) state.diplomacy[b][a] = DiplomacyState.Peace;

    if (!wasKnown) {
        logEvent(state, HistoryEventType.CivContact, a, { targetId: b });
        logEvent(state, HistoryEventType.CivContact, b, { targetId: a });
    }
}

export function assertContact(state: GameState, a: string, b: string) {
    if (!state.contacts?.[a]?.[b]) {
        throw new Error("You have not made contact with that player");
    }
}

export function enableSharedVision(state: GameState, a: string, b: string) {
    if (!state.sharedVision[a]) state.sharedVision[a] = {} as any;
    if (!state.sharedVision[b]) state.sharedVision[b] = {} as any;
    state.sharedVision[a][b] = true;
    state.sharedVision[b][a] = true;
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.type === "Vision" && ((o.from === a && o.to === b) || (o.from === b && o.to === a))));
}

export function disableSharedVision(state: GameState, a: string, b: string) {
    if (!state.sharedVision[a]) state.sharedVision[a] = {} as any;
    if (!state.sharedVision[b]) state.sharedVision[b] = {} as any;
    state.sharedVision[a][b] = false;
    state.sharedVision[b][a] = false;
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.type === "Vision" && ((o.from === a && o.to === b) || (o.from === b && o.to === a))));
}

export function ensureWar(state: GameState, a: string, b: string) {
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;
    const wasWar = state.diplomacy[a][b] === DiplomacyState.War && state.diplomacy[b][a] === DiplomacyState.War;
    state.diplomacy[a][b] = DiplomacyState.War;
    state.diplomacy[b][a] = DiplomacyState.War;
    if (!wasWar) {
        if (!state.diplomacyChangeTurn) state.diplomacyChangeTurn = {};
        if (!state.diplomacyChangeTurn[a]) state.diplomacyChangeTurn[a] = {};
        if (!state.diplomacyChangeTurn[b]) state.diplomacyChangeTurn[b] = {};
        state.diplomacyChangeTurn[a][b] = state.turn;
        state.diplomacyChangeTurn[b][a] = state.turn;
    }
    setContact(state, a, b);
    disableSharedVision(state, a, b);
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === a && o.to === b) && !(o.from === b && o.to === a));
}

export function assertCanShareVision(state: GameState, a: string, b: string) {
    if (!state.players.find(p => p.id === b)) throw new Error("Target player not found");
    assertContact(state, a, b);
    const stance = state.diplomacy[a]?.[b];
    if (stance !== DiplomacyState.Peace) throw new Error("Vision sharing requires peace");
}
