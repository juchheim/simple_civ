import { City, GameState, TerrainType, UnitType, getTileYields } from "@simple-civ/engine";
import { describe, expect, it } from "vitest";
import {
    computeTileYieldsWithCivBonuses,
    createCitiesByCoord,
    createPlayerColorMap,
    createPlayersById,
    splitUnitRenderDataByCity,
    toCoordKey
} from "./render-data-helpers";

function makePlayer(id: string, civName: string, color: string) {
    return { id, civName, color } as GameState["players"][number];
}

describe("render-data-helpers", () => {
    it("creates stable coordinate keys and map lookups", () => {
        const cityA = {
            id: "c1",
            coord: { q: 0, r: 1 },
            ownerId: "p1",
        } as unknown as City;
        const cityB = {
            id: "c2",
            coord: { q: -2, r: 3 },
            ownerId: "p2",
        } as unknown as City;

        expect(toCoordKey({ q: 4, r: -1 })).toBe("4,-1");

        const cityMap = createCitiesByCoord([cityA, cityB]);
        expect(cityMap.get("0,1")?.id).toBe("c1");
        expect(cityMap.get("-2,3")?.id).toBe("c2");
    });

    it("creates player maps for civ ownership and colors", () => {
        const players = [
            makePlayer("p1", "RiverLeague", "#f00"),
            makePlayer("p2", "ForgeClans", "#0ff"),
        ];
        const playersById = createPlayersById(players);
        const colorMap = createPlayerColorMap(players);

        expect(playersById.get("p1")?.civName).toBe("RiverLeague");
        expect(colorMap.get("p2")).toBe("#0ff");
    });

    it("applies RiverLeague and ForgeClans yield bonuses", () => {
        const playersById = createPlayersById([
            makePlayer("p1", "RiverLeague", "#f00"),
            makePlayer("p2", "ForgeClans", "#0ff"),
        ]);

        const riverTile = {
            coord: { q: 0, r: 0 },
            terrain: TerrainType.Plains,
            overlays: [],
            ownerId: "p1",
        };
        const hillTile = {
            coord: { q: 1, r: 0 },
            terrain: TerrainType.Hills,
            overlays: [],
            ownerId: "p2",
        };
        const map = {
            width: 2,
            height: 1,
            tiles: [riverTile, hillTile],
            rivers: [{ a: { q: 0, r: 0 }, b: { q: 1, r: 0 } }],
        } as GameState["map"];

        const riverBase = getTileYields(riverTile);
        const riverBoosted = computeTileYieldsWithCivBonuses({
            tile: riverTile,
            playerId: "p1",
            playersById,
            map,
        });
        expect(riverBoosted.F).toBe(riverBase.F + 1);
        expect(riverBoosted.P).toBe(riverBase.P);

        const hillBase = getTileYields(hillTile);
        const hillBoosted = computeTileYieldsWithCivBonuses({
            tile: hillTile,
            playerId: "p1",
            playersById,
            map,
        });
        expect(hillBoosted.P).toBe(hillBase.P + 1);
        expect(hillBoosted.F).toBe(hillBase.F);
    });

    it("splits unit render data by city occupancy", () => {
        const unitRenderData = [
            {
                unit: { id: "u1", type: UnitType.SpearGuard },
                isOnCityHex: true,
            },
            {
                unit: { id: "u2", type: UnitType.Scout },
                isOnCityHex: false,
            },
        ] as unknown as Parameters<typeof splitUnitRenderDataByCity>[0];

        const split = splitUnitRenderDataByCity(unitRenderData);
        expect(split.unitRenderDataOnCity).toHaveLength(1);
        expect(split.unitRenderDataOffCity).toHaveLength(1);
        expect(split.unitRenderDataOnCity[0].unit.id).toBe("u1");
        expect(split.unitRenderDataOffCity[0].unit.id).toBe("u2");
    });
});
