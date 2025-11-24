import { GameState, HexCoord, Tile, Unit, UnitDomain, UnitState, TerrainType, UnitType } from "../../core/types.js";
import { TERRAIN, UNITS } from "../../core/constants.js";
import type { UnitStats } from "../../core/constants.js";
import { hexEquals } from "../../core/hex.js";
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

    for (const mover of movers) {
        const isMilitary = mover.stats.domain !== UnitDomain.Civilian;
        if (isMilitary) {
            if (hasEnemyMilitary) throw new Error("Tile occupied by military unit");
            if (friendlyMilitaryOnTile > 0) throw new Error("Tile occupied by military unit");
            friendlyMilitaryOnTile += 1;
        } else {
            if (friendlyCivilianOnTile > 0) throw new Error("Tile occupied by civilian unit");
            if (hasEnemyUnit) throw new Error("Cannot enter enemy tile");
            friendlyCivilianOnTile += 1;
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

