// Mutual defense reinforcement routing across cities.
import { DiplomacyState, GameState } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { canPlanMove } from "../ai/shared/validation.js";
import { aiInfo } from "../ai/debug-logging.js";
import { assessCityThreatLevel } from "./defense-situation/scoring.js";
import { isPerimeterCity } from "./defense-perimeter.js";
import { isMilitary } from "./unit-roles.js";
import { planMoveToward } from "./movement.js";
import { DefenseMovePlan, getDefenseCityValueBonus, scoreDefenseMove } from "./defense-actions.js";
import type { TacticalContext } from "./tactical-context.js";

type GetFlowField = TacticalContext["getFlowField"];


export function planMutualDefenseReinforcements(
    state: GameState,
    playerId: string,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>,
    getFlowField?: GetFlowField
): DefenseMovePlan[] {
    const plans: DefenseMovePlan[] = [];

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    if (myCities.length < 2) return plans;

    const enemies = state.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        state.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    if (enemies.length === 0) return plans;
    const enemyIds = new Set(enemies.map(e => e.id));

    const cityStatus = myCities.map(city => {
        const threatLevel = assessCityThreatLevel(state, city, playerId);
        const perimeter = isPerimeterCity(state, city, playerId);
        const minDefenders = city.isCapital ? (perimeter ? 4 : 1) : (perimeter ? 3 : 1);

        const garrison = state.units.find(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexEquals(u.coord, city.coord)
        );
        const ringDefenders = state.units.filter(u =>
            u.ownerId === playerId &&
            isMilitary(u) &&
            hexDistance(u.coord, city.coord) === 1
        );
        const currentDefenders = (garrison ? 1 : 0) + ringDefenders.length;

        const excess = Math.max(0, currentDefenders - minDefenders);
        const deficit = Math.max(0, minDefenders - currentDefenders);

        return {
            city,
            threatLevel,
            perimeter,
            minDefenders,
            currentDefenders,
            excess,
            deficit,
            ringDefenders
        };
    });

    const needsHelp = cityStatus
        .filter(cs => (cs.threatLevel === "raid" || cs.threatLevel === "assault") && cs.deficit > 0)
        .sort((a, b) => {
            if (a.threatLevel === "assault" && b.threatLevel !== "assault") return -1;
            if (b.threatLevel === "assault" && a.threatLevel !== "assault") return 1;
            if (a.city.isCapital && !b.city.isCapital) return -1;
            if (b.city.isCapital && !a.city.isCapital) return 1;
            return b.deficit - a.deficit;
        });

    if (needsHelp.length === 0) return plans;

    const canHelp = cityStatus
        .filter(cs => cs.excess > 0)
        .sort((a, b) => b.excess - a.excess);

    for (const needy of needsHelp) {
        if (needy.deficit <= 0) continue;
        const needyBonus = getDefenseCityValueBonus(state, playerId, needy.city);

        for (const helper of canHelp) {
            if (helper.excess <= 0) continue;

            const distance = hexDistance(helper.city.coord, needy.city.coord);
            if (distance > 8) continue;

            const helperEnemiesNearby = state.units.filter(u =>
                enemyIds.has(u.ownerId) &&
                isMilitary(u) &&
                hexDistance(u.coord, helper.city.coord) <= 3
            );
            if (helperEnemiesNearby.length > 0) continue;

            const toSend = helper.ringDefenders.filter(u => {
                const liveUnit = state.units.find(uu => uu.id === u.id);
                return liveUnit && liveUnit.movesLeft > 0 && !reservedUnitIds.has(liveUnit.id);
            }).slice(0, Math.min(helper.excess, needy.deficit));

            for (const unit of toSend) {
                const liveUnit = state.units.find(u => u.id === unit.id);
                if (!liveUnit || liveUnit.movesLeft <= 0) continue;

                const ringPositions = getNeighbors(needy.city.coord).filter(n =>
                    !state.units.some(u => hexEquals(u.coord, n)) &&
                    !reservedCoords.has(`${n.q},${n.r}`)
                );

                let planned = false;

                if (ringPositions.length > 0) {
                    const closest = ringPositions.sort((a, b) =>
                        hexDistance(liveUnit.coord, a) - hexDistance(liveUnit.coord, b)
                    )[0];

                    if (hexDistance(liveUnit.coord, closest) === 1) {
                        const action = { type: "MoveUnit", playerId, unitId: liveUnit.id, to: closest } as const;
                        if (canPlanMove(state, playerId, liveUnit, closest)) {
                            plans.push({
                                intent: "support",
                                unitId: liveUnit.id,
                                action,
                                score: scoreDefenseMove(needy.threatLevel, 1, needyBonus),
                                cityId: needy.city.id,
                                reason: "mutual-defense-ring"
                            });
                            reservedUnitIds.add(liveUnit.id);
                            reservedCoords.add(`${closest.q},${closest.r}`);
                            planned = true;
                            aiInfo(`[MUTUAL DEFENSE] ${playerId} ${liveUnit.type} from ${helper.city.name} reinforcing ${needy.city.name} (threat:${needy.threatLevel})`);
                        }
                    } else {
                        const flow = getFlowField ? getFlowField(closest, { cacheKey: "defense-mutual" }) : undefined;
                        const moveAction = planMoveToward(state, playerId, liveUnit, closest, reservedCoords, undefined, flow);
                        if (moveAction && moveAction.type === "MoveUnit") {
                            const destKey = `${moveAction.to.q},${moveAction.to.r}`;
                            plans.push({
                                intent: "support",
                                unitId: liveUnit.id,
                                action: moveAction,
                                score: scoreDefenseMove(needy.threatLevel, hexDistance(moveAction.to, needy.city.coord), needyBonus),
                                cityId: needy.city.id,
                                reason: "mutual-defense-step"
                            });
                            reservedUnitIds.add(liveUnit.id);
                            reservedCoords.add(destKey);
                            planned = true;
                            aiInfo(`[MUTUAL DEFENSE] ${playerId} ${liveUnit.type} stepping toward ${needy.city.name}`);
                        }
                    }
                }

                if (!planned) {
                    const sorted = getNeighbors(liveUnit.coord).sort((a, b) =>
                        hexDistance(a, needy.city.coord) - hexDistance(b, needy.city.coord)
                    );
                    for (const n of sorted) {
                        const key = `${n.q},${n.r}`;
                        if (reservedCoords.has(key)) continue;
                        if (canPlanMove(state, playerId, liveUnit, n)) {
                            plans.push({
                                intent: "support",
                                unitId: liveUnit.id,
                                action: { type: "MoveUnit", playerId, unitId: liveUnit.id, to: n },
                                score: scoreDefenseMove(needy.threatLevel, hexDistance(n, needy.city.coord), needyBonus),
                                cityId: needy.city.id,
                                reason: "mutual-defense-fallback"
                            });
                            reservedUnitIds.add(liveUnit.id);
                            reservedCoords.add(key);
                            aiInfo(`[MUTUAL DEFENSE] ${playerId} ${liveUnit.type} stepping from ${helper.city.name} toward ${needy.city.name}`);
                            break;
                        }
                    }
                }

                helper.excess--;
                needy.deficit--;
                if (needy.deficit <= 0) break;
            }

            if (needy.deficit <= 0) break;
        }
    }

    return plans;
}
