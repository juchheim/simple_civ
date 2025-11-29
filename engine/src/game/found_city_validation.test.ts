import { describe, it, expect } from "vitest";
import { applyAction } from "./turn-loop.js";
import { TerrainType, UnitType, PlayerPhase } from "../core/types.js";

type HexCoord = { q: number; r: number };
function hex(q: number, r: number): HexCoord { return { q, r }; }

function baseState() {
    return {
        id: "g",
        turn: 1,
        players: [
            { id: "p1", civName: "Civ1", color: "#f00", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "p2", civName: "Civ2", color: "#00f", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: { width: 10, height: 10, tiles: [] as any[], rivers: [] as any[] },
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

describe("FoundCity validation", () => {
    it("throws error when too close to enemy city", () => {
        const state = baseState();
        const p1Center = hex(0, 0);
        const p2Center = hex(0, 2); // Distance 2 - too close!

        // Setup map
        for (let r = 0; r < 5; r++) {
            for (let q = 0; q < 5; q++) {
                state.map.tiles.push({ coord: hex(q, r), terrain: TerrainType.Plains, overlays: [], hasCityCenter: false });
            }
        }

        // P1 founds city at (0,0)
        state.units.push({
            id: "u1", ownerId: "p1", type: UnitType.Settler, coord: p1Center, movesLeft: 1, state: "Normal"
        } as any);

        const next = applyAction(state as any, { type: "FoundCity", playerId: "p1", unitId: "u1", name: "City1" });

        // P2 tries to found city at (0,2) - distance 2, should fail
        next.units.push({
            id: "u2", ownerId: "p2", type: UnitType.Settler, coord: p2Center, movesLeft: 1, state: "Normal"
        } as any);

        // Switch to P2
        next.currentPlayerId = "p2";

        // Expect specific enemy error
        expect(() => {
            applyAction(next as any, { type: "FoundCity", playerId: "p2", unitId: "u2", name: "City2" });
        }).toThrow("Too close to enemy city");
    });

    it("throws error when too close to friendly city", () => {
        const state = baseState();
        const p1Center = hex(0, 0);
        const p1SecondCity = hex(0, 2); // Distance 2 - too close!

        // Setup map
        for (let r = 0; r < 5; r++) {
            for (let q = 0; q < 5; q++) {
                state.map.tiles.push({ coord: hex(q, r), terrain: TerrainType.Plains, overlays: [], hasCityCenter: false });
            }
        }

        // P1 founds city at (0,0)
        state.units.push({
            id: "u1", ownerId: "p1", type: UnitType.Settler, coord: p1Center, movesLeft: 1, state: "Normal"
        } as any);

        const next = applyAction(state as any, { type: "FoundCity", playerId: "p1", unitId: "u1", name: "City1" });

        // P1 tries to found another city at (0,2) - distance 2, should fail
        next.units.push({
            id: "u2", ownerId: "p1", type: UnitType.Settler, coord: p1SecondCity, movesLeft: 1, state: "Normal"
        } as any);

        // Expect friendly error
        expect(() => {
            applyAction(next as any, { type: "FoundCity", playerId: "p1", unitId: "u2", name: "City2" });
        }).toThrow("Too close to friendly city");
    });

    it("allows founding at distance 3 from friendly city", () => {
        const state = baseState();
        const p1Center = hex(0, 0);
        const p1SecondCity = hex(0, 3); // Distance 3 - valid!

        // Setup map
        for (let r = 0; r < 6; r++) {
            for (let q = 0; q < 6; q++) {
                state.map.tiles.push({ coord: hex(q, r), terrain: TerrainType.Plains, overlays: [], hasCityCenter: false });
            }
        }

        // P1 founds city at (0,0)
        state.units.push({
            id: "u1", ownerId: "p1", type: UnitType.Settler, coord: p1Center, movesLeft: 1, state: "Normal"
        } as any);

        const next = applyAction(state as any, { type: "FoundCity", playerId: "p1", unitId: "u1", name: "City1" });

        // P1 tries to found another city at (0,3) - distance 3, should succeed
        next.units.push({
            id: "u2", ownerId: "p1", type: UnitType.Settler, coord: p1SecondCity, movesLeft: 1, state: "Normal"
        } as any);

        // Should not throw
        expect(() => {
            applyAction(next as any, { type: "FoundCity", playerId: "p1", unitId: "u2", name: "City2" });
        }).not.toThrow();
    });

    it("allows founding at distance 3 from enemy city", () => {
        const state = baseState();
        const p1Center = hex(0, 0);
        const p2Center = hex(0, 3); // Distance 3 - valid!

        // Setup map
        for (let r = 0; r < 6; r++) {
            for (let q = 0; q < 6; q++) {
                state.map.tiles.push({ coord: hex(q, r), terrain: TerrainType.Plains, overlays: [], hasCityCenter: false });
            }
        }

        // P1 founds city at (0,0)
        state.units.push({
            id: "u1", ownerId: "p1", type: UnitType.Settler, coord: p1Center, movesLeft: 1, state: "Normal"
        } as any);

        const next = applyAction(state as any, { type: "FoundCity", playerId: "p1", unitId: "u1", name: "City1" });

        // P2 tries to found city at (0,3) - distance 3, should succeed
        next.units.push({
            id: "u2", ownerId: "p2", type: UnitType.Settler, coord: p2Center, movesLeft: 1, state: "Normal"
        } as any);

        // Switch to P2
        next.currentPlayerId = "p2";

        // Should not throw
        expect(() => {
            applyAction(next as any, { type: "FoundCity", playerId: "p2", unitId: "u2", name: "City2" });
        }).not.toThrow();
    });

    it("allows founding city even when settler has no moves left", () => {
        const state = baseState();
        const p1Center = hex(0, 0);

        // Setup map
        for (let r = 0; r < 5; r++) {
            for (let q = 0; q < 5; q++) {
                state.map.tiles.push({ coord: hex(q, r), terrain: TerrainType.Plains, overlays: [], hasCityCenter: false });
            }
        }

        // P1 settler with 0 moves left
        state.units.push({
            id: "u1", ownerId: "p1", type: UnitType.Settler, coord: p1Center, movesLeft: 0, state: "Normal"
        } as any);

        // Should not throw - founding a city should not require moves
        expect(() => {
            const next = applyAction(state as any, { type: "FoundCity", playerId: "p1", unitId: "u1", name: "City1" });
            expect(next.cities.length).toBe(1);
            expect(next.cities[0].name).toBe("City1");
            expect(next.units.find((u: any) => u.id === "u1")).toBeUndefined(); // Settler should be consumed
        }).not.toThrow();
    });
});
