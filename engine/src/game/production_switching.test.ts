import { describe, it, expect } from "vitest";
import { GameState, UnitType, BuildingType, Player, City, TerrainType, PlayerPhase } from "../core/types";
import { handleSetCityBuild } from "./actions/cities";

describe("City Production Switching", () => {
    const mockPlayer: Player = {
        id: "p1",
        civName: "TestCiv",
        color: "#000000",
        techs: ["Fieldcraft" as any], // Cast to any to avoid importing TechId if lazy, or better import it.
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
    };

    const mockCity: City = {
        id: "c1",
        name: "Test City",
        ownerId: "p1",
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
        savedProduction: {},
    };

    const mockState: GameState = {
        id: "game1",
        turn: 1,
        players: [mockPlayer],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: {
            width: 10,
            height: 10,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", hasCityCenter: true },
                { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1" },
            ],
        },
        units: [],
        cities: [mockCity],
        seed: 12345,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    };

    it("should save progress when switching production", () => {
        // Start building a Warrior (SpearGuard)
        let state = handleSetCityBuild(mockState, {
            type: "SetCityBuild",
            playerId: "p1",
            cityId: "c1",
            buildType: "Unit",
            buildId: UnitType.SpearGuard,
        });

        let city = state.cities[0];
        expect(city.currentBuild?.id).toBe(UnitType.SpearGuard);

        // Simulate some progress
        city.buildProgress = 10;

        // Switch to Granary (Farmstead)
        state = handleSetCityBuild(state, {
            type: "SetCityBuild",
            playerId: "p1",
            cityId: "c1",
            buildType: "Building",
            buildId: BuildingType.Farmstead,
        });

        city = state.cities[0];
        expect(city.currentBuild?.id).toBe(BuildingType.Farmstead);
        expect(city.buildProgress).toBe(0);

        // Check if Warrior progress is saved
        const key = `Unit:${UnitType.SpearGuard}`;
        expect(city.savedProduction?.[key]).toBe(10);
    });

    it("should restore progress when switching back", () => {
        let state = mockState;
        let city = state.cities[0];

        // Ensure we have saved progress from previous test (or setup fresh)
        // Let's setup fresh state for clarity
        city.savedProduction = {
            [`Unit:${UnitType.SpearGuard}`]: 15
        };
        city.currentBuild = {
            type: "Building",
            id: BuildingType.Farmstead,
            cost: 100
        };
        city.buildProgress = 5;

        // Switch back to Warrior
        state = handleSetCityBuild(state, {
            type: "SetCityBuild",
            playerId: "p1",
            cityId: "c1",
            buildType: "Unit",
            buildId: UnitType.SpearGuard,
        });

        city = state.cities[0];
        expect(city.currentBuild?.id).toBe(UnitType.SpearGuard);
        expect(city.buildProgress).toBe(15);

        // Check if saved progress is removed (since it's active)
        const key = `Unit:${UnitType.SpearGuard}`;
        expect(city.savedProduction?.[key]).toBeUndefined();

        // Check if Granary progress was saved
        const granaryKey = `Building:${BuildingType.Farmstead}`;
        expect(city.savedProduction?.[granaryKey]).toBe(5);
    });
});
