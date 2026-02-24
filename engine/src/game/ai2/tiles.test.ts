import { describe, expect, it } from "vitest";
import { BuildingType, DiplomacyState, EraId, GameState, OverlayType, PlayerPhase, TerrainType, TechId } from "../../core/types.js";
import { assignWorkedTilesV2 } from "./tiles.js";

function makeBaseState(): GameState {
    return {
        id: "ai2-tiles",
        turn: 40,
        players: [
            {
                id: "p1",
                civName: "ForgeClans",
                color: "#fff",
                isAI: true,
                aiGoal: "Balanced",
                techs: [TechId.Fieldcraft],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Hearth,
                treasury: 80,
                grossGold: 8,
                buildingUpkeep: 0,
                militaryUpkeep: 0,
                netGold: 8,
                usedSupply: 0,
                freeSupply: 4,
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

describe("assignWorkedTilesV2", () => {
    it("uses owned city territory instead of only previously worked tiles", () => {
        const state = makeBaseState();
        state.cities = [
            {
                id: "c1",
                name: "Capital",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 2,
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
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Desert, overlays: [OverlayType.SacredSite], ownerId: "p1", ownerCityId: "c1" },
        ];

        const next = assignWorkedTilesV2(state, "p1", "Balanced");
        const city = next.cities[0];
        expect(city.workedTiles).toContainEqual({ q: 0, r: 1 });
        expect(city.workedTiles.length).toBe(2);
    });

    it("reserves an Ore Vein tile when Bank is active", () => {
        const state = makeBaseState();
        state.players[0].techs.push(TechId.SignalRelay);
        state.cities = [
            {
                id: "c1",
                name: "Ironbank",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.Bank],
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
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Plains, overlays: [OverlayType.SacredSite], ownerId: "p1", ownerCityId: "c1" },
        ];

        const next = assignWorkedTilesV2(state, "p1", "Progress");
        const city = next.cities[0];
        expect(city.workedTiles).toContainEqual({ q: 1, r: 0 });
    });

    it("biases toward food when MarketHall is active below pop 5", () => {
        const state = makeBaseState();
        state.cities = [
            {
                id: "c1",
                name: "Bazaar",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.MarketHall],
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
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [OverlayType.SacredSite], ownerId: "p1", ownerCityId: "c1" },
            { coord: { q: 0, r: 1 }, terrain: TerrainType.Marsh, overlays: [], ownerId: "p1", ownerCityId: "c1" },
        ];

        const next = assignWorkedTilesV2(state, "p1", "Progress");
        const city = next.cities[0];
        expect(city.workedTiles).toContainEqual({ q: 0, r: 1 });
    });
});
