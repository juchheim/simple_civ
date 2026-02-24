import { describe, expect, it } from "vitest";
import { BuildingType, DiplomacyState, EraId, GameState, PlayerPhase, TerrainType } from "../../core/types.js";
import { handleRushBuyProduction } from "./cities.js";

function makeState(): GameState {
    return {
        id: "rush-buy-test",
        turn: 10,
        players: [
            {
                id: "p1",
                civName: "ForgeClans",
                color: "#fff",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Hearth,
                treasury: 50,
                grossGold: 0,
                buildingUpkeep: 0,
                militaryUpkeep: 0,
                netGold: 0,
                usedSupply: 0,
                freeSupply: 0,
                austerityActive: false,
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Action,
        map: {
            width: 5,
            height: 5,
            tiles: [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1", hasCityCenter: true },
            ],
        },
        units: [],
        cities: [
            {
                id: "c1",
                name: "Capital",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.TradingPost],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: { type: "Building", id: BuildingType.Farmstead, cost: 40 },
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            },
        ],
        seed: 1,
        visibility: { p1: [] },
        revealed: { p1: [] },
        diplomacy: { p1: {} as Record<string, DiplomacyState> },
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

describe("handleRushBuyProduction", () => {
    it("applies city rush-buy discounts and tracks saved gold", () => {
        const state = makeState();

        handleRushBuyProduction(state, {
            type: "RushBuyProduction",
            playerId: "p1",
            cityId: "c1",
        });

        const player = state.players[0];
        const city = state.cities[0];
        expect(player.treasury).toBe(12); // 40 base -> 38 after 5% TradingPost discount
        expect(player.rushBuyCount).toBe(1);
        expect(player.rushBuyGoldSpent).toBe(38);
        expect(player.rushBuyGoldSaved).toBe(2);
        expect(city.buildings).toContain(BuildingType.Farmstead);
        expect(city.currentBuild).toBeNull();
    });

    it("blocks rush-buy while austerity is active", () => {
        const state = makeState();
        state.players[0].austerityActive = true;

        expect(() =>
            handleRushBuyProduction(state, {
                type: "RushBuyProduction",
                playerId: "p1",
                cityId: "c1",
            }),
        ).toThrow(/austerity/i);
    });
});
