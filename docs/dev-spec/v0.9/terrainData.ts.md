import { TerrainType } from "../types/mapTypes";
import { Yields } from "../types/gameTypes";

export const TERRAIN_YIELDS: Record<TerrainType, Yields> = {
  Plains:   {F:1, P:1, S:0},
  Hills:    {F:0, P:2, S:0},
  Forest:   {F:1, P:1, S:0},
  Marsh:    {F:2, P:0, S:0},
  Desert:   {F:0, P:1, S:0},
  Mountain: {F:0, P:0, S:0},
  Coast:    {F:1, P:0, S:0},
  DeepSea:  {F:1, P:0, S:0},
};

export const TERRAIN_MOVE_COST_LAND: Record<TerrainType, number|null> = {
  Plains:1, Hills:2, Forest:2, Marsh:2, Desert:1,
  Mountain:null, Coast:null, DeepSea:null
};

export const TERRAIN_MOVE_COST_NAVAL: Record<TerrainType, number|null> = {
  Plains:null, Hills:null, Forest:null, Marsh:null, Desert:null,
  Mountain:null, Coast:1, DeepSea:1
};

export const TERRAIN_DEF_MOD: Record<TerrainType, number> = {
  Plains:0, Coast:0, DeepSea:0,
  Hills:2, Forest:1,
  Marsh:-1, Desert:-1,
  Mountain:0
};