import { describe, it, expect } from "vitest";
import { generateRivers } from "./generation/rivers.js";
import { WorldRng } from "./generation/seeding.js";
import { MAP_DIMS } from "../core/constants.js";
import { hexToString } from "../core/hex.js";
import { MapSize } from "../core/types.js";

function buildSyntheticMap(mapSize: MapSize) {
  const dims = MAP_DIMS[mapSize];
  const width = dims.width;
  const height = dims.height;
  const tiles: any[] = [];
  const tileMap = new Map<string, any>();
  for (let r = 0; r < height; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < width - rOffset; q++) {
      const coord = { q, r };
      const tile: any = { coord, terrain: "Plains", overlays: [] };
      const minQ = -rOffset;
      const maxQ = width - rOffset - 1;
      const isOuter = r === 0 || r === height - 1 || q === minQ || q === maxQ;
      const isCoast = r === 1 || r === height - 2 || q === minQ + 1 || q === maxQ - 1;
      if (isOuter) tile.terrain = "DeepSea";
      else if (isCoast) tile.terrain = "Coast";
      else if ((q + r) % 4 === 0) tile.terrain = "Hills";
      else if ((q + r) % 4 === 1) tile.terrain = "Forest";
      tiles.push(tile);
      tileMap.set(hexToString(coord), tile);
    }
  }
  const getTile = (coord: { q: number; r: number }) => tileMap.get(hexToString(coord));
  const isLand = (t: any) => !!t && t.terrain !== "Mountain" && t.terrain !== "DeepSea" && t.terrain !== "Coast";
  return { tiles, getTile, isLand };
}

