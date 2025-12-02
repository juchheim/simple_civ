import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("Garrison System v1.0", () => {
    let state: GameState;

    beforeEach(() => {
        state = {
            id: "test-game",
            turn: 1,
            players: [
                { id: "p1", civName: "Civ1", color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
                { id: "p2", civName: "Civ2", color: "blue", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            ],
            currentPlayerId: "p2", // Attacker player
            phase: PlayerPhase.Action,
            map: {
                width: 10,
                height: 10,
                tiles: [
                    { coord: { q: 5, r: 5 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 5, r: 6 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 5, r: 7 }, terrain: TerrainType.Plains, overlays: [] },
                    { coord: { q: 3, r: 5 }, terrain: TerrainType.Plains, overlays: [] },
                ],
            },
            units: [],
            cities: [],
            seed: 123,
            visibility: {},
            revealed: {},
            diplomacy: {
                "p1": { "p2": DiplomacyState.War },
                "p2": { "p1": DiplomacyState.War }
            },
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
        };
    });

    it("ungarrisoned city cannot retaliate", () => {
        // Ungarrisoned city
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            pop: 3,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 15,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        // Attacker 2 hexes away
        state.units.push({
            id: "u_attacker",
            type: UnitType.BowGuard,
            ownerId: "p2",
            coord: { q: 5, r: 7 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const attackerInitialHp = state.units[0].hp;

        // Attack the ungarrisoned city
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;
        expect(attacker.hp).toBe(attackerInitialHp);
    });

    it("ranged garrison retaliates at range 2", () => {
        // City with ranged garrison
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            pop: 3,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 15,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        // Ranged garrison
        state.units.push({
            id: "u_garrison",
            type: UnitType.BowGuard,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Attacker at range 2
        state.units.push({
            id: "u_attacker",
            type: UnitType.BowGuard,
            ownerId: "p2",
            coord: { q: 5, r: 7 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const attackerInitialHp = 10;

        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;
        expect(attacker.hp).toBeLessThan(attackerInitialHp);
    });

    it("melee garrison does NOT retaliate at range 2", () => {
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            pop: 3,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 15,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        // Melee garrison
        state.units.push({
            id: "u_garrison",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Attacker at range 2
        state.units.push({
            id: "u_attacker",
            type: UnitType.BowGuard,
            ownerId: "p2",
            coord: { q: 5, r: 7 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const attackerInitialHp = 10;

        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;
        expect(attacker.hp).toBe(attackerInitialHp);
    });

    it("melee garrison DOES retaliate at range 1", () => {
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            pop: 3,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 15,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        // Melee garrison
        state.units.push({
            id: "u_garrison",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Attacker at range 1
        state.units.push({
            id: "u_attacker",
            type: UnitType.SpearGuard,
            ownerId: "p2",
            coord: { q: 5, r: 6 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const attackerInitialHp = 10;

        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;
        expect(attacker.hp).toBeLessThan(attackerInitialHp);
    });

    it("settler provides no garrison bonus", () => {
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            pop: 3,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 15,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        // Settler "garrison"
        state.units.push({
            id: "u_settler",
            type: UnitType.Settler,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 1,
            maxHp: 1,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Attacker
        state.units.push({
            id: "u_attacker",
            type: UnitType.BowGuard,
            ownerId: "p2",
            coord: { q: 5, r: 7 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const attackerInitialHp = 10;

        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;
        expect(attacker.hp).toBe(attackerInitialHp);
    });

    it("garrison destroyed on city capture", () => {
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            pop: 3,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
            currentBuild: null,
            buildProgress: 0,
            hp: 1, // Low HP
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });

        state.map.tiles[0].ownerId = "p1";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Garrison
        state.units.push({
            id: "u_garrison",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 5, r: 5 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Captor
        state.units.push({
            id: "u_captor",
            type: UnitType.SpearGuard,
            ownerId: "p2",
            coord: { q: 5, r: 6 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_captor",
            targetId: "c1",
            targetType: "City",
        });

        const garrison = nextState.units.find((u) => u.id === "u_garrison");
        expect(garrison).toBeUndefined();

        const city = nextState.cities.find((c) => c.id === "c1")!;
        expect(city.ownerId).toBe("p2");
    });
});
