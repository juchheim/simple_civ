import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, TechId, UnitType } from "../../core/types.js";
import { decideDiplomacyActionsV2 } from "./diplomacy.js";
import { getAiMemoryV2 } from "./memory.js";

const BASE_TECHS = [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore];
const ALL_TECHS = Object.values(TechId) as TechId[];

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

describe("UtilityV2 AI diplomacy (characterization)", () => {
    it("stages for forced war when units are not yet positioned", () => {
        const state = baseState();
        state.turn = 200;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 10, 0, { capital: true }),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p1", "u2", UnitType.BowGuard, 1, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

        const result = decideDiplomacyActionsV2(state, "p1", "Balanced");
        expect(result.actions.some(a => a.type === "SetDiplomacy")).toBe(false);

        const memory = getAiMemoryV2(result.state, "p1");
        expect(memory.focusTargetPlayerId).toBe("p2");
        expect(memory.focusCityId).toBe("e1");
    });

    it("declares forced war once units are staged near the target", () => {
        const state = baseState();
        state.turn = 200;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 10, 0, { capital: true }),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 7, 0),
            mkUnit("p1", "u2", UnitType.BowGuard, 8, 0),
            mkUnit("p1", "u3", UnitType.Riders, 7, 1),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

        const result = decideDiplomacyActionsV2(state, "p1", "Balanced");
        expect(result.actions.some(a => a.type === "SetDiplomacy" && a.targetPlayerId === "p2")).toBe(true);
    });

    it("forces war between 20-tech civs when units are staged", () => {
        const state = baseState();
        state.turn = 150;
        state.players = [
            mkPlayer("p1", "ForgeClans", ALL_TECHS),
            mkPlayer("p2", "RiverLeague", ALL_TECHS),
        ];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p2", "e1", 10, 0, { capital: true }),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 7, 0),
            mkUnit("p1", "u2", UnitType.BowGuard, 8, 0),
            mkUnit("p1", "u3", UnitType.Riders, 7, 1),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

        const result = decideDiplomacyActionsV2(state, "p1", "Balanced");
        expect(result.actions.some(a => a.type === "SetDiplomacy" && a.targetPlayerId === "p2")).toBe(true);
    });

    it("proposes peace after military collapse", () => {
        const state = baseState();
        state.turn = 60;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p1", "c2", 0, 2),
            mkCity("p2", "e1", 10, 0, { capital: true }),
            mkCity("p2", "e2", 10, 2),
            mkCity("p2", "e3", 12, 0),
            mkCity("p2", "e4", 12, 2),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.BowGuard, 0, 1),
            mkUnit("p2", "eU1", UnitType.SpearGuard, 10, 1),
            mkUnit("p2", "eU2", UnitType.SpearGuard, 11, 1),
            mkUnit("p2", "eU3", UnitType.SpearGuard, 12, 1),
            mkUnit("p2", "eU4", UnitType.SpearGuard, 9, 1),
            mkUnit("p2", "eU5", UnitType.SpearGuard, 13, 1),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                lastStanceTurn: { p2: state.turn - 10 },
                warCityCount: { p2: 3 },
            },
        };

        const result = decideDiplomacyActionsV2(state, "p1", "Balanced");
        expect(result.actions.some(a => a.type === "ProposePeace" && a.targetPlayerId === "p2")).toBe(true);
    });

    it("proposes peace after repeated siege stalemate", () => {
        const state = baseState();
        state.turn = 80;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true }),
            mkCity("p1", "c2", 0, 2),
            mkCity("p2", "e1", 10, 0, { capital: true }),
            mkCity("p2", "e2", 10, 2),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 6, 0),
            mkUnit("p1", "u2", UnitType.BowGuard, 6, 1),
            mkUnit("p2", "eU1", UnitType.SpearGuard, 11, 0),
            mkUnit("p2", "eU2", UnitType.BowGuard, 11, 1),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = {
            p1: {
                focusCityId: "e1",
                siegeFailureCount: { e1: 2 },
                lastStanceTurn: { p2: state.turn - 35 },
                lastCityCaptureTurn: { p2: state.turn - 35 },
            },
        };

        const result = decideDiplomacyActionsV2(state, "p1", "Balanced");
        expect(result.actions.some(a => a.type === "ProposePeace" && a.targetPlayerId === "p2")).toBe(true);
    });
});
