
import { describe, it, expect } from "vitest";
import { GameState, UnitType, UnitState, TerrainType, PlayerPhase } from "../core/types.js";
import { validateTileOccupancy } from "./helpers/movement.js";
import { UNITS } from "../core/constants.js";

function createGameState(): GameState {
    return {
        id: "test-game",
        turn: 1,
        players: [
            { id: "p1", civName: "Civ1", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: {
            width: 10,
            height: 10,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 0, r: 2 }, terrain: TerrainType.Plains, overlays: [] },
            ],
        },
        units: [],
        cities: [],
        seed: 123,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    };
}

describe("Titan Movement Repro", () => {
    it("should allow Titan to move 2 tiles to an empty tile", () => {
        const state = createGameState();
        const player = state.players[0];

        // Place Titan at 0,0
        const titan = {
            id: "titan1",
            type: UnitType.Titan,
            ownerId: player.id,
            coord: { q: 0, r: 0 },
            hp: 100,
            maxHp: 100,
            movesLeft: 3,
            state: UnitState.Normal,
        };
        state.units.push(titan);

        const dest = { q: 0, r: 2 };
        const intermediate = { q: 0, r: 1 };

        // 1. Validate move to intermediate
        expect(() => validateTileOccupancy(state, intermediate, [{ unit: titan, stats: UNITS[UnitType.Titan] }], player.id)).not.toThrow();

        // 2. Validate move to destination
        expect(() => validateTileOccupancy(state, dest, [{ unit: titan, stats: UNITS[UnitType.Titan] }], player.id)).not.toThrow();
    });

    it("should fail validation if intermediate tile is occupied by friendly unit", () => {
        const state = createGameState();
        const player = state.players[0];

        // Place Titan at 0,0
        const titan = {
            id: "titan1",
            type: UnitType.Titan,
            ownerId: player.id,
            coord: { q: 0, r: 0 },
            hp: 100,
            maxHp: 100,
            movesLeft: 3,
            state: UnitState.Normal,
        };
        state.units.push(titan);

        // Place friendly unit at 0,1
        const friend = {
            id: "friend1",
            type: UnitType.SpearGuard,
            ownerId: player.id,
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
        };
        state.units.push(friend);

        const intermediate = { q: 0, r: 1 };


        // Validate move to intermediate
        expect(() => validateTileOccupancy(state, intermediate, [{ unit: titan, stats: UNITS[UnitType.Titan] }], player.id))
            .toThrow("Tile occupied by military unit");
    });

    it("should fail (currently) when moving two linked military units to the same tile", () => {
        const state = createGameState();
        const player = state.players[0];

        const u1 = {
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: player.id,
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            linkedUnitId: "u2",
        };
        const u2 = {
            id: "u2",
            type: UnitType.SpearGuard,
            ownerId: player.id,
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            linkedUnitId: "u1",
        };
        state.units.push(u1, u2);

        const dest = { q: 0, r: 1 };
        const movers = [
            { unit: u1, stats: UNITS[UnitType.SpearGuard] },
            { unit: u2, stats: UNITS[UnitType.SpearGuard] }
        ];


        // This should throw if the bug exists (validation doesn't account for linking compatibility)
        expect(() => validateTileOccupancy(state, dest, movers, player.id))
            .toThrow("Tile occupied by military unit");
    });
});

import { findPath } from "./helpers/pathfinding.js";
import { refreshPlayerVision } from "./vision.js";

describe("Titan Pathfinding Repro", () => {
    it("should generate a path through friendly unit despite it being impassable for movement", () => {
        const state = createGameState();
        const player = state.players[0];

        // Titan at (0,0)
        const titan = {
            id: "titan1",
            type: UnitType.Titan,
            ownerId: player.id,
            coord: { q: 0, r: 0 },
            hp: 100,
            maxHp: 100,
            movesLeft: 3,
            state: UnitState.Normal,
        };
        state.units.push(titan);

        // Friendly at (0,1)
        const friend = {
            id: "friend1",
            type: UnitType.SpearGuard,
            ownerId: player.id,
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
        };
        state.units.push(friend);

        // Destination at (0,2)
        const start = { q: 0, r: 0 };
        const dest = { q: 0, r: 2 };

        // Ensure player has vision of the tiles so pathfinding doesn't optimistically guess they are clear
        refreshPlayerVision(state, player.id);

        // Pathfinding should now return NO path (or a longer path around if map allowed, but here blocked)
        const path = findPath(start, dest, titan, state);

        // Expect NO path (empty array) because (0,1) is blocked by friendly military
        // and map is insufficient to go around.
        expect(path).toHaveLength(0);
    });
});
