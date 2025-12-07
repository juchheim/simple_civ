import { describe, it, expect } from "vitest";
import { findPath } from "../game/helpers/pathfinding.js";
import { GameState, TerrainType, UnitType, UnitState, PlayerPhase } from "../core/types.js";

describe("Fog of War Movement", () => {
    it("findPath should return a valid path to fogged tiles", () => {
        const state: GameState = {
            id: "test",
            turn: 1,
            players: [{ id: "p1", civName: "Test", color: "#f00", techs: [], currentTech: null, completedProjects: [], isEliminated: false }],
            currentPlayerId: "p1",
            phase: PlayerPhase.Action,
            map: {
                width: 5,
                height: 1,
                tiles: [
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 2, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 3, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                ],
            },
            units: [
                {
                    id: "u1",
                    ownerId: "p1",
                    type: UnitType.Scout,
                    coord: { q: 0, r: 0 },
                    hp: 100,
                    maxHp: 100,
                    movesLeft: 3,
                    state: UnitState.Normal,
                    hasAttacked: false,
                },
            ],
            cities: [],
            seed: 1,
            // Only tile 0,0 is visible; tiles 1,0 through 3,0 are fogged
            visibility: { p1: ["0,0"] },
            revealed: { p1: ["0,0", "1,0", "2,0", "3,0"] },
            diplomacy: {},
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
        } as unknown as GameState;

        const unit = state.units[0];
        const start = { q: 0, r: 0 };
        const foggedTarget = { q: 3, r: 0 };

        const path = findPath(start, foggedTarget, unit, state);

        console.log("Path found:", path);

        // Path should exist and have 3 steps
        expect(path.length).toBeGreaterThan(0);
        expect(path).toEqual([
            { q: 1, r: 0 },
            { q: 2, r: 0 },
            { q: 3, r: 0 },
        ]);
    });
});
