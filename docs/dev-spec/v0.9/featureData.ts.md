import { FeatureType } from "../types/mapTypes";
import { Yields } from "../types/gameTypes";

export const FEATURE_YIELDS: Record<FeatureType, Yields> = {
  RiverEdge: {F:0, P:0, S:0}, // handled as adjacency bonus
  RichSoil:  {F:1, P:0, S:0},
  OreVein:   {F:0, P:1, S:0},
  SacredSite:{F:0, P:0, S:1},
};

export const RIVER_ADJACENCY_FOOD_BONUS = 1; // per river edge adjacent to tile