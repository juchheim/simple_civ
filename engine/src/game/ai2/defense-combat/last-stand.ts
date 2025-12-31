import { DiplomacyState, GameState, Unit } from "../../../core/types.js";
import { hexDistance, hexEquals, getNeighbors } from "../../../core/hex.js";
import { UNITS } from "../../../core/constants.js";
import { tryAction } from "../../ai/shared/actions.js";
import { getCombatPreviewUnitVsUnit } from "../../helpers/combat-preview.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { scoreAttackOption } from "../attack-order/scoring.js";
import { canPlanAttack, isGarrisoned } from "../attack-order/shared.js";
import { isMilitary } from "../unit-roles.js";
import { DefenseAttackPlan } from "../defense-actions.js";



export function planLastStandAttacks(
    state: GameState,
    playerId: string,
    reservedUnitIds: Set<string>,
    reservedCoords: Set<string>
): DefenseAttackPlan[] {
    const plans: DefenseAttackPlan[] = [];

    const enemies = state.players.filter(p =>
        !p.isEliminated &&
        p.id !== playerId &&
        state.diplomacy[playerId]?.[p.id] === DiplomacyState.War
    );
    if (enemies.length === 0) return plans;
    const enemyIds = new Set(enemies.map(e => e.id));

    const myCities = state.cities.filter(c => c.ownerId === playerId);
    // Note: garrisoned units (on city tile) cannot attack, so exclude them
    const militaryUnits = state.units.filter(u =>
        u.ownerId === playerId &&
        isMilitary(u) &&
        !u.hasAttacked &&
        u.movesLeft > 0 &&
        !reservedUnitIds.has(u.id) &&
        !isGarrisoned(u, state, playerId) // Garrisoned units can't attack
    );

    for (const unit of militaryUnits) {
        const liveUnit = state.units.find(u => u.id === unit.id);
        if (!liveUnit || liveUnit.hasAttacked) continue;

        const nearbyEnemies = state.units.filter(u =>
            enemyIds.has(u.ownerId) &&
            isMilitary(u) &&
            hexDistance(u.coord, liveUnit.coord) <= 2
        );

        if (nearbyEnemies.length === 0) continue;

        const canRetreat = checkCanRetreat(state, liveUnit, myCities, enemyIds);
        if (canRetreat) continue;

        const attackableEnemies = nearbyEnemies.filter(e =>
            canPlanAttack(state, liveUnit, "Unit", e.id)
        );

        if (attackableEnemies.length === 0) {
            const neighbors = getNeighbors(liveUnit.coord);
            for (const neighbor of neighbors) {
                const occupied = state.units.some(u => hexEquals(u.coord, neighbor));
                const isCity = state.cities.some(c => hexEquals(c.coord, neighbor));
                if (occupied || isCity) continue;
                const neighborKey = `${neighbor.q},${neighbor.r}`;
                if (reservedCoords.has(neighborKey)) continue;

                const enemyInRange = nearbyEnemies.find(e =>
                    canPlanAttack(state, liveUnit, "Unit", e.id, neighbor)
                );
                if (!enemyInRange) continue;

                const preview = getCombatPreviewUnitVsUnit(state, { ...liveUnit, coord: neighbor }, enemyInRange);
                const dmg = preview.estimatedDamage.avg;
                const ret = preview.returnDamage?.avg ?? 0;
                const scored = scoreAttackOption({
                    state,
                    playerId,
                    attacker: { ...liveUnit, coord: neighbor },
                    targetType: "Unit",
                    target: enemyInRange,
                    damage: dmg,
                    returnDamage: ret
                });

                plans.push({
                    intent: "move-attack",
                    unitId: liveUnit.id,
                    score: scored.score,
                    wouldKill: scored.wouldKill,
                    plan: {
                        unit: liveUnit,
                        moveTo: neighbor,
                        targetId: enemyInRange.id,
                        targetType: "Unit",
                        exposureDamage: 0,
                        potentialDamage: dmg,
                        wouldKill: scored.wouldKill,
                        score: scored.score
                    },
                    reason: "last-stand-move-attack"
                });
                reservedUnitIds.add(liveUnit.id);
                reservedCoords.add(neighborKey);
                break;
            }
            continue;
        }

        let bestTarget: typeof attackableEnemies[0] | null = null;
        let bestScore = -Infinity;
        let bestPreview: ReturnType<typeof getCombatPreviewUnitVsUnit> | null = null;

        for (const enemy of attackableEnemies) {
            const preview = getCombatPreviewUnitVsUnit(state, liveUnit, enemy);
            const dmg = preview.estimatedDamage.avg;
            const ret = preview.returnDamage?.avg ?? 0;
            const scored = scoreAttackOption({
                state,
                playerId,
                attacker: liveUnit,
                targetType: "Unit",
                target: enemy,
                damage: dmg,
                returnDamage: ret
            });
            if (scored.score > bestScore) {
                bestScore = scored.score;
                bestTarget = enemy;
                bestPreview = preview;
            }
        }

        if (bestTarget && bestPreview) {
            plans.push({
                intent: "attack",
                unitId: liveUnit.id,
                score: bestScore,
                wouldKill: bestPreview.estimatedDamage.avg >= bestTarget.hp,
                plan: {
                    attacker: liveUnit,
                    targetId: bestTarget.id,
                    targetType: "Unit",
                    damage: bestPreview.estimatedDamage.avg,
                    wouldKill: bestPreview.estimatedDamage.avg >= bestTarget.hp,
                    score: bestScore,
                    returnDamage: bestPreview.returnDamage?.avg ?? 0
                },
                reason: "last-stand-attack"
            });
            reservedUnitIds.add(liveUnit.id);
        }
    }

    return plans;
}

