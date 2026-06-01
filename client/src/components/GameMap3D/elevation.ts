import { TerrainType } from "@simple-civ/engine";

const TERRAIN_RELIEF: Record<TerrainType, number> = {
    [TerrainType.DeepSea]: 0.04,
    [TerrainType.Coast]: 0.08,
    [TerrainType.Plains]: 0.14,
    [TerrainType.Marsh]: 0.16,
    [TerrainType.Desert]: 0.18,
    [TerrainType.Forest]: 0.22,
    [TerrainType.Hills]: 0.38,
    [TerrainType.Mountain]: 0.7,
};

export function getTerrainElevation(terrain: TerrainType): number {
    return TERRAIN_RELIEF[terrain];
}
