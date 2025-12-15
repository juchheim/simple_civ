import { DiplomacyState, GameState, estimateMilitaryPower } from "@simple-civ/engine";
import { CIV_OPTIONS, CivId } from "../../../data/civs";

export type DiplomacyRow = {
    playerId: string;
    civTitle: string;
    color?: string;
    state: DiplomacyState;
    hasContact: boolean;
    incomingPeace: boolean;
    outgoingPeace: boolean;
    sharingVision: boolean;
    incomingVision: boolean;
    outgoingVision: boolean;
    atPeace: boolean;
    power: number;
    powerDelta: number;
    selfPower: number;
};

const civMeta = new Map(CIV_OPTIONS.map(c => [c.id, c]));

export const buildDiplomacyRows = (gameState: GameState, playerId: string): DiplomacyRow[] => {
    const playerPower = estimateMilitaryPower(playerId, gameState);

    return gameState.players
        .filter(p => p.id !== playerId && !p.isEliminated)
        .map(p => {
            const state = gameState.diplomacy[playerId]?.[p.id] ?? DiplomacyState.Peace;
            const hasContact = !!gameState.contacts?.[playerId]?.[p.id];
            const incomingPeace = gameState.diplomacyOffers.some(o => o.type === "Peace" && o.from === p.id && o.to === playerId);
            const outgoingPeace = gameState.diplomacyOffers.some(o => o.type === "Peace" && o.from === playerId && o.to === p.id);
            const sharingVision = !!gameState.sharedVision?.[playerId]?.[p.id];
            const incomingVision = gameState.diplomacyOffers.some(o => o.type === "Vision" && o.from === p.id && o.to === playerId);
            const outgoingVision = gameState.diplomacyOffers.some(o => o.type === "Vision" && o.from === playerId && o.to === p.id);
            const civInfo = civMeta.get(p.civName as CivId);
            const power = estimateMilitaryPower(p.id, gameState);

            return {
                playerId: p.id,
                civTitle: civInfo?.title ?? p.civName ?? p.id,
                color: civInfo?.color,
                state,
                hasContact,
                incomingPeace,
                outgoingPeace,
                sharingVision,
                incomingVision,
                outgoingVision,
                atPeace: state === DiplomacyState.Peace,
                power,
                powerDelta: power - playerPower,
                selfPower: playerPower,
            };
        })
        .filter(row => row.hasContact);
};





