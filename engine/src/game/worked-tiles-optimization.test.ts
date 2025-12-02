import { describe, it, expect } from "vitest";
import { advancePlayerTurn } from "./turn-lifecycle.js";
import { PlayerPhase, TerrainType, OverlayType } from "../core/types.js";
import { claimCityTerritory, ensureWorkedTiles } from "./helpers/cities.js";
import { hexEquals } from "../core/hex.js";
import { handleSetWorkedTiles } from "./actions/cities.js";

type HexCoord = { q: number; r: number };

const hex = (q: number, r: number): HexCoord => ({ q, r });

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

describe("worked tile optimization", () => {
    it("re-optimizes after growth to pick the best available tiles, even replacing weaker ones", () => {
        const state = baseState();
        const center = hex(0, 0);
        const ring1Low = hex(1, 0);
        const ring2High = hex(2, 0);
        const ring2Mid = hex(2, -1);

        state.map.tiles = [
            { coord: center, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: ring1Low, terrain: TerrainType.Desert, overlays: [], hasCityCenter: false },
            { coord: ring2High, terrain: TerrainType.Plains, overlays: [OverlayType.RichSoil], hasCityCenter: false },
            { coord: ring2Mid, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
        ] as any;

        const city = {
            id: "c1",
            name: "Cap",
            ownerId: "p",
            coord: center,
            pop: 2,
            storedFood: 60, // force single growth into ring 2
            storedProduction: 0,
            buildings: [],
            workedTiles: [center, ring1Low],
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
        expect(grownCity.pop).toBe(3);

        const worked = grownCity.workedTiles;
        expect(worked.some(c => hexEquals(c, ring2High))).toBe(true);
        expect(worked.some(c => hexEquals(c, ring2Mid))).toBe(true);
        expect(worked.some(c => hexEquals(c, ring1Low))).toBe(false); // replaced by better ring 2 options
    });

    it("respects player overrides and keeps pinned tiles after auto-optimization", () => {
        const state = baseState();
        const center = hex(0, 0);
        const rich = hex(1, 0); // clearly better than low
        const low = hex(0, 1);

        state.map.tiles = [
            { coord: center, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: rich, terrain: TerrainType.Plains, overlays: [OverlayType.RichSoil], hasCityCenter: false },
            { coord: low, terrain: TerrainType.Desert, overlays: [], hasCityCenter: false },
        ] as any;

        const city = {
            id: "c1",
            name: "Cap",
            ownerId: "p",
            coord: center,
            pop: 2,
            storedFood: 10,
            storedProduction: 0,
            buildings: [],
            workedTiles: [center, rich],
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

        handleSetWorkedTiles(state as any, {
            type: "SetWorkedTiles",
            playerId: "p",
            cityId: city.id,
            tiles: [center, low],
        });

        const afterTurn = advancePlayerTurn(state as any, "p");
        const worked = afterTurn.cities[0].workedTiles;
        expect(worked.some(c => hexEquals(c, low))).toBe(true);
        expect(worked.some(c => hexEquals(c, rich))).toBe(false); // player override persisted
    });

    it("allows deselecting a worked tile without auto-reassigning it", () => {
        const state = baseState();
        const center = hex(0, 0);
        const rich = hex(1, 0); // best
        const mid = hex(0, 1); // second best
        const weak = hex(-1, 0); // worst

        state.map.tiles = [
            { coord: center, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: rich, terrain: TerrainType.Plains, overlays: [OverlayType.RichSoil], hasCityCenter: false },
            { coord: mid, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: weak, terrain: TerrainType.Desert, overlays: [], hasCityCenter: false },
        ] as any;

        const city = {
            id: "c1",
            name: "Cap",
            ownerId: "p",
            coord: center,
            pop: 2,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [center, rich],
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

        // Player deselects the rich tile, leaving only center; should not auto-add rich back.
        handleSetWorkedTiles(state as any, {
            type: "SetWorkedTiles",
            playerId: "p",
            cityId: city.id,
            tiles: [center], // nothing else selected
        });

        const after = advancePlayerTurn(state as any, "p");
        const worked = after.cities[0].workedTiles;

        expect(worked.some(c => hexEquals(c, rich))).toBe(false);
        expect(worked.some(c => hexEquals(c, mid))).toBe(true); // auto-fill with next best non-excluded tile
        expect(after.cities[0].manualExcludedTiles?.some(c => hexEquals(c, rich))).toBe(true);
    });
});
