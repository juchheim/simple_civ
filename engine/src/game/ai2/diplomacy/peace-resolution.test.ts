import { describe, expect, it, vi } from "vitest";
import { GameState, PlayerPhase, TechId } from "../../../core/types.js";
import { getAiMemoryV2 } from "../memory.js";
import { resolveWarStancePeace } from "./peace-resolution.js";

const mockBuildPeaceDecisionContext = vi.fn();
const mockBuildPeaceCandidates = vi.fn();

vi.mock("./peace-context.js", () => ({
    buildPeaceDecisionContext: (...args: any[]) => mockBuildPeaceDecisionContext(...args),
}));

vi.mock("./peace-candidates.js", () => ({
    buildPeaceCandidates: (...args: any[]) => mockBuildPeaceCandidates(...args),
}));

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

function mkPlayer(id: string): any {
    return {
        id,
        civName: "ForgeClans",
        color: "#fff",
        isAI: true,
        aiGoal: "Balanced",
        techs: BASE_TECHS,
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

describe("peace resolution", () => {
    it("returns unchanged state when peace context is unavailable", () => {
        mockBuildPeaceDecisionContext.mockReturnValue(null);
        mockBuildPeaceCandidates.mockReturnValue([]);

        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        const actions: any[] = [];

        const result = resolveWarStancePeace({
            state,
            playersForThreatCheck: state.players,
            actions,
            playerId: "p1",
            targetId: "p2",
            ratio: 1,
            memory: {},
            minStanceTurns: 5,
            canInitiateWars: true,
            warPowerRatio: 1,
            peacePowerThreshold: 0.7,
            debugEnabled: false,
        });

        expect(result).toBe(state);
        expect(actions).toHaveLength(0);
        expect(mockBuildPeaceCandidates).not.toHaveBeenCalled();
    });

    it("applies top peace decision and records stance turn", () => {
        mockBuildPeaceDecisionContext.mockReturnValue({
            warAge: 25,
            turnsSinceCapture: 12,
            lostCities: 1,
            warMomentum: -0.4,
            siegeFailureCount: 0,
            progressThreatNow: false,
            thirdPartyThreat: false,
            incomingPeace: false,
            aggressive: false,
            lastStanceTurn: 30,
        });
        mockBuildPeaceCandidates.mockReturnValue([
            { type: "ProposePeace", targetId: "p2", score: 0.4, reason: "wait" },
            { type: "AcceptPeace", targetId: "p2", score: 0.8, reason: "collapse" },
        ]);

        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        const actions: any[] = [];

        const result = resolveWarStancePeace({
            state,
            playersForThreatCheck: state.players,
            actions,
            playerId: "p1",
            targetId: "p2",
            ratio: 0.6,
            memory: { lastStanceTurn: { p2: 30 } },
            minStanceTurns: 5,
            canInitiateWars: true,
            warPowerRatio: 1.1,
            peacePowerThreshold: 0.7,
            debugEnabled: false,
        });

        expect(result).not.toBe(state);
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
            type: "AcceptPeace",
            playerId: "p1",
            targetPlayerId: "p2",
        });

        const memory = getAiMemoryV2(result, "p1");
        expect(memory.lastStanceTurn?.p2).toBe(50);
    });
});
