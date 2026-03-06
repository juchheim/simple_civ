import { describe, expect, it } from "vitest";
import { DiplomacyState, PlayerPhase, UnitType } from "../../../core/types.js";
import { evaluateSettlerProductionGate, isSafeSettlerStagingCity } from "./settler-production-gates.js";

function baseState() {
    return {
        id: "g",
        turn: 1,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: { width: 12, height: 12, tiles: [], rivers: [] as { a: { q: number; r: number }; b: { q: number; r: number } }[] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: { p1: [] as string[] },
        revealed: { p1: [] as string[] },
        diplomacy: {} as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
    };
}

describe("settler production gate", () => {
    it("pauses settlers in war when no safe staging city exists", () => {
        const state = baseState();
        state.players = [
            { id: "p1", isEliminated: false },
            { id: "p2", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } } as any;
        state.cities = [
            { id: "c1", ownerId: "p1", coord: { q: 0, r: 0 } },
            { id: "ec1", ownerId: "p2", coord: { q: 3, r: 0 } },
        ] as any;
        state.units = [
            { id: "enemy-spear", ownerId: "p2", type: UnitType.SpearGuard, coord: { q: 1, r: 0 } },
        ] as any;

        const gate = evaluateSettlerProductionGate(state as any, "p1", true);
        expect(gate.allowSettlers).toBe(false);
        expect(gate.reason).toBe("unsafe-war-no-staging-city");
    });

    it("allows settlers in war when a rear garrisoned city is safe", () => {
        const state = baseState();
        state.players = [
            { id: "p1", isEliminated: false },
            { id: "p2", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } } as any;
        state.cities = [
            { id: "front", ownerId: "p1", coord: { q: 0, r: 0 } },
            { id: "rear", ownerId: "p1", coord: { q: -4, r: 0 } },
            { id: "enemy-cap", ownerId: "p2", coord: { q: 3, r: 0 } },
        ] as any;
        state.units = [
            { id: "rear-garrison", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: -4, r: 0 } },
            { id: "enemy-front", ownerId: "p2", type: UnitType.BowGuard, coord: { q: 1, r: 0 } },
        ] as any;

        const gate = evaluateSettlerProductionGate(state as any, "p1", true);
        expect(gate.allowSettlers).toBe(true);
        expect(gate.reason).toBe("allowed");

        expect(isSafeSettlerStagingCity(state as any, "p1", "front")).toBe(false);
        expect(isSafeSettlerStagingCity(state as any, "p1", "rear")).toBe(true);
    });

    it("pauses peacetime settlers when enemy military is near a city", () => {
        const state = baseState();
        state.players = [
            { id: "p1", isEliminated: false },
            { id: "p2", isEliminated: false },
        ] as any;
        state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } } as any;
        state.cities = [
            { id: "c1", ownerId: "p1", coord: { q: 0, r: 0 } },
        ] as any;
        state.units = [
            { id: "enemy-rider", ownerId: "p2", type: UnitType.Riders, coord: { q: 4, r: 0 } },
        ] as any;

        const gate = evaluateSettlerProductionGate(state as any, "p1", false);
        expect(gate.allowSettlers).toBe(false);
        expect(gate.reason).toBe("enemy-military-near-city");
    });

    it("treats native military as hostile peacetime pressure", () => {
        const state = baseState();
        state.players = [
            { id: "p1", isEliminated: false },
        ] as any;
        state.cities = [
            { id: "c1", ownerId: "p1", coord: { q: 0, r: 0 } },
        ] as any;
        state.units = [
            { id: "native-1", ownerId: "natives", type: UnitType.NativeChampion, coord: { q: 2, r: 0 } },
        ] as any;

        const gate = evaluateSettlerProductionGate(state as any, "p1", false);
        expect(gate.allowSettlers).toBe(false);
        expect(gate.reason).toBe("enemy-military-near-city");
    });
});
