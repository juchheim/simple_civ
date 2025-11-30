import { GameState, HexCoord, Tile, Unit, UnitDomain, UnitState, TerrainType, UnitType } from "../../core/types.js";
import { TERRAIN, UNITS } from "../../core/constants.js";
import type { UnitStats } from "../../core/constants.js";
import { hexEquals, getNeighbors } from "../../core/hex.js";
import { captureCity } from "./cities.js";
import { ensureWar } from "./diplomacy.js";

export type MoveContext = {
    stats: UnitStats;
    cost: number;
    isMilitary: boolean;
};

export type MoveParticipant = {
    unit: Unit;
    stats: UnitStats;
};

export function createMoveContext(unit: Unit, targetTile: Tile): MoveContext {
    const stats = UNITS[unit.type];
    ensureTerrainEntry(stats, targetTile);
    const cost = computeMoveCost(unit, stats, targetTile);
    return {
        stats,
        cost,
        isMilitary: stats.domain !== UnitDomain.Civilian,
    };
}

export function ensureTerrainEntry(unitStats: UnitStats, targetTile: Tile) {
    if (unitStats.domain === UnitDomain.Land && (targetTile.terrain === TerrainType.Coast || targetTile.terrain === TerrainType.DeepSea)) {
        throw new Error("Land units cannot enter water");
    }
    if (unitStats.domain === UnitDomain.Naval && (targetTile.terrain !== TerrainType.Coast && targetTile.terrain !== TerrainType.DeepSea)) {
        throw new Error("Naval units cannot enter land");
    }
    if (targetTile.terrain === TerrainType.Mountain) {
        throw new Error("Impassable terrain");
    }
}

export function computeMoveCost(unit: Unit, unitStats: UnitStats, targetTile: Tile): number {
    if (unit.movesLeft <= 0) throw new Error("No moves left");

    const terrainData = TERRAIN[targetTile.terrain];
    let cost = 1;
    if (unitStats.domain === UnitDomain.Land) {
        cost = terrainData.moveCostLand ?? 999;
    } else if (unitStats.domain === UnitDomain.Naval) {
        cost = terrainData.moveCostNaval ?? 999;
    }

    if (unitStats.move === 1 || unit.type === UnitType.Titan) {
        cost = 1;
    }

    if (unit.movesLeft < cost) {
        throw new Error("Not enough movement");
    }

    return cost;
}

export function validateTileOccupancy(state: GameState, target: HexCoord, movers: MoveParticipant[], playerId: string) {
    const unitsOnTile = state.units.filter(u => hexEquals(u.coord, target));
    let friendlyMilitaryOnTile = unitsOnTile.filter(u => u.ownerId === playerId && UNITS[u.type].domain !== UnitDomain.Civilian).length;
    let friendlyCivilianOnTile = unitsOnTile.filter(u => u.ownerId === playerId && UNITS[u.type].domain === UnitDomain.Civilian).length;
    const enemyUnitsOnTile = unitsOnTile.filter(u => u.ownerId !== playerId);

    const hasEnemyMilitary = enemyUnitsOnTile.some(u => UNITS[u.type].domain !== UnitDomain.Civilian);
    const hasEnemyUnit = enemyUnitsOnTile.length > 0;
    const cityOnTile = state.cities.find(c => hexEquals(c.coord, target));
    const isEnemyCityTile = cityOnTile && cityOnTile.ownerId !== playerId;

    for (const mover of movers) {
        const isMilitary = mover.stats.domain !== UnitDomain.Civilian;
        if (isMilitary) {
            if (hasEnemyMilitary) {
                // Exception: If it's an enemy city with <= 0 HP, and we can capture it, we can ignore the enemy military (it will be removed)
                const targetCity = state.cities.find(c => hexEquals(c.coord, target));
                const canCapture = mover.stats.canCaptureCity;
                const isVulnerableCity = targetCity && targetCity.ownerId !== playerId && targetCity.hp <= 0;

                if (isVulnerableCity && canCapture) {
                    // Allowed
                } else {
                    console.log(`[VALIDATION FAIL] Enemy military on tile ${target.q},${target.r}. Units: ${unitsOnTile.map(u => u.type).join(",")}`);
                    throw new Error("Tile occupied by military unit");
                }
            }
            if (friendlyMilitaryOnTile > 0) {
                console.log(`[VALIDATION FAIL] Friendly military on tile ${target.q},${target.r}. Units: ${unitsOnTile.map(u => u.type).join(",")}. Movers: ${movers.length}`);
                throw new Error("Tile occupied by military unit");
            }
            friendlyMilitaryOnTile += 1;
        } else {
            if (friendlyCivilianOnTile > 0) throw new Error("Tile occupied by civilian unit");
            if (hasEnemyUnit) throw new Error("Cannot enter enemy tile");
            friendlyCivilianOnTile += 1;
        }
    }

    // Peacetime movement restriction
    const tile = state.map.tiles.find(t => hexEquals(t.coord, target));
    if (tile && tile.ownerId && tile.ownerId !== playerId) {
        const diplomacy = state.diplomacy[playerId]?.[tile.ownerId];
        // Allow entering enemy city tiles to resolve capture logic (hp/canCapture checks happen later).
        if (!isEnemyCityTile && diplomacy !== "War") {
            console.log(`[VALIDATION FAIL] Peacetime block: ${playerId} -> ${tile.ownerId} (Diplomacy: ${diplomacy})`);
            throw new Error("Cannot enter enemy territory during peacetime");
        }
    }
}

