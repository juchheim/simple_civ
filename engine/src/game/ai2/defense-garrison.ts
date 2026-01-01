// Garrison selection and reinforcement helpers for city defense.
import { GameState, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { tryAction } from "../ai/shared/actions.js";
import { canPlanMove } from "../ai/shared/validation.js";
import { moveToward, planMoveToward } from "./movement.js";
import { getUnitCapabilityProfile, isCombatUnitType } from "./schema.js";
import { DefenseMovePlan, getDefenseCityValueBonus, scoreDefenseMove } from "./defense-actions.js";
import { UNITS } from "../../core/constants.js";

export type CityThreat = {
    city: GameState["cities"][number];
    threat: "none" | "probe" | "raid" | "assault";
    isCapital: boolean;
};

// Threshold to trigger a garrison swap (prevent jitter)
const GARRISON_SWAP_THRESHOLD = 5; // v1.1: Quality difference required to swap

function scoreGarrisonCandidate(state: GameState, unit: GameState["units"][number], city: GameState["cities"][number]): number {
    const stats = UNITS[unit.type];
    if (!stats) return 0;

    let score = 0;

    // 1. Base Combat Strength (prioritize stronger units)
    score += (stats.atk + stats.def) * 2;

    // 2. HP Health percentage
    score += (unit.hp / unit.maxHp) * 10;

    // 3. Garrison Eligibility (capability check)
    if (getUnitCapabilityProfile(unit.type).garrisonEligible) {
        score += 20;
    }

    // 4. Distance Penalty (prefer closer, but quality outweighs a few steps)
    const dist = hexDistance(unit.coord, city.coord);
    score -= dist * 3;

    // 5. Specific Unit Type Preference
    // Lorekeepers are excellent garrisons (defensive bonus in territory)
    if (unit.type === UnitType.Lorekeeper) {
        score += 15;
    }
    // Bowguards are decent but secondary to Lorekeepers/Spears
    if (unit.type === UnitType.BowGuard || unit.type === UnitType.ArmyBowGuard) {
        score += 5;
    }

    return score;
}

export function ensureCityGarrisons(
    state: GameState,
    playerId: string,
    cityThreats: CityThreat[],
    cityCoords: Set<string>
): GameState {
    let next = state;

    // Ensure each city has a garrison if possible - prioritize threatened cities
    for (const { city, threat } of cityThreats) {
        const hasGarrison = next.units.some(u =>
            u.ownerId === playerId &&
            isCombatUnitType(u.type) &&
            hexEquals(u.coord, city.coord)
        );
        if (hasGarrison) continue;

        // Only pull garrisons for none/probe threat if we have excess units
        const urgency = threat === "assault" || threat === "raid";
        const searchRadius = urgency ? 6 : 2; // Look further for high-pressure cities

        const candidates = next.units
            .filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                isCombatUnitType(u.type) &&
                u.type !== UnitType.Titan &&
                !u.hasAttacked &&
                hexDistance(u.coord, city.coord) <= searchRadius &&
                !cityCoords.has(`${u.coord.q},${u.coord.r}`) // v1.1: Don't pull from other cities
            )
            .sort((a, b) => scoreGarrisonCandidate(next, b, city) - scoreGarrisonCandidate(next, a, city));

        const cand = candidates[0];
        if (!cand) continue;

        // Move into city if adjacent; otherwise step toward.
        if (hexDistance(cand.coord, city.coord) === 1) {
            next = tryAction(next, { type: "MoveUnit", playerId, unitId: cand.id, to: city.coord });
        } else {
            next = moveToward(next, playerId, cand, city.coord);
        }
    }

    return next;
}

