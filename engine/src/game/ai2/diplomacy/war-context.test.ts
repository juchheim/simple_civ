import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, ProjectId, TechId, UnitType } from "../../../core/types.js";
import { buildWarPreflightContext } from "./war-context.js";

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

function mkPlayer(id: string, civName: string, completedProjects: ProjectId[] = []): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: true,
        aiGoal: "Balanced",
        techs: BASE_TECHS,
        currentTech: null,
        completedProjects,
        isEliminated: false,
        currentEra: "Hearth",
    };
}

function mkCity(ownerId: string, id: string, q: number, r: number, hp: number = 20, originalOwnerId?: string): any {
    return {
        id,
        name: id,
        ownerId,
        originalOwnerId,
        coord: { q, r },
        pop: 2,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp,
        maxHp: 20,
        isCapital: false,
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
        movesLeft: 1,
        hasAttacked: false,
        state: "Normal",
    };
}

describe("diplomacy war context helper", () => {
    it("identifies Aetherian pre-Titan expansion conditions", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "AetherianVanguard"), mkPlayer("p2", "ForgeClans")];
        state.cities = [
            mkCity("p1", "c1", 0, 0),
            mkCity("p1", "c2", 0, 2),
            mkCity("p1", "c3", 0, 4),
            mkCity("p2", "e1", 10, 0, 0),
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.Peace } as any };

        const context = buildWarPreflightContext({
            state,
            playerId: "p1",
            targetId: "p2",
            goal: "Balanced",
            civName: "AetherianVanguard",
            canInitiateWars: true,
            warPowerRatio: 1.3,
            minStanceTurns: 10,
            warDistanceMax: 8,
            ratio: 1.1,
            dist: 8,
            frontDistanceBonus: 0,
            memory: {},
        });

        expect(context.isAetherianPreTitan).toBe(true);
        expect(context.needsCities).toBe(true);
        expect(context.targetHasWeakCity).toBe(true);
    });

    it("flags overwhelming peace when ratio is huge and cooldown is active", () => {
        const state = baseState();
        state.turn = 60;
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 0, 0), mkCity("p2", "e1", 8, 0)];

        const context = buildWarPreflightContext({
            state,
            playerId: "p1",
            targetId: "p2",
            goal: "Balanced",
            civName: "ForgeClans",
            canInitiateWars: true,
            warPowerRatio: 1.3,
            minStanceTurns: 10,
            warDistanceMax: 8,
            ratio: 3.2,
            dist: 8,
            frontDistanceBonus: 0,
            memory: { lastStanceTurn: { p2: 58 } },
        });

        expect(context.overwhelmingPeace).toBe(true);
    });

    it("computes threat overrides and distance allowance", () => {
        const state = baseState();
        state.turn = 120;
        state.players = [
            mkPlayer("p1", "ForgeClans"),
            mkPlayer("p2", "StarborneSeekers", [ProjectId.GrandAcademy]),
        ];
        state.cities = [
            mkCity("p1", "c1", 0, 0),
            mkCity("p2", "e1", 20, 0, 20, "p3"),
            mkCity("p2", "e2", 21, 0, 20, "p4"),
        ];

        const context = buildWarPreflightContext({
            state,
            playerId: "p1",
            targetId: "p2",
            goal: "Balanced",
            civName: "ForgeClans",
            canInitiateWars: true,
            warPowerRatio: 1.3,
            minStanceTurns: 10,
            warDistanceMax: 6,
            ratio: 1.0,
            dist: 20,
            frontDistanceBonus: 0,
            memory: {},
        });

        expect(context.progressThreat).toBe(true);
        expect(context.conquestThreat).toBe(true);
        expect(context.allowDistance).toBe(999);
        expect(context.effectiveDist).toBe(14);
    });

    it("uses Aetherian Titan ratio floor when Titan is present", () => {
        const state = baseState();
        state.turn = 100;
        state.players = [mkPlayer("p1", "AetherianVanguard"), mkPlayer("p2", "RiverLeague")];
        state.cities = [mkCity("p1", "c1", 0, 0), mkCity("p2", "e1", 8, 0)];
        state.units = [mkUnit("p1", "t1", UnitType.Titan, 1, 0)];

        const context = buildWarPreflightContext({
            state,
            playerId: "p1",
            targetId: "p2",
            goal: "Balanced",
            civName: "AetherianVanguard",
            canInitiateWars: true,
            warPowerRatio: 1.4,
            minStanceTurns: 10,
            warDistanceMax: 8,
            ratio: 1.0,
            dist: 8,
            frontDistanceBonus: 0,
            memory: {},
        });

        expect(context.hasTitanNow).toBe(true);
        expect(context.requiredRatio).toBeCloseTo(0.9);
        expect(context.escalatedRatio).toBeCloseTo(0.9);
    });
});
