import { GameState, HexCoord, Tile, Unit, UnitType } from "../../core/types.js";
import { UNITS, TERRAIN } from "../../core/constants.js";
import { TechId } from "../../core/types.js";
import { hexLine, hexToString } from "../../core/hex.js";

const MELEE_TYPES = new Set<UnitType>([
    UnitType.SpearGuard,
    UnitType.ArmySpearGuard,
    UnitType.Riders,
    UnitType.ArmyRiders,
]);

const RANGED_TYPES = new Set<UnitType>([
    UnitType.BowGuard,
    UnitType.ArmyBowGuard,
]);

export function getEffectiveUnitStats(unit: Unit, state: GameState) {
    const base = UNITS[unit.type];
    const player = state.players.find(p => p.id === unit.ownerId);
    if (!player) return base;
    const boosted = { ...base };

    if (player.techs.includes(TechId.FormationTraining) && MELEE_TYPES.has(unit.type)) {
        boosted.def += 1;
    }
    if (player.techs.includes(TechId.DrilledRanks) && (MELEE_TYPES.has(unit.type) || RANGED_TYPES.has(unit.type))) {
        boosted.atk += 1;
    }

    return boosted;
}

export function buildTileLookup(state: GameState): Map<string, Tile> {
    return new Map(state.map.tiles.map(t => [hexToString(t.coord), t]));
}

export function hasClearLineOfSight(state: GameState, from: HexCoord, target: HexCoord, lookup?: Map<string, Tile>): boolean {
    const tileByKey = lookup ?? buildTileLookup(state);
    const line = hexLine(from, target);
    for (let i = 1; i < line.length - 1; i++) {
        const key = hexToString(line[i]);
        const tile = tileByKey.get(key);
        if (!tile) return false;
        if (TERRAIN[tile.terrain].blocksLoS) return false;
    }
    return true;
}

