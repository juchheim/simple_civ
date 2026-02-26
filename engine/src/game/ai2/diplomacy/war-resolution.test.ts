import { describe, expect, it, vi } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, TechId } from "../../../core/types.js";
import { resolvePeaceStanceWar } from "./war-resolution.js";

const mockCanDeclareWar = vi.fn();
const mockBuildWarPreflightContext = vi.fn();
const mockHasDominatingPower = vi.fn();
const mockApplyWarDeclaration = vi.fn();

vi.mock("../../helpers/diplomacy.js", () => ({
    canDeclareWar: (...args: any[]) => mockCanDeclareWar(...args),
}));

vi.mock("./war-context.js", () => ({
    buildWarPreflightContext: (...args: any[]) => mockBuildWarPreflightContext(...args),
}));

vi.mock("./utils.js", async (importOriginal) => {
    const original = await importOriginal<any>();
    return {
        ...original,
        hasDominatingPower: (...args: any[]) => mockHasDominatingPower(...args),
    };
});

vi.mock("./war-declaration.js", async (importOriginal) => {
    const original = await importOriginal<any>();
    return {
        ...original,
        applyWarDeclaration: (...args: any[]) => mockApplyWarDeclaration(...args),
    };
});

const BASE_TECHS = [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore];

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

function mkProfile(): any {
    return {
        civName: "ForgeClans",
        diplomacy: {
            warDistanceMax: 10,
            canInitiateWars: true,
            warPowerRatio: 1.1,
            minStanceTurns: 6,
            minWarTurn: 20,
            maxConcurrentWars: 2,
            maxInitiatedWarsPer50Turns: 2,
        },
        tactics: {
            forceConcentration: 1,
        },
    };
}

function baseInput(overrides: Partial<Parameters<typeof resolvePeaceStanceWar>[0]> = {}): Parameters<typeof resolvePeaceStanceWar>[0] {
    const state = baseState();
    state.players = [mkPlayer("p1"), mkPlayer("p2")];
    state.cities = [
        { id: "c1", ownerId: "p1", coord: { q: 0, r: 0 }, isCapital: true },
        { id: "e1", ownerId: "p2", coord: { q: 4, r: 0 }, isCapital: true },
    ] as any;
    state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

    return {
        state,
        actions: [],
        playerId: "p1",
        other: state.players[1] as any,
        goal: "Balanced",
        profile: mkProfile(),
        memory: {},
        myAnchor: state.cities[0] as any,
        influence: undefined,
        myMilitaryCount: 4,
        warsNow: 0,
        warsPlanned: 0,
        globalWarIntent: false,
        earlyRushActive: false,
        opponent: {
            stance: DiplomacyState.Peace,
            ratio: 1.2,
            effectiveRatio: 1.2,
            effectiveOffensiveRatio: 1.1,
            theirAnchor: state.cities[1] as any,
            dist: 4,
            frontRatio: 0,
            pressureRatio: 0,
            frontDistanceBonus: 0,
        },
        debugEnabled: false,
        ...overrides,
    };
}

describe("war resolution", () => {
    it("no-ops when global war intent is already active", () => {
        const input = baseInput({
            globalWarIntent: true,
            warsPlanned: 2,
        });

        const result = resolvePeaceStanceWar(input);

        expect(result.state).toBe(input.state);
        expect(result.warsPlanned).toBe(2);
        expect(mockBuildWarPreflightContext).not.toHaveBeenCalled();
    });

    it("declares immediately when dominating power path succeeds", () => {
        mockBuildWarPreflightContext.mockReturnValue({
            isAetherianPreTitan: false,
            needsCities: false,
            targetHasWeakCity: false,
            overwhelmingPeace: false,
            progressThreat: false,
            conquestThreat: false,
            hasTitanNow: false,
            isAetherian: false,
            requiredRatio: 1,
            escalatedRatio: 1,
            effectiveDist: 4,
            allowDistance: 10,
        });
        mockHasDominatingPower.mockReturnValue(true);
        mockCanDeclareWar.mockReturnValue(true);
        const nextState = { ...baseState(), players: [mkPlayer("p1"), mkPlayer("p2")] } as GameState;
        mockApplyWarDeclaration.mockReturnValue({ state: nextState, warsPlanned: 1 });

        const input = baseInput();
        const result = resolvePeaceStanceWar(input);

        expect(mockBuildWarPreflightContext).toHaveBeenCalledOnce();
        expect(mockApplyWarDeclaration).toHaveBeenCalledOnce();
        expect(result.state).toBe(nextState);
        expect(result.warsPlanned).toBe(1);
    });
});
