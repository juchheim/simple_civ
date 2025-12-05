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
    handleSwapUnits,
} from "./actions/units.js";
import {
    handleFoundCity,
    handleRazeCity,
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
} from "./actions/diplomacy.js";
import { handleEndTurn } from "./turn-lifecycle.js";
import { enforceLinkedUnitIntegrity } from "./helpers/movement.js";

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

    switch (action.type) {
        case "MoveUnit":
            updatedState = handleMoveUnit(nextState, action);
            break;
        case "Attack":
            updatedState = handleAttack(nextState, action);
            break;
        case "FoundCity":
            updatedState = handleFoundCity(nextState, action);
            break;
        case "ChooseTech":
            updatedState = handleChooseTech(nextState, action);
            break;
        case "SetCityBuild":
            updatedState = handleSetCityBuild(nextState, action);
            break;
        case "RazeCity":
            updatedState = handleRazeCity(nextState, action);
            break;
        case "SetWorkedTiles":
            updatedState = handleSetWorkedTiles(nextState, action);
            break;
        case "SetDiplomacy":
            updatedState = handleSetDiplomacy(nextState, action);
            break;
        case "ProposePeace":
            updatedState = handleProposePeace(nextState, action);
            break;
        case "AcceptPeace":
            updatedState = handleAcceptPeace(nextState, action);
            break;
        case "ProposeVisionShare":
            updatedState = handleProposeVisionShare(nextState, action);
            break;
        case "AcceptVisionShare":
            updatedState = handleAcceptVisionShare(nextState, action);
            break;
        case "RevokeVisionShare":
            updatedState = handleRevokeVisionShare(nextState, action);
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
        case "SwapUnits":
            updatedState = handleSwapUnits(nextState, action);
            break;
        case "EndTurn":
            updatedState = handleEndTurn(nextState, action);
            break;
        default:
            updatedState = nextState;
            break;
    }

    enforceLinkedUnitIntegrity(updatedState);
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
        if (hearthCount < 2) throw new Error("Need 2 Hearth techs");
    }
    if (tech.era === "Engine") {
        const bannerCount = player.techs.filter(t => TECHS[t].era === "Banner").length;
        if (bannerCount < 2) throw new Error("Need 2 Banner techs");
    }

    const savedProgress = player.researchHistory?.[action.techId] || 0;
    player.currentTech = {
        id: action.techId,
        progress: savedProgress,
        cost: tech.cost,
    };

    return state;
}
