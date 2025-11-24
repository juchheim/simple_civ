import { DiplomacyState, GameState } from "@simple-civ/engine";

export type DiplomacyRow = {
    playerId: string;
    state: DiplomacyState;
    hasContact: boolean;
    incomingPeace: boolean;
    outgoingPeace: boolean;
    sharingVision: boolean;
    incomingVision: boolean;
    outgoingVision: boolean;
    atPeace: boolean;
};

export const buildDiplomacyRows = (gameState: GameState, playerId: string): DiplomacyRow[] =>
    gameState.players
        .filter(p => p.id !== playerId)
        .map(p => {
            const state = gameState.diplomacy[playerId]?.[p.id] ?? DiplomacyState.Peace;
            const hasContact = !!gameState.contacts?.[playerId]?.[p.id];
            const incomingPeace = gameState.diplomacyOffers.some(o => o.type === "Peace" && o.from === p.id && o.to === playerId);
            const outgoingPeace = gameState.diplomacyOffers.some(o => o.type === "Peace" && o.from === playerId && o.to === p.id);
            const sharingVision = !!gameState.sharedVision?.[playerId]?.[p.id];
            const incomingVision = gameState.diplomacyOffers.some(o => o.type === "Vision" && o.from === p.id && o.to === playerId);
            const outgoingVision = gameState.diplomacyOffers.some(o => o.type === "Vision" && o.from === playerId && o.to === p.id);

            return {
                playerId: p.id,
                state,
                hasContact,
                incomingPeace,
                outgoingPeace,
                sharingVision,
                incomingVision,
                outgoingVision,
                atPeace: state === DiplomacyState.Peace,
            };
        });

