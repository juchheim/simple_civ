// Garrison selection and reinforcement helpers for city defense.
import { GameState, UnitType } from "../../core/types.js";
import { hexDistance, hexEquals } from "../../core/hex.js";
import { tryAction } from "../ai/shared/actions.js";
import { canPlanMove } from "../ai/shared/validation.js";
import { moveToward, planMoveToward } from "./movement.js";
import { getUnitCapabilityProfile, isCombatUnitType } from "./schema.js";
import { DefenseMovePlan, getDefenseCityValueBonus, scoreDefenseMove } from "./defense-actions.js";

export type CityThreat = {
    city: GameState["cities"][number];
    threat: "none" | "probe" | "raid" | "assault";
    isCapital: boolean;
};

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
            .sort((a, b) => hexDistance(a.coord, city.coord) - hexDistance(b.coord, city.coord));

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
        const hasGarrison = state.units.some(u =>
            u.ownerId === playerId &&
            isCombatUnitType(u.type) &&
            hexEquals(u.coord, city.coord)
        );
        if (hasGarrison || reservedCoords.has(cityKey)) continue;

        const urgency = threat === "assault" || threat === "raid";
        const searchRadius = urgency ? 6 : 2;

        const candidates = state.units
            .filter(u => {
                if (u.ownerId !== playerId) return false;
                if (u.movesLeft <= 0 || u.hasAttacked) return false;
                if (reservedUnitIds.has(u.id)) return false;
                if (!isCombatUnitType(u.type)) return false;
                if (!getUnitCapabilityProfile(u.type).garrisonEligible) return false;
                if (u.type === UnitType.Titan) return false;
                if (hexDistance(u.coord, city.coord) > searchRadius) return false;
                if (cityCoords.has(`${u.coord.q},${u.coord.r}`)) return false;
                return true;
            })
            .sort((a, b) => hexDistance(a.coord, city.coord) - hexDistance(b.coord, city.coord));

        const cand = candidates[0];
        if (!cand) continue;

        if (hexDistance(cand.coord, city.coord) === 1) {
            const action = { type: "MoveUnit", playerId, unitId: cand.id, to: city.coord } as const;
            if (canPlanMove(state, playerId, cand, city.coord)) {
                plans.push({
                    intent: "garrison",
                    unitId: cand.id,
                    action,
                    score: scoreDefenseMove(threat, 1, cityBonus),
                    cityId: city.id,
                    reason: "fill-garrison"
                });
                reservedUnitIds.add(cand.id);
                reservedCoords.add(cityKey);
            }
            continue;
        }

        // Pure planMoveToward check
        const moveAction = planMoveToward(state, playerId, cand, city.coord, reservedCoords);
        if (moveAction && moveAction.type === "MoveUnit") {
            const destKey = `${moveAction.to.q},${moveAction.to.r}`;

            plans.push({
                intent: "garrison",
                unitId: cand.id,
                action: moveAction,
                score: scoreDefenseMove(threat, hexDistance(moveAction.to, city.coord), cityBonus),
                cityId: city.id,
                reason: "step-to-garrison"
            });
            reservedUnitIds.add(cand.id);
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