/**
 * Check if a unit can retreat to a friendly city.
 * Uses bounded BFS with PESSIMISTIC terrain checking:
 * - Terrain passability is always checked (mountains, water for land units)
 * - Hidden/fog tiles are treated as BLOCKED (not passable like normal pathfinding)
 * - Enemy units block tiles
 * - Friendly units add cost but don't fully block
 * 
 * Returns false if:
 * - No friendly cities exist
 * - No valid path to any city within MAX_RETREAT_RANGE tiles
 * - Unit is effectively cornered
 * 
 * Note: Unlike normal pathfinding which is optimistic about fog, this is
 * pessimistic - if we can't see it, we can't retreat through it.
 */
export function checkCanRetreat(
    state: GameState,
    unit: { coord: { q: number; r: number }, movesLeft: number, type?: string, ownerId?: string },
    myCities: Array<{ coord: { q: number; r: number } }>,
    enemyIds: Set<string>
): boolean {
    if (myCities.length === 0) return false;

    // Find all cities within potential retreat range
    const MAX_RETREAT_RANGE = 8;
    const citiesInRange = myCities.filter(c =>
        hexDistance(unit.coord, c.coord) <= MAX_RETREAT_RANGE
    );

    // If no cities in range, unit is too far from safety
    if (citiesInRange.length === 0) return false;

    // If already at or next to a city, can retreat
    const nearestDist = Math.min(...citiesInRange.map(c => hexDistance(unit.coord, c.coord)));
    if (nearestDist <= 1) return true;

    // Find the actual unit for pathfinding (need type info for domain checks)
    const liveUnit = state.units.find(u =>
        hexEquals(u.coord, unit.coord) && u.ownerId && !enemyIds.has(u.ownerId)
    );
    if (!liveUnit) return false;

    // Build visibility set for this player
    const visibilitySet = new Set(state.visibility[liveUnit.ownerId] || []);

    // Build tile lookup map for O(1) access
    const tileByKey = new Map<string, { terrain: string }>();
    for (const tile of state.map.tiles) {
        tileByKey.set(`${tile.coord.q},${tile.coord.r}`, tile);
    }

    // Build unit lookup for blocking checks
    const unitByCoord = new Map<string, { ownerId: string }>();
    for (const u of state.units) {
        if (u.id !== liveUnit.id) {
            unitByCoord.set(`${u.coord.q},${u.coord.r}`, u);
        }
    }

    // Build city coord set for retreat targets
    const cityCoords = new Set(citiesInRange.map(c => `${c.coord.q},${c.coord.r}`));
    // Also include neighbors of cities as valid retreat destinations
    for (const city of citiesInRange) {
        for (const neighbor of getNeighbors(city.coord)) {
            cityCoords.add(`${neighbor.q},${neighbor.r}`);
        }
    }

    // Get unit domain for terrain checks
    const unitStats = UNITS[liveUnit.type];
    const isLandUnit = unitStats?.domain === "Land";
    const isNavalUnit = unitStats?.domain === "Naval";

    /**
     * Check if a tile is passable for retreat (PESSIMISTIC)
     * - Hidden tiles are BLOCKED (unlike normal pathfinding which is optimistic)
     * - Enemy units block
     * - Mountains/water block land units
     */
    const isPassable = (coord: { q: number; r: number }): boolean => {
        const key = `${coord.q},${coord.r}`;
        const tile = tileByKey.get(key);

        // No tile data = off map or unknown = blocked
        if (!tile) return false;

        // PESSIMISTIC: Hidden tiles are not passable for retreat calculations
        // We can only retreat through tiles we can see
        if (!visibilitySet.has(key)) return false;

        // Enemy unit on tile = blocked
        const unitOnTile = unitByCoord.get(key);
        if (unitOnTile && enemyIds.has(unitOnTile.ownerId)) return false;

        // Check terrain based on unit domain
        if (isLandUnit) {
            if (tile.terrain === "Coast" || tile.terrain === "DeepSea") return false;
            if (tile.terrain === "Mountain") return false;
        } else if (isNavalUnit) {
            if (tile.terrain !== "Coast" && tile.terrain !== "DeepSea") return false;
        }

        return true;
    };

    // BFS to find if we can reach any city or city-adjacent tile
    const visited = new Set<string>();
    const queue: Array<{ coord: { q: number; r: number }; depth: number }> = [];
    const startKey = `${unit.coord.q},${unit.coord.r}`;
    visited.add(startKey);
    queue.push({ coord: unit.coord, depth: 0 });

    while (queue.length > 0) {
        const current = queue.shift()!;

        // Check if we've reached a city or city-adjacent tile
        const currentKey = `${current.coord.q},${current.coord.r}`;
        if (cityCoords.has(currentKey) && current.depth > 0) {
            // Found a path to safety!
            return true;
        }

        // Don't search beyond max range
        if (current.depth >= MAX_RETREAT_RANGE) continue;

        // Explore neighbors
        for (const neighbor of getNeighbors(current.coord)) {
            const neighborKey = `${neighbor.q},${neighbor.r}`;
            if (visited.has(neighborKey)) continue;
            visited.add(neighborKey);

            if (isPassable(neighbor)) {
                queue.push({ coord: neighbor, depth: current.depth + 1 });
            }
        }
    }

    // No path to any city found - unit is cornered
    return false;
}

