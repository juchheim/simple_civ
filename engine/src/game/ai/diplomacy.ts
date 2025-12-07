import { DiplomacyState, GameState } from "../../core/types.js";
import { aiWarPeaceDecision } from "../ai-decisions.js";
import { tryAction } from "./shared/actions.js";

export function handleDiplomacy(state: GameState, playerId: string): GameState {
    let next = state;
    const player = next.players.find(p => p.id === playerId);
    for (const other of next.players) {
        if (other.id === playerId || other.isEliminated) continue;
        const decision = aiWarPeaceDecision(playerId, other.id, next);
        // If we are in war preparation for this target, the prep gate may block the decision.
        // We respect the prep gate and wait until the AI is Ready.
        if (decision === "None" && player?.warPreparation?.targetId === other.id) {
            // Do nothing - wait for prep to complete
        }
        if (decision === "DeclareWar") {
            next = tryAction(next, { type: "SetDiplomacy", playerId, targetPlayerId: other.id, state: DiplomacyState.War });
        } else if (decision === "ProposePeace") {
            // Skip if we already have an outgoing peace offer to this target
            const alreadyOffered = next.diplomacyOffers.some(o => o.from === playerId && o.to === other.id && o.type === "Peace");
            if (!alreadyOffered) {
                next = tryAction(next, { type: "ProposePeace", playerId, targetPlayerId: other.id });
            }
        } else if (decision === "AcceptPeace") {
            next = tryAction(next, { type: "AcceptPeace", playerId, targetPlayerId: other.id });
        }
    }
    return next;
}
