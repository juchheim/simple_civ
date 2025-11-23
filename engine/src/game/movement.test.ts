import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState } from "../core/types.js";
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
});
