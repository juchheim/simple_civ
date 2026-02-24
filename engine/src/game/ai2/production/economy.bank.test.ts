import { describe, expect, it } from "vitest";
import {
    BuildingType,
    DiplomacyState,
    EraId,
    GameState,
    OverlayType,
    PlayerPhase,
    TerrainType,
    TechId,
} from "../../../core/types.js";
import { pickEconomyBuilding } from "./economy.js";

function makeBaseState(): GameState {
    return {
        id: "economy-bank",
        turn: 80,
        players: [
            {
                id: "p1",
                civName: "ForgeClans",
                color: "#fff",
                isAI: true,
                aiGoal: "Balanced",
                techs: [TechId.UrbanPlans],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Engine,
                treasury: 160,
                grossGold: 12,
                buildingUpkeep: 0,
                militaryUpkeep: 0,
                netGold: 12,
                usedSupply: 2,
                freeSupply: 6,
                austerityActive: false,
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: {
            width: 8,
            height: 8,
            tiles: [],
            rivers: [],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: { p1: {} as Record<string, DiplomacyState> },
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

describe("pickEconomyBuilding Bank siting", () => {
    it("does not choose Bank when city has no owned Ore Vein", () => {
        const state = makeBaseState();
        state.cities = [
            {
                id: "c1",
                name: "NoOre",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 4,
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
            },
        ];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1", hasCityCenter: true },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1" },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Hills, overlays: [], ownerId: "p1", ownerCityId: "c1" },
        ];

        const choice = pickEconomyBuilding(state, "p1", state.cities[0], "ForgeClans");
        expect(choice).toBeNull();
    });

    it("chooses Bank when city owns an Ore Vein tile", () => {
        const state = makeBaseState();
        state.cities = [
            {
                id: "c1",
                name: "OreCity",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 4,
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
            },
        ];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1", hasCityCenter: true },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Hills, overlays: [OverlayType.OreVein], ownerId: "p1", ownerCityId: "c1" },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1" },
        ];

        const choice = pickEconomyBuilding(state, "p1", state.cities[0], "ForgeClans");
        expect(choice).toEqual({ type: "Building", id: BuildingType.Bank });
    });
});

