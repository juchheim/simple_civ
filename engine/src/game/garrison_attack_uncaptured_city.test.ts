import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("Garrison Attack in Unconquered City", () => {
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

    it("should redirect attack to the city when garrisoned city still has health > 0", () => {
        // Setup City for P2 with full health
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
            hp: 20,
            maxHp: 20,
            isCapital: true,
            hasFiredThisTurn: false,
            milestones: [],
        });
        state.map.tiles[0].ownerId = "p2";
        state.map.tiles[0].ownerCityId = "c1";
        state.map.tiles[0].hasCityCenter = true;

        // Garrison Unit for P2 (weak, will die in one hit)
        state.units.push({
            id: "u_garrison",
            type: UnitType.Scout,
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            hp: 1,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
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

        // Action: Attack the garrison unit
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p1",
            attackerId: "u_attacker",
            targetId: "u_garrison",
            targetType: "Unit",
        });

        // Attack is redirected to city; garrison remains
        const garrison = nextState.units.find(u => u.id === "u_garrison");
        expect(garrison).toBeDefined();
        expect(garrison?.hp).toBe(1);

        // Verify attacker did NOT move into the city
        const attacker = nextState.units.find(u => u.id === "u_attacker");
        expect(attacker!.coord).toEqual({ q: 0, r: 1 }); // Still at original position
        expect(attacker!.hp).toBe(5);

        // Verify city still belongs to P2 and took damage instead
        const city = nextState.cities.find(c => c.id === "c1");
        expect(city!.ownerId).toBe("p2");
        expect(city!.hp).toBe(16); // v2.0: Civ 6 formula deals 4 damage (was 2)
    });

    it("should allow unit to enter empty tile after defeating enemy unit (no city)", () => {
        // No city at (0, 0)

        // Defender Unit for P2
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

        // Verify attacker DID move into the tile (normal behavior)
        const attacker = nextState.units.find(u => u.id === "u_attacker");
        expect(attacker!.coord).toEqual({ q: 0, r: 0 }); // Moved into defender's position
    });

    it("should allow unit to enter city after defeating garrison when city has health <= 0", () => {
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
            type: UnitType.Scout,
            ownerId: "p2",
            coord: { q: 0, r: 0 },
            hp: 1,
            maxHp: 10,
            movesLeft: 0,
            state: UnitState.Normal,
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

        // Action: Attack the garrison unit (city is capturable)
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p1",
            attackerId: "u_attacker",
            targetId: "u_garrison",
            targetType: "Unit",
        });

        // Verify garrison was defeated
        const garrison = nextState.units.find(u => u.id === "u_garrison");
        expect(garrison).toBeUndefined();

        // Verify attacker DID move into the city (city had 0 HP, so it's capturable)
        const attacker = nextState.units.find(u => u.id === "u_attacker");
        expect(attacker!.coord).toEqual({ q: 0, r: 0 }); // Moved into city
    });
});
