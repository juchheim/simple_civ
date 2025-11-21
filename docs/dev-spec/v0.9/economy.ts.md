import { City } from "../types/cityTypes";
import { Yields } from "../types/gameTypes";
import { BUILDING_EFFECTS } from "../data/buildingData";
import { FEATURE_YIELDS, RIVER_ADJACENCY_FOOD_BONUS } from "../data/featureData";
import { TERRAIN_YIELDS } from "../data/terrainData";
import { BASE_COST_2, GROWTH_FACTORS } from "../data/growthTable";

export function computeTileYield(tile:any, riverAdjacencyCount:number, civCtx:any): Yields {
  let y = {...TERRAIN_YIELDS[tile.terrain]};

  for (const f of tile.features) {
    const add = FEATURE_YIELDS[f];
    y.F += add.F; y.P += add.P; y.S += add.S;
  }

  // river adjacency
  y.F += riverAdjacencyCount * RIVER_ADJACENCY_FOOD_BONUS;

  // civ trait tile effects (if any)
  if (civCtx?.trait?.applyTileYieldBonus) {
    const bonus = civCtx.trait.applyTileYieldBonus({tile, civCtx});
    y.F += bonus.F; y.P += bonus.P; y.S += bonus.S;
  }

  return y;
}

export function computeCityCenterYield(centerTile:any, baseY: Yields, civCtx:any): Yields {
  let y = {...baseY};

  // minimums
  if (y.F < 2) y.F = 2;
  if (y.P < 1) y.P = 1;

  // civ trait city-center effects
  if (civCtx?.trait?.applyTileYieldBonus) {
    const bonus = civCtx.trait.applyTileYieldBonus({tile:centerTile, civCtx, isCenter:true});
    y.F += bonus.F; y.P += bonus.P; y.S += bonus.S;
  }

  return y;
}

export function computeCityYields(city:City, tiles:any[], civCtx:any): { total:Yields, byTile:Map<string,Yields> } {
  let total: Yields = {F:0,P:0,S:0};
  const byTile = new Map<string,Yields>();

  for (const coord of city.workedTiles) {
    const tile = tiles.find((t:any)=> sameCoord(t.coord, coord));
    const riverAdj = getRiverAdjacencyCount(tile.coord, civCtx.map.rivers);

    let y = computeTileYield(tile, riverAdj, civCtx);

    // if tile is center, apply minimums
    if (sameCoord(coord, city.coord)) {
      y = computeCityCenterYield(tile, y, civCtx);
    }

    byTile.set(key(coord), y);
    total.F += y.F; total.P += y.P; total.S += y.S;
  }

  // base science per city
  total.S += 1;

  // building yield bonuses
  for (const b of city.buildings) {
    const eff = (BUILDING_EFFECTS as any)[b];
    if (eff?.cityYields) {
      total.F += eff.cityYields.F ?? 0;
      total.P += eff.cityYields.P ?? 0;
      total.S += eff.cityYields.S ?? 0;
    }
    if (b==="Reservoir" && isRiverCity(city, civCtx.map.rivers)) {
      total.F += eff.riverCityBonusF ?? 0;
    }
    if (b==="LumberMill" && cityWorksTerrain(city, tiles, "Forest")) {
      total.P += eff.forestWorkedBonusP ?? 0;
    }
  }

  // civ trait city-wide effects
  if (civCtx?.trait?.applyCityYieldBonus) {
    const bonus = civCtx.trait.applyCityYieldBonus({city, civCtx});
    total.F += bonus.F; total.P += bonus.P; total.S += bonus.S;
  }

  // tech passives (science per city etc.) handled at empire layer
  return {total, byTile};
}

export function growthCostBase(targetPop:number): number {
  if (targetPop === 2) return BASE_COST_2;

  let cost = BASE_COST_2;
  for (let n=3; n<=targetPop; n++) {
    const f = factorForPop(n);
    cost = Math.ceil(cost * f);
  }
  return cost;
}

export function actualGrowthCost(city:City): number {
  const targetPop = city.pop + 1;
  let cost = growthCostBase(targetPop);
  if (city.buildings.has("Farmstead" as any)) {
    cost = Math.ceil(cost * 0.9);
  }
  return cost;
}

export function applyGrowth(city:City, foodYield:number): void {
  city.storedFood += foodYield;
  while (city.storedFood >= actualGrowthCost(city)) {
    const cost = actualGrowthCost(city);
    city.storedFood -= cost;
    city.pop += 1;
    // workedTiles reassign is a Planning concern; engine may auto-fill temporarily
  }
}

export function applyProduction(city:City, prodYield:number): void {
  if (!city.currentBuild) return;
  city.currentBuild.investedP += prodYield;

  if (city.currentBuild.investedP >= city.currentBuild.costP) {
    city.currentBuild.finished = true;
    city.storedProd = city.currentBuild.investedP - city.currentBuild.costP;
  }
}