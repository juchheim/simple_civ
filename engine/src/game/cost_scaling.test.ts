import { describe, it, expect } from "vitest";
import { getProjectCost } from "./rules";
import { ProjectId, GameState, Player, City, PlayerPhase, TerrainType } from "../core/types";
import { handleSetCityBuild } from "./actions/cities";
import { PROJECTS } from "../core/constants";

describe("Project Cost Scaling", () => {
    it("should return base cost at turn 0", () => {
        const cost = getProjectCost(ProjectId.HarvestFestival, 0);
        expect(cost).toBe(100);
    });

    it("should return base cost at turn 24", () => {
        const cost = getProjectCost(ProjectId.HarvestFestival, 24);
        expect(cost).toBe(100);
    });

    it("should return 2x cost at turn 25", () => {
        const cost = getProjectCost(ProjectId.HarvestFestival, 25);
        expect(cost).toBe(200);
    });

    it("should return 3x cost at turn 50", () => {
        const cost = getProjectCost(ProjectId.HarvestFestival, 50);
        expect(cost).toBe(300);
    });

    it("should NOT scale static projects", () => {
        const cost0 = getProjectCost(ProjectId.Observatory, 0);
        const cost50 = getProjectCost(ProjectId.Observatory, 50);
        expect(cost0).toBe(220); // New base cost
        expect(cost50).toBe(220);
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
            turn: 50, // Turn 50 -> 3x cost
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
});
