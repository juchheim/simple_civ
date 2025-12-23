import { describe, it, expect, beforeEach } from "vitest";
import { GameState, UnitType, UnitState, TerrainType, PlayerPhase, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

/**
 * BUG REPRODUCTION TEST
 * 
 * Scenario:
 * 1. Player captures an enemy settler with their military unit
 * 2. Player's military unit is now stacked with the captured settler (now friendly)
 * 3. An enemy military unit moves onto the same tile, capturing the settler
 * 
 * Expected: Enemy should NOT be able to move onto a tile with player's military unit
 * Actual (bug): Enemy moves in and captures the settler
 */

function createBaseState(): GameState {
    return {
        id: "test",
        turn: 5,
        players: [
            { id: "p1", civName: "ForgeClans", color: "#ff0000", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "p2", civName: "RiverLeague", color: "#0000ff", techs: [], currentTech: null, completedProjects: [], isEliminated: false, isAI: true },
        ],
        currentPlayerId: "p2",
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
        seed: 12345,
        visibility: { p1: ["0,0", "1,0", "2,0"], p2: ["0,0", "1,0", "2,0"] },
        revealed: { p1: ["0,0", "1,0", "2,0"], p2: ["0,0", "1,0", "2,0"] },
        diplomacy: { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } },
        diplomacyOffers: [],
        sharedVision: { p1: { p2: false }, p2: { p1: false } },
        contacts: { p1: { p2: true }, p2: { p1: true } },
    } as unknown as GameState;
}

describe("Settler Capture Bug", () => {
    let state: GameState;

    beforeEach(() => {
        state = createBaseState();
    });

    it("enemy military should NOT be able to move onto tile with player's military unit (even with settler stacked)", () => {
        // Setup: P1 has a SpearGuard and a Settler (captured, now friendly) on the same tile (1,0)
        // P2 has a SpearGuard at (2,0) and it's P2's turn

        // Player 1's military unit
        state.units.push({
            id: "p1_spear",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 1, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0, // Already moved this turn (just captured)
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Player 1's captured settler (stacked with military)
        state.units.push({
            id: "p1_settler",
            type: UnitType.Settler,
            ownerId: "p1", // Now belongs to P1 after capture
            coord: { q: 1, r: 0 }, // Same tile as the SpearGuard
            hp: 1,
            maxHp: 1,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Enemy (P2) military unit adjacent to the stack
        state.units.push({
            id: "p2_spear",
            type: UnitType.SpearGuard,
            ownerId: "p2",
            coord: { q: 2, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 2,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // It's P2's turn
        state.currentPlayerId = "p2";

        // P2 attempts to move their SpearGuard onto the tile with P1's units
        // This SHOULD fail because P1 has a military unit there
        expect(() => {
            applyAction(state, {
                type: "MoveUnit",
                playerId: "p2",
                unitId: "p2_spear",
                to: { q: 1, r: 0 },
            });
        }).toThrow("Tile occupied by military unit");
    });

    it("attacking a settler with a military on the same tile should redirect attack to the military", () => {
        // Setup: P1 has a SpearGuard and a Settler on the same tile (1,0)
        // P2 attacks the settler - it should redirect to the military unit

        // Player 1's military unit
        state.units.push({
            id: "p1_spear",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 1, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Player 1's settler (stacked with military - NOT linked)
        state.units.push({
            id: "p1_settler",
            type: UnitType.Settler,
            ownerId: "p1",
            coord: { q: 1, r: 0 },
            hp: 1,
            maxHp: 1,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
            // Note: No linkedUnitId - simulating the scenario after capturing a settler
        });

        // Enemy military adjacent
        state.units.push({
            id: "p2_spear",
            type: UnitType.SpearGuard,
            ownerId: "p2",
            coord: { q: 2, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 2,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        state.currentPlayerId = "p2";

        // P2 attacks the settler - this should redirect to the military
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "p2_spear",
            targetId: "p1_settler", // Targeting the settler
            targetType: "Unit",
        });

        // Verify: The attack was redirected to the military unit
        // P1's spear should have taken damage (attack redirected)
        const p1Spear = nextState.units.find(u => u.id === "p1_spear");
        expect(p1Spear).toBeDefined();
        expect(p1Spear!.hp).toBeLessThan(10);

        // P1's settler should be UNHARMED (attack redirected away from it)
        const settler = nextState.units.find(u => u.id === "p1_settler");
        expect(settler).toBeDefined();
        expect(settler!.ownerId).toBe("p1"); // Still belongs to P1
        expect(settler!.hp).toBe(1); // Unharmed

        // P2's spear should NOT have moved (just attacked)
        const p2Spear = nextState.units.find(u => u.id === "p2_spear");
        expect(p2Spear).toBeDefined();
        expect(p2Spear!.coord).toEqual({ q: 2, r: 0 }); // Still at original position
    });

    it("enemy settler should NOT be able to enter player's city", () => {
        // Setup: P1 has a city at (1,0), P2 has a settler adjacent at (2,0)

        // Add a city for P1
        (state as any).cities = [{
            id: "c1",
            name: "TestCity",
            ownerId: "p1",
            coord: { q: 1, r: 0 },
            pop: 2,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 1, r: 0 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        }];

        // Set tile ownership
        state.map.tiles[1].ownerId = "p1";

        // Enemy settler adjacent to the city
        state.units.push({
            id: "p2_settler",
            type: UnitType.Settler,
            ownerId: "p2",
            coord: { q: 2, r: 0 },
            hp: 1,
            maxHp: 1,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        state.currentPlayerId = "p2";

        // P2's settler attempts to move onto P1's city
        // This SHOULD fail
        expect(() => {
            applyAction(state, {
                type: "MoveUnit",
                playerId: "p2",
                unitId: "p2_settler",
                to: { q: 1, r: 0 },
            });
        }).toThrow("Cannot enter enemy city");
    });
});
