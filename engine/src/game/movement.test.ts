import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("Movement Logic", () => {
    let state: GameState;

    beforeEach(() => {
        state = {
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
                    { coord: { q: 0, r: 1 }, terrain: TerrainType.Forest, overlays: [] }, // Cost 2
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
    });

    it("should allow a Settler with 1 move (max) to enter Forest (cost 2)", () => {
        state.units.push({
            id: "u1",
            type: UnitType.Settler, // Move 1 but ignores terrain penalties
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const nextState = applyAction(state, {
            type: "MoveUnit",
            playerId: "p1",
            unitId: "u1",
            to: { q: 0, r: 1 },
        });

        const unit = nextState.units.find(u => u.id === "u1");
        expect(unit!.coord).toEqual({ q: 0, r: 1 });
        expect(unit!.movesLeft).toBe(0);
    });

    it("should allow a SpearGuard to move to the same hex as a Settler (stacking)", () => {
        // Setup: SpearGuard at (0,0), Settler at (0,1)
        state.units.push(
            {
                id: "spear1",
                type: UnitType.SpearGuard,
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 2,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "settler1",
                type: UnitType.Settler,
                ownerId: "p1",
                coord: { q: 0, r: 1 },
                hp: 1,
                maxHp: 1,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            }
        );

        // Action: Move SpearGuard to the same hex as Settler
        const nextState = applyAction(state, {
            type: "MoveUnit",
            playerId: "p1",
            unitId: "spear1",
            to: { q: 0, r: 1 },
        });

        // Verify: Both units should be at (0,1)
        const spear = nextState.units.find(u => u.id === "spear1");
        const settler = nextState.units.find(u => u.id === "settler1");

        expect(spear!.coord).toEqual({ q: 0, r: 1 });
        expect(settler!.coord).toEqual({ q: 0, r: 1 });
        expect(spear!.movesLeft).toBe(1); // Moving to forest costs 1 move (SpearGuard has 2 moves max)
    });

    it("should declare war when moving into enemy territory at peace", () => {
        state.players = [
            { id: "p1", civName: "Civ1", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "p2", civName: "Civ2", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p2" },
        ];
        state.units.push({
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 2,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const nextState = applyAction(state, {
            type: "MoveUnit",
            playerId: "p1",
            unitId: "u1",
            to: { q: 0, r: 1 },
        });

        const unit = nextState.units.find(u => u.id === "u1");
        expect(unit!.coord).toEqual({ q: 0, r: 1 });
        expect(nextState.diplomacy.p1.p2).toBe(DiplomacyState.War);
        expect(nextState.diplomacy.p2.p1).toBe(DiplomacyState.War);
        expect(nextState.diplomacyChangeTurn?.p1?.p2).toBe(state.turn);
        expect(nextState.diplomacyChangeTurn?.p2?.p1).toBe(state.turn);
    });
});
