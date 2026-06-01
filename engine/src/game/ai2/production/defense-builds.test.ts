import { describe, expect, it } from "vitest";
import { BuildingType, EraId, GameState, PlayerPhase, ProjectId, TechId, UnitType } from "../../../core/types.js";
import { pickDefensiveLorekeeperBuild } from "./civ-builds.js";
import { pickBulwarkBuild } from "./defense-builds.js";
import { pickProactiveReinforcementBuild } from "./proactive.js";

function makeState(): GameState {
    return {
        id: "scholar-defense-test",
        turn: 140,
        players: [
            {
                id: "p1",
                civName: "ScholarKingdoms",
                color: "#fff",
                isAI: true,
                aiGoal: "Progress",
                techs: [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.CityWards, TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: EraId.Engine,
                treasury: 250,
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: {
            width: 20,
            height: 20,
            tiles: [{ coord: { q: 0, r: 0 }, terrain: "Plains", overlays: [] } as any],
        },
        units: [],
        cities: [
            {
                id: "c1",
                name: "Capital",
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
            {
                id: "c2",
                name: "Second",
                ownerId: "p1",
                coord: { q: 2, r: 0 },
                pop: 3,
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
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    } as unknown as GameState;
}

function makeContext(state: GameState): any {
    return {
        profile: {
            civName: "ScholarKingdoms",
            economy: {
                deficitToleranceTurns: 4,
                upkeepRatioLimit: 0.36,
            },
        },
        player: state.players[0],
        myCities: state.cities,
        myUnits: state.units,
        myMilitaryUnits: state.units,
        unlockedUnits: [UnitType.Lorekeeper, UnitType.SpearGuard, UnitType.BowGuard],
        atWar: true,
        economy: {
            economyState: "Guarded",
            netGold: 8,
            deficitRiskTurns: Number.POSITIVE_INFINITY,
            upkeepRatio: 0.2,
            treasury: 250,
            reserveFloor: 120,
        },
    };
}

describe("Scholar defensive behavior trims", () => {
    it("delays Bulwark until Observatory is complete", () => {
        const state = makeState();
        const context = makeContext(state);

        expect(pickBulwarkBuild(state, state.cities[0]!, "Progress", context)).toBeNull();
    });

    it("allows Bulwark after Observatory on the Progress path", () => {
        const state = makeState();
        state.players[0]!.completedProjects = [ProjectId.Observatory];
        const context = makeContext(state);

        expect(pickBulwarkBuild(state, state.cities[0]!, "Progress", context)).toEqual({
            type: "Building",
            id: BuildingType.Bulwark,
        });
    });

    it("keeps Scholar Lorekeeper demand below the old saturation target", () => {
        const state = makeState();
        state.units = [
            {
                id: "l1",
                ownerId: "p1",
                type: UnitType.Lorekeeper,
                coord: { q: 0, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                hasAttacked: false,
                state: "Normal",
            } as any,
            {
                id: "l2",
                ownerId: "p1",
                type: UnitType.Lorekeeper,
                coord: { q: 2, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 1,
                hasAttacked: false,
                state: "Normal",
            } as any,
        ];
        const context = makeContext(state);
        context.myUnits = state.units;
        context.myMilitaryUnits = state.units;

        expect(pickDefensiveLorekeeperBuild(state, state.cities[0]!, context)).toBeNull();
    });

    it("stops Scholar proactive reinforcement at the lower military cap", () => {
        const state = makeState();
        state.units = Array.from({ length: 5 }, (_, index) => ({
            id: `u${index}`,
            ownerId: "p1",
            type: index < 3 ? UnitType.SpearGuard : UnitType.BowGuard,
            coord: { q: index, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            hasAttacked: false,
            state: "Normal",
        })) as any;
        const context = makeContext(state);
        context.myUnits = state.units;
        context.myMilitaryUnits = state.units;

        expect(pickProactiveReinforcementBuild(state, "p1", state.cities[0]!, context)).toBeNull();
    });
});
