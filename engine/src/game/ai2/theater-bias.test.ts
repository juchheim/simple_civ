import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, ProjectId } from "../../core/types.js";
import { selectFocusTargetV2 } from "./strategy.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 80,
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
    } as GameState;
}

function mkCity(ownerId: string, id: string, q: number, r: number, opts?: { capital?: boolean; project?: ProjectId }): any {
    return {
        id,
        name: id,
        ownerId,
        coord: { q, r },
        pop: 4,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: opts?.project ? { type: "Project", id: opts.project } : null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: !!opts?.capital,
        originalOwnerId: ownerId,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkPlayer(id: string, civName: string, ai = true): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: ai,
        aiGoal: "Balanced",
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

describe("Theater bias in focus selection", () => {
    it("prefers target from the top operational theater when available", () => {
        const state = baseState();
        state.players = [
            mkPlayer("p1", "ForgeClans"),
            mkPlayer("p2", "RiverLeague"),
            mkPlayer("p3", "ScholarKingdoms"),
        ];
        state.cities = [
            mkCity("p1", "home", 0, 0, { capital: true }),
            mkCity("p2", "e1", 8, 0, { capital: true }),
            mkCity("p3", "p1", 6, 0, { capital: true, project: ProjectId.Observatory }),
        ];

        state.aiMemoryV2 = {
            p1: {
                operationalTurn: state.turn,
                operationalTheaters: [
                    {
                        id: "front-1",
                        targetPlayerId: "p3",
                        targetCityId: "p1",
                        anchorCityId: "home",
                        anchorCoord: { q: 0, r: 0 },
                        targetCoord: { q: 6, r: 0 },
                        objective: "deny-progress",
                        priority: 0.9,
                        threat: 0,
                        friendly: 0,
                        distance: 6,
                        atWar: false,
                        cityCount: 1,
                    },
                ],
            },
        } as any;

        const result = selectFocusTargetV2(state, "p1");
        expect(result.focusTargetId).toBe("p3");
        expect(result.focusCityId).toBe("p1");
    });
});
