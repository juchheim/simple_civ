import { describe, expect, it } from "vitest";
import {
    BuildingType,
    City,
    DiplomacyState,
    EraId,
    GameState,
    Player,
    PlayerPhase,
    TechId,
    TerrainType,
    Unit,
    UnitState,
    UnitType,
} from "../../../core/types.js";
import { classifyEconomyState, computeEconomySnapshot, type EconomySnapshot } from "./budget.js";
import { selectRushBuyDecisions } from "./spending.js";
import { runCityBuilds } from "../turn-runner/production.js";
import { pickExpansionBuild } from "../production/expansion.js";

function makePlayer(id: string, civName: string, treasury: number = 100): Player {
    return {
        id,
        civName,
        color: id === "p1" ? "#f97316" : "#60a5fa",
        isAI: id === "p1",
        aiGoal: "Balanced",
        techs: [TechId.Fieldcraft, TechId.FormationTraining, TechId.TrailMaps],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: EraId.Hearth,
        treasury,
        grossGold: 0,
        buildingUpkeep: 0,
        militaryUpkeep: 0,
        netGold: 0,
        usedSupply: 0,
        freeSupply: 0,
        austerityActive: false,
    };
}

function makeCity(id: string, ownerId: string, q: number, r: number): City {
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
        isCapital: id === "c1",
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function makeUnit(id: string, ownerId: string, type: UnitType, q: number, r: number): Unit {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        state: UnitState.Normal,
        hasAttacked: false,
    };
}

