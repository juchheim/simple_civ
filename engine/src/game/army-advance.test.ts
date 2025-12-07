import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("Army Advance After Kill", () => {
    let state: GameState;

    beforeEach(() => {
        state = {
            id: "test-game",
            turn: 1,
            round: 1,
            players: [
                { id: "p1", civName: "Civ1", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
                { id: "p2", civName: "Civ2", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            ],
            currentPlayerId: "p1",
            phase: PlayerPhase.Action,
            map: {
                width: 10,
                height: 10,
                tiles: [
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] },
                ],
            },
            units: [],
            cities: [],
            seed: 123,
            visibility: { "p1": ["0,0", "0,1"], "p2": ["0,0", "0,1"] },
            revealed: { "p1": ["0,0", "0,1"], "p2": ["0,0", "0,1"] },
            diplomacy: {
                "p1": { "p2": DiplomacyState.War },
                "p2": { "p1": DiplomacyState.War }
            },
            sharedVision: {},
            contacts: { "p1": { "p2": true }, "p2": { "p1": true } },
            diplomacyOffers: [],
        };
    });

    it("should advance ArmySpearGuard into defender's hex after killing", () => {
        // Defender Unit for P2 (weak, will die in one hit)
        state.units.push({
            id: "u_defender",
            type: UnitType.Scout,
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            hp: 1,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // ArmySpearGuard Attacker for P1
        state.units.push({
            id: "u_attacker",
            type: UnitType.ArmySpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 15,
            maxHp: 15,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: Attack the defender unit
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p1",
            attackerId: "u_attacker",
            targetId: "u_defender",
            targetType: "Unit",
        });

        // Verify defender was defeated
        const defender = nextState.units.find(u => u.id === "u_defender");
        expect(defender).toBeUndefined();

        // Verify attacker DID move into the tile (Army should advance)
        const attacker = nextState.units.find(u => u.id === "u_attacker");
        expect(attacker!.coord).toEqual({ q: 0, r: 0 }); // Moved into defender's position
        expect(attacker!.movesLeft).toBe(0);
    });

    it("should advance ArmyRiders into defender's hex after killing", () => {
        // Defender Unit for P2 (weak, will die in one hit)
        state.units.push({
            id: "u_defender",
            type: UnitType.Scout,
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            hp: 1,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // ArmyRiders Attacker for P1
        state.units.push({
            id: "u_attacker",
            type: UnitType.ArmyRiders,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 15,
            maxHp: 15,
            movesLeft: 2,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: Attack the defender unit
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p1",
            attackerId: "u_attacker",
            targetId: "u_defender",
            targetType: "Unit",
        });

        // Verify defender was defeated
        const defender = nextState.units.find(u => u.id === "u_defender");
        expect(defender).toBeUndefined();

        // Verify attacker DID move into the tile (Army should advance)
        const attacker = nextState.units.find(u => u.id === "u_attacker");
        expect(attacker!.coord).toEqual({ q: 0, r: 0 }); // Moved into defender's position
        expect(attacker!.movesLeft).toBe(0);
    });

    it("should NOT advance ArmyBowGuard (ranged unit) after killing", () => {
        // Defender Unit for P2 (weak, will die in one hit)
        state.units.push({
            id: "u_defender",
            type: UnitType.Scout,
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            hp: 1,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // ArmyBowGuard Attacker for P1 (ranged, should NOT advance)
        state.units.push({
            id: "u_attacker",
            type: UnitType.ArmyBowGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 15,
            maxHp: 15,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: Attack the defender unit
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p1",
            attackerId: "u_attacker",
            targetId: "u_defender",
            targetType: "Unit",
        });

        // Verify defender was defeated
        const defender = nextState.units.find(u => u.id === "u_defender");
        expect(defender).toBeUndefined();

        // Verify attacker did NOT move (ranged units don't advance)
        const attacker = nextState.units.find(u => u.id === "u_attacker");
        expect(attacker!.coord).toEqual({ q: 0, r: 1 }); // Still at original position
        expect(attacker!.movesLeft).toBe(0);
    });
});
