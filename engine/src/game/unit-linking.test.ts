import { describe, it, expect } from "vitest";
import { applyAction } from "./turn-loop.js";
import { GameState, PlayerPhase, TerrainType, UnitState, UnitType } from "../core/types.js";

function createTestState(): GameState {
    return {
        id: "test",
        turn: 1,
        players: [
            { id: "p1", civName: "Red", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "p2", civName: "Blue", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: {
            width: 5,
            height: 5,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            ],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    };
}

const baseUnit = (overrides: Partial<ReturnType<typeof createTestUnit>> = {}) => ({
    ...createTestUnit(),
    ...overrides,
});
function createTestUnit() {
    return {
        id: "temp",
        type: UnitType.Settler,
        ownerId: "p1",
        coord: { q: 0, r: 0 },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        state: UnitState.Normal,
        hasAttacked: false,
    };
}

describe("Unit Linking", () => {
    it("links two friendly units sharing a tile", () => {
        const state = createTestState();
        state.units = [
            baseUnit({ id: "settler", type: UnitType.Settler }),
            baseUnit({ id: "riders", type: UnitType.Riders, movesLeft: 2 }),
        ];

        const result = applyAction(state, { type: "LinkUnits", playerId: "p1", unitId: "riders", partnerId: "settler" });
        const settler = result.units.find(u => u.id === "settler");
        const riders = result.units.find(u => u.id === "riders");

        expect(settler?.linkedUnitId).toBe("riders");
        expect(riders?.linkedUnitId).toBe("settler");
});
    it("moves both linked units at the slower unit's pace", () => {
        const state = createTestState();
        state.units = [
            baseUnit({ id: "settler", type: UnitType.Settler }),
            baseUnit({ id: "riders", type: UnitType.Riders, movesLeft: 2 }),
        ];

        const linked = applyAction(state, { type: "LinkUnits", playerId: "p1", unitId: "riders", partnerId: "settler" });
        const moved = applyAction(linked, { type: "MoveUnit", playerId: "p1", unitId: "riders", to: { q: 1, r: 0 } });

        const settler = moved.units.find(u => u.id === "settler");
        const riders = moved.units.find(u => u.id === "riders");

        expect(settler?.coord).toEqual({ q: 1, r: 0 });
        expect(riders?.coord).toEqual({ q: 1, r: 0 });
        expect(settler?.movesLeft).toBe(0);
        expect(riders?.movesLeft).toBe(0);
        expect(settler?.linkedUnitId).toBe("riders");
        expect(riders?.linkedUnitId).toBe("settler");
    });

    it("auto-unlinks when the partner cannot enter an enemy-occupied tile", () => {
        const state = createTestState();
        state.units = [
            baseUnit({ id: "guard", type: UnitType.SpearGuard }),
            baseUnit({ id: "settler", type: UnitType.Settler }),
            {
                ...createTestUnit(),
                id: "enemy-settler",
                ownerId: "p2",
                coord: { q: 1, r: 0 },
            },
        ];

        const linked = applyAction(state, { type: "LinkUnits", playerId: "p1", unitId: "guard", partnerId: "settler" });
        const moved = applyAction(linked, { type: "MoveUnit", playerId: "p1", unitId: "guard", to: { q: 1, r: 0 } });

        const guard = moved.units.find(u => u.id === "guard");
        const settler = moved.units.find(u => u.id === "settler");
        const remainingEnemy = moved.units.find(u => u.ownerId === "p2");

        expect(guard?.coord).toEqual({ q: 1, r: 0 });
        expect(settler?.coord).toEqual({ q: 0, r: 0 });
        expect(guard?.linkedUnitId).toBeUndefined();
        expect(settler?.linkedUnitId).toBeUndefined();
        expect(remainingEnemy).toBeUndefined();
    });

    it("unlink action clears both units", () => {
        const state = createTestState();
        state.units = [
            baseUnit({ id: "settler", type: UnitType.Settler }),
            baseUnit({ id: "riders", type: UnitType.Riders, movesLeft: 2 }),
        ];

        const linked = applyAction(state, { type: "LinkUnits", playerId: "p1", unitId: "settler", partnerId: "riders" });
        const unlinked = applyAction(linked, { type: "UnlinkUnits", playerId: "p1", unitId: "settler", partnerId: "riders" });

        const settler = unlinked.units.find(u => u.id === "settler");
        const riders = unlinked.units.find(u => u.id === "riders");

        expect(settler?.linkedUnitId).toBeUndefined();
        expect(riders?.linkedUnitId).toBeUndefined();
    });
});

