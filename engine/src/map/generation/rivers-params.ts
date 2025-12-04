import { MapSize } from "../../core/types.js";

export type RiverGenParams = {
    MAX_COAST_ENTRY_ATTEMPTS: number;
    COAST_BAND_ALLOWANCE: number;
    MAX_COAST_BAND_STREAK: number;
    MAX_SHORELINE_PLATEAU: number;
    MAX_RIVER_SEARCH_STATES: number;
    elevationThreshold: number;
    minStartSpacing: number;
    minRiverLength: number;
    minStartCoastDistance: number;
    riverTargetsBySize: Record<MapSize, [number, number]>;
};

export const RIVER_PARAMS: RiverGenParams = {
    MAX_COAST_ENTRY_ATTEMPTS: 12,
    COAST_BAND_ALLOWANCE: 5,
    MAX_COAST_BAND_STREAK: 4,
    MAX_SHORELINE_PLATEAU: 1,
    MAX_RIVER_SEARCH_STATES: 1500,
    elevationThreshold: 3,
    minStartSpacing: 4,
    minRiverLength: 4,
    minStartCoastDistance: 2,
    riverTargetsBySize: {
        Tiny: [2, 4],
        Small: [4, 7],
        Standard: [8, 13],
        Large: [10, 15],
        Huge: [14, 20],
    },
};
