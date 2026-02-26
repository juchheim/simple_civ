import { describe, expect, it, vi } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, TechId } from "../../../core/types.js";
import { getAiMemoryV2 } from "../memory.js";
import { buildGlobalWarTriggerCandidates, resolveGlobalWarTriggerIntent } from "./war-triggers.js";

const mockFindBorderViolators = vi.fn();
const mockCanDeclareWar = vi.fn();
const mockCheckTacticalOpportunity = vi.fn();
const mockHasUnitsStaged = vi.fn();
const mockSelectFocusCityAgainstTarget = vi.fn();

vi.mock("../../helpers/diplomacy.js", () => ({
    findBorderViolators: (...args: any[]) => mockFindBorderViolators(...args),
    canDeclareWar: (...args: any[]) => mockCanDeclareWar(...args),
}));

vi.mock("./opportunities.js", () => ({
    checkTacticalOpportunity: (...args: any[]) => mockCheckTacticalOpportunity(...args),
    hasUnitsStaged: (...args: any[]) => mockHasUnitsStaged(...args),
}));

vi.mock("../strategy.js", () => ({
    selectFocusCityAgainstTarget: (...args: any[]) => mockSelectFocusCityAgainstTarget(...args),
}));

function baseState(): GameState {
    return {
        id: "test",
        turn: 40,
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

function mkPlayer(id: string, techs: TechId[] = [TechId.Fieldcraft]): any {
    return {
        id,
        civName: "ForgeClans",
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

describe("diplomacy war trigger helpers", () => {
    it("builds border-violation trigger candidates", () => {
        mockFindBorderViolators.mockReturnValue([{ enemyId: "p2", count: 2 }]);
        mockCanDeclareWar.mockReturnValue(true);
        mockCheckTacticalOpportunity.mockReturnValue(null);
        mockSelectFocusCityAgainstTarget.mockReturnValue({ id: "e1" });

        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        state.cities = [
            { id: "c1", ownerId: "p1", coord: { q: 0, r: 0 }, isCapital: true },
            { id: "e1", ownerId: "p2", coord: { q: 4, r: 0 }, isCapital: true },
        ] as any;
        state.units = [{ ownerId: "p2", coord: { q: 1, r: 0 }, type: "SpearGuard" }] as any;

        const candidates = buildGlobalWarTriggerCandidates({
            state,
            playerId: "p1",
            warsNow: 1,
            warsPlanned: 1,
            myPower: 10,
            myCities: state.cities.filter(c => c.ownerId === "p1"),
            myAnchor: state.cities[0] as any,
            influence: undefined,
        });

        expect(candidates).toHaveLength(1);
        expect(candidates[0]).toMatchObject({
            targetId: "p2",
            reason: "border-violation",
            stageIfNotReady: false,
            focusCityId: "e1",
        });
    });

    it("builds tactical trigger candidates when no wars are active", () => {
        mockFindBorderViolators.mockReturnValue([]);
        mockCanDeclareWar.mockReturnValue(true);
        mockCheckTacticalOpportunity.mockReturnValue({
            targetId: "p3",
            reason: "counter-attack",
            focusCity: { id: "e3" },
        });
        mockSelectFocusCityAgainstTarget.mockReturnValue(undefined);

        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p3")];
        state.cities = [{ id: "c1", ownerId: "p1", coord: { q: 0, r: 0 }, isCapital: true }] as any;

        const candidates = buildGlobalWarTriggerCandidates({
            state,
            playerId: "p1",
            warsNow: 0,
            warsPlanned: 0,
            myPower: 10,
            myCities: state.cities.filter(c => c.ownerId === "p1"),
            myAnchor: state.cities[0] as any,
            influence: undefined,
        });

        expect(candidates.some(c => c.reason === "tactical:counter-attack")).toBe(true);
        expect(candidates.find(c => c.reason === "tactical:counter-attack")?.stageIfNotReady).toBe(true);
    });

    it("declares war from best trigger when ready", () => {
        mockCanDeclareWar.mockReturnValue(true);
        mockHasUnitsStaged.mockReturnValue(true);

        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        const actions: any[] = [];

        const resolved = resolveGlobalWarTriggerIntent({
            state,
            actions,
            playerId: "p1",
            warsNow: 0,
            warsPlanned: 0,
            warTriggerCandidates: [{
                targetId: "p2",
                score: 0.9,
                reason: "forced-war",
                focusCityId: "e1",
                stageIfNotReady: false,
            }],
            influence: undefined,
        });

        expect(resolved.globalWarIntent).toBe(true);
        expect(resolved.warsPlanned).toBe(1);
        expect(actions).toHaveLength(1);
        expect(actions[0]).toMatchObject({
            type: "SetDiplomacy",
            playerId: "p1",
            targetPlayerId: "p2",
            state: DiplomacyState.War,
        });

        const memory = getAiMemoryV2(resolved.state, "p1");
        expect(memory.focusTargetPlayerId).toBe("p2");
        expect(memory.focusCityId).toBe("e1");
    });

    it("stages focus instead of declaring when not ready", () => {
        mockCanDeclareWar.mockReturnValue(true);
        mockHasUnitsStaged.mockReturnValue(false);

        const state = baseState();
        state.players = [mkPlayer("p1"), mkPlayer("p2")];
        const actions: any[] = [];

        const resolved = resolveGlobalWarTriggerIntent({
            state,
            actions,
            playerId: "p1",
            warsNow: 0,
            warsPlanned: 0,
            warTriggerCandidates: [{
                targetId: "p2",
                score: 0.9,
                reason: "tactical:counter-attack",
                focusCityId: "e1",
                stageIfNotReady: true,
            }],
            influence: undefined,
        });

        expect(resolved.globalWarIntent).toBe(true);
        expect(actions).toHaveLength(0);
        const memory = getAiMemoryV2(resolved.state, "p1");
        expect(memory.focusTargetPlayerId).toBe("p2");
        expect(memory.focusCityId).toBe("e1");
    });
});
