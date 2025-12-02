import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("Garrison Retaliation Bug", () => {
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
                    { coord: { q: 5, r: 5 }, terrain: TerrainType.Plains, overlays: [] }, // City
                    { coord: { q: 5, r: 6 }, terrain: TerrainType.Plains, overlays: [] }, // Range 1
                    { coord: { q: 5, r: 7 }, terrain: TerrainType.Plains, overlays: [] }, // Range 2
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

    it("should retaliate against SpearGuard (Range 1)", () => {
        // City for P1
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
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        state.map.tiles[0].ownerId = "p1";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Garrison Unit for P1 (BowGuard - Range 2)
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

        // Attacker for P2 (SpearGuard - Range 1)
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

        // Attack the city
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;

        // Should take damage from retaliation
        expect(attacker.hp).toBeLessThan(10);
    });

    it("should retaliate against BowGuard (Range 2)", () => {
        // City for P1
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
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        state.map.tiles[0].ownerId = "p1";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Garrison Unit for P1 (BowGuard - Range 2)
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

        // Attacker for P2 (BowGuard - Range 2)
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

        // Attack the city
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;

        // Should take damage from retaliation
        expect(attacker.hp).toBeLessThan(10);
    });

    it("should retaliate when attack is REDIRECTED from garrison to city", () => {
        // City for P1
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
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        state.map.tiles[0].ownerId = "p1";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Garrison Unit for P1 (BowGuard - Range 2)
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

        // Attacker for P2 (SpearGuard - Range 1)
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

        // Attack the GARRISON UNIT directly
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "u_garrison", // Target Unit
            targetType: "Unit",
        });

        const attacker = nextState.units.find((u) => u.id === "u_attacker")!;
        const city = nextState.cities.find((c) => c.id === "c1")!;

        // 1. City should take damage (Redirect worked)
        expect(city.hp).toBeLessThan(20);

        // 2. Attacker should take retaliation damage (Retaliation worked)
        expect(attacker.hp).toBeLessThan(10);
    });
});
