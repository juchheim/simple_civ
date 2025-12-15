
import { describe, it, expect } from "vitest";
import { applyAction } from "./turn-loop.js";
import { GameState, PlayerPhase, TerrainType, UnitState, UnitType, BuildingType } from "../core/types.js";

function createTestState(): GameState {
    return {
        id: "test",
        turn: 1,
        players: [
            { id: "p1", civName: "Red", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: "Hearth" as any },
            { id: "p2", civName: "Blue", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false, currentEra: "Hearth" as any },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: {
            width: 5,
            height: 5,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], hasCityCenter: true, ownerId: "p1", ownerCityId: "city1" },
                { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            ],
        },
        units: [],
        cities: [
            {
                id: "city1",
                name: "Test City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 1,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            }
        ],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
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

describe("Unit Linking in City", () => {
    it("links Bowguard and Settler in a city", () => {
        const state = createTestState();
        state.units = [
            baseUnit({ id: "settler", type: UnitType.Settler, coord: { q: 0, r: 0 } }),
            baseUnit({ id: "bowguard", type: UnitType.BowGuard, coord: { q: 0, r: 0 }, movesLeft: 1, state: UnitState.Garrisoned }),
        ];

        const result = applyAction(state, { type: "LinkUnits", playerId: "p1", unitId: "bowguard", partnerId: "settler" });
        const settler = result.units.find(u => u.id === "settler");
        const bowguard = result.units.find(u => u.id === "bowguard");

        expect(settler?.linkedUnitId).toBe("bowguard");
        expect(bowguard?.linkedUnitId).toBe("settler");
    });
});
