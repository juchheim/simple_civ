import type { GameState } from "../../core/types.js";
import { UnitType } from "../../core/types.js";
import type { TacticalContext } from "./tactical-context.js";
import { followTitan, runPreTitanRally, runTitanAgent } from "./titan-agent.js";
import { hexDistance } from "../../core/hex.js";
import { tryAction } from "../ai/shared/actions.js";
import { getCombatPreviewUnitVsUnit } from "../helpers/combat-preview.js";
import { aiInfo } from "../ai/debug-logging.js";
import { UNITS } from "../../core/constants.js";
import { isMilitary } from "./unit-roles.js";

/**
 * v9.11: Escorts actively attack enemies threatening the Titan
 * v1.0.4: Limit this to true close-protection so the Titan does not get a free
 * path-clearing mini alpha strike before it acts.
 */
function escortsAttackThreats(state: GameState, playerId: string): GameState {
    let next = state;
    const titan = next.units.find(u => u.ownerId === playerId && u.type === UnitType.Titan);
    if (!titan) return next;
    const MAX_ESCORT_PROTECTIVE_ATTACKS = 1;

    // Only react to immediate local threats around the Titan.
    const threats = next.units.filter(u => {
        if (u.ownerId === playerId) return false;

        const distToTitan = hexDistance(u.coord, titan.coord);
        return distToTitan <= 2;
    }).sort((a, b) => {
        // Prioritize by threat level: higher ATK first, then lower HP (easier kills)
        const aStats = UNITS[a.type];
        const bStats = UNITS[b.type];
        const aThreat = aStats.atk - a.hp * 0.1;
        const bThreat = bStats.atk - b.hp * 0.1;
        return bThreat - aThreat;
    });

    if (threats.length === 0) return next;

    // Find escorts that can attack
    const escorts = next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        u.type !== UnitType.Titan &&
        u.isTitanEscort &&
        !u.hasAttacked &&
        hexDistance(u.coord, titan.coord) <= 2
    );

    let attacksMade = 0;
    for (const threat of threats) {
        if (attacksMade >= MAX_ESCORT_PROTECTIVE_ATTACKS) break;
        // Find best escort to attack this threat
        for (const escort of escorts) {
            const liveEscort = next.units.find(u => u.id === escort.id);
            const liveThreat = next.units.find(u => u.id === threat.id);
            if (!liveEscort || !liveThreat || liveEscort.hasAttacked) continue;

            const escortStats = UNITS[liveEscort.type];
            const dist = hexDistance(liveEscort.coord, liveThreat.coord);

            // Can we attack?
            if (dist > escortStats.rng) continue;

            // Preview attack
            const preview = getCombatPreviewUnitVsUnit(next, liveEscort, liveThreat);
            const wouldKill = preview.estimatedDamage.avg >= liveThreat.hp;
            const returnDamage = preview.returnDamage?.avg ?? 0;

            // Only attack if we kill or trade well (deal more than we take)
            if (wouldKill || preview.estimatedDamage.avg > returnDamage) {
                const result = tryAction(next, {
                    type: "Attack",
                    playerId,
                    attackerId: liveEscort.id,
                    targetId: liveThreat.id,
                    targetType: "Unit"
                });
                if (result !== next) {
                    next = result;
                    attacksMade++;
                    aiInfo(`[TITAN PROTECT] Escort ${liveEscort.type} attacked ${liveThreat.type}${wouldKill ? ' (KILL)' : ''}`);
                    break; // Move to next threat
                }
            }
        }
    }

    if (attacksMade > 0) {
        aiInfo(`[TITAN PROTECT] Escorts made ${attacksMade} protective attacks`);
    }

    return next;
}

/**
 * Titan orchestration wrapper so tactics.ts only delegates to a single entry point
 * for Titan-specific behavior.
 */
export function runTitanPreMovement(state: GameState, playerId: string): GameState {
    let next = runPreTitanRally(state, playerId);
    next = followTitan(next, playerId);
    return next;
}

export function runTitanPhase(state: GameState, playerId: string, ctx?: TacticalContext): GameState {
    // v9.11: Escorts attack threats BEFORE Titan moves
    const next = escortsAttackThreats(state, playerId);
    return runTitanAgent(next, playerId, ctx);
}
