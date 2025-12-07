import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("City Combat", () => {
    let state: GameState;

    beforeEach(() => {
        state = {
            id: "test-game",
            turn: 1,
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
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] }, // City
                    { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [] }, // Attacker
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

    it("should allow a unit to attack a city and reduce its HP", () => {
        // Setup City for P2
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p2",
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
        });
        state.map.tiles[0].ownerId = "p2";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Setup Attacker for P1
        state.units.push({
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: Attack
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p1",
            attackerId: "u1",
            targetId: "c1",
            targetType: "City",
        });

        const city = nextState.cities.find(c => c.id === "c1");
        expect(city).toBeDefined();
        expect(city!.hp).toBeLessThan(20);

        // Check war declaration
        expect(nextState.diplomacy["p1"]["p2"]).toBe("War");
    });

    it("should allow capturing a city when HP is 0", () => {
        // Setup City for P2 with 0 HP
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            pop: 2,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 0, r: 0 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 0, // Vulnerable
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        state.map.tiles[0].ownerId = "p2";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Setup Capturer for P1 (Melee)
        state.units.push({
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: Move into city (Capture)
        const nextState = applyAction(state, {
            type: "MoveUnit",
            playerId: "p1",
            unitId: "u1",
            to: { q: 0, r: 0 },
        });

        const city = nextState.cities.find(c => c.id === "c1");
        expect(city).toBeDefined();
        expect(city!.ownerId).toBe("p1"); // Ownership changed
        expect(city!.hp).toBe(8); // Reset HP
        expect(city!.pop).toBe(1); // Pop reduced

        const unit = nextState.units.find(u => u.id === "u1");
        expect(unit!.coord).toEqual({ q: 0, r: 0 }); // Unit moved in
    });

    it("should NOT allow capturing a city if HP > 0", () => {
        // Setup City for P2 with 1 HP
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            pop: 2,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 0, r: 0 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 1,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        state.map.tiles[0].ownerId = "p2";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Setup Capturer for P1
        state.units.push({
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: Move into city -> Should fail
        expect(() => applyAction(state, {
            type: "MoveUnit",
            playerId: "p1",
            unitId: "u1",
            to: { q: 0, r: 0 },
        })).toThrow("City not capturable");
    });

    it("should NOT allow non-capture units (Scout) to capture city", () => {
        // Setup City for P2 with 0 HP
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            pop: 2,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 0, r: 0 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 0,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        state.map.tiles[0].ownerId = "p2";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Setup Scout for P1
        state.units.push({
            id: "u1",
            type: UnitType.Scout, // Cannot capture
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: Move into city -> Should fail
        expect(() => applyAction(state, {
            type: "MoveUnit",
            playerId: "p1",
            unitId: "u1",
            to: { q: 0, r: 0 },
        })).toThrow("Unit cannot capture cities");
    });

    it("should heal cities at the start of the turn", () => {
        // Setup City for P1 with damaged HP
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 0, r: 0 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [{ q: 0, r: 0 }],
            currentBuild: null,
            buildProgress: 0,
            hp: 10, // Damaged
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        state.map.tiles[0].ownerId = "p1";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Action: End Turn (P1 -> P2)
        let nextState = applyAction(state, { type: "EndTurn", playerId: "p1" });

        // Action: End Turn (P2 -> P1) - P1's turn starts here, healing should trigger
        nextState = applyAction(nextState, { type: "EndTurn", playerId: "p2" });

        const city = nextState.cities.find(c => c.id === "c1");
        expect(city).toBeDefined();
        expect(city!.hp).toBe(12); // 10 + 2
    });

    it("should NOT heal a city that was damaged this turn", () => {
        // Setup City for P2
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p2",
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
        });
        state.map.tiles[0].ownerId = "p2";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Setup Attacker for P1
        state.units.push({
            id: "u1",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Turn 1: P1 attacks P2's city
        let nextState = applyAction(state, {
            type: "Attack",
            playerId: "p1",
            attackerId: "u1",
            targetId: "c1",
            targetType: "City",
        });

        let city = nextState.cities.find(c => c.id === "c1");
        const damagedHp = city!.hp;
        expect(damagedHp).toBeLessThan(20);

        // P1 ends turn -> P2's turn starts (still turn 1)
        // City should NOT heal because it was damaged this turn
        nextState = applyAction(nextState, { type: "EndTurn", playerId: "p1" });

        city = nextState.cities.find(c => c.id === "c1");
        expect(city!.hp).toBe(damagedHp); // No healing!

        // P2 ends turn -> Turn 2, P1's turn
        nextState = applyAction(nextState, { type: "EndTurn", playerId: "p2" });

        // P1 ends turn -> P2's turn starts (turn 2)
        // City SHOULD heal now because it wasn't damaged on turn 2
        nextState = applyAction(nextState, { type: "EndTurn", playerId: "p1" });

        city = nextState.cities.find(c => c.id === "c1");
        expect(city!.hp).toBe(damagedHp + 2); // Healed by 2!
    });
});
