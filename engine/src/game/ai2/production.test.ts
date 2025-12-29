import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, TechId, UnitType } from "../../core/types.js";
import { chooseCityBuildV2 } from "./production.js";

const BASE_TECHS = [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore];

function baseState(): GameState {
    return {
        id: "test",
        turn: 10,
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

function mkCity(ownerId: string, id: string, q: number, r: number, opts?: { capital?: boolean; pop?: number }): any {
    return {
        id,
        name: id,
        ownerId,
        coord: { q, r },
        pop: opts?.pop ?? 2,
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

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        hasAttacked: false,
        state: "Normal",
    };
}

function mkPlayer(id: string, civName: string, techs: TechId[] = BASE_TECHS): any {
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

describe("UtilityV2 AI production (characterization)", () => {
    it("builds BowGuard when a city is under direct attack", () => {
        const state = baseState();
        state.turn = 35;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 6, 0, { capital: true }),
        ];
        state.units = [
            mkUnit("p2", "eU1", UnitType.SpearGuard, 1, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const build = chooseCityBuildV2(state, "p1", state.cities[0], "Balanced");
        expect(build).toEqual({ type: "Unit", id: UnitType.BowGuard });
    });

    it("stages for war when a focus target is set and no war is active", () => {
        const state = baseState();
        state.turn = 50;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 10, 0, { capital: true }),
        ];
        state.aiMemoryV2 = {
            p1: {
                focusTargetPlayerId: "p2",
                focusCityId: "e1",
                focusSetTurn: 50,
            },
        };
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

        const build = chooseCityBuildV2(state, "p1", state.cities[0], "Balanced");
        expect(build).toEqual({ type: "Unit", id: UnitType.SpearGuard });
    });

    it("builds a Settler in safe early-game expansion windows", () => {
        const state = baseState();
        state.turn = 20;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true, pop: 2 }),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

        const build = chooseCityBuildV2(state, "p1", state.cities[0], "Balanced");
        expect(build).toEqual({ type: "Unit", id: UnitType.Settler });
    });
});
