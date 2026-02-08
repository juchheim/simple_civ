// Defensive ring positioning for cities under threat.
import { DiplomacyState, GameState } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { canPlanMove } from "../ai/shared/validation.js";
import { aiInfo } from "../ai/debug-logging.js";
import { getAiProfileV2 } from "./rules.js";
import { isPerimeterCity } from "./defense-perimeter.js";
import { isMilitary } from "./unit-roles.js";
import { planMoveToward } from "./movement.js";
import { DefenseMovePlan, getDefenseCityValueBonus, scoreDefenseMove } from "./defense-actions.js";
import { getTacticalTuning } from "./tuning.js";
import type { TacticalContext } from "./tactical-context.js";

type GetFlowField = TacticalContext["getFlowField"];


export function planDefensiveRing(
    state: GameState,
    playerId: string,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>,
    getFlowField?: GetFlowField
): DefenseMovePlan[] {
    const plans: DefenseMovePlan[] = [];

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    if (myCities.length === 0) return plans;

    const enemies = state.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        state.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    const enemyIds = new Set(enemies.map(e => e.id));

    const getTile = (coord: { q: number; r: number }) =>
        state.map.tiles.find(t => hexEquals(t.coord, coord));

    const profile = getAiProfileV2(state, playerId);
    const tuning = getTacticalTuning(state, playerId);
    const earlyRushChance = profile.diplomacy.earlyRushChance ?? 0;
    const isEarlyGame = state.turn < tuning.ring.earlyGameTurn;
    const skipRingForOffense = earlyRushChance > 0 && isEarlyGame;

    if (skipRingForOffense) {
        aiInfo(`[RING DEFENSE] ${profile.civName} skipping ring defense (early rush mode, turn ${state.turn})`);
        return plans;
    }

    for (const city of myCities) {
        const cityBonus = getDefenseCityValueBonus(state, playerId, city);
        const perimeter = isPerimeterCity(state, city, playerId);
        const desiredTotal = city.isCapital ? tuning.ring.capitalRingSize : (perimeter ? tuning.ring.perimeterRingSize : tuning.ring.defaultRingSize);
        const desiredRing = desiredTotal - 1;

        if (desiredRing <= 0) continue;

        const allMilitary = state.units.filter(u => u.ownerId === playerId && isMilitary(u) && !u.hasAttacked);
        const inGarrisons = new Set(state.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`));

        const inRings = new Set<string>();
        for (const c of myCities) {
            for (const u of allMilitary) {
                if (hexDistance(u.coord, c.coord) === 1) {
                    inRings.add(u.id);
                }
            }
        }

        let available = allMilitary.filter(u => {
            if (inGarrisons.has(`${u.coord.q},${u.coord.r}`)) return false;
            if (inRings.has(u.id)) return false;
            if (reservedUnitIds.has(u.id)) return false;

            // Distance Check: Don't pull units from across the map
            // Unless it's the capital logic? No, even capital shouldn't recall deep strikers.
            // If they are far away, they probably have better things to do (like attacking).
            const dist = hexDistance(u.coord, city.coord);
            const limit = tuning.ring.maxDefenderDistance ?? 8; // Fallback to 8 if undefined in old types
            // console.error(`[DEBUG] Ring Check ${u.id}: dist=${dist} limit=${limit}`);
            if (dist > limit) {
                return false;
            }

            // Attack Check: Don't pull units that are currently adjacent to an enemy city (sieging)
            // This prevents the "swarming but retreating" bug.
            const isSieging = enemies.some(player =>
                state.cities.some(c => c.ownerId === player.id && hexDistance(u.coord, c.coord) === 1)
            );
            if (isSieging) {
                return false;
            }

            return true;
        });

        const currentRing = allMilitary.filter(u => hexDistance(u.coord, city.coord) === 1);
        const needed = desiredRing - currentRing.length;

        if (needed <= 0) continue;

        const neighbors = getNeighbors(city.coord);
        const scoredTiles = neighbors.map(coord => {
            const tile = getTile(coord);
            if (!tile) return { coord, score: -1 };

            let score = tuning.ring.baseTileScore;
            if (tile.terrain === "Hills" || tile.terrain === "Forest") score += tuning.ring.terrainBonus;

            const closestEnemyUnit = state.units
                .filter(u => enemyIds.has(u.ownerId))
                .reduce((minDist, u) => {
                    return Math.min(minDist, hexDistance(coord, u.coord));
                }, 100);

            score += (tuning.ring.enemyDistanceCap - Math.min(tuning.ring.enemyDistanceCap, closestEnemyUnit));

            return { coord, score };
        });

        const targetTiles = scoredTiles
            .filter(t => !state.units.some(u => hexEquals(u.coord, t.coord)))
            .filter(t => !reservedCoords.has(`${t.coord.q},${t.coord.r}`))
            .sort((a, b) => b.score - a.score)
            .slice(0, needed);

        for (const target of targetTiles) {
            if (available.length === 0) break;

            const closest = available.sort((a, b) =>
                hexDistance(a.coord, target.coord) - hexDistance(b.coord, target.coord)
            )[0];

            if (hexDistance(closest.coord, target.coord) === 1) {
                const action = { type: "MoveUnit", playerId, unitId: closest.id, to: target.coord } as const;
                if (canPlanMove(state, playerId, closest, target.coord)) {
                    plans.push({
                        intent: "support",
                        unitId: closest.id,
                        action,
                        score: scoreDefenseMove("probe", 1, cityBonus),
                        cityId: city.id,
                        reason: "ring-position"
                    });
                    reservedUnitIds.add(closest.id);
                    reservedCoords.add(`${target.coord.q},${target.coord.r}`);
                    available = available.filter(u => u.id !== closest.id);
                }
            } else {
                const flow = getFlowField ? getFlowField(target.coord, { cacheKey: "defense-ring" }) : undefined;
                const moveAction = planMoveToward(state, playerId, closest, target.coord, reservedCoords, undefined, flow);
                if (moveAction && moveAction.type === "MoveUnit") {
                    const destKey = `${moveAction.to.q},${moveAction.to.r}`;
                    plans.push({
                        intent: "support",
                        unitId: closest.id,
                        action: moveAction,
                        score: scoreDefenseMove("probe", hexDistance(moveAction.to, city.coord), cityBonus),
                        cityId: city.id,
                        reason: "ring-step"
                    });
                    reservedUnitIds.add(closest.id);
                    reservedCoords.add(destKey);
                    available = available.filter(u => u.id !== closest.id);
                }
            }
        }
    }

    return plans;
}
