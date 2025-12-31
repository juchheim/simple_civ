import { describe, expect, it } from "vitest";
import { BuildingType, DiplomacyState, GameState, PlayerPhase, TechId, UnitType } from "../../core/types.js";
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

    it("prioritizes unit mix during fallback production", () => {
        const state = baseState();
        state.turn = 50;
        // Remove StoneworkHalls to prevent Bulwark, Add FormationTraining to unlock BowGuard
        state.players = [mkPlayer("p1", "StarborneSeekers", [TechId.Fieldcraft, TechId.ScriptLore, TechId.FormationTraining])];
        // City has no current build
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true, pop: 1 }),
        ];
        state.cities[0].buildings = [BuildingType.Scriptorium, BuildingType.Farmstead];
        // Player has 5 Melee units (SpearGuard) and 0 Ranged
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 1),
            mkUnit("p1", "u2", UnitType.SpearGuard, 0, 2),
            mkUnit("p1", "u3", UnitType.SpearGuard, 1, 0),
            mkUnit("p1", "u4", UnitType.SpearGuard, 1, 1),
            mkUnit("p1", "u5", UnitType.SpearGuard, 2, 0),
        ];

        // Should normally pick capture unit (SpearGuard), but with 5:0 split, we want BowGuard if we fix it
        // For reproduction, we assert the CURRENT behavior (which is incorrect) to verify the test setup
        // After fix, we will update expectation to UnitType.BowGuard
        const build = chooseCityBuildV2(state, "p1", state.cities[0], "Balanced");

        // CURRENT BUGGY BEHAVIOR: Ignores composition, picks Capture unit (SpearGuard)
        // We will change this expectation to BowGuard after applying the fix
        expect(build).toEqual({ type: "Unit", id: UnitType.BowGuard });
    });

    it("prioritizes unit mix with 3:2:1 ratio (Spear:Bow:Rider)", () => {
        const state = baseState();
        state.turn = 50;
        // Add TrailMaps to unlock Riders
        state.players = [mkPlayer("p1", "StarborneSeekers", [TechId.Fieldcraft, TechId.ScriptLore, TechId.FormationTraining, TechId.TrailMaps])];
        // City has no current build
        state.cities = [
            mkCity("p1", "c1", 0, 0, { capital: true, pop: 1 }),
        ];
        state.cities[0].buildings = [BuildingType.Scriptorium, BuildingType.Farmstead];
        // State: 3 Spears, 2 Bows, 0 Riders.
        // Ratio 3:2:0. Riders deficit is largest (target ~1 per 6, actual 0).
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 1),
            mkUnit("p1", "u2", UnitType.SpearGuard, 0, 2),
            mkUnit("p1", "u3", UnitType.SpearGuard, 1, 0),
            mkUnit("p1", "u4", UnitType.BowGuard, 1, 1),
            mkUnit("p1", "u5", UnitType.BowGuard, 2, 0),
        ];

        const build = chooseCityBuildV2(state, "p1", state.cities[0], "Balanced");
        expect(build).toEqual({ type: "Unit", id: UnitType.Riders });
    });
});
