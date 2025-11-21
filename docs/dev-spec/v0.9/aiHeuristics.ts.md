export function scoreCitySite(tile:any, map:any): number {
  // CenterYieldValue + best3 nearby tiles + bonuses
  const centerY = effectiveYield(tile, map);
  const best3 = bestNearbyTiles(tile, map, 3).reduce((s,t)=>s+effectiveYield(t,map),0);
  const riverBonus = isRiverCity(tile, map) ? 1 : 0;
  const overlayBonus = countNearbyOverlays(tile, map, 2);
  return centerY + best3 + riverBonus + overlayBonus;
}

export function tileWorkingPriority(mode:"Progress"|"Conquest"|"Balanced", city:any): ("S"|"P"|"F")[] {
  if (mode==="Progress") return ["S","P","F"];
  if (mode==="Conquest") return ["P","F","S"];
  return ["F","P","S"];
}