import { describe, it, expect } from "vitest";
import { expelUnitsFromTerritory } from "./helpers/movement.js";
import { GameState, PlayerPhase, TerrainType, UnitType, UnitState, DiplomacyState } from "../core/types.js";
import { UNITS } from "../core/constants.js";

const hex = (q: number, r: number) => ({ q, r });

function baseState(): GameState {
    return {
        id: "g",
        turn: 1,
        players: [
            { id: "owner_a", civName: "CivA", color: "#000", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "owner_b", civName: "CivB", color: "#111", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "intruder", civName: "Intruder", color: "#222", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "owner_a",
        phase: PlayerPhase.Planning,
        map: {
            width: 5,
            height: 5,
            tiles: [
                { coord: hex(0, 0), terrain: TerrainType.Plains, overlays: [], ownerId: "owner_a" }, // Civ A land
                { coord: hex(1, 0), terrain: TerrainType.Plains, overlays: [], ownerId: "owner_b" }, // Civ B land
                { coord: hex(2, 0), terrain: TerrainType.Plains, overlays: [], ownerId: undefined }, // Free land
            ],
            rivers: [],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {
            "intruder": { "owner_a": DiplomacyState.Peace, "owner_b": DiplomacyState.Peace },
            "owner_a": { "intruder": DiplomacyState.Peace },
            "owner_b": { "intruder": DiplomacyState.Peace },
        },
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    };
}

describe("Expulsion into Neighbor", () => {
    it("moves unit into valid neighbor but NOT into peaceful third party territory", () => {
        // Situation: Unit (Intruder) is in Civ A's land.
        // It gets expelled.
        // Civ B is adjacent (Peace). Free land is also valid.
        // It SHOULD NOT go to Civ B. It SHOULD go to Free Land.

        const state = baseState();
        const intruderUnit = {
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: "intruder",
            coord: hex(0, 0),
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        };
        state.units.push(intruderUnit as any);

        // Intruding in A's land
        // Civ A expels it
        expelUnitsFromTerritory(state, "intruder", "owner_a");

        // Should NOT be in B's land (1,0)
        expect(intruderUnit.coord).not.toEqual(hex(1, 0));

        // Should be in Free land (2,0) or elsewhere valid
        // Actually, (2,0) is distance 2 from (0,0). (1,0) is distance 1.
        // If (1,0) is blocked (Peace treaty), BFS should find next best.
        // Wait, (2,0) is NOT neighbor of (0,0). 
        // Need to set up map so A is adjacent to B and Free.

        // Map:
        // (0,0): Owner A (Intruder here)
        // (1,0): Owner B (Peace)
        // (1,-1): Free (Valid)

        state.map.tiles = [
            { coord: hex(0, 0), terrain: TerrainType.Plains, overlays: [], ownerId: "owner_a" },
            { coord: hex(1, 0), terrain: TerrainType.Plains, overlays: [], ownerId: "owner_b" },
            { coord: hex(1, -1), terrain: TerrainType.Plains, overlays: [], ownerId: undefined },
        ] as any;

        // Reset unit
        intruderUnit.coord = hex(0, 0);

        expelUnitsFromTerritory(state, "intruder", "owner_a");

        // Should ignore (1,0) because it's Civ B (Peace)
        // Should choose (1,-1) because it's Unowned
        expect(intruderUnit.coord).toEqual(hex(1, -1));
    });
});
