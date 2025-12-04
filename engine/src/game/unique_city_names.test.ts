import { describe, it, expect, beforeEach } from "vitest";
import { GameState, UnitType, Unit, UnitState, PlayerPhase } from "../core/types.js";
import { handleFoundCity, handleRazeCity } from "./actions/cities.js";
import { getCityName, captureCity } from "./helpers/cities.js";
import { CITY_NAMES } from "../core/constants.js";

describe("Unique City Naming", () => {
    let state: GameState;
    const playerId = "p1";
    const civName = "ForgeClans"; // Using a valid civ name key

    beforeEach(() => {
        state = {
            id: "test-game",
            turn: 1,
            players: [{ id: playerId, civName, color: "red", techs: [], currentTech: null, completedProjects: [], isEliminated: false }],
            currentPlayerId: playerId,
            phase: PlayerPhase.Action,
            map: { width: 10, height: 10, tiles: [] },
            units: [],
            cities: [],
            seed: 12345,
            visibility: {},
            revealed: {},
            diplomacy: {},
            sharedVision: {},
            contacts: {},
            diplomacyOffers: [],
            usedCityNames: [],
        } as unknown as GameState;

        // Mock tiles
        for (let q = 0; q < 10; q++) {
            for (let r = 0; r < 10; r++) {
                state.map.tiles.push({
                    coord: { q, r },
                    terrain: "Plains",
                    overlays: [],
                } as any);
            }
        }
    });

    it("should track used city names when founding a city", () => {
        const unitId = "u1";
        const coord = { q: 1, r: 1 };
        state.units.push({
            id: unitId,
            type: UnitType.Settler,
            ownerId: playerId,
            coord,
            movesLeft: 1,
            state: UnitState.Normal,
            hp: 10,
            maxHp: 10,
            hasAttacked: false,
        } as Unit);

        state = handleFoundCity(state, { type: "FoundCity", playerId, unitId, name: "" });

        expect(state.cities.length).toBe(1);
        const cityName = state.cities[0].name;
        expect(state.usedCityNames).toContain(cityName);
    });

    it("should not reuse a name even if the city is razed", () => {
        // Found a city
        const unitId = "u1";
        const coord = { q: 1, r: 1 };
        state.units.push({
            id: unitId,
            type: UnitType.Settler,
            ownerId: playerId,
            coord,
            movesLeft: 1,
            state: UnitState.Normal,
            hp: 10,
            maxHp: 10,
            hasAttacked: false,
        } as Unit);

        state = handleFoundCity(state, { type: "FoundCity", playerId, unitId, name: "" });
        const firstCityName = state.cities[0].name;
        const cityId = state.cities[0].id;

        // Add garrison to allow razing
        state.units.push({
            id: "g1",
            type: UnitType.SpearGuard,
            ownerId: playerId,
            coord,
            movesLeft: 1,
            state: UnitState.Normal,
            hp: 10,
            maxHp: 10,
            hasAttacked: false,
        } as Unit);

        // Raze the city
        state = handleRazeCity(state, { type: "RazeCity", playerId, cityId });
        expect(state.cities.length).toBe(0);
        expect(state.usedCityNames).toContain(firstCityName);

        // Found another city
        const unitId2 = "u2";
        const coord2 = { q: 2, r: 2 };
        state.units.push({
            id: unitId2,
            type: UnitType.Settler,
            ownerId: playerId,
            coord: coord2,
            movesLeft: 1,
            state: UnitState.Normal,
            hp: 10,
            maxHp: 10,
            hasAttacked: false,
        } as Unit);

        state = handleFoundCity(state, { type: "FoundCity", playerId, unitId: unitId2, name: "" });
        const secondCityName = state.cities[0].name;

        expect(secondCityName).not.toBe(firstCityName);
        expect(state.usedCityNames).toContain(secondCityName);
    });

    it("should not reuse a name if the city is captured", () => {
        // Found a city
        const unitId = "u1";
        const coord = { q: 1, r: 1 };
        state.units.push({
            id: unitId,
            type: UnitType.Settler,
            ownerId: playerId,
            coord,
            movesLeft: 1,
            state: UnitState.Normal,
            hp: 10,
            maxHp: 10,
            hasAttacked: false,
        } as Unit);

        state = handleFoundCity(state, { type: "FoundCity", playerId, unitId, name: "" });
        const firstCityName = state.cities[0].name;
        const city = state.cities[0];

        // Capture the city
        captureCity(state, city, "p2");
        expect(city.ownerId).toBe("p2");
        expect(state.usedCityNames).toContain(firstCityName);

        // Found another city as p1
        const unitId2 = "u2";
        const coord2 = { q: 5, r: 5 };
        state.units.push({
            id: unitId2,
            type: UnitType.Settler,
            ownerId: playerId,
            coord: coord2,
            movesLeft: 1,
            state: UnitState.Normal,
            hp: 10,
            maxHp: 10,
            hasAttacked: false,
        } as Unit);

        state = handleFoundCity(state, { type: "FoundCity", playerId, unitId: unitId2, name: "" });
        const secondCityName = state.cities.find(c => c.ownerId === playerId)?.name;

        expect(secondCityName).toBeDefined();
        expect(secondCityName).not.toBe(firstCityName);
    });

    it("getCityName should return a name not in usedCityNames", () => {
        const nameList = CITY_NAMES[civName];
        if (!nameList || nameList.length < 2) throw new Error("Need at least 2 names for this test");

        state.usedCityNames = [nameList[0]]; // Pretend first name is used

        const newName = getCityName(state, civName, playerId);
        expect(newName).not.toBe(nameList[0]);
        expect(nameList).toContain(newName);
    });
});
