import { describe, expect, it, vi } from "vitest";
import { GameState, PlayerPhase, TechId, UnitType, DiplomacyState } from "../../../core/types.js";
import { retreatIfNeeded } from "../../../game/ai2/movement.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 12,
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

function mkCity(ownerId: string, id: string, q: number, r: number, opts?: { capital?: boolean }): any {
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
        isCapital: !!opts?.capital,
        originalOwnerId: ownerId,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

describe("Retreat flow field integration", () => {
    it("retreatIfNeeded consults flow field when routing to safety", () => {
        const state = baseState();
        seedTiles(state, 0, 5);
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        const city = mkCity("p1", "home", 0, 0, { capital: true });
        state.cities = [city];
        state.units = [
            { id: "u1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 2, r: 0 }, hp: 1, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "e1", ownerId: "p2", type: UnitType.SpearGuard, coord: { q: 2, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
        ];

        const getFlowField = vi.fn(() => ({
            width: 0,
            height: 0,
            target: city.coord,
            indexByCoord: new Map(),
            costs: new Float32Array(0),
            getCost: () => 0,
            nextStep: () => null
        }));

        retreatIfNeeded(state, "p1", state.units[0] as any, getFlowField);

        expect(getFlowField).toHaveBeenCalledTimes(1);
        expect(getFlowField).toHaveBeenCalledWith(city.coord, { cacheKey: "retreat" });
    });
});
