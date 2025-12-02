import { describe, it, expect, beforeEach } from "vitest";
import { GameState, PlayerPhase, UnitType, TerrainType, UnitState, DiplomacyState } from "../core/types.js";
import { applyAction } from "./turn-loop.js";

describe("Garrison Attack Reproduction", () => {
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

    it("attacking a garrisoned unit currently damages the unit (BUG)", () => {
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

        // Garrison Unit for P1
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

        // Attacker for P2
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

        // Attack the garrisoned unit directly
        const nextState = applyAction(state, {
            type: "Attack",
            playerId: "p2",
            attackerId: "u_attacker",
            targetId: "u_garrison", // Targeting the unit, not the city
            targetType: "Unit",
        });

        const garrison = nextState.units.find((u) => u.id === "u_garrison")!;
        const city = nextState.cities.find((c) => c.id === "c1")!;

        // FIXED BEHAVIOR: Garrison takes NO damage, City takes damage
        expect(garrison.hp).toBe(10);
        expect(city.hp).toBeLessThan(20);
    });
});
