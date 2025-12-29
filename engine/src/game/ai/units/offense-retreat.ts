// Retreat routines for offensive unit behavior.
import { GameState } from "../../../core/types.js";
import { hexDistance, hexEquals } from "../../../core/hex.js";
import { aiInfo } from "../debug-logging.js";
import { tryAction } from "../shared/actions.js";
import { findSafeRetreatTile, shouldRetreatAfterAttacking } from "./unit-helpers.js";

export function handlePostAttackRetreat(next: GameState, playerId: string, unitId: string): GameState {
    const liveUnit = next.units.find(u => u.id === unitId);
    if (!liveUnit || liveUnit.movesLeft <= 0) return next;
    if (!shouldRetreatAfterAttacking(liveUnit, next, playerId)) return next;

    const friendlyCities = next.cities.filter(c => c.ownerId === playerId);
    const nearestCity = friendlyCities.length > 0
        ? friendlyCities.sort((a, b) => hexDistance(a.coord, liveUnit.coord) - hexDistance(b.coord, liveUnit.coord))[0]
        : null;
    if (!nearestCity) return next;

    const safeTile = findSafeRetreatTile(next, playerId, liveUnit, nearestCity.coord);
    if (!safeTile) return next;

    const retreated = tryAction(next, { type: "MoveUnit", playerId, unitId: liveUnit.id, to: safeTile });
    if (retreated !== next) {
        aiInfo(`[AI POST-ATTACK RETREAT] ${playerId} ${liveUnit.type} retreating after attack (exposed to multiple threats)`);
        return retreated;
    }

    return next;
}

export function handleUnsafeAttack(
    next: GameState,
    playerId: string,
    unit: any,
    attackSafety: { safe: boolean; riskLevel: "low" | "medium" | "high" | "suicidal"; reason: string }
): GameState {
    aiInfo(`[AI SKIP UNSAFE ATTACK] ${playerId} ${unit.type} skipping attack: ${attackSafety.reason}`);

    const inFriendlyCity = next.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, unit.coord));

    if (!inFriendlyCity && (attackSafety.riskLevel === "high" || attackSafety.riskLevel === "suicidal")) {
        const friendlyCities = next.cities.filter(c => c.ownerId === playerId);
        const nearestCity = friendlyCities.length > 0
            ? friendlyCities.sort((a, b) => hexDistance(a.coord, unit.coord) - hexDistance(b.coord, unit.coord))[0]
            : null;
        if (nearestCity && unit.movesLeft > 0) {
            const safeTile = findSafeRetreatTile(next, playerId, unit, nearestCity.coord);
            if (safeTile) {
                const retreated = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: safeTile });
                if (retreated !== next) {
                    aiInfo(`[AI PROACTIVE RETREAT] ${playerId} ${unit.type} retreating from dangerous position`);
                    return retreated;
                }
            }
        }
    }

    return next;
}