export function planCityGarrisons(
    state: GameState,
    playerId: string,
    cityThreats: CityThreat[],
    cityCoords: Set<string>,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>
): DefenseMovePlan[] {
    const plans: DefenseMovePlan[] = [];

    for (const { city, threat } of cityThreats) {
        const cityKey = `${city.coord.q},${city.coord.r}`;
        const cityBonus = getDefenseCityValueBonus(state, playerId, city);

        const currentGarrison = state.units.find(u =>
            u.ownerId === playerId &&
            isCombatUnitType(u.type) &&
            hexEquals(u.coord, city.coord)
        );

        // If reserved, skip completely
        if (reservedCoords.has(cityKey)) continue;

        const urgency = threat === "assault" || threat === "raid";
        const searchRadius = urgency ? 6 : 2;

        // Filter valid candidates (excluding current garrison if it exists)
        const candidates = state.units
            .filter(u => {
                if (u.ownerId !== playerId) return false;
                if (u.movesLeft <= 0 || u.hasAttacked) return false;
                if (reservedUnitIds.has(u.id)) return false;
                if (!isCombatUnitType(u.type)) return false;
                if (!getUnitCapabilityProfile(u.type).garrisonEligible) return false;
                if (u.type === UnitType.Titan) return false;
                // Exclude current garrison from candidates list (it's already there)
                if (currentGarrison && u.id === currentGarrison.id) return false;

                if (hexDistance(u.coord, city.coord) > searchRadius) return false;
                if (cityCoords.has(`${u.coord.q},${u.coord.r}`) && !hexEquals(u.coord, city.coord)) return false;
                return true;
            })
            .sort((a, b) => scoreGarrisonCandidate(state, b, city) - scoreGarrisonCandidate(state, a, city));

        const bestCandidate = candidates[0];

        // If we have a garrison...
        if (currentGarrison) {
            // ...and we found a candidate
            if (bestCandidate) {
                const currentScore = scoreGarrisonCandidate(state, currentGarrison, city);
                const bestScore = scoreGarrisonCandidate(state, bestCandidate, city);

                // If candidate is significantly better, try to swap
                if (bestScore > currentScore + GARRISON_SWAP_THRESHOLD) {
                    // We need to move the current garrison OUT
                    if (currentGarrison.movesLeft > 0 && !currentGarrison.hasAttacked && !reservedUnitIds.has(currentGarrison.id)) {
                        // Find a valid neighbor to move to
                        const neighbors = getNeighbors(city.coord)
                            .filter(n => {
                                const nKey = `${n.q},${n.r}`;
                                if (reservedCoords.has(nKey)) return false;
                                return canPlanMove(state, playerId, currentGarrison, n);
                            })
                            // Prefer moving towards safety or just random valid spot?
                            // For now, just pick first valid, maybe sort by distance to enemy?
                            // Or just any valid spot not adjacent to enemy?
                            .slice(0, 1); // just take one

                        if (neighbors.length > 0) {
                            const vacateDest = neighbors[0];
                            const vacateAction = { type: "MoveUnit", playerId, unitId: currentGarrison.id, to: vacateDest } as const;

                            // Plan Vacate
                            plans.push({
                                intent: "support", // Use support as 'miscellaneous move'
                                unitId: currentGarrison.id,
                                action: vacateAction,
                                score: 10, // Medium priority?
                                cityId: city.id,
                                reason: "vacate-garrison-upgrade"
                            });
                            reservedUnitIds.add(currentGarrison.id);
                            reservedCoords.add(`${vacateDest.q},${vacateDest.r}`);

                            // Now plan the new guy moving IN
                            // Note: Strict coordinate check might fail if engine doesn't support simultaneous, 
                            // but since we reserved the vacate dest, and city is technically occupied until move execution...
                            // The planner usually generates a list. The execution engine handles order?
                            // If simultaneous execution is not supported, this might fail in-game if the vacate doesn't happen first.
                            // But we output the plan.

                            // The bestCandidate needs to move to city.coord
                            // If adjacent, direct move check:
                            if (hexDistance(bestCandidate.coord, city.coord) === 1) {
                                // We can't use 'canPlanMove' strictly because it checks occupancy.
                                // But we know we are vacating. 
                                // Optimistic plan.
                                const moveInAction = { type: "MoveUnit", playerId, unitId: bestCandidate.id, to: city.coord } as const;
                                plans.push({
                                    intent: "garrison",
                                    unitId: bestCandidate.id,
                                    action: moveInAction,
                                    score: scoreDefenseMove(threat, 1, cityBonus) + 5, // Bonus for upgrade
                                    cityId: city.id,
                                    reason: "fill-garrison-upgrade"
                                });
                                reservedUnitIds.add(bestCandidate.id);
                                reservedCoords.add(cityKey);
                            } else {
                                // If not adjacent, move toward
                                const moveAction = planMoveToward(state, playerId, bestCandidate, city.coord, reservedCoords);
                                if (moveAction && moveAction.type === "MoveUnit") {
                                    const destKey = `${moveAction.to.q},${moveAction.to.r}`;
                                    plans.push({
                                        intent: "garrison",
                                        unitId: bestCandidate.id,
                                        action: moveAction,
                                        score: scoreDefenseMove(threat, hexDistance(moveAction.to, city.coord), cityBonus),
                                        cityId: city.id,
                                        reason: "step-to-garrison-upgrade"
                                    });
                                    reservedUnitIds.add(bestCandidate.id);
                                    reservedCoords.add(destKey);
                                }
                            }
                        }
                    }
                }
            }
            // If already garrisoned (and no swap happening), we stop here for this city
            continue;
        }

        if (!bestCandidate) continue;

        if (hexDistance(bestCandidate.coord, city.coord) === 1) {
            const action = { type: "MoveUnit", playerId, unitId: bestCandidate.id, to: city.coord } as const;
            if (canPlanMove(state, playerId, bestCandidate, city.coord)) {
                plans.push({
                    intent: "garrison",
                    unitId: bestCandidate.id,
                    action,
                    score: scoreDefenseMove(threat, 1, cityBonus),
                    cityId: city.id,
                    reason: "fill-garrison"
                });
                reservedUnitIds.add(bestCandidate.id);
                reservedCoords.add(cityKey);
            }
            continue;
        }

        // Pure planMoveToward check
        const moveAction = planMoveToward(state, playerId, bestCandidate, city.coord, reservedCoords);
        if (moveAction && moveAction.type === "MoveUnit") {
            const destKey = `${moveAction.to.q},${moveAction.to.r}`;

            plans.push({
                intent: "garrison",
                unitId: bestCandidate.id,
                action: moveAction,
                score: scoreDefenseMove(threat, hexDistance(moveAction.to, city.coord), cityBonus),
                cityId: city.id,
                reason: "step-to-garrison"
            });
            reservedUnitIds.add(bestCandidate.id);
            reservedCoords.add(destKey);
        }
    }

    return plans;
}

