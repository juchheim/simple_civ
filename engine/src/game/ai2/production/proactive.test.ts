import { describe, expect, it } from "vitest";
import {
    DiplomacyState,
    EraId,
    GameState,
    PlayerPhase,
    TerrainType,
    TechId,
    UnitState,
    UnitType,
} from "../../../core/types.js";
import { pickProactiveReinforcementBuild } from "./proactive.js";

function makeState(): GameState {
    return {
        id: "proactive-test",
        turn: 70,
        players: [
            {
                id: "p1",
                civName: "ForgeClans",
                color: "#f97316",
                isAI: true,
                aiGoal: "Conquest",
                techs: [TechId.Fieldcraft, TechId.FormationTraining],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Banner,
                treasury: 220,
                grossGold: 0,
                buildingUpkeep: 0,
                militaryUpkeep: 0,
                netGold: 0,
                usedSupply: 0,
                freeSupply: 0,
                austerityActive: false,
            },
            {
                id: "p2",
                civName: "RiverLeague",
                color: "#60a5fa",
                isAI: true,
                aiGoal: "Conquest",
                techs: [TechId.Fieldcraft],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Hearth,
                treasury: 100,
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
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: {
            width: 20,
            height: 20,
            tiles: [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [] }],
            rivers: [],
        },
        units: [],
        cities: [
            {
                id: "c1",
                name: "Capital",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 3,
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
            {
                id: "c2",
                name: "Second",
                ownerId: "p1",
                coord: { q: 2, r: 0 },
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [{ q: 2, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: false,
                hasFiredThisTurn: false,
                milestones: [],
            },
        ],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {
            p1: { p2: DiplomacyState.War },
            p2: { p1: DiplomacyState.War },
        },
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

describe("proactive reinforcement production", () => {
    it("keeps producing military at war when economy has headroom despite high upkeep ratio", () => {
        const state = makeState();
        state.units = [
            {
                id: "u1",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 0, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "u2",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 1, r: 0 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
            {
                id: "u3",
                ownerId: "p1",
                type: UnitType.BowGuard,
                coord: { q: 1, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            },
        ];

        const context: any = {
            atWar: true,
            economy: {
                economyState: "Guarded",
                netGold: 8,
                deficitRiskTurns: Number.POSITIVE_INFINITY,
                upkeepRatio: 0.62,
                treasury: 220,
                reserveFloor: 150,
            },
            profile: {
                civName: "ForgeClans",
                economy: {
                    deficitToleranceTurns: 3,
                    upkeepRatioLimit: 0.44,
                },
            },
            myMilitaryUnits: state.units.filter(unit => unit.ownerId === "p1"),
            myCities: state.cities.filter(city => city.ownerId === "p1"),
            unlockedUnits: [UnitType.SpearGuard, UnitType.BowGuard],
        };

        const city = state.cities.find(c => c.id === "c1");
        const build = pickProactiveReinforcementBuild(state, "p1", city!, context);
        expect(build).not.toBeNull();
        expect(build?.type).toBe("Unit");
    });
});
