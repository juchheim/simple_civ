import { GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { updateArmyPhase, type ArmyPhase } from "../army-phase.js";
import { updateTacticalFocus } from "../attack-order.js";
import { isMilitary } from "../unit-roles.js";
import { retreatIfNeeded } from "../movement.js";
import type { TacticalContext } from "../tactical-context.js";
import { runTitanPreMovement } from "../titan-flow.js";

export type TacticsPreparationResult = {
    state: GameState;
    armyPhase: ArmyPhase;
};

type GetFlowField = TacticalContext["getFlowField"];

export function runTacticsPreparation(state: GameState, playerId: string, getFlowField?: GetFlowField): TacticsPreparationResult {
    let next = state;

    const unitsForRetreat = next.units.filter(u =>
        u.ownerId === playerId &&
        u.movesLeft > 0 &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        !u.isTitanEscort
    );
    for (const unit of unitsForRetreat) {
        const live = next.units.find(u => u.id === unit.id);
        if (!live || live.movesLeft <= 0) continue;
        next = retreatIfNeeded(next, playerId, live, getFlowField);
    }

    next = runTitanPreMovement(next, playerId);

    // DISABLED: aidVulnerableUnits was consuming ALL unit moves BEFORE attack planning,
    // preventing units from attacking. Support movements should happen AFTER attacks.
    // next = aidVulnerableUnits(next, playerId);

    const armyPhaseResult = updateArmyPhase(next, playerId);
    next = armyPhaseResult.state;
    const currentArmyPhase = armyPhaseResult.phase;
    aiInfo(`[ARMY PHASE] ${playerId} is in phase: ${currentArmyPhase}`);

    // DISABLED: executeTacticalMovements was consuming ALL unit moves BEFORE attack planning,
    // causing the "swarm but don't attack" bug. Tactical positioning should happen AFTER attacks.
    // if (currentArmyPhase === "attacking") {
    //     const tacticalMoves = planTacticalMovements(next, playerId);
    //     if (tacticalMoves.length > 0) {
    //         aiInfo(`[TACTICAL] Planning ${tacticalMoves.length} positioning moves`);
    //         next = executeTacticalMovements(next, playerId, tacticalMoves);
    //     }
    // }

    next = updateTacticalFocus(next, playerId);

    return { state: next, armyPhase: currentArmyPhase };
}
