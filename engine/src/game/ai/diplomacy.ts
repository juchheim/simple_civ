import { DiplomacyState, GameState } from "../../core/types.js";
import { aiWarPeaceDecision } from "../ai-decisions.js";
import { tryAction } from "./shared/actions.js";

export function handleDiplomacy(state: GameState, playerId: string): GameState {
    let next = state;
    for (const other of next.players) {
        if (other.id === playerId || other.isEliminated) continue;
        const decision = aiWarPeaceDecision(playerId, other.id, next);
        if (decision === "DeclareWar") {
            next = tryAction(next, { type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
        } else if (decision === "ProposePeace") {
            next = tryAction(next, { type: "ProposePeace", playerId, targetPlayerId: other.id });
        } else if (decision === "AcceptPeace") {
            next = tryAction(next, { type: "AcceptPeace", playerId, targetPlayerId: other.id });
        }
    }
    return next;
}

