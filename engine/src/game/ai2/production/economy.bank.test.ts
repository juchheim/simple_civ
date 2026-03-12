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
                buildings: [BuildingType.TradingPost, BuildingType.MarketHall],
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

    it("chooses Bank when city works an Ore Vein tile under economy pressure", () => {
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
                buildings: [BuildingType.TradingPost, BuildingType.MarketHall],
                workedTiles: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
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
        const snapshot = {
            grossGold: 6,
            buildingUpkeep: 4,
            militaryUpkeep: 6,
            netGold: -4,
            treasury: 30,
            reserveFloor: 40,
            deficitRiskTurns: 8,
            economyState: "Strained",
            spendableTreasury: 0,
            usedSupply: 6,
            freeSupply: 4,
            upkeepRatio: 1.67,
            atWar: false,
        } as const;

        const choice = pickEconomyBuilding(state, "p1", state.cities[0], "ForgeClans", snapshot);
        expect(choice).toEqual({ type: "Building", id: BuildingType.Bank });
    });

    it("holds second gold buildings until another idle city has first gold coverage", () => {
        const state = makeBaseState();
        state.players[0].techs = [TechId.Fieldcraft, TechId.Wellworks, TechId.UrbanPlans];
        state.cities = [
            {
                id: "c1",
                name: "Capital",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 5,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.TradingPost],
                workedTiles: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            },
            {
                id: "c2",
                name: "Frontier",
                ownerId: "p1",
                coord: { q: 3, r: 0 },
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [{ q: 3, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: false,
                hasFiredThisTurn: false,
                milestones: [],
            },
        ];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1", hasCityCenter: true },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Hills, overlays: [OverlayType.OreVein], ownerId: "p1", ownerCityId: "c1" },
            { coord: { q: 3, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c2", hasCityCenter: true },
            { coord: { q: 4, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c2" },
        ];
        const snapshot = {
            grossGold: 6,
            buildingUpkeep: 4,
            militaryUpkeep: 6,
            netGold: -4,
            treasury: 30,
            reserveFloor: 40,
            deficitRiskTurns: 8,
            economyState: "Strained",
            spendableTreasury: 0,
            usedSupply: 6,
            freeSupply: 4,
            upkeepRatio: 1.67,
            atWar: false,
        } as const;

        const upgradedCapital = pickEconomyBuilding(state, "p1", state.cities[0], "ForgeClans", snapshot);
        const frontierChoice = pickEconomyBuilding(state, "p1", state.cities[1], "ForgeClans", snapshot);

        expect(upgradedCapital).toBeNull();
        expect(frontierChoice).toEqual({ type: "Building", id: BuildingType.TradingPost });
    });

    it("ignores scatter gating during austerity", () => {
        const state = makeBaseState();
        state.players[0].techs = [TechId.Fieldcraft, TechId.Wellworks];
        state.players[0].austerityActive = true;
        state.cities = [
            {
                id: "c1",
                name: "Capital",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 6,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.TradingPost],
                workedTiles: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            },
            {
                id: "c2",
                name: "Frontier",
                ownerId: "p1",
                coord: { q: 3, r: 0 },
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [{ q: 3, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: false,
                hasFiredThisTurn: false,
                milestones: [],
            },
        ];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1", hasCityCenter: true },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Hills, overlays: [OverlayType.OreVein], ownerId: "p1", ownerCityId: "c1" },
            { coord: { q: 3, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c2", hasCityCenter: true },
            { coord: { q: 4, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c2" },
        ];
        const snapshot = {
            grossGold: 5,
            buildingUpkeep: 4,
            militaryUpkeep: 6,
            netGold: -5,
            treasury: 18,
            reserveFloor: 36,
            deficitRiskTurns: 4,
            economyState: "Crisis",
            spendableTreasury: 0,
            usedSupply: 6,
            freeSupply: 4,
            upkeepRatio: 2,
            atWar: false,
        } as const;

        const choice = pickEconomyBuilding(state, "p1", state.cities[0], "ForgeClans", snapshot);
        expect(choice).toEqual({ type: "Building", id: BuildingType.MarketHall });
    });
});
