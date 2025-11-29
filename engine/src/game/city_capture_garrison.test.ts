import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState, BuildingType, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("City Capture with Garrison", () => {
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
            diplomacy: {
                "p1": { "p2": DiplomacyState.War },
                "p2": { "p1": DiplomacyState.War }
            },
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
        };
    });

    it("Scenario 1: City has unit, 0 HP, enemy attempts capture (MoveUnit)", () => {
        // Setup City for P2 with 0 HP
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
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

        // Garrison Unit for P2
        state.units.push({
            id: "u_garrison",
            type: UnitType.SpearGuard,
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Fortified,
            hasAttacked: false,
        });

        // Attacker for P1
        state.units.push({
            id: "u_attacker",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: MoveUnit (Capture)
        const nextState = applyAction(state, {
            type: "MoveUnit",
            playerId: "p1",
            unitId: "u_attacker",
            to: { q: 0, r: 0 },
        });

        // Expectation: City captured, Garrison removed
        const city = nextState.cities.find(c => c.id === "c1");
        expect(city!.ownerId).toBe("p1");

        const garrison = nextState.units.find(u => u.id === "u_garrison");
        expect(garrison).toBeUndefined();

        const attacker = nextState.units.find(u => u.id === "u_attacker");
        expect(attacker!.coord).toEqual({ q: 0, r: 0 });
    });

    it("Scenario 2: City has unit, 1 HP, attacked by unit who would capture", () => {
        // Setup City for P2 with 1 HP
        state.cities.push({
            id: "c1",
            name: "City1",
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            pop: 1,
            storedFood: 0,
            storedProduction: 0,
            buildings: [],
            workedTiles: [],
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

        // Garrison Unit for P2
        state.units.push({
            id: "u_garrison",
            type: UnitType.SpearGuard,
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            hp: 10,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Fortified,
            hasAttacked: false,
        });

        // Attacker for P1
        state.units.push({
            id: "u_attacker",
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: 0, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Action: Attack City
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p1",
            attackerId: "u_attacker",
            targetId: "c1",
            targetType: "City",
        });

        // Expectation: City captured, Garrison removed
        const city = nextState.cities.find(c => c.id === "c1");
        expect(city!.ownerId).toBe("p1");

        const garrison = nextState.units.find(u => u.id === "u_garrison");
        expect(garrison).toBeUndefined();

        const attacker = nextState.units.find(u => u.id === "u_attacker");
        expect(attacker!.coord).toEqual({ q: 0, r: 0 });
    });
});
