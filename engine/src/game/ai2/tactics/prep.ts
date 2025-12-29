import { GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { identifyBattleGroups, coordinateGroupAttack } from "../../ai/units/battle-groups.js";
import { aidVulnerableUnits } from "../../ai/units/defense.js";
import { updateArmyPhase, type ArmyPhase } from "../army-phase.js";
import { updateTacticalFocus } from "../attack-order.js";
import { isMilitary } from "../unit-roles.js";
import { retreatIfNeeded } from "../movement.js";
import { runTitanPreMovement } from "../titan-flow.js";

export type TacticsPreparationResult = {
    state: GameState;
    armyPhase: ArmyPhase;
};

export function runTacticsPreparation(state: GameState, playerId: string): TacticsPreparationResult {
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
        next = retreatIfNeeded(next, playerId, live);
    }

    next = runTitanPreMovement(next, playerId);
    next = aidVulnerableUnits(next, playerId);

    const armyPhaseResult = updateArmyPhase(next, playerId);
    next = armyPhaseResult.state;
    const currentArmyPhase = armyPhaseResult.phase;
    aiInfo(`[ARMY PHASE] ${playerId} is in phase: ${currentArmyPhase}`);

    const battleGroups = identifyBattleGroups(next, playerId);
    for (const group of battleGroups) {
        next = coordinateGroupAttack(next, playerId, group);
    }

    next = updateTacticalFocus(next, playerId);

    return { state: next, armyPhase: currentArmyPhase };
}
