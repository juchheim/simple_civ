import { describe, it, expect } from "vitest";
import { getMapSpecificVictoryRules, getProgressVictoryCityRequirement, getProjectCost } from "./rules";
import { ProjectId, TechId, GameState, Player, City, PlayerPhase, TerrainType } from "../core/types";
import { handleSetCityBuild } from "./actions/cities";

describe("Project Cost Scaling", () => {
    it("should return base cost at turn 0", () => {
        const cost = getProjectCost(ProjectId.HarvestFestival, 0);
        expect(cost).toBe(100);
    });

    it("should return base cost at turn 39", () => {
        const cost = getProjectCost(ProjectId.HarvestFestival, 39);
        expect(cost).toBe(100);
    });

    it("should return 2x cost at turn 40", () => {
        const cost = getProjectCost(ProjectId.HarvestFestival, 40);
        expect(cost).toBe(200);
    });

    it("should return 3x cost at turn 80", () => {
        const cost = getProjectCost(ProjectId.HarvestFestival, 80);
        expect(cost).toBe(300);
    });

    it("should NOT scale static projects", () => {
        const cost0 = getProjectCost(ProjectId.Observatory, 0);
        const cost50 = getProjectCost(ProjectId.Observatory, 50);
        expect(cost0).toBe(400);
        expect(cost50).toBe(400);
    });

    it("scales Progress projects by map size on large and huge maps", () => {
        const largeCost = getProjectCost(ProjectId.Observatory, 0, { width: 35, height: 25 });
        const hugeCost = getProjectCost(ProjectId.Observatory, 0, { width: 40, height: 30 });

        expect(largeCost).toBe(440);
        expect(hugeCost).toBe(480);
    });

    it("keeps Progress victory city requirements at the default threshold across map sizes", () => {
        expect(getProgressVictoryCityRequirement({ width: 35, height: 25 })).toBe(1);
        expect(getProgressVictoryCityRequirement({ width: 40, height: 30 })).toBe(1);
    });

    it("does not describe map-specific victory rules when the rules are standard", () => {
        expect(getMapSpecificVictoryRules("Standard")).toEqual([]);
        expect(getMapSpecificVictoryRules("Large")).toEqual([]);
        expect(getMapSpecificVictoryRules("Huge")).toEqual([]);
    });

    it("should set scaled cost in city build", () => {
        const mockPlayer: Player = {
            id: "p1",
            civName: "TestCiv",
            color: "#000000",
            techs: ["Fieldcraft" as any],
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
            buildings: ["Farmstead" as any], // Prereq for HarvestFestival
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
            turn: 80, // Turn 80 -> 3x cost
            players: [mockPlayer],
            currentPlayerId: "p1",
            phase: PlayerPhase.Action,
            map: {
                width: 10,
                height: 10,
                tiles: [
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", hasCityCenter: true },
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

        const state = handleSetCityBuild(mockState, {
            type: "SetCityBuild",
            playerId: "p1",
            cityId: "c1",
            buildType: "Project",
            buildId: ProjectId.HarvestFestival,
        });

        const city = state.cities[0];
        expect(city.currentBuild?.id).toBe(ProjectId.HarvestFestival);
        expect(city.currentBuild?.cost).toBe(300); // 100 * 3
    });

    it("uses map-scaled Progress costs without late-map or civ-specific discounts", () => {
        const mockPlayer: Player = {
            id: "p1",
            civName: "StarborneSeekers",
            color: "#000000",
            techs: [TechId.StarCharts],
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
            id: "game2",
            turn: 250,
            players: [mockPlayer],
            currentPlayerId: "p1",
            phase: PlayerPhase.Action,
            map: {
                width: 35,
                height: 25,
                tiles: [
                    { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", hasCityCenter: true },
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

        const state = handleSetCityBuild(mockState, {
            type: "SetCityBuild",
            playerId: "p1",
            cityId: "c1",
            buildType: "Project",
            buildId: ProjectId.Observatory,
        });

        const city = state.cities[0];
        expect(city.currentBuild?.id).toBe(ProjectId.Observatory);
        expect(city.currentBuild?.cost).toBe(440);
    });
});
