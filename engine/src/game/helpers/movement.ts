import { aiLog, aiInfo } from "../ai/debug-logging.js";
import { GameState, HexCoord, OverlayType, Tile, Unit, UnitDomain, UnitState, TerrainType, UnitType } from "../../core/types.js";
import { TERRAIN, UNITS } from "../../core/constants.js";
import type { UnitStats } from "../../core/constants.js";
import { hexEquals, getNeighbors, hexToString, hexDistance } from "../../core/hex.js";
import { captureCity } from "./cities.js";
import { ensureWar } from "./diplomacy.js";
import { buildTileLookup, getUnitMaxMoves } from "./combat.js";
import { collectGoodieHut } from "./goodie-huts.js";

export type MoveContext = {
    stats: UnitStats;
    cost: number;
    isMilitary: boolean;
};

export type MoveParticipant = {
    unit: Unit;
    stats: UnitStats;
};

export function createMoveContext(unit: Unit, targetTile: Tile, state?: GameState): MoveContext {
    const stats = { ...UNITS[unit.type] };
    if (state) {
        stats.move = getUnitMaxMoves(unit, state);
    }
    ensureTerrainEntry(stats, targetTile, unit.type);
    const cost = computeMoveCost(unit, stats, targetTile);
    return {
        stats,
        cost,
        isMilitary: stats.domain !== UnitDomain.Civilian,
    };
}

export function ensureTerrainEntry(unitStats: UnitStats, targetTile: Tile, unitType?: UnitType) {
    if (unitStats.domain === UnitDomain.Land && (targetTile.terrain === TerrainType.Coast || targetTile.terrain === TerrainType.DeepSea)) {
        throw new Error("Land units cannot enter water");
    }
    if (unitStats.domain === UnitDomain.Naval && (targetTile.terrain !== TerrainType.Coast && targetTile.terrain !== TerrainType.DeepSea)) {
        throw new Error("Naval units cannot enter land");
    }
    // v6.0: Air Domain - can go anywhere, but respecting map borders implicitly by valid tiles
    if (unitStats.domain === UnitDomain.Air) {
        return; // Valid everywhere
    }

    // Skiff is restricted to Coast only (no DeepSea)
    if (unitType === UnitType.Skiff && targetTile.terrain === TerrainType.DeepSea) {
        throw new Error("Skiff can only traverse coastal waters");
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
    } else if (unitStats.domain === UnitDomain.Air) {
        cost = 1; // Air units ignore terrain cost
    }

    // v1.1 Nerf: Titans no longer ignore terrain costs -> REVERTED: Titans ignore terrain costs again
    if (unitStats.move === 1 || unit.type === UnitType.Titan) {
        cost = 1;
    }

    if (unit.movesLeft < cost) {
        throw new Error("Not enough movement");
    }

    return cost;
}

