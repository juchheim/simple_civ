import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, ProjectId, TechId } from "../../../core/types.js";
import { buildPeaceDecisionContext } from "./peace-context.js";

const BASE_TECHS = [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore];

function baseState(): GameState {
    return {
        id: "test",
        turn: 50,
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

function mkPlayer(id: string, completedProjects: ProjectId[] = []): any {
    return {
        id,
        civName: "ForgeClans",
        color: "#fff",
        isAI: true,
        aiGoal: "Balanced",
        techs: BASE_TECHS,
        currentTech: null,
        completedProjects,
        isEliminated: false,
        currentEra: "Hearth",
    };
}

function mkCity(ownerId: string, id: string, q: number, r: number, hp: number = 20, capital: boolean = false): any {
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
        hp,
        maxHp: 20,
        isCapital: capital,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

describe("diplomacy peace context helper", () => {
    it("returns null when target has a capturable city", () => {
        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, 20, true),
            mkCity("p2", "e1", 10, 0, 0, true),
            mkCity("p2", "e2", 12, 0, 20),
        ];

        const context = buildPeaceDecisionContext({
            state,
            playersForThreatCheck: state.players,
            playerId: "p1",
            targetId: "p2",
            ratio: 1.0,
            myAnchorCoord: { q: 0, r: 0 },
            targetAnchorCoord: { q: 10, r: 0 },
            memory: { lastStanceTurn: { p2: 30 } },
            influence: undefined,
            minStanceTurns: 5,
            canInitiateWars: true,
            warPowerRatio: 1.2,
        });

        expect(context).toBeNull();
    });

    it("returns null when enemy should be finished", () => {
        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, 20, true),
            mkCity("p2", "e1", 10, 0, 20, true),
        ];

        const context = buildPeaceDecisionContext({
            state,
            playersForThreatCheck: state.players,
            playerId: "p1",
            targetId: "p2",
            ratio: 1.25,
            myAnchorCoord: { q: 0, r: 0 },
            targetAnchorCoord: { q: 10, r: 0 },
            memory: { lastStanceTurn: { p2: 30 } },
            influence: undefined,
            minStanceTurns: 5,
            canInitiateWars: true,
            warPowerRatio: 1.2,
        });

        expect(context).toBeNull();
    });

    it("returns null when minimum stance duration is not met", () => {
        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        state.cities = [
            mkCity("p1", "c1", 0, 0, 20, true),
            mkCity("p2", "e1", 10, 0, 20, true),
            mkCity("p2", "e2", 12, 0, 20),
        ];

        const context = buildPeaceDecisionContext({
            state,
            playersForThreatCheck: state.players,
            playerId: "p1",
            targetId: "p2",
            ratio: 1.0,
            myAnchorCoord: { q: 0, r: 0 },
            targetAnchorCoord: { q: 10, r: 0 },
            memory: { lastStanceTurn: { p2: 48 } },
            influence: undefined,
            minStanceTurns: 5,
            canInitiateWars: true,
            warPowerRatio: 1.2,
        });

        expect(context).toBeNull();
    });

    it("computes war peace context values without changing rules", () => {
        const state = baseState();
        state.turn = 120;
        state.players = [
            mkPlayer("p1"),
            mkPlayer("p2", [ProjectId.GrandExperiment]),
            mkPlayer("p3", [ProjectId.GrandExperiment]),
        ];
        state.cities = [
            mkCity("p1", "c1", 0, 0, 20, true),
            mkCity("p1", "c2", 0, 2, 20),
            mkCity("p2", "e1", 10, 0, 20, true),
            mkCity("p2", "e2", 12, 0, 20),
        ];
        state.diplomacy = {
            p1: { p2: DiplomacyState.War, p3: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.War, p3: DiplomacyState.Peace },
            p3: { p1: DiplomacyState.Peace, p2: DiplomacyState.Peace },
        };
        state.diplomacyOffers = [{ type: "Peace", from: "p2", to: "p1" } as any];

        const context = buildPeaceDecisionContext({
            state,
            playersForThreatCheck: state.players,
            playerId: "p1",
            targetId: "p2",
            ratio: 0.9,
            myAnchorCoord: { q: 0, r: 0 },
            targetAnchorCoord: { q: 10, r: 0 },
            memory: {
                lastStanceTurn: { p2: 90 },
                warCityCount: { p2: 3 },
                lastCityCaptureTurn: { p2: 100 },
                focusCityId: "e1",
                siegeFailureCount: { e1: 2 },
            },
            influence: {
                pressure: { max: 10, get: () => 6 } as any,
                front: { max: 10, get: () => 2 } as any,
            } as any,
            minStanceTurns: 12,
            canInitiateWars: true,
            warPowerRatio: 1.2,
        });

        expect(context).not.toBeNull();
        expect(context?.progressThreatNow).toBe(true);
        expect(context?.lastStanceTurn).toBe(90);
        expect(context?.warAge).toBe(30);
        expect(context?.lostCities).toBe(1);
        expect(context?.turnsSinceCapture).toBe(20);
        expect(context?.incomingPeace).toBe(true);
        expect(context?.warMomentum).toBeCloseTo(0.44);
        expect(context?.siegeFailureCount).toBe(2);
        expect(context?.thirdPartyThreat).toBe(true);
        expect(context?.aggressive).toBe(true);
    });
});