export function executeUnitMove(state: GameState, unit: Unit, context: MoveContext, destination: HexCoord, playerId: string) {
    const unitsOnTile = state.units.filter(u => hexEquals(u.coord, destination));

    unit.coord = destination;
    unit.movesLeft -= context.cost;
    unit.state = UnitState.Normal;

    if (context.isMilitary) {
        const enemyCivilian = unitsOnTile.find(u => u.ownerId !== playerId && UNITS[u.type].domain === UnitDomain.Civilian);
        if (enemyCivilian) {
            ensureWar(state, playerId, enemyCivilian.ownerId);
            state.units = state.units.filter(u => u.id !== enemyCivilian.id);
            state.units.push({
                id: `u_${playerId}_captured_${Date.now()}`,
                type: enemyCivilian.type,
                ownerId: playerId,
                coord: destination,
                hp: 1,
                maxHp: 1,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
            });
        }
    }

    const cityOnTile = state.cities.find(c => hexEquals(c.coord, destination));
    if (cityOnTile && cityOnTile.ownerId !== playerId) {
        if (cityOnTile.hp > 0) throw new Error("City not capturable");
        if (!context.stats.canCaptureCity) throw new Error("Unit cannot capture cities");

        // Remove any enemy units (garrison) that might still be there
        const enemyUnits = state.units.filter(u => hexEquals(u.coord, destination) && u.ownerId !== playerId);
        for (const enemy of enemyUnits) {
            unlinkPair(enemy, resolveLinkedPartner(state, enemy));
            state.units = state.units.filter(u => u.id !== enemy.id);
        }

        ensureWar(state, playerId, cityOnTile.ownerId);
        captureCity(state, cityOnTile, playerId);
    }
}

export function resolveLinkedPartner(state: GameState, unit: Unit): Unit | undefined {
    if (!unit.linkedUnitId) return undefined;
    const partner = state.units.find(u => u.id === unit.linkedUnitId);
    if (!partner) {
        unit.linkedUnitId = undefined;
        return undefined;
    }
    if (partner.linkedUnitId !== unit.id || partner.ownerId !== unit.ownerId) {
        unlinkPair(unit, partner);
        return undefined;
    }
    if (!hexEquals(unit.coord, partner.coord)) {
        unlinkPair(unit, partner);
        return undefined;
    }
    return partner;
}

export function unlinkPair(unit: Unit, partner?: Unit) {
    unit.linkedUnitId = undefined;
    if (partner && partner.linkedUnitId === unit.id) {
        partner.linkedUnitId = undefined;
    }
}

export function enforceLinkedUnitIntegrity(state: GameState) {
    const unitLookup = new Map<string, Unit>();
    state.units.forEach(u => unitLookup.set(u.id, u));

    state.units.forEach(unit => {
        if (!unit.linkedUnitId) return;
        const partner = unitLookup.get(unit.linkedUnitId);
        if (!partner || partner.linkedUnitId !== unit.id || partner.ownerId !== unit.ownerId || !hexEquals(unit.coord, partner.coord)) {
            unlinkPair(unit, partner);
        }
    });
}

export function expelUnitsFromTerritory(state: GameState, unitOwnerId: string, territoryOwnerId: string) {
    const unitsToExpel = state.units.filter(u => {
        if (u.ownerId !== unitOwnerId) return false;
        const tile = state.map.tiles.find(t => hexEquals(t.coord, u.coord));
        return tile && tile.ownerId === territoryOwnerId;
    });

    for (const unit of unitsToExpel) {
        // BFS to find nearest valid tile
        const visited = new Set<string>();
        const queue: HexCoord[] = [unit.coord];
        visited.add(`${unit.coord.q},${unit.coord.r}`);

        let foundDest: HexCoord | undefined;

        // Safety break
        let iterations = 0;
        const MAX_ITERATIONS = 500;

        while (queue.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            const current = queue.shift()!;

            // Check if this tile is valid
            const tile = state.map.tiles.find(t => hexEquals(t.coord, current));
            if (tile) {
                // Must be passable for unit domain
                const stats = UNITS[unit.type];
                const isLand = stats.domain === UnitDomain.Land;
                const isNaval = stats.domain === UnitDomain.Naval;

                let passable = true;
                if (isLand && (tile.terrain === "Coast" || tile.terrain === "DeepSea" || tile.terrain === "Mountain")) passable = false;
                if (isNaval && (tile.terrain !== "Coast" && tile.terrain !== "DeepSea")) passable = false;

                // Must NOT be owned by territoryOwnerId
                const isSafeTerritory = tile.ownerId !== territoryOwnerId;

                // Must be unoccupied (or occupied by friendly) - for simplicity, let's say unoccupied or friendly stacking allowed?
                // Actually, stacking rules are strict: 1 military, 1 civilian.
                // To be safe, let's look for completely empty tiles or tiles where we can stack.
                // For expulsion, let's just find an empty tile to avoid stacking complexity.
                const occupied = state.units.some(u => hexEquals(u.coord, current));

                if (passable && isSafeTerritory && !occupied) {
                    foundDest = current;
                    break;
                }
            }

            // Add neighbors
            const neighbors = getNeighbors(current);
            for (const n of neighbors) {
                const key = `${n.q},${n.r}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(n);
                }
            }
        }

        if (foundDest) {
            unit.coord = foundDest;
            unit.movesLeft = 0; // Exhaust movement after expulsion
            unit.autoMoveTarget = undefined;
            unit.isAutoExploring = false;
        }
    }
}
