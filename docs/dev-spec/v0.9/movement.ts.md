import { TERRAIN_MOVE_COST_LAND, TERRAIN_MOVE_COST_NAVAL } from "../data/terrainData";
import { UNIT_STATS } from "../data/unitData";

export function movementCost(unit:any, terrain:any): number|null {
  const domain = UNIT_STATS[unit.type].domain;
  return domain==="Land"
    ? TERRAIN_MOVE_COST_LAND[terrain.terrain]
    : TERRAIN_MOVE_COST_NAVAL[terrain.terrain];
}

export function canEnterTile(unit:any, tile:any, game:any): boolean {
  const cost = movementCost(unit, tile);
  if (cost === null) return false;

  // enemy blocking
  if (tile.unitId && game.units[tile.unitId].ownerPlayerId !== unit.ownerPlayerId) return false;

  // stacking rules checked elsewhere (military count, settler share)
  return true;
}