import { CityStateYieldType, DiplomacyState, GameState, estimateMilitaryPower, getCityStateInvestCost } from "@simple-civ/engine";
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

export type CityStateInfluenceEntry = {
    playerId: string;
    civTitle: string;
    influence: number;
    isSuzerain: boolean;
};

export type CityStateRow = {
    cityStateId: string;
    name: string;
    yieldType: CityStateYieldType;
    suzerainId?: string;
    suzerainLabel: string;
    myInfluence: number;
    topInfluence: number;
    investCost: number;
    canInvest: boolean;
    investDisabledReason?: string;
    atWar: boolean;
    entries: CityStateInfluenceEntry[];
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

export const buildCityStateRows = (gameState: GameState, playerId: string): CityStateRow[] => {
    const cityStates = gameState.cityStates ?? [];
    const player = gameState.players.find(p => p.id === playerId);
    const treasury = player?.treasury ?? 0;

    return cityStates
        .filter(cs => cs.discoveredByPlayer[playerId])
        .map(cs => {
            const entries = gameState.players
                .filter(p => !p.isEliminated)
                .map(p => {
                    const civInfo = civMeta.get(p.civName as CivId);
                    return {
                        playerId: p.id,
                        civTitle: civInfo?.title ?? p.civName ?? p.id,
                        influence: cs.influenceByPlayer[p.id] ?? 0,
                        isSuzerain: cs.suzerainId === p.id,
                    };
                })
                .sort((a, b) => b.influence - a.influence);

            const myInfluence = cs.influenceByPlayer[playerId] ?? 0;
            const topInfluence = entries[0]?.influence ?? 0;
            const atWar = !!cs.warByPlayer[playerId];
            const investedThisTurn = (cs.lastInvestTurnByPlayer[playerId] ?? -1) === gameState.turn;
            const investCost = getCityStateInvestCost(cs, playerId);
            const canAfford = treasury >= investCost;
            const canInvest = !atWar && !investedThisTurn && canAfford;

            let investDisabledReason: string | undefined;
            if (atWar) {
                investDisabledReason = "At war";
            } else if (investedThisTurn) {
                investDisabledReason = "Already invested this turn";
            } else if (!canAfford) {
                investDisabledReason = "Not enough gold";
            }

            const suzerainPlayer = gameState.players.find(p => p.id === cs.suzerainId);
            const suzerainInfo = suzerainPlayer ? civMeta.get(suzerainPlayer.civName as CivId) : undefined;
            const suzerainLabel = suzerainPlayer
                ? (suzerainInfo?.title ?? suzerainPlayer.civName ?? suzerainPlayer.id)
                : "None";

            return {
                cityStateId: cs.id,
                name: cs.name,
                yieldType: cs.yieldType,
                suzerainId: cs.suzerainId,
                suzerainLabel,
                myInfluence,
                topInfluence,
                investCost,
                canInvest,
                investDisabledReason,
                atWar,
                entries,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
};





