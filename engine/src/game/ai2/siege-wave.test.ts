import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, UnitType } from "../../core/types.js";
import { SIEGE_NO_PROGRESS_TURNS, updateSiegeWaveMemory } from "./siege-wave.js";

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
    } as GameState;
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
        isCapital: false,
        originalOwnerId: ownerId,
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
        movesLeft: 2,
        hasAttacked: false,
        state: "Normal",
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

describe("siege wave tracking", () => {
    it("records a failed wave when the assault collapses without progress", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "home", 0, 0),
            mkCity("p2", "e1", 4, 0),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 3, 0),
            mkUnit("p1", "u2", UnitType.SpearGuard, 4, 1),
            mkUnit("p1", "u3", UnitType.SpearGuard, 5, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = { p1: { focusCityId: "e1" } } as any;

        const started = updateSiegeWaveMemory(state, "p1");
        expect(started.aiMemoryV2?.p1?.siegeWaveActive).toBe(true);

        const collapsed: GameState = {
            ...started,
            turn: started.turn + 1,
            units: [mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0)],
        } as GameState;

        const failed = updateSiegeWaveMemory(collapsed, "p1");
        expect(failed.aiMemoryV2?.p1?.siegeFailureCount?.e1).toBe(1);
        expect(failed.aiMemoryV2?.p1?.armyPhase).toBe("rallying");
    });

    it("records a failed wave when no progress is made over the stall window", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [
            mkCity("p1", "home", 0, 0),
            mkCity("p2", "e1", 4, 0),
        ];
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 3, 0),
            mkUnit("p1", "u2", UnitType.SpearGuard, 4, 1),
            mkUnit("p1", "u3", UnitType.SpearGuard, 5, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        state.aiMemoryV2 = { p1: { focusCityId: "e1" } } as any;

        let next = updateSiegeWaveMemory(state, "p1");
        expect(next.aiMemoryV2?.p1?.siegeWaveActive).toBe(true);

        for (let i = 0; i < SIEGE_NO_PROGRESS_TURNS; i++) {
            next = { ...next, turn: next.turn + 1 };
            next = updateSiegeWaveMemory(next, "p1");
        }

        expect(next.aiMemoryV2?.p1?.siegeFailureCount?.e1).toBe(1);
        expect(next.aiMemoryV2?.p1?.siegeWaveActive).toBe(false);
    });
});
