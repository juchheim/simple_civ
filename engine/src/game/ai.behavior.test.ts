import { describe, it, expect } from "vitest";
import { hexEquals } from "../core/hex.js";
import { DiplomacyState, PlayerPhase, TerrainType, UnitType } from "../core/types.js";
import { moveMilitaryTowardTargets, rotateGarrisons, routeCityCaptures, repositionRanged } from "./ai/units.js";

function hex(q: number, r: number) {
    return { q, r };
}

function tile(coord: { q: number; r: number }, terrain: TerrainType = TerrainType.Plains) {
    return { coord, terrain, overlays: [], ownerId: undefined, hasCityCenter: false };
}

function baseState() {
    return {
        id: "g",
        turn: 1,
        players: [],
        currentPlayerId: "p",
        phase: PlayerPhase.Action,
        map: { width: 8, height: 8, tiles: [] as any[] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: { p: [] as string[] },
        revealed: { p: [] as string[] },
        diplomacy: {} as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
    };
}

describe("ai unit behaviors", () => {
    it("pulls healthier defenders from ring 3 toward empty garrisons when safe", () => {
        const state = baseState();
        const cityCoord = hex(0, 0);
        state.players = [{ id: "p", isEliminated: false }] as any;
        state.diplomacy = { p: {} } as any;
        state.diplomacy.p["e"] = DiplomacyState.War;
        state.players.push({ id: "e", isEliminated: false } as any);
        state.cities = [{ id: "c1", ownerId: "p", coord: cityCoord, hp: 20, maxHp: 20, buildings: [] }] as any;
        state.map.tiles = [
            tile(cityCoord),
            tile(hex(1, 0)),
            tile(hex(2, 0)),
            tile(hex(3, 0)),
        ];
        state.units = [
            { id: "garrison", ownerId: "p", type: UnitType.SpearGuard, coord: cityCoord, hp: 2, maxHp: 10, movesLeft: 1 },
            { id: "def", ownerId: "p", type: UnitType.SpearGuard, coord: hex(3, 0), hp: 10, maxHp: 10, movesLeft: 1 },
        ] as any;

        const next = rotateGarrisons(state as any, "p");
        const movedDef = next.units.find(u => u.id === "def");
        expect(movedDef && hexEquals(movedDef.coord, hex(2, 0))).toBe(true);
    });

    it("routes capture-capable units to 0-HP cities", () => {
        const state = baseState();
        state.players = [{ id: "p" }, { id: "e" }] as any;
        state.diplomacy = { p: { e: DiplomacyState.War }, e: { p: DiplomacyState.War } } as any;
        state.map.tiles = [tile(hex(0, 0)), tile(hex(1, 0))];
        state.cities = [{
            id: "ec",
            ownerId: "e",
            coord: hex(1, 0),
            hp: 0,
            maxHp: 20,
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildProgress: 0,
            currentBuild: null,
            workedTiles: [hex(1, 0)],
            milestones: [],
            buildings: [],
            isCapital: false,
            hasFiredThisTurn: false,
        }] as any;
        state.units = [
            { id: "capper", ownerId: "p", type: UnitType.SpearGuard, coord: hex(0, 0), hp: 10, maxHp: 10, movesLeft: 1 },
        ] as any;

        const next = routeCityCaptures(state as any, "p");
        const city = next.cities.find(c => c.id === "ec");
        expect(city?.ownerId).toBe("p");
    });

    it("repositions ranged units out of adjacency/crowding and naval units target coastal cities", () => {
        const state = baseState();
        state.players = [{ id: "p" }, { id: "e" }] as any;
        state.diplomacy = { p: { e: DiplomacyState.War }, e: { p: DiplomacyState.War } } as any;
        state.map.tiles = [
            tile(hex(0, 0)),
            tile(hex(1, 0)),
            tile(hex(-1, 1)),
            tile(hex(2, 0), TerrainType.Coast),
            tile(hex(1, 1), TerrainType.Coast),
            tile(hex(0, 1), TerrainType.Coast),
            tile(hex(0, 2), TerrainType.Coast),
            tile(hex(1, 2), TerrainType.Coast),
        ];
        state.cities = [
            { id: "coast-city", ownerId: "e", coord: hex(1, 1), hp: 20, maxHp: 20, buildings: [], isCapital: false },
        ] as any;
        state.units = [
            { id: "bow", ownerId: "p", type: UnitType.BowGuard, coord: hex(0, 0), hp: 10, maxHp: 10, movesLeft: 1 },
            { id: "boat", ownerId: "p", type: UnitType.RiverBoat, coord: hex(0, 2), hp: 10, maxHp: 10, movesLeft: 3 },
            { id: "enemy", ownerId: "e", type: UnitType.SpearGuard, coord: hex(1, 0), hp: 10, maxHp: 10, movesLeft: 1 },
        ] as any;

        const afterRanged = repositionRanged(state as any, "p");
        const bow = afterRanged.units.find(u => u.id === "bow");
        expect(bow && !hexEquals(bow.coord, hex(0, 0))).toBe(true);

        const moved = moveMilitaryTowardTargets(afterRanged as any, "p");
        const boat = moved.units.find(u => u.id === "boat");
        expect(boat && !hexEquals(boat.coord, hex(0, 2))).toBe(true);
    });
});
