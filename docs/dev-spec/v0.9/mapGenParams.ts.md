export const MAP_SIZES = {
  Small:    {width:16, height:12},
  Standard: {width:20, height:14},
  Large:    {width:24, height:18},
};

export const START_GUARANTEES = {
  radiusFoodProd: 2,
  radiusSettlement: 1,
  minEffectiveFoodTile: 2,
  minEffectiveProdTile: 2,
  minCapitalDistance: 6,
  maxStartRetries: 50
};

export const MAPGEN_BIASES = {
  mountainClusters: [2,3],
  coastEdges: [1,2],
  terrainWeights: {
    Plains: 0.35,
    Forest: 0.25,
    Hills: 0.20,
    Marsh: 0.10,
    Desert: 0.10
  },
  overlaysLowDensity: true
};