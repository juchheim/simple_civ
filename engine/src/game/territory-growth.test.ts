import { describe, it, expect } from "vitest";
import { applyAction } from "./turn-loop.js";
import { advancePlayerTurn } from "./turn-lifecycle.js";
import { OverlayType, PlayerPhase, TerrainType, UnitType } from "../core/types.js";
import { claimCityTerritory, ensureWorkedTiles } from "./helpers/cities.js";
import { hexEquals } from "../core/hex.js";

type HexCoord = { q: number; r: number };

function hex(q: number, r: number): HexCoord {
    return { q, r };
}

function baseState() {
    return {
        id: "g",
        turn: 1,
        players: [
            { id: "p", civName: "ForgeClans", color: "#fff", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "p",
        phase: PlayerPhase.Planning,
        map: { width: 5, height: 5, tiles: [] as any[], rivers: [] as { a: HexCoord; b: HexCoord }[] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    };
}

describe("city territory growth", () => {
    it("claims center + ring 1 on founding only", () => {
        const state = baseState();
        const center = hex(0, 0);
        const ring1 = hex(1, 0);
        const ring2 = hex(2, 0);

        state.map.tiles = [
            { coord: center, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: ring1, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: ring2, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
        ] as any;

        state.units = [
            {
                id: "settler",
                ownerId: "p",
                type: UnitType.Settler,
                coord: center,
                movesLeft: 2,
                hasAttacked: false,
                state: "Normal",
            },
        ] as any;

        const after = applyAction(state as any, {
            type: "FoundCity",
            playerId: "p",
            unitId: "settler",
            name: "Cap",
        });

        const ring1Tile = after.map.tiles.find((t: any) => hexEquals(t.coord, ring1));
        const ring2Tile = after.map.tiles.find((t: any) => hexEquals(t.coord, ring2));
        expect(ring1Tile?.ownerId).toBe("p");
        expect(ring1Tile?.ownerCityId).toBe(after.cities[0].id);
        expect(ring2Tile?.ownerId).toBeUndefined();
    });

    it("expands to ring 2 at pop 3+ and keeps claimed tiles after pop loss", () => {
        const state = baseState();
        const center = hex(0, 0);
        const ring1 = hex(1, 0); // production heavy, should be secondary pick
        const ring2 = hex(2, 0); // best tile; should be picked once territory expands

        state.map.tiles = [
            { coord: center, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: ring1, terrain: TerrainType.Hills, overlays: [], hasCityCenter: false },
            { coord: ring2, terrain: TerrainType.Plains, overlays: [OverlayType.RichSoil], hasCityCenter: false },
        ] as any;

        const city = {
            id: "c1",
            name: "Cap",
            ownerId: "p",
            coord: center,
            pop: 2,
            storedFood: 100, // force multiple growth ticks
            storedProduction: 0,
            buildings: [],
            workedTiles: [center],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        };

        state.cities.push(city as any);
        claimCityTerritory(city as any, state as any, "p", 1);
        city.workedTiles = ensureWorkedTiles(city as any, state as any);

        const afterGrowth = advancePlayerTurn(state as any, "p");
        const grownCity = afterGrowth.cities[0];
        expect(grownCity.pop).toBeGreaterThanOrEqual(3);

        const expandedTile = afterGrowth.map.tiles.find((t: any) => hexEquals(t.coord, ring2));
        expect(expandedTile?.ownerId).toBe("p");
        expect(expandedTile?.ownerCityId).toBe(grownCity.id);
        expect(grownCity.workedTiles.some(c => hexEquals(c, ring2))).toBe(true);

        // Drop population and ensure territory does not shrink.
        grownCity.pop = 1;
        grownCity.storedFood = 0;
        const afterPopLoss = advancePlayerTurn(afterGrowth as any, "p");
        const stillOwnedTile = afterPopLoss.map.tiles.find((t: any) => hexEquals(t.coord, ring2));
        expect(stillOwnedTile?.ownerId).toBe("p");
        expect(stillOwnedTile?.ownerCityId).toBe(afterPopLoss.cities[0].id);
    });
});
