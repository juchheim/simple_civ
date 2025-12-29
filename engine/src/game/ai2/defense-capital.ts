// Capital-specific defense helpers for ring positioning and garrison swaps.
import { DiplomacyState, GameState, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { tryAction } from "../ai/shared/actions.js";
import { aiInfo } from "../ai/debug-logging.js";
import { isMilitary } from "./unit-roles.js";

// v7.2: Capital should always have 1 garrison + 3 in ring (total 4 defenders)
// Note: Only 1 unit can be IN the city, rest must be in adjacent tiles (ring)
// Capitals ALWAYS get full defense regardless of perimeter status
const CAPITAL_MIN_DEFENDERS = 4; // 1 inside + 3 in ring

export function defendCapitalRing(
    state: GameState,
    playerId: string,
    capital: GameState["cities"][number] | null,
    cityCoords: Set<string>
): GameState {
    if (!capital) return state;

    let next = state;

    // Count units in capital (should be max 1)
    const capitalGarrison = next.units.find(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexEquals(u.coord, capital.coord)
    );

    // Count units in ring (adjacent to capital)
    const capitalRingDefenders = next.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, capital.coord) === 1
    );

    const totalDefenders = (capitalGarrison ? 1 : 0) + capitalRingDefenders.length;

    // Check if enemy has ranged attackers nearby - if so, prefer ranged garrison
    const enemies = next.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        next.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    ).map(p => p.id);

    const nearbyEnemyRanged = next.units.filter(u =>
        enemies.includes(u.ownerId) &&
        UNITS[u.type].rng > 1 &&
        hexDistance(u.coord, capital.coord) <= 5
    ).length;

    // If enemy has ranged and garrison isn't ranged, try to swap
    if (nearbyEnemyRanged > 0 && capitalGarrison && UNITS[capitalGarrison.type].rng <= 1) {
        // Find a ranged unit in ring to swap with garrison
        const rangedInRing = capitalRingDefenders.find(u =>
            UNITS[u.type].rng > 1 && u.movesLeft > 0
        );
        if (rangedInRing && capitalGarrison.movesLeft > 0) {
            // Try to swap: garrison out, ranged in
            const neighbors = getNeighbors(capital.coord).filter(n =>
                !next.units.some(u => hexEquals(u.coord, n))
            );
            if (neighbors.length > 0) {
                // Move garrison to empty adjacent tile
                const moveOut = tryAction(next, {
                    type: "MoveUnit", playerId, unitId: capitalGarrison.id, to: neighbors[0]
                });
                if (moveOut !== next) {
                    next = moveOut;
                    // Move ranged into capital
                    const moveIn = tryAction(next, {
                        type: "MoveUnit", playerId, unitId: rangedInRing.id, to: capital.coord
                    });
                    if (moveIn !== next) {
                        next = moveIn;
                        aiInfo(`[CAPITAL DEFENSE] ${playerId} swapped ${rangedInRing.type} into capital (enemy has ranged)`);
                    }
                }
            }
        }
    }

    // If we need more defenders, pull units toward capital ring
    if (totalDefenders < CAPITAL_MIN_DEFENDERS) {
        const available = next.units.filter(u =>
            u.ownerId === playerId &&
            u.movesLeft > 0 &&
            isMilitary(u) &&
            u.type !== UnitType.Titan &&
            !cityCoords.has(`${u.coord.q},${u.coord.r}`) && // Don't pull from other cities
            hexDistance(u.coord, capital.coord) > 1 // Not already in ring
        ).sort((a, b) => hexDistance(a.coord, capital.coord) - hexDistance(b.coord, capital.coord));

        const needed = CAPITAL_MIN_DEFENDERS - totalDefenders;
        for (const unit of available.slice(0, needed)) {
            // Move toward capital (to ring position, not inside)
            const ringPositions = getNeighbors(capital.coord).filter(n =>
                !next.units.some(u => hexEquals(u.coord, n))
            );

            if (ringPositions.length > 0) {
                // If adjacent, move directly to ring
                if (hexDistance(unit.coord, capital.coord) === 2) {
                    const closest = ringPositions.sort((a, b) =>
                        hexDistance(unit.coord, a) - hexDistance(unit.coord, b)
                    )[0];
                    const moveResult = tryAction(next, {
                        type: "MoveUnit", playerId, unitId: unit.id, to: closest
                    });
                    if (moveResult !== next) {
                        next = moveResult;
                        continue;
                    }
                }
            }

            // Otherwise step toward capital
            const sorted = getNeighbors(unit.coord).sort((a, b) =>
                hexDistance(a, capital.coord) - hexDistance(b, capital.coord)
            );
            for (const n of sorted) {
                const attempt = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: n });
                if (attempt !== next) {
                    next = attempt;
                    break;
                }
            }
        }

        aiInfo(`[CAPITAL DEFENSE] ${playerId} capital has ${totalDefenders} defenders (min: ${CAPITAL_MIN_DEFENDERS}), reinforcing ring...`);
    }

    return next;
}
