// Defensive ring positioning for cities under threat.
import { DiplomacyState, GameState } from "../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../core/hex.js";
import { tryAction } from "../ai/shared/actions.js";
import { aiInfo } from "../ai/debug-logging.js";
import { getAiProfileV2 } from "./rules.js";
import { isPerimeterCity } from "./defense-perimeter.js";
import { isMilitary } from "./unit-roles.js";

/**
 * v7.2: Defensive Ring Positioning
 * Instead of stacking all defenders inside the city, position excess defenders
 * in a ring around the city to screen/intercept attackers.
 * 
 * Benefits:
 * - Attackers must fight through the ring before reaching city
 * - Ranged units in ring can attack before enemy reaches city
 * - Better use of defensive terrain (hills, forests)
 * 
 * Logic:
 * - Keep 1-2 garrison inside city (based on threat level)
 * - Position excess defenders on adjacent tiles
 * - Prefer tiles with defensive terrain
 * - Prefer tiles between city and approaching enemies
 */
export function positionDefensiveRing(state: GameState, playerId: string): GameState {
    let next = state;

    const myCities = next.cities.filter(c => c.ownerId === playerId);
    if (myCities.length === 0) return next;

    // Find enemies at war with us
    const enemies = next.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        next.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    const enemyIds = new Set(enemies.map(e => e.id));

    // Get terrain for defensive scoring
    const getTile = (coord: { q: number; r: number }) =>
        next.map.tiles.find(t => hexEquals(t.coord, coord));

    // v7.2: Pull units to form ring around PERIMETER cities only
    // This ensures aggressive civs don't waste units defending interior cities
    // Capital: 4 total (handled separately in defendCitiesV2)
    // Perimeter cities: 3 total (1 garrison + 2 ring)
    // Interior cities: 1 total (garrison only) - NO ring formation

    // v7.2: EARLY OFFENSE BYPASS for aggressive civs (ForgeClans)
    // If civ has earlyRushChance and we're in early game, skip ring formation
    // to allow full commitment to early offensive
    const profile = getAiProfileV2(next, playerId);
    const earlyRushChance = profile.diplomacy.earlyRushChance ?? 0;
    const isEarlyGame = next.turn < 50;
    const skipRingForOffense = earlyRushChance > 0 && isEarlyGame;

    if (skipRingForOffense) {
        aiInfo(`[RING DEFENSE] ${profile.civName} skipping ring defense (early rush mode, turn ${next.turn})`);
        return next;
    }

    for (const city of myCities) {
        // v7.7: Capital now included in ring defense (was previously skipped, causing undefended capitals)
        // Capital: 4 total (1 garrison + 3 ring)
        // Perimeter cities: 3 total (1 garrison + 2 ring)
        // Interior cities: 1 total (garrison only) - NO ring formation
        const perimeter = isPerimeterCity(next, city, playerId);
        const desiredTotal = city.isCapital ? 4 : (perimeter ? 3 : 1);
        const desiredRing = desiredTotal - 1; // Subtract 1 for garrison inside

        if (desiredRing <= 0) continue; // Interior cities don't need ring

        // Find available defenders (not in garrison, not already in a ring)
        const allMilitary = next.units.filter(u => u.ownerId === playerId && isMilitary(u) && !u.hasAttacked);
        const inGarrisons = new Set(next.cities.filter(c => c.ownerId === playerId).map(c => `${c.coord.q},${c.coord.r}`));

        // v1.2: Also track units already in a defensive ring around ANY city
        // These should not be pulled to form rings around other cities
        const inRings = new Set<string>();
        for (const c of myCities) {
            for (const u of allMilitary) {
                if (hexDistance(u.coord, c.coord) === 1) {
                    inRings.add(u.id);
                }
            }
        }

        // v1.2: Exclude units in garrisons AND units already in a ring around any city
        let available = allMilitary.filter(u =>
            !inGarrisons.has(`${u.coord.q},${u.coord.r}`) &&
            !inRings.has(u.id)
        );

        // How many do we have already?
        const currentRing = allMilitary.filter(u => hexDistance(u.coord, city.coord) === 1);
        const needed = desiredRing - currentRing.length;

        if (needed <= 0) continue;

        // Score adjacent tiles for defense
        const neighbors = getNeighbors(city.coord);
        const scoredTiles = neighbors.map(coord => {
            const tile = getTile(coord);
            if (!tile) return { coord, score: -1 };

            // Base score for terrain
            let score = 10;
            if (tile.terrain === "Hills" || tile.terrain === "Forest") score += 5;

            // Score for proximity to enemies
            const closestEnemyUnit = next.units
                .filter(u => enemyIds.has(u.ownerId))
                .reduce((minDist, u) => {
                    return Math.min(minDist, hexDistance(coord, u.coord));
                }, 100);

            // Favor positions between city and enemies (dist to enumy + dist to city should be close to dist city-to-enemy)
            // But for now, let's just use proximity to enemies to intercept
            score += (10 - Math.min(10, closestEnemyUnit));

            return { coord, score };
        });

        // Simplified for v7.2: Just pick the best empty tiles
        const targetTiles = scoredTiles
            .filter(t => !next.units.some(u => hexEquals(u.coord, t.coord)))
            .sort((a, b) => b.score - a.score)
            .slice(0, needed);

        for (const target of targetTiles) {
            if (available.length === 0) break;

            // Find closest available unit
            const closest = available.sort((a, b) =>
                hexDistance(a.coord, target.coord) - hexDistance(b.coord, target.coord)
            )[0];

            if (hexDistance(closest.coord, target.coord) <= closest.movesLeft) {
                const moveResult = tryAction(next, {
                    type: "MoveUnit",
                    playerId,
                    unitId: closest.id,
                    to: target.coord
                });
                if (moveResult !== next) {
                    next = moveResult;
                    available = available.filter(u => u.id !== closest.id);
                }
            }
        }
    }

    return next;
}
