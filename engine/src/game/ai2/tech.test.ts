import { describe, expect, it } from "vitest";
import { BuildingType, GameState, OverlayType, PlayerPhase, TechId, TerrainType } from "../../core/types.js";
import { chooseTechV2 } from "./tech.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 5,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: { width: 20, height: 20, tiles: [] },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

function mkCity(ownerId: string, id: string, q: number, r: number, opts?: { capital?: boolean }): any {
    return {
        id,
        name: id,
        ownerId,
        coord: { q, r },
        pop: 2,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: !!opts?.capital,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkPlayer(id: string, civName: string, techs: TechId[]): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: true,
        aiGoal: "Balanced",
        techs,
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

describe("UtilityV2 AI tech selection", () => {
    it("prefers the goal chain tech when available", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans", [TechId.Fieldcraft])];
        state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];

        const tech = chooseTechV2(state, "p1", "Balanced");
        expect(tech).toBe(TechId.FormationTraining);
    });

    it("prefers Progress chain tech when goal is Progress", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "RiverLeague", [TechId.Fieldcraft])];
        state.cities = [mkCity("p1", "c1", 0, 0, { capital: true })];

        const tech = chooseTechV2(state, "p1", "Progress");
        expect(tech).toBe(TechId.ScriptLore);
    });

    it("prefers UrbanPlans over SignalRelay when the economy chain trigger is active", () => {
        const state = baseState();
        state.turn = 80;
        state.players = [
            mkPlayer("p1", "RiverLeague", [
                TechId.Fieldcraft,
                TechId.StoneworkHalls,
                TechId.ScriptLore,
                TechId.Wellworks,
                TechId.ScholarCourts,
            ]),
        ];
        state.cities = [
            {
                ...mkCity("p1", "c1", 0, 0, { capital: true }),
                pop: 5,
                buildings: [BuildingType.TradingPost, BuildingType.MarketHall],
                workedTiles: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
            },
            {
                ...mkCity("p1", "c2", 3, 0),
                pop: 4,
                buildings: [BuildingType.TradingPost, BuildingType.MarketHall],
                workedTiles: [{ q: 3, r: 0 }, { q: 4, r: 0 }],
            },
        ];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1", hasCityCenter: true },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Hills, overlays: [OverlayType.OreVein], ownerId: "p1", ownerCityId: "c1" },
            { coord: { q: 3, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c2", hasCityCenter: true },
            { coord: { q: 4, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c2" },
        ];

        const tech = chooseTechV2(state, "p1", "Progress");
        expect(tech).toBe(TechId.UrbanPlans);
    });

    it("does not suppress SignalRelay when the economy chain trigger is absent", () => {
        const state = baseState();
        state.turn = 80;
        state.players = [
            mkPlayer("p1", "RiverLeague", [
                TechId.Fieldcraft,
                TechId.StoneworkHalls,
                TechId.ScriptLore,
                TechId.Wellworks,
                TechId.ScholarCourts,
            ]),
        ];
        state.cities = [
            {
                ...mkCity("p1", "c1", 0, 0, { capital: true }),
                pop: 5,
                buildings: [BuildingType.TradingPost],
                workedTiles: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
            },
            {
                ...mkCity("p1", "c2", 3, 0),
                pop: 4,
                buildings: [],
                workedTiles: [{ q: 3, r: 0 }, { q: 4, r: 0 }],
            },
        ];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c1", hasCityCenter: true },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Hills, overlays: [OverlayType.OreVein], ownerId: "p1", ownerCityId: "c1" },
            { coord: { q: 3, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c2", hasCityCenter: true },
            { coord: { q: 4, r: 0 }, terrain: TerrainType.Plains, overlays: [], ownerId: "p1", ownerCityId: "c2" },
        ];

        const tech = chooseTechV2(state, "p1", "Progress");
        expect(tech).toBe(TechId.SignalRelay);
    });
});
