import { DiplomacyState, GameState } from "../../core/types.js";

function ensureContactMaps(state: GameState, a: string, b: string) {
    if (!state.contacts[a]) state.contacts[a] = {} as any;
    if (!state.contacts[b]) state.contacts[b] = {} as any;
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;
}

export function setContact(state: GameState, a: string, b: string) {
    ensureContactMaps(state, a, b);
    state.contacts[a][b] = true;
    state.contacts[b][a] = true;
    if (!state.diplomacy[a][b]) state.diplomacy[a][b] = DiplomacyState.Peace;
    if (!state.diplomacy[b][a]) state.diplomacy[b][a] = DiplomacyState.Peace;
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
    state.diplomacy[a][b] = DiplomacyState.War;
    state.diplomacy[b][a] = DiplomacyState.War;
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