export function validateTileOccupancy(state: GameState, target: HexCoord, movers: MoveParticipant[], playerId: string, tileLookup?: Map<string, Tile>) {
    const tilesByKey = tileLookup ?? buildTileLookup(state);
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
                const targetCity = cityOnTile ?? state.cities.find(c => hexEquals(c.coord, target));
                const canCapture = mover.stats.canCaptureCity;
                const isVulnerableCity = targetCity && targetCity.ownerId !== playerId && targetCity.hp <= 0;

                if (isVulnerableCity && canCapture) {
                    // Allowed
                } else {
                    aiLog(`[VALIDATION FAIL] Enemy military on tile ${target.q},${target.r}. Units: ${unitsOnTile.map(u => u.type).join(",")}`);
                    throw new Error("Tile occupied by military unit");
                }
            }
            if (friendlyMilitaryOnTile > 0) {
                aiLog(`[VALIDATION FAIL] Friendly military on tile ${target.q},${target.r}. Units: ${unitsOnTile.map(u => u.type).join(",")}. Movers: ${movers.length}`);
                throw new Error("Tile occupied by military unit");
            }
            friendlyMilitaryOnTile += 1;
        } else {
            if (friendlyCivilianOnTile > 0) throw new Error("Tile occupied by civilian unit");
            if (hasEnemyUnit) throw new Error("Cannot enter enemy tile");
            // Civilians cannot enter enemy city tiles
            if (isEnemyCityTile) throw new Error("Cannot enter enemy city");
            friendlyCivilianOnTile += 1;
        }
    }

    // Peacetime movement restriction
    const tile = tilesByKey.get(hexToString(target));
    if (tile && tile.ownerId && tile.ownerId !== playerId) {
        // Check if the tile is visible to the player
        const tileKey = hexToString(target);
        const playerVisibility = state.visibility[playerId] || [];
        const isVisible = playerVisibility.includes(tileKey);

        // Only enforce peacetime border restrictions if the tile is visible
        // This allows optimistic movement into fog of war (consistent with pathfinding)
        if (isVisible) {
            const diplomacy = state.diplomacy[playerId]?.[tile.ownerId];
            // Allow entering enemy city tiles to resolve capture logic (hp/canCapture checks happen later).
            if (!isEnemyCityTile && diplomacy !== "War") {
                aiLog(`[VALIDATION FAIL] Peacetime block: ${playerId} -> ${tile.ownerId} (Diplomacy: ${diplomacy})`);
                throw new Error("Cannot enter enemy territory during peacetime");
            }
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
            // Generate unique ID using seed
            const rand = Math.floor(state.seed * 10000);
            state.seed = (state.seed * 9301 + 49297) % 233280;
            state.units.push({
                id: `u_${playerId}_captured_${Date.now()}_${rand}`,
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
        // v1.8: Exclude Air domain units - they float above the battle
        const enemyUnits = state.units.filter(u =>
            hexEquals(u.coord, destination) &&
            u.ownerId !== playerId &&
            UNITS[u.type].domain !== UnitDomain.Air
        );
        for (const enemy of enemyUnits) {
            unlinkPair(enemy, resolveLinkedPartner(state, enemy));
            state.units = state.units.filter(u => u.id !== enemy.id);
        }

        ensureWar(state, playerId, cityOnTile.ownerId);
        captureCity(state, cityOnTile, playerId);

        // Track Titan / deathball captures for AetherianVanguard analysis.
        // NOTE: `handleAttack` already tracks these when capture happens via Attack.
        // Captures that occur via movement onto a 0-HP city tile must also be tracked here.
        const player = state.players.find(p => p.id === playerId);
        if (player && player.civName === "AetherianVanguard") {
            if (!player.titanStats) {
                player.titanStats = { kills: 0, cityCaptures: 0, deathballCaptures: 0, totalSupportAtCaptures: 0, escortsMarkedTotal: 0, escortsAtCaptureTotal: 0, totalMilitaryAtCaptures: 0, supportByCapture: [] };
            }
            if (unit.type === UnitType.Titan) {
                player.titanStats.cityCaptures++;

                // Count support units near the captured city for deathball analysis
                // v6.6i: Range 4 to match safe staging distance (escorts at 2-4)
                const nearbyMilitary = state.units.filter(u =>
                    u.ownerId === playerId &&
                    u.id !== unit.id &&
                    UNITS[u.type].domain !== UnitDomain.Civilian &&
                    hexDistance(u.coord, cityOnTile.coord) <= 4
                );
                const supportCount = nearbyMilitary.length;
                const escortCount = nearbyMilitary.filter(u => u.isTitanEscort).length;

                player.titanStats.totalSupportAtCaptures += supportCount;
                player.titanStats.escortsAtCaptureTotal += escortCount;
                player.titanStats.totalMilitaryAtCaptures += supportCount + 1; // +1 for Titan
                player.titanStats.supportByCapture.push(supportCount); // v6.6j: Track per-capture
            } else {
                player.titanStats.deathballCaptures++;
            }
        }
    }

    // Check for goodie hut on destination tile
    const destTile = state.map.tiles.find(t => hexEquals(t.coord, destination));
    if (destTile && destTile.overlays.includes(OverlayType.GoodieHut)) {
        collectGoodieHut(state, destTile, playerId, destination);
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
    const tilesByKey = buildTileLookup(state);
    const occupiedKeys = new Set(state.units.map(u => hexToString(u.coord)));
    const unitsToExpel = state.units.filter(u => {
        if (u.ownerId !== unitOwnerId) return false;
        const tile = tilesByKey.get(hexToString(u.coord));
        return tile && tile.ownerId === territoryOwnerId;
    });

    for (const unit of unitsToExpel) {
        // BFS to find nearest valid tile
        const visited = new Set<string>();
        const queue: HexCoord[] = [unit.coord];
        const originKey = hexToString(unit.coord);
        visited.add(originKey);

        let foundDest: HexCoord | undefined;

        // Safety break
        let iterations = 0;
        const MAX_ITERATIONS = 500;

        while (queue.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            const current = queue.shift()!;

            // Check if this tile is valid
            const key = hexToString(current);
            const tile = tilesByKey.get(key);
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
                const occupied = occupiedKeys.has(key);

                if (passable && isSafeTerritory && !occupied) {
                    foundDest = current;
                    break;
                }
            }

            // Add neighbors
            const neighbors = getNeighbors(current);
            for (const n of neighbors) {
                const nKey = hexToString(n);
                if (!visited.has(nKey)) {
                    visited.add(nKey);
                    queue.push(n);
                }
            }
        }

        if (foundDest) {
            const destKey = hexToString(foundDest);
            occupiedKeys.delete(originKey);
            occupiedKeys.add(destKey);
            unit.coord = foundDest;
            unit.movesLeft = 0; // Exhaust movement after expulsion
            unit.autoMoveTarget = undefined;
            unit.isAutoExploring = false;
        }
    }
}
