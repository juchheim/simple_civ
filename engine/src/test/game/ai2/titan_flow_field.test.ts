import { describe, expect, it, vi } from "vitest";
import { followTitan, runTitanAgent } from "../../../game/ai2/titan-agent.js";
import { GameState, PlayerPhase, UnitType, DiplomacyState, TechId } from "../../../core/types.js";
import { getFlowFieldCached } from "../../../game/ai2/flow-field.js";

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
});