export function reinforceThreatenedCities(
    state: GameState,
    playerId: string,
    cityThreats: CityThreat[],
    cityCoords: Set<string>
): GameState {
    let next = state;

    // Reinforce threatened cities based on threat level
    for (const { city, threat } of cityThreats) {
        if (threat === "none") continue;
        // Determine desired defenders based on threat level
        const desired = threat === "assault" ? 3 : threat === "raid" ? 2 : 1;
        const defendersNear = next.units.filter(u =>
            u.ownerId === playerId &&
            isCombatUnitType(u.type) &&
            u.type !== UnitType.Titan &&
            hexDistance(u.coord, city.coord) <= 2
        ).length;

        if (defendersNear >= desired) continue;

        // Pull reinforcements from farther away for more threatened cities
        const pullRadius = threat === "assault" ? 8 : threat === "raid" ? 5 : 3;
        const reinforcements = next.units
            .filter(u =>
                u.ownerId === playerId &&
                u.movesLeft > 0 &&
                isCombatUnitType(u.type) &&
                u.type !== UnitType.Titan &&
                hexDistance(u.coord, city.coord) >= 3 &&
                hexDistance(u.coord, city.coord) <= pullRadius &&
                !cityCoords.has(`${u.coord.q},${u.coord.r}`) // v1.1: Don't pull from other cities
            )
            .sort((a, b) => hexDistance(a.coord, city.coord) - hexDistance(b.coord, city.coord));

        for (const unit of reinforcements.slice(0, desired - defendersNear)) {
            const neighbors = next.map.tiles
                .filter(t => hexDistance(t.coord, unit.coord) === 1)
                .map(t => t.coord)
                .sort((a, b) => hexDistance(a, city.coord) - hexDistance(b, city.coord));
            for (const step of neighbors) {
                const moved = tryAction(next, { type: "MoveUnit", playerId, unitId: unit.id, to: step });
                if (moved !== next) {
                    next = moved;
                    break;
                }
            }
        }
    }

    return next;
}

export function planReinforceThreatenedCities(
    state: GameState,
    playerId: string,
    cityThreats: CityThreat[],
    cityCoords: Set<string>,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>
): DefenseMovePlan[] {
    const plans: DefenseMovePlan[] = [];

    for (const { city, threat } of cityThreats) {
        if (threat === "none") continue;
        const cityBonus = getDefenseCityValueBonus(state, playerId, city);

        const desired = threat === "assault" ? 3 : threat === "raid" ? 2 : 1;
        const defendersNear = state.units.filter(u =>
            u.ownerId === playerId &&
            isCombatUnitType(u.type) &&
            u.type !== UnitType.Titan &&
            hexDistance(u.coord, city.coord) <= 2
        ).length;

        if (defendersNear >= desired) continue;

        const pullRadius = threat === "assault" ? 8 : threat === "raid" ? 5 : 3;
        const reinforcements = state.units
            .filter(u => {
                if (u.ownerId !== playerId) return false;
                if (u.movesLeft <= 0) return false;
                if (u.hasAttacked) return false;
                if (reservedUnitIds.has(u.id)) return false;
                if (!isCombatUnitType(u.type)) return false;
                if (u.type === UnitType.Titan) return false;
                const dist = hexDistance(u.coord, city.coord);
                if (dist < 3 || dist > pullRadius) return false;
                if (cityCoords.has(`${u.coord.q},${u.coord.r}`)) return false;
                return true;
            })
            // Optimization: sort reinforcements by distance first to grab closest help
            .sort((a, b) => hexDistance(a.coord, city.coord) - hexDistance(b.coord, city.coord));

        for (const unit of reinforcements.slice(0, desired - defendersNear)) {
            const neighbors = state.map.tiles
                .filter(t => hexDistance(t.coord, unit.coord) === 1)
                .map(t => t.coord)
                .sort((a, b) => hexDistance(a, city.coord) - hexDistance(b, city.coord));
            for (const step of neighbors) {
                const stepKey = `${step.q},${step.r}`;
                if (reservedCoords.has(stepKey)) continue;
                const action = { type: "MoveUnit", playerId, unitId: unit.id, to: step } as const;
                if (canPlanMove(state, playerId, unit, step)) {
                    plans.push({
                        intent: "support",
                        unitId: unit.id,
                        action,
                        score: scoreDefenseMove(threat, hexDistance(step, city.coord), cityBonus),
                        cityId: city.id,
                        reason: "reinforce-city"
                    });
                    reservedUnitIds.add(unit.id);
                    reservedCoords.add(stepKey);
                    break;
                }
            }
        }
    }

    return plans;
}
