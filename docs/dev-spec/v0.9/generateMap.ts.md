import { MAPGEN_BIASES } from "../data/mapGenParams";

export function generateMap(sizeKey:"Small"|"Standard"|"Large", rng:any): any {
  // 1) allocate hex grid
  // 2) place mountain clusters
  // 3) paint coast edges + sea
  // 4) fill land by weights
  // 5) sprinkle overlays low density
  // 6) generate rivers as edges
  return map;
}