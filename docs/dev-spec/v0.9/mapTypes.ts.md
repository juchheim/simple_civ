export enum TerrainType {
  Plains="Plains",
  Hills="Hills",
  Forest="Forest",
  Marsh="Marsh",
  Desert="Desert",
  Mountain="Mountain",
  Coast="Coast",
  DeepSea="DeepSea",
}

export enum FeatureType {
  RiverEdge="RiverEdge",     // edge-adjacent; represented separately
  RichSoil="RichSoil",
  OreVein="OreVein",
  SacredSite="SacredSite",
}

export type TileCoord = { q:number; r:number }; // axial hex coords

export type Tile = {
  coord: TileCoord;
  terrain: TerrainType;
  features: FeatureType[]; // excludes rivers; rivers stored as edges
  ownerCityId?: string;    // no shared tiles
  hasCityCenter?: boolean;
  unitId?: string;         // max 1 military; settler stacking handled in rules
};

export type RiverEdge = {
  a: TileCoord;
  b: TileCoord; // adjacent coord
};