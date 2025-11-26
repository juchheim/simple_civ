import { DiplomacyState, GameState } from "../../core/types.js";
import { assertCanShareVision, assertContact, disableSharedVision, enableSharedVision } from "../helpers/diplomacy.js";

export function handleSetDiplomacy(state: GameState, action: { type: "SetDiplomacy"; playerId: string; targetPlayerId: string; state: DiplomacyState }) {
    const a = action.playerId;
    const b = action.targetPlayerId;
    if (!state.players.find(p => p.id === b)) throw new Error("Target player not found");
    assertContact(state, a, b);
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;

    // Track when diplomacy state changed
    if (!state.diplomacyChangeTurn) state.diplomacyChangeTurn = {};
    if (!state.diplomacyChangeTurn[a]) state.diplomacyChangeTurn[a] = {};
    if (!state.diplomacyChangeTurn[b]) state.diplomacyChangeTurn[b] = {};
    state.diplomacyChangeTurn[a][b] = state.turn;
    state.diplomacyChangeTurn[b][a] = state.turn;

    state.diplomacy[a][b] = action.state;
    state.diplomacy[b][a] = action.state;
    if (action.state === DiplomacyState.Peace) {
        state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === a && o.to === b) && !(o.from === b && o.to === a));
    } else {
        disableSharedVision(state, a, b);
    }
    return state;
}

export function handleProposePeace(state: GameState, action: { type: "ProposePeace"; playerId: string; targetPlayerId: string }) {
    const a = action.playerId;
    const b = action.targetPlayerId;
    if (!state.players.find(p => p.id === b)) throw new Error("Target player not found");
    assertContact(state, a, b);
    if (state.diplomacy[a]?.[b] === DiplomacyState.Peace) return state;

    const incoming = state.diplomacyOffers.find(o => o.from === b && o.to === a && o.type === "Peace");
    if (incoming) {
        state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === b && o.to === a && o.type === "Peace"));
        if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
        if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;

        // Track when peace was established
        if (!state.diplomacyChangeTurn) state.diplomacyChangeTurn = {};
        if (!state.diplomacyChangeTurn[a]) state.diplomacyChangeTurn[a] = {};
        if (!state.diplomacyChangeTurn[b]) state.diplomacyChangeTurn[b] = {};
        state.diplomacyChangeTurn[a][b] = state.turn;
        state.diplomacyChangeTurn[b][a] = state.turn;

        state.diplomacy[a][b] = DiplomacyState.Peace;
        state.diplomacy[b][a] = DiplomacyState.Peace;
        return state;
    }

    const existing = state.diplomacyOffers.find(o => o.from === a && o.to === b && o.type === "Peace");
    if (!existing) state.diplomacyOffers.push({ from: a, to: b, type: "Peace" });
    return state;
}

export function handleAcceptPeace(state: GameState, action: { type: "AcceptPeace"; playerId: string; targetPlayerId: string }) {
    const a = action.playerId;
    const b = action.targetPlayerId;
    assertContact(state, a, b);
    const hasOffer = state.diplomacyOffers.find(o => o.from === b && o.to === a && o.type === "Peace");
    if (!hasOffer) throw new Error("No peace offer to accept");
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === b && o.to === a && o.type === "Peace"));
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;

    // Track when peace was established
    if (!state.diplomacyChangeTurn) state.diplomacyChangeTurn = {};
    if (!state.diplomacyChangeTurn[a]) state.diplomacyChangeTurn[a] = {};
    if (!state.diplomacyChangeTurn[b]) state.diplomacyChangeTurn[b] = {};
    state.diplomacyChangeTurn[a][b] = state.turn;
    state.diplomacyChangeTurn[b][a] = state.turn;

    state.diplomacy[a][b] = DiplomacyState.Peace;
    state.diplomacy[b][a] = DiplomacyState.Peace;
    return state;
}

export function handleProposeVisionShare(state: GameState, action: { type: "ProposeVisionShare"; playerId: string; targetPlayerId: string }) {
    const a = action.playerId;
    const b = action.targetPlayerId;
    assertCanShareVision(state, a, b);
    if (state.sharedVision?.[a]?.[b]) return state;

    const incoming = state.diplomacyOffers.find(o => o.from === b && o.to === a && o.type === "Vision");
    if (incoming) {
        state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === b && o.to === a && o.type === "Vision"));
        enableSharedVision(state, a, b);
        return state;
    }

    const existing = state.diplomacyOffers.find(o => o.from === a && o.to === b && o.type === "Vision");
    if (!existing) state.diplomacyOffers.push({ from: a, to: b, type: "Vision" });
    return state;
}

export function handleAcceptVisionShare(state: GameState, action: { type: "AcceptVisionShare"; playerId: string; targetPlayerId: string }) {
    const a = action.playerId;
    const b = action.targetPlayerId;
    assertCanShareVision(state, a, b);
    const hasOffer = state.diplomacyOffers.find(o => o.from === b && o.to === a && o.type === "Vision");
    if (!hasOffer) throw new Error("No vision offer to accept");
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === b && o.to === a && o.type === "Vision"));
    enableSharedVision(state, a, b);
    return state;
}

export function handleRevokeVisionShare(state: GameState, action: { type: "RevokeVisionShare"; playerId: string; targetPlayerId: string }) {
    const a = action.playerId;
    const b = action.targetPlayerId;
    disableSharedVision(state, a, b);
    return state;
}

