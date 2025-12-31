// Capital-specific defense helpers for ring positioning and garrison swaps.
import { DiplomacyState, GameState, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { UNITS } from "../../core/constants.js";
import { tryAction } from "../ai/shared/actions.js";
import { canPlanMove } from "../ai/shared/validation.js";
import { aiInfo } from "../ai/debug-logging.js";
import { isMilitary } from "./unit-roles.js";
import { DefenseMovePlan, getDefenseCityValueBonus, scoreDefenseMove } from "./defense-actions.js";
import { planMoveToward, moveToward } from "./movement.js";

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
                    if (hexDistance(unit.coord, closest) === 1) {
                        const moveResult = tryAction(next, {
                            type: "MoveUnit", playerId, unitId: unit.id, to: closest
                        });
                        if (moveResult !== next) {
                            next = moveResult;
                            continue;
                        }
                    }
                }
            }

            // Otherwise step toward capital
            next = moveToward(next, playerId, unit, capital.coord);
        }

        aiInfo(`[CAPITAL DEFENSE] ${playerId} capital has ${totalDefenders} defenders (min: ${CAPITAL_MIN_DEFENDERS}), reinforcing ring...`);
    }

    return next;
}

export function planCapitalRingDefense(
    state: GameState,
    playerId: string,
    capital: GameState["cities"][number] | null,
    cityCoords: Set<string>,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>
): DefenseMovePlan[] {
    if (!capital) return [];

    const plans: DefenseMovePlan[] = [];
    const capitalBonus = getDefenseCityValueBonus(state, playerId, capital);
    const capitalKey = `${capital.coord.q},${capital.coord.r}`;

    const capitalGarrison = state.units.find(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexEquals(u.coord, capital.coord)
    );

    const capitalRingDefenders = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        hexDistance(u.coord, capital.coord) === 1
    );

    const totalDefenders = (capitalGarrison ? 1 : 0) + capitalRingDefenders.length;

    const enemies = state.players.filter(p =>
        p.id !== playerId &&
        !p.isEliminated &&
        state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
    ).map(p => p.id);

    const nearbyEnemyRanged = state.units.filter(u =>
        enemies.includes(u.ownerId) &&
        UNITS[u.type].rng > 1 &&
        hexDistance(u.coord, capital.coord) <= 5
    ).length;

    if (nearbyEnemyRanged > 0 && capitalGarrison && UNITS[capitalGarrison.type].rng <= 1) {
        const rangedInRing = capitalRingDefenders.find(u =>
            UNITS[u.type].rng > 1 && u.movesLeft > 0 && !reservedUnitIds.has(u.id)
        );
        if (rangedInRing && capitalGarrison.movesLeft > 0 && !reservedUnitIds.has(capitalGarrison.id)) {
            const neighbors = getNeighbors(capital.coord).filter(n =>
                !state.units.some(u => hexEquals(u.coord, n)) &&
                !reservedCoords.has(`${n.q},${n.r}`)
            );
            if (neighbors.length > 0 && !reservedCoords.has(capitalKey)) {

                // Swap Out Phase
                const moveOutDest = neighbors[0];
                const moveOutKey = `${moveOutDest.q},${moveOutDest.r}`;

                if (canPlanMove(state, playerId, capitalGarrison, moveOutDest)) {
                    plans.push({
                        intent: "support",
                        unitId: capitalGarrison.id,
                        action: { type: "MoveUnit", playerId, unitId: capitalGarrison.id, to: moveOutDest },
                        score: scoreDefenseMove("raid", 1, capitalBonus),
                        cityId: capital.id,
                        reason: "capital-swap-out"
                    });
                    reservedUnitIds.add(capitalGarrison.id);
                    reservedCoords.add(moveOutKey);

                    // Note: We can't strictly plan the swap-in here atomically without handling the multi-unit coordination carefully in execution.
                    // But for planning purposes, we mark the garrison as "moved out" (reserved), 
                    // and we can try to plan the swap-in IF it passes validation.
                    // However, `canPlanMove(rangedInRing -> capital)` will FAIL if `capitalGarrison` is still physically there in `state`.
                    // This is a known limitation of pure planning without immediate application.
                    // We will skip planning the "swap in" part here and rely on the next turn or execution phase to handle it?
                    // OR: We accept that this planning step primarily clears the way.

                    // ACTUALLY: The "swap" is a coordinated maneuver. If we plan the move-out, the move-in will be blocked by `canPlanMove` 
                    // because the unit is still there. 
                    // To support swaps in pure planning, we would need to pass a "virtual state" or "ignored units set".
                    // For now, we plan the move-out. The next tick (or re-evaluation) would plan the move-in. 
                }
            }
        }
    }

    if (totalDefenders < CAPITAL_MIN_DEFENDERS) {
        const available = state.units.filter(u =>
            u.ownerId === playerId &&
            u.movesLeft > 0 &&
            isMilitary(u) &&
            u.type !== UnitType.Titan &&
            !reservedUnitIds.has(u.id) &&
            !cityCoords.has(`${u.coord.q},${u.coord.r}`) &&
            hexDistance(u.coord, capital.coord) > 1
        ).sort((a, b) => hexDistance(a.coord, capital.coord) - hexDistance(b.coord, capital.coord));

        const needed = CAPITAL_MIN_DEFENDERS - totalDefenders;
        for (const unit of available.slice(0, needed)) {
            const ringPositions = getNeighbors(capital.coord).filter(n =>
                !state.units.some(u => hexEquals(u.coord, n)) &&
                !reservedCoords.has(`${n.q},${n.r}`)
            );

            let planned = false;

            if (ringPositions.length > 0) {
                if (hexDistance(unit.coord, capital.coord) === 2) {
                    const closest = ringPositions.sort((a, b) =>
                        hexDistance(unit.coord, a) - hexDistance(unit.coord, b)
                    )[0];
                    if (hexDistance(unit.coord, closest) === 1) {
                        const action = { type: "MoveUnit", playerId, unitId: unit.id, to: closest } as const;
                        if (canPlanMove(state, playerId, unit, closest)) {
                            plans.push({
                                intent: "support",
                                unitId: unit.id,
                                action,
                                score: scoreDefenseMove("raid", hexDistance(closest, capital.coord), capitalBonus),
                                cityId: capital.id,
                                reason: "capital-ring-direct"
                            });
                            reservedUnitIds.add(unit.id);
                            reservedCoords.add(`${closest.q},${closest.r}`);
                            planned = true;
                        }
                    }
                }
            }

            if (!planned) {
                // Use pure planMoveToward
                const moveAction = planMoveToward(state, playerId, unit, capital.coord, reservedCoords);
                if (moveAction && moveAction.type === "MoveUnit") {
                    const destKey = `${moveAction.to.q},${moveAction.to.r}`;
                    plans.push({
                        intent: "support",
                        unitId: unit.id,
                        action: moveAction,
                        score: scoreDefenseMove("raid", hexDistance(moveAction.to, capital.coord), capitalBonus),
                        cityId: capital.id,
                        reason: "capital-ring-step"
                    });
                    reservedUnitIds.add(unit.id);
                    reservedCoords.add(destKey);
                }
            }
        }

        if (plans.length > 0) {
            aiInfo(`[CAPITAL DEFENSE] ${playerId} capital has ${totalDefenders} defenders (min: ${CAPITAL_MIN_DEFENDERS}), planning reinforcements...`);
        }
    }

    return plans;
}