function makeState(civName: string, treasury: number = 100): GameState {
    const player = makePlayer("p1", civName, treasury);
    const enemy = makePlayer("p2", "ForgeClans", 100);

    return {
        id: "econ-test",
        turn: 30,
        players: [player, enemy],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: {
            width: 20,
            height: 20,
            tiles: [],
            rivers: [],
        },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {
            p1: { p2: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.Peace },
        },
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

describe("AI economy budget", () => {
    it("classifies Healthy/Guarded/Strained/Crisis boundaries", () => {
        expect(classifyEconomyState({
            treasury: 160,
            reserveFloor: 100,
            netGold: 4,
            deficitRiskTurns: Number.POSITIVE_INFINITY,
        }, false)).toBe("Healthy");

        expect(classifyEconomyState({
            treasury: 110,
            reserveFloor: 100,
            netGold: 0,
            deficitRiskTurns: Number.POSITIVE_INFINITY,
        }, false)).toBe("Guarded");

        expect(classifyEconomyState({
            treasury: 99,
            reserveFloor: 100,
            netGold: -1,
            deficitRiskTurns: 8,
        }, false)).toBe("Strained");

        expect(classifyEconomyState({
            treasury: 80,
            reserveFloor: 100,
            netGold: -10,
            deficitRiskTurns: 2,
        }, false)).toBe("Crisis");
    });

    it("never approves rush-buys that would push treasury below reserve floor", () => {
        const state = makeState("ForgeClans", 50);
        const city = makeCity("c1", "p1", 0, 0);
        city.currentBuild = { type: "Unit", id: UnitType.SpearGuard, cost: 20 };
        city.buildProgress = 0;
        state.cities = [city];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
        ];
        state.units = [makeUnit("e1", "p2", UnitType.SpearGuard, 1, 0)];
        state.diplomacy = {
            p1: { p2: DiplomacyState.War },
            p2: { p1: DiplomacyState.War },
        };

        const syntheticSnapshot: EconomySnapshot = {
            grossGold: 8,
            buildingUpkeep: 0,
            militaryUpkeep: 0,
            netGold: 8,
            treasury: 50,
            reserveFloor: 45,
            deficitRiskTurns: Number.POSITIVE_INFINITY,
            economyState: "Healthy",
            spendableTreasury: 100,
            usedSupply: 0,
            freeSupply: 4,
            upkeepRatio: 0,
            atWar: false,
        };

        const decisions = selectRushBuyDecisions(state, "p1", syntheticSnapshot);
        expect(decisions).toEqual([]);
    });

    it("uses discounted rush-buy costs when checking reserve floor", () => {
        const state = makeState("ForgeClans", 50);
        const city = makeCity("c1", "p1", 0, 0);
        city.buildings = [BuildingType.TradingPost]; // 5% rush-buy discount
        city.currentBuild = { type: "Unit", id: UnitType.SpearGuard, cost: 20 };
        city.buildProgress = 0;
        state.cities = [city];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
        ];
        state.units = [makeUnit("e1", "p2", UnitType.SpearGuard, 1, 0)];
        state.diplomacy = {
            p1: { p2: DiplomacyState.War },
            p2: { p1: DiplomacyState.War },
        };

        const syntheticSnapshot: EconomySnapshot = {
            grossGold: 8,
            buildingUpkeep: 0,
            militaryUpkeep: 0,
            netGold: 8,
            treasury: 50,
            reserveFloor: 31,
            deficitRiskTurns: Number.POSITIVE_INFINITY,
            economyState: "Healthy",
            spendableTreasury: 100,
            usedSupply: 0,
            freeSupply: 4,
            upkeepRatio: 0,
            atWar: false,
        };

        const decisions = selectRushBuyDecisions(state, "p1", syntheticSnapshot);
        expect(decisions.length).toBe(1);
        expect(decisions[0].goldCost).toBe(19);
    });

    it("forces economy-recovery production in Crisis", () => {
        const state = makeState("ForgeClans", 0);
        const city = makeCity("c1", "p1", 0, 0);
        state.cities = [city];
        state.map.tiles = [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] }];
        state.players[0].techs = [TechId.Fieldcraft];
        state.players[0].austerityActive = true;

        const next = runCityBuilds(state, "p1", "Balanced");
        const updated = next.cities.find(c => c.id === "c1");
        expect(updated?.currentBuild?.type).toBe("Building");
        expect(updated?.currentBuild?.id).toBe(BuildingType.TradingPost);
    });

    it("spends more aggressively for ForgeClans/Aetherian than Scholar/Starborne", () => {
        const forge = makeState("ForgeClans", 250);
        const scholar = makeState("ScholarKingdoms", 250);
        const aether = makeState("AetherianVanguard", 250);
        const starborne = makeState("StarborneSeekers", 250);

        for (const state of [forge, scholar, aether, starborne]) {
            const cityOne = makeCity("c1", "p1", 0, 0);
            cityOne.currentBuild = { type: "Unit", id: UnitType.SpearGuard, cost: 25 };
            cityOne.buildProgress = 0;
            const cityTwo = makeCity("c2", "p1", 3, 0);
            cityTwo.currentBuild = { type: "Unit", id: UnitType.SpearGuard, cost: 25 };
            cityTwo.buildProgress = 0;
            state.cities = [cityOne, cityTwo];
            state.map.tiles = [
                { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 3, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
                { coord: { q: 4, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            ];
            state.units = [
                makeUnit("e1", "p2", UnitType.SpearGuard, 1, 0),
                makeUnit("e2", "p2", UnitType.SpearGuard, 4, 0),
            ];
            state.diplomacy = {
                p1: { p2: DiplomacyState.War },
                p2: { p1: DiplomacyState.War },
            };
        }

        const forgeDecisions = selectRushBuyDecisions(forge, "p1", computeEconomySnapshot(forge, "p1"));
        const scholarDecisions = selectRushBuyDecisions(scholar, "p1", computeEconomySnapshot(scholar, "p1"));
        const aetherDecisions = selectRushBuyDecisions(aether, "p1", computeEconomySnapshot(aether, "p1"));
        const starborneDecisions = selectRushBuyDecisions(starborne, "p1", computeEconomySnapshot(starborne, "p1"));

        expect(forgeDecisions.length).toBeGreaterThan(scholarDecisions.length);
        expect(aetherDecisions.length).toBeGreaterThan(starborneDecisions.length);
    });

    it("prioritizes river/coast cities for RiverLeague economy recovery", () => {
        const state = makeState("RiverLeague", 0);
        state.turn = 20;
        state.players[0].techs = [TechId.Fieldcraft];

        const riverCity = makeCity("river", "p1", 0, 0);
        const inlandCity = makeCity("inland", "p1", 5, 0);
        state.cities = [riverCity, inlandCity];
        state.map.tiles = [
            { coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 1, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 5, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
            { coord: { q: 6, r: 0 }, terrain: TerrainType.Plains, overlays: [] },
        ];
        state.map.rivers = [{ a: { q: 0, r: 0 }, b: { q: 1, r: 0 } }];

        const next = runCityBuilds(state, "p1", "Balanced");
        const updatedRiver = next.cities.find(c => c.id === "river");
        const updatedInland = next.cities.find(c => c.id === "inland");

        expect(updatedRiver?.currentBuild?.id).toBe(BuildingType.TradingPost);
        expect(updatedInland?.currentBuild?.id).not.toBe(BuildingType.TradingPost);
    });

    it("pauses Jade settler production only under severe economy stress", () => {
        const state = makeState("JadeCovenant", 120);
        const city = makeCity("c1", "p1", 0, 0);
        city.pop = 3;
        state.cities = [city];
        state.map.tiles = [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] }];

        const context = {
            phase: "Expand",
            economy: {
                economyState: "Strained",
                upkeepRatio: 0.8,
                netGold: -6,
                deficitRiskTurns: 2,
            },
            profile: {
                civName: "JadeCovenant",
                economy: { upkeepRatioLimit: 0.56 },
                build: { settlerCap: 2, desiredCities: 6 },
            },
            myCities: [city],
            capabilities: { garrison: 2 },
            thisCityThreat: "none",
        } as any;

        expect(pickExpansionBuild(state, "p1", city, context, "expand")).toBeNull();

        context.economy.economyState = "Guarded";
        context.economy.upkeepRatio = 0.2;
        context.economy.netGold = 2;
        context.economy.deficitRiskTurns = Number.POSITIVE_INFINITY;
        expect(pickExpansionBuild(state, "p1", city, context, "expand")).toEqual({
            type: "Unit",
            id: UnitType.Settler,
        });
    });
});
