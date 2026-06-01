import { describe, expect, it } from "vitest";
import { TerrainType, Tile } from "@simple-civ/engine";
import { createTerrainElevationLookup, getTerrainElevation } from "./elevation";

describe("3D board terrain elevation", () => {
    it("grounds tokens against the relief of their tile", () => {
        const getGroundElevation = createTerrainElevationLookup([
            { coord: { q: 2, r: -1 }, terrain: TerrainType.Mountain } as Tile,
            { coord: { q: 3, r: -1 }, terrain: TerrainType.Coast } as Tile,
        ]);

        expect(getGroundElevation({ q: 2, r: -1 })).toBe(getTerrainElevation(TerrainType.Mountain));
        expect(getGroundElevation({ q: 3, r: -1 })).toBe(getTerrainElevation(TerrainType.Coast));
        expect(getGroundElevation({ q: 99, r: 99 })).toBe(getTerrainElevation(TerrainType.Plains));
    });
});
