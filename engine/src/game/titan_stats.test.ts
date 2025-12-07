
import { describe, it, expect } from "vitest";
import { UnitType } from "../core/types.js";
import { UNITS } from "../core/constants.js";
import { startPlayerTurn } from "./turn-lifecycle.js";
import { GameState, PlayerPhase, TerrainType, UnitState, DiplomacyState } from "../core/types.js";

describe("Titan Stats & Mechanics", () => {
    it("should have correct nerfed stats (Defense 8, HP 30)", () => {
        const titan = UNITS[UnitType.Titan];
        expect(titan.def).toBe(8);
        expect(titan.hp).toBe(30);
        expect(titan.atk).toBe(30);
    });

    it("should regenerate exactly 1 HP per turn", () => {
        const state: GameState = {
            id: "test-game",
            turn: 1,
            players: [
                { id: "p1", civName: "AetherianVanguard", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false, hasFoundedFirstCity: true, currentEra: 1 },
            ],
            currentPlayerId: "p1",
            phase: PlayerPhase.Action,
            map: { width: 10, height: 10, tiles: [] },
            units: [
                {
                    id: "u1",
                    type: UnitType.Titan,
                    ownerId: "p1",
                    coord: { q: 0, r: 0 },
                    hp: 10, // Damaged Titan
                    maxHp: 30,
                    movesLeft: 0,
                    state: UnitState.Normal,
                    hasAttacked: false,
                }
            ],
            cities: [],
            seed: 123,
            visibility: {},
            revealed: {},
            diplomacy: {},
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
        };

        // Populate map tiles to avoid errors
        for (let q = 0; q < 10; q++) {
            for (let r = 0; r < 10; r++) {
                state.map.tiles.push({ coord: { q, r }, terrain: TerrainType.Plains, overlays: [] });
            }
        }

        // Trigger start of turn
        startPlayerTurn(state, state.players[0]);

        const titan = state.units.find(u => u.id === "u1")!;

        // Should heal by exactly 1
        expect(titan.hp).toBe(11);
    });
});
