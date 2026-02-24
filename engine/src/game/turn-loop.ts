import { Action, GameState, TechId } from "../core/types.js";
import { TECHS } from "../core/constants.js";
import {
    handleAttack,
    handleLinkUnits,
    handleMoveUnit,
    handleUnlinkUnits,
    handleSetAutoMoveTarget,
    handleClearAutoMoveTarget,
    handleSetAutoExplore,
    handleClearAutoExplore,
    handleFortifyUnit,
    handleDisbandUnit,
    handleSwapUnits,
} from "./actions/units.js";
import {
    handleFoundCity,
    handleRazeCity,
    handleRushBuyProduction,
    handleSetCityBuild,
    handleSetWorkedTiles,
} from "./actions/cities.js";
import {
    handleAcceptPeace,
    handleAcceptVisionShare,
    handleProposePeace,
    handleProposeVisionShare,
    handleRevokeVisionShare,
    handleSetDiplomacy,
    handleWithdrawPeace,
} from "./actions/diplomacy.js";
import { handleEndTurn, finalizeVictory } from "./turn-lifecycle.js";
import { enforceLinkedUnitIntegrity } from "./helpers/movement.js";
import { clearInfluenceMapCache } from "./ai2/influence-map.js";
import { clearFlowFieldCache } from "./ai2/flow-field.js";

export function applyAction(state: GameState, action: Action): GameState {
    const nextState = JSON.parse(JSON.stringify(state)) as GameState;

    // If game already ended, preserve endTurn and ignore further actions
    if (nextState.winnerId) {
        if (!nextState.endTurn) nextState.endTurn = nextState.turn;
        return nextState;
    }

    if (action.playerId !== nextState.currentPlayerId) {
        throw new Error("Not your turn");
    }

    let updatedState: GameState;
    let shouldInvalidateInfluence = false;
    const affectedPlayers = new Set<string>();

    switch (action.type) {
        case "MoveUnit":
            updatedState = handleMoveUnit(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "Attack":
            if (action.targetType === "Unit") {
                const targetUnit = nextState.units.find(u => u.id === action.targetId);
                if (targetUnit?.ownerId) affectedPlayers.add(targetUnit.ownerId);
            } else {
                const targetCity = nextState.cities.find(c => c.id === action.targetId);
                if (targetCity?.ownerId) affectedPlayers.add(targetCity.ownerId);
            }
            updatedState = handleAttack(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "FoundCity":
            updatedState = handleFoundCity(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "ChooseTech":
            updatedState = handleChooseTech(nextState, action);
            break;
        case "SetCityBuild":
            updatedState = handleSetCityBuild(nextState, action);
            break;
        case "RushBuyProduction":
            updatedState = handleRushBuyProduction(nextState, action);
            break;
        case "RazeCity":
            {
                const targetCity = nextState.cities.find(c => c.id === action.cityId);
                if (targetCity?.ownerId) affectedPlayers.add(targetCity.ownerId);
            }
            updatedState = handleRazeCity(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "SetWorkedTiles":
            updatedState = handleSetWorkedTiles(nextState, action);
            break;
        case "SetDiplomacy":
            affectedPlayers.add(action.targetPlayerId);
            updatedState = handleSetDiplomacy(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "ProposePeace":
            updatedState = handleProposePeace(nextState, action);
            break;
        case "AcceptPeace":
            updatedState = handleAcceptPeace(nextState, action);
            break;
        case "WithdrawPeace":
            updatedState = handleWithdrawPeace(nextState, action);
            break;
        case "ProposeVisionShare":
            updatedState = handleProposeVisionShare(nextState, action);
            break;
        case "AcceptVisionShare":
            affectedPlayers.add(action.targetPlayerId);
            updatedState = handleAcceptVisionShare(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "RevokeVisionShare":
            affectedPlayers.add(action.targetPlayerId);
            updatedState = handleRevokeVisionShare(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "LinkUnits":
            updatedState = handleLinkUnits(nextState, action);
            break;
        case "UnlinkUnits":
            updatedState = handleUnlinkUnits(nextState, action);
            break;
        case "SetAutoMoveTarget":
            updatedState = handleSetAutoMoveTarget(nextState, action);
            break;
        case "ClearAutoMoveTarget":
            updatedState = handleClearAutoMoveTarget(nextState, action);
            break;
        case "SetAutoExplore":
            updatedState = handleSetAutoExplore(nextState, action);
            break;
        case "ClearAutoExplore":
            updatedState = handleClearAutoExplore(nextState, action);
            break;
        case "FortifyUnit":
            updatedState = handleFortifyUnit(nextState, action);
            break;
        case "DisbandUnit":
            updatedState = handleDisbandUnit(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "SwapUnits":
            updatedState = handleSwapUnits(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        case "EndTurn":
            updatedState = handleEndTurn(nextState, action);
            break;
        case "Resign":
            updatedState = handleResign(nextState, action);
            shouldInvalidateInfluence = true;
            break;
        default:
            updatedState = nextState;
            break;
    }

    enforceLinkedUnitIntegrity(updatedState);
    if (shouldInvalidateInfluence) {
        affectedPlayers.add(action.playerId);
        for (const playerId of affectedPlayers) {
            clearInfluenceMapCache(playerId);
            clearFlowFieldCache(playerId);
        }
    }
    return updatedState;
}

function handleChooseTech(state: GameState, action: { type: "ChooseTech"; playerId: string; techId: TechId }): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error("Player not found");

    // Save current progress if switching
    if (player.currentTech) {
        if (!player.researchHistory) player.researchHistory = {};
        player.researchHistory[player.currentTech.id] = player.currentTech.progress;
    }

    const tech = TECHS[action.techId];
    if (!tech) throw new Error("Invalid tech");

    if (action.techId === TechId.CityWards) {
        const hasEither = player.techs.includes(TechId.StoneworkHalls) || player.techs.includes(TechId.FormationTraining);
        if (!hasEither) throw new Error("Missing prerequisite tech");
    } else {
        for (const req of tech.prereqTechs) {
            if (!player.techs.includes(req)) throw new Error("Missing prerequisite tech");
        }
    }

    if (tech.era === "Banner") {
        const hearthCount = player.techs.filter(t => TECHS[t].era === "Hearth").length;
        if (hearthCount < 3) throw new Error("Need 3 Hearth techs");
    }
    if (tech.era === "Engine") {
        const bannerCount = player.techs.filter(t => TECHS[t].era === "Banner").length;
        if (bannerCount < 2) throw new Error("Need 2 Banner techs");
    }

    const savedProgress = player.researchHistory?.[action.techId] || 0;
    const GAME_LOG_ENABLED = typeof process !== "undefined" && process.env.DEBUG_GAME_LOGS === "true";
    if (GAME_LOG_ENABLED) console.log(`[TechDebug] Turn ${state.turn} Player ${player.id} CHOOSES ${action.techId} (Saved: ${savedProgress})`);
    player.currentTech = {
        id: action.techId,
        progress: savedProgress,
        cost: tech.cost,
    };

    return state;
}

function handleResign(state: GameState, action: { type: "Resign"; playerId: string }): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) return state;

    player.isEliminated = true;
    state.units = state.units.filter(u => u.ownerId !== action.playerId);

    // Find opponent to award victory to
    const opponent = state.players.find(p => p.id !== action.playerId && !p.isEliminated);
    if (opponent) {
        finalizeVictory(state, opponent.id, "Resignation");
    }

    return state;
}