describe("river polyline snapshots", () => {
  it("matches corner/mouth layout for synthetic Small map seed 12345", () => {
    const { tiles, getTile, isLand } = buildSyntheticMap("Small");
    const rng = new WorldRng(12345);
    const result = generateRivers({
      tiles,
      mapSize: "Small",
      rng,
      getTile: getTile as any,
      isLand,
      options: { usePathfinderModule: true, collectMetrics: true },
    });

    const summary = result.riverPolylines.map(pl =>
      pl.map(seg => ({
        tile: seg.tile,
        corners: [seg.cornerA, seg.cornerB],
        mouth: seg.isMouth,
      })),
    );

    expect(summary).toMatchInlineSnapshot(`
          [
            [
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 5,
                  "r": 7,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 6,
                  "r": 6,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 6,
                  "r": 6,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 6,
                  "r": 6,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 5,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 5,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 4,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 4,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 4,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 3,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 3,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 3,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 8,
                  "r": 2,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": true,
                "tile": {
                  "q": 8,
                  "r": 2,
                },
              },
            ],
            [
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 7,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 7,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 7,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 7,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 6,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 6,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 6,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 5,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 5,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 5,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 5,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 5,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 5,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 14,
                  "r": 5,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 14,
                  "r": 5,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": true,
                "tile": {
                  "q": 14,
                  "r": 5,
                },
              },
            ],
            [
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 5,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 6,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 6,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 6,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 1,
                  "r": 7,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 1,
                  "r": 7,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 1,
                  "r": 7,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 0,
                  "r": 8,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 0,
                  "r": 8,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": -1,
                  "r": 8,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": -1,
                  "r": 8,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": -1,
                  "r": 8,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": -1,
                  "r": 7,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": true,
                "tile": {
                  "q": -1,
                  "r": 7,
                },
              },
            ],
            [
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 3,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 3,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 3,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 4,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 4,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 4,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 4,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 4,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 3,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 3,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 3,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 2,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": true,
                "tile": {
                  "q": 12,
                  "r": 2,
                },
              },
            ],
          ]
        `);
  });
  it("matches corner/mouth layout for synthetic Standard map seed 98765", () => {
    const { tiles, getTile, isLand } = buildSyntheticMap("Standard");
    const rng = new WorldRng(98765);
    const result = generateRivers({
      tiles,
      mapSize: "Standard",
      rng,
      getTile: getTile as any,
      isLand,
      options: { usePathfinderModule: true },
    });

    const summary = result.riverPolylines.map(pl =>
      pl.map(seg => ({
        tile: seg.tile,
        corners: [seg.cornerA, seg.cornerB],
        mouth: seg.isMouth,
      })),
    );

    expect(summary).toMatchInlineSnapshot(`
          [
            [
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 4,
                  "r": 8,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 9,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 9,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 9,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 10,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 10,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 10,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 11,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 11,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 11,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 12,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 12,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 13,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 13,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 13,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 1,
                  "r": 14,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 1,
                  "r": 14,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": true,
                "tile": {
                  "q": 1,
                  "r": 14,
                },
              },
            ],
            [
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 8,
                  "r": 8,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 7,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 7,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 7,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 6,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 6,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 6,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 5,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 5,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 5,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 4,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 4,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 4,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 3,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 3,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 3,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 2,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": true,
                "tile": {
                  "q": 13,
                  "r": 2,
                },
              },
            ],
            [
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 9,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 9,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 9,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 9,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 9,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 9,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 14,
                  "r": 8,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 14,
                  "r": 8,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 14,
                  "r": 8,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 15,
                  "r": 7,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 15,
                  "r": 7,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 15,
                  "r": 7,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 16,
                  "r": 7,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 16,
                  "r": 7,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 17,
                  "r": 6,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": true,
                "tile": {
                  "q": 17,
                  "r": 6,
                },
              },
            ],
            [
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 3,
                  "r": 5,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 6,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 6,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 2,
                  "r": 6,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 1,
                  "r": 7,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 1,
                  "r": 7,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 1,
                  "r": 7,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 0,
                  "r": 8,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 0,
                  "r": 8,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": -1,
                  "r": 8,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": -1,
                  "r": 8,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": -1,
                  "r": 8,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": -1,
                  "r": 7,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": true,
                "tile": {
                  "q": -1,
                  "r": 7,
                },
              },
            ],
            [
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 8,
                  "r": 4,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 4,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 4,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 7,
                  "r": 4,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 6,
                  "r": 4,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 6,
                  "r": 4,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 6,
                  "r": 4,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 5,
                  "r": 4,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 5,
                  "r": 4,
                },
              },
              {
                "corners": [
                  2,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 5,
                  "r": 3,
                },
              },
              {
                "corners": [
                  1,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 5,
                  "r": 3,
                },
              },
              {
                "corners": [
                  0,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 5,
                  "r": 3,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 6,
                  "r": 2,
                },
              },
              {
                "corners": [
                  4,
                  5,
                ],
                "mouth": false,
                "tile": {
                  "q": 6,
                  "r": 2,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": true,
                "tile": {
                  "q": 6,
                  "r": 2,
                },
              },
            ],
            [
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 13,
                  "r": 11,
                },
              },
              {
                "corners": [
                  5,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 12,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 12,
                  "r": 12,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 12,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 12,
                },
              },
              {
                "corners": [
                  3,
                  4,
                ],
                "mouth": false,
                "tile": {
                  "q": 11,
                  "r": 12,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 12,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 12,
                },
              },
              {
                "corners": [
                  2,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 10,
                  "r": 12,
                },
              },
              {
                "corners": [
                  5,
                  0,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 13,
                },
              },
              {
                "corners": [
                  0,
                  1,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 13,
                },
              },
              {
                "corners": [
                  1,
                  2,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 13,
                },
              },
              {
                "corners": [
                  4,
                  3,
                ],
                "mouth": false,
                "tile": {
                  "q": 9,
                  "r": 14,
                },
              },
              {
                "corners": [
                  3,
                  2,
                ],
                "mouth": true,
                "tile": {
                  "q": 9,
                  "r": 14,
                },
              },
            ],
          ]
        `);
  });

  it("maintains river overlay counts across sizes", () => {
    const cases: Array<{ mapSize: MapSize; seed: number; expected: number }> = [
      { mapSize: "Small", seed: 12345, expected: 44 },
      { mapSize: "Standard", seed: 98765, expected: 81 },
      { mapSize: "Large", seed: 54321, expected: 135 },
    ];

    for (const { mapSize, seed, expected } of cases) {
      const { tiles, getTile, isLand } = buildSyntheticMap(mapSize);
      const rng = new WorldRng(seed);
      generateRivers({
        tiles,
        mapSize,
        rng,
        getTile: getTile as any,
        isLand,
        options: { usePathfinderModule: true },
      });
      const overlayCount = tiles.filter(t => t.overlays.includes("RiverEdge")).length;
      expect(overlayCount).toBe(expected);
    }
  });
});
