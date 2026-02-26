import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, TechId } from "../../../core/types.js";
import { getAiMemoryV2 } from "../memory.js";
import {
    applyScoredWarDeclaration,
    applyWarDeclaration,
    formatWarDeclarationDebugText
} from "./war-declaration.js";

const BASE_TECHS = [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore];

function baseState(): GameState {
    return {
        id: "test",
        turn: 42,
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

describe("diplomacy war declaration helpers", () => {
    it("applies war declaration action and records initiation turn", () => {
        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        const actions: any[] = [];

        const result = applyWarDeclaration({
            state,
            actions,
            playerId: "p1",
            targetId: "p2",
            warsPlanned: 0,
        });

        expect(result.warsPlanned).toBe(1);
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
            type: "SetDiplomacy",
            playerId: "p1",
            targetPlayerId: "p2",
            state: "War",
        });

        const memory = getAiMemoryV2(result.state, "p1");
        expect(memory.lastStanceTurn?.p2).toBe(42);
        expect(memory.warInitiationTurns).toEqual([42]);
    });

    it("preserves declaration options in memory updates", () => {
        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        const actions: any[] = [];

        const result = applyWarDeclaration({
            state,
            actions,
            playerId: "p1",
            targetId: "p2",
            warsPlanned: 2,
            options: {
                setFocus: true,
                focusCityId: "e1",
                warInitiationTurns: [10, 20],
                warCityCount: 3,
                warUnitsCount: 9,
                recordCaptureTurn: true,
            },
        });

        expect(result.warsPlanned).toBe(3);
        const memory = getAiMemoryV2(result.state, "p1");
        expect(memory.focusTargetPlayerId).toBe("p2");
        expect(memory.focusCityId).toBe("e1");
        expect(memory.warInitiationTurns).toEqual([10, 20, 42]);
        expect(memory.warCityCount?.p2).toBe(3);
        expect(memory.warUnitsCount?.p2).toBe(9);
        expect(memory.lastCityCaptureTurn?.p2).toBe(42);
    });

    it("formats war declaration debug text with influence suffix", () => {
        const text = formatWarDeclarationDebugText({
            playerId: "p1",
            targetId: "p2",
            score: 0.876,
            effectiveOffensiveRatio: 1.234,
            escalatedRatio: 0.912,
            frontRatio: 0.4,
            pressureRatio: 0.2,
        });
        expect(text).toContain("score=0.88");
        expect(text).toContain("ratio:1.23 req:0.91");
        expect(text).toContain("front:0.40 pressure:0.20");
    });

    it("skips scored declaration when score is not positive", () => {
        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        const actions: any[] = [];

        const result = applyScoredWarDeclaration({
            state,
            actions,
            playerId: "p1",
            targetId: "p2",
            warsPlanned: 1,
            scoring: {
                effectiveOffensiveRatio: 0.6,
                escalatedRatio: 1.0,
                progressThreat: false,
                conquestThreat: false,
                earlyRushActive: false,
                isDominating: false,
                frontRatio: 0,
                pressureRatio: 0,
            },
        });

        expect(result.declared).toBe(false);
        expect(result.warsPlanned).toBe(1);
        expect(actions).toHaveLength(0);
    });

    it("applies scored declaration and records focus data", () => {
        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        const actions: any[] = [];

        const result = applyScoredWarDeclaration({
            state,
            actions,
            playerId: "p1",
            targetId: "p2",
            warsPlanned: 1,
            scoring: {
                effectiveOffensiveRatio: 1.5,
                escalatedRatio: 1.0,
                progressThreat: false,
                conquestThreat: false,
                earlyRushActive: false,
                isDominating: false,
                frontRatio: 0.2,
                pressureRatio: 0.1,
            },
            options: {
                setFocus: true,
                focusCityId: "e1",
            },
        });

        expect(result.declared).toBe(true);
        expect(result.warsPlanned).toBe(2);
        expect(actions).toHaveLength(1);
        const memory = getAiMemoryV2(result.state, "p1");
        expect(memory.focusTargetPlayerId).toBe("p2");
        expect(memory.focusCityId).toBe("e1");
    });
});
