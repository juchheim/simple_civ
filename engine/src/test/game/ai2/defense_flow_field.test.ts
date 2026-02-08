import { describe, expect, it, vi } from "vitest";
import { GameState, PlayerPhase, TechId, UnitType } from "../../../core/types.js";
import { planCityGarrisons, type CityThreat } from "../../../game/ai2/defense-garrison.js";
import { planDefensiveRing } from "../../../game/ai2/defense-ring.js";
import { planMutualDefenseReinforcements } from "../../../game/ai2/defense-mutual-defense.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 5,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: { width: 10, height: 10, tiles: [] },
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

function seedTiles(state: GameState, min: number, max: number) {
    for (let q = min; q <= max; q++) {
        for (let r = min; r <= max; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: "Plains", overlays: [] } as any);
        }
    }
}

describe("Defense flow field integration", () => {
    it("planCityGarrisons consults the flow field per city", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans")];
        const city = mkCity("p1", "c1", 0, 0, { capital: true });
        state.cities = [city];

        const getFlowField = vi.fn(() => ({
            width: 0,
            height: 0,
            target: city.coord,
            indexByCoord: new Map(),
            costs: new Float32Array(0),
            getCost: () => 0,
            nextStep: () => null
        }));

        const threats: CityThreat[] = [{ city, threat: "raid", isCapital: true }];
        planCityGarrisons(
            state,
            "p1",
            threats,
            new Set([`${city.coord.q},${city.coord.r}`]),
            new Set(),
            new Set(),
            getFlowField
        );

        expect(getFlowField).toHaveBeenCalledTimes(1);
        expect(getFlowField).toHaveBeenCalledWith(city.coord, { cacheKey: "defense-garrison" });
    });

    it("planDefensiveRing consults flow field when routing defenders", () => {
        const state = baseState();
        state.turn = 60;
        seedTiles(state, 0, 5);
        state.players = [mkPlayer("p1", "ForgeClans")];
        const city = mkCity("p1", "c1", 1, 1, { capital: true });
        state.cities = [city];
        state.units = [
            {
                id: "u1",
                ownerId: "p1",
                type: UnitType.SpearGuard,
                coord: { q: 4, r: 1 },
                hp: 10,
                maxHp: 10,
                movesLeft: 2,
                hasAttacked: false,
                state: "Normal"
            } as any
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

        planDefensiveRing(state, "p1", new Set(), new Set(), getFlowField);

        expect(getFlowField).toHaveBeenCalledWith(
            expect.objectContaining({ q: expect.any(Number), r: expect.any(Number) }),
            { cacheKey: "defense-ring" }
        );
    });

    it("planMutualDefenseReinforcements consults flow field when sending support", () => {
        const state = baseState();
        state.turn = 60;
        seedTiles(state, 0, 8);
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.diplomacy = { p1: { p2: "War" }, p2: { p1: "War" } } as any;
        state.cities = [
            mkCity("p1", "cap", 1, 1, { capital: true }),
            mkCity("p1", "outpost", 7, 1),
        ];
        state.units = [
            { id: "g1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 1, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "h0", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 7, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "h1", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 6, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "h2", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 8, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "h3", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 7, r: 0 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "h4", ownerId: "p1", type: UnitType.SpearGuard, coord: { q: 7, r: 2 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "e1", ownerId: "p2", type: UnitType.SpearGuard, coord: { q: 2, r: 1 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "e2", ownerId: "p2", type: UnitType.SpearGuard, coord: { q: 2, r: 2 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
            { id: "e3", ownerId: "p2", type: UnitType.SpearGuard, coord: { q: 1, r: 2 }, hp: 10, maxHp: 10, movesLeft: 2, hasAttacked: false, state: "Normal" } as any,
        ];

        const getFlowField = vi.fn(() => ({
            width: 0,
            height: 0,
            target: { q: 3, r: 1 },
            indexByCoord: new Map(),
            costs: new Float32Array(0),
            getCost: () => 0,
            nextStep: () => null
        }));

        planMutualDefenseReinforcements(state, "p1", new Set(), new Set(), getFlowField);

        expect(getFlowField).toHaveBeenCalledWith(
            expect.objectContaining({ q: expect.any(Number), r: expect.any(Number) }),
            { cacheKey: "defense-mutual" }
        );
    });
});
