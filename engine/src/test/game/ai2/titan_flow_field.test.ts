import { describe, expect, it, vi } from "vitest";
import { followTitan, runTitanAgent } from "../../../game/ai2/titan-agent.js";
import { runTitanPhase } from "../../../game/ai2/titan-flow.js";
import { GameState, PlayerPhase, UnitType, DiplomacyState, TechId } from "../../../core/types.js";
import { getFlowFieldCached } from "../../../game/ai2/flow-field.js";
import { tryAction } from "../../../game/ai/shared/actions.js";

vi.mock("../../../game/ai2/flow-field.js", () => {
    return {
        getFlowFieldCached: vi.fn(() => ({
            width: 0,
            height: 0,
            target: { q: 0, r: 0 },
            indexByCoord: new Map(),
            costs: new Float32Array(0),
            getCost: () => 0,
            nextStep: () => null
        }))
    };
});

vi.mock("../../../game/ai/shared/actions.js", async () => {
    const actual = await vi.importActual<typeof import("../../../game/ai/shared/actions.js")>("../../../game/ai/shared/actions.js");
    return {
        ...actual,
        tryAction: vi.fn(actual.tryAction)
    };
});

function baseState(): GameState {
    return {
        id: "test",
        turn: 8,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: { width: 6, height: 6, tiles: [] },
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

function seedTiles(state: GameState, min: number, max: number) {
    for (let q = min; q <= max; q++) {
        for (let r = min; r <= max; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
        }
    }
}

function mkPlayer(id: string, civName: string): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: true,
        aiGoal: "Balanced",
        techs: [TechId.Fieldcraft, TechId.StoneworkHalls],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

function mkCity(ownerId: string, id: string, q: number, r: number): any {
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
        isCapital: true,
        originalOwnerId: ownerId,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

describe("Titan escort flow field integration", () => {
    it("followTitan consults the flow field for escort routing", () => {
        const state = baseState();
        seedTiles(state, 0, 5);
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.cities = [mkCity("p2", "enemy", 5, 5)];
        state.units = [
            { id: "t1", ownerId: "p1", type: UnitType.Titan, coord: { q: 0, r: 0 }, hp: 30, maxHp: 30, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "e1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 2, r: 0 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
        ];

        followTitan(state, "p1");

        const flowMock = getFlowFieldCached as unknown as ReturnType<typeof vi.fn>;
        expect(flowMock).toHaveBeenCalledTimes(1);
        expect(flowMock).toHaveBeenCalledWith(state, "p1", { q: 0, r: 0 }, { cacheKey: "titan-escort" });
    });

    it("caps Aetherian escort reservations to three units", () => {
        const state = baseState();
        seedTiles(state, 0, 5);
        state.players = [mkPlayer("p1", "AetherianVanguard"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.cities = [mkCity("p2", "enemy", 5, 5)];
        state.units = [
            { id: "t1", ownerId: "p1", type: UnitType.Titan, coord: { q: 0, r: 0 }, hp: 35, maxHp: 35, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "e1", ownerId: "p1", type: UnitType.ArmyRiders, coord: { q: 2, r: 0 }, hp: 15, maxHp: 15, movesLeft: 2, hasAttacked: false, state: "Normal", isTitanEscort: true } as any,
            { id: "e2", ownerId: "p1", type: UnitType.Riders, coord: { q: 2, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal", isTitanEscort: true } as any,
            { id: "e3", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 3, r: 0 }, hp: 10, maxHp: 10, movesLeft: 1, hasAttacked: false, state: "Normal", isTitanEscort: true } as any,
        ];

        const next = followTitan(state, "p1");
        const escorts = next.units.filter(u => u.ownerId === "p1" && u.type !== UnitType.Titan && u.isTitanEscort);

        expect(escorts).toHaveLength(3);
        expect(escorts.map(u => u.id).sort()).toEqual(["e1", "e2", "e3"]);
    });
});

describe("Titan advance flow field integration", () => {
    it("runTitanAgent consults flow field during advance", () => {
        const state = baseState();
        seedTiles(state, 0, 5);
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.cities = [mkCity("p2", "enemy", 5, 0)];
        state.units = [
            { id: "t1", ownerId: "p1", type: UnitType.Titan, coord: { q: 0, r: 0 }, hp: 30, maxHp: 30, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "s1", ownerId: "p1", type: UnitType.Riders, coord: { q: 0, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "s2", ownerId: "p1", type: UnitType.Riders, coord: { q: 0, r: 2 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "s3", ownerId: "p1", type: UnitType.Riders, coord: { q: 1, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
        ];

        const getFlowField = vi.fn(() => ({
            width: 0,
            height: 0,
            target: { q: 5, r: 0 },
            indexByCoord: new Map(),
            costs: new Float32Array(0),
            getCost: () => 0,
            nextStep: () => ({ q: 1, r: 0 })
        }));

        runTitanAgent(state, "p1", {
            enemyIds: new Set(["p2"]),
            getFlowField
        } as any);

        expect(getFlowField).toHaveBeenCalledWith({ q: 5, r: 0 }, { cacheKey: "titan-advance" });
    });

    it("Aetherian Titan waits if nearby support is not reserved as escorts", () => {
        const state = baseState();
        seedTiles(state, 0, 5);
        state.players = [mkPlayer("p1", "AetherianVanguard"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.cities = [mkCity("p2", "enemy", 5, 0)];
        state.units = [
            { id: "t1", ownerId: "p1", type: UnitType.Titan, coord: { q: 0, r: 0 }, hp: 35, maxHp: 35, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "s1", ownerId: "p1", type: UnitType.Riders, coord: { q: 0, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "s2", ownerId: "p1", type: UnitType.Riders, coord: { q: 0, r: 2 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "s3", ownerId: "p1", type: UnitType.ArmyRiders, coord: { q: 1, r: 1 }, hp: 15, maxHp: 15, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
        ];

        const getFlowField = vi.fn(() => ({
            width: 0,
            height: 0,
            target: { q: 5, r: 0 },
            indexByCoord: new Map(),
            costs: new Float32Array(0),
            getCost: () => 0,
            nextStep: () => ({ q: 1, r: 0 })
        }));

        const next = runTitanAgent(state, "p1", {
            enemyIds: new Set(["p2"]),
            getFlowField
        } as any);

        expect(next.units.find(u => u.id === "t1")?.coord).toEqual({ q: 0, r: 0 });
    });

    it("Aetherian Titan waits once damaged if only the three reserved escorts remain", () => {
        const state = baseState();
        seedTiles(state, 0, 5);
        state.players = [mkPlayer("p1", "AetherianVanguard"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.cities = [mkCity("p2", "enemy", 5, 0)];
        state.units = [
            { id: "t1", ownerId: "p1", type: UnitType.Titan, coord: { q: 0, r: 0 }, hp: 27, maxHp: 35, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "s1", ownerId: "p1", type: UnitType.ArmyRiders, coord: { q: 0, r: 1 }, hp: 15, maxHp: 15, movesLeft: 2, hasAttacked: false, state: "Normal", isTitanEscort: true } as any,
            { id: "s2", ownerId: "p1", type: UnitType.Riders, coord: { q: 0, r: 2 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal", isTitanEscort: true } as any,
            { id: "s3", ownerId: "p1", type: UnitType.Landship, coord: { q: 1, r: 1 }, hp: 25, maxHp: 25, movesLeft: 2, hasAttacked: false, state: "Normal", isTitanEscort: true } as any,
        ];

        const getFlowField = vi.fn(() => ({
            width: 0,
            height: 0,
            target: { q: 5, r: 0 },
            indexByCoord: new Map(),
            costs: new Float32Array(0),
            getCost: () => 0,
            nextStep: () => ({ q: 1, r: 0 })
        }));

        const next = runTitanAgent(state, "p1", {
            enemyIds: new Set(["p2"]),
            getFlowField
        } as any);

        expect(next.units.find(u => u.id === "t1")?.coord).toEqual({ q: 0, r: 0 });
    });
});

describe("Titan escort protection limits", () => {
    it("allows only reserved escorts to make one close-protection attack before the Titan acts", () => {
        const state = baseState();
        seedTiles(state, 0, 5);
        state.players = [mkPlayer("p1", "AetherianVanguard"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.units = [
            { id: "t1", ownerId: "p1", type: UnitType.Titan, coord: { q: 0, r: 0 }, hp: 35, maxHp: 35, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "escort", ownerId: "p1", type: UnitType.Landship, coord: { q: 1, r: 0 }, hp: 25, maxHp: 25, movesLeft: 2, hasAttacked: false, state: "Normal", isTitanEscort: true } as any,
            { id: "non-escort", ownerId: "p1", type: UnitType.Riders, coord: { q: 0, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "enemy-a", ownerId: "p2", type: UnitType.Settler, coord: { q: 1, r: 1 }, hp: 1, maxHp: 1, movesLeft: 1, hasAttacked: false, state: "Normal" } as any,
            { id: "enemy-b", ownerId: "p2", type: UnitType.Settler, coord: { q: 2, r: 0 }, hp: 1, maxHp: 1, movesLeft: 1, hasAttacked: false, state: "Normal" } as any,
        ];
        const tryActionMock = vi.mocked(tryAction);
        const originalImpl = tryActionMock.getMockImplementation();
        const attackCalls: Array<{ attackerId: string; targetId: string }> = [];

        tryActionMock.mockImplementation((current, action) => {
            if (action.type !== "Attack") return current;
            attackCalls.push({ attackerId: action.attackerId, targetId: action.targetId });

            const next = JSON.parse(JSON.stringify(current)) as GameState;
            const attacker = next.units.find(u => u.id === action.attackerId);
            if (attacker) {
                attacker.hasAttacked = true;
                attacker.movesLeft = 0;
            }
            next.units = next.units.filter(u => u.id !== action.targetId);
            return next;
        });

        try {
            const next = runTitanPhase(state, "p1");

            expect(attackCalls).toHaveLength(1);
            expect(attackCalls[0]?.attackerId).toBe("escort");
            expect(next.units.find(u => u.id === "non-escort")?.hasAttacked).toBe(false);
            expect(next.units.filter(u => u.ownerId === "p2")).toHaveLength(1);
        } finally {
            if (originalImpl) {
                tryActionMock.mockImplementation(originalImpl);
            } else {
                tryActionMock.mockReset();
            }
        }
    });
});
