import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, PlayerPhase, TechId, UnitType } from "../../../core/types.js";
import { DIPLOMACY_DISTANCE_FALLBACK_MAX } from "./constants.js";
import { buildDiplomacyOpponentContext } from "./opponent-context.js";

const BASE_TECHS = [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore];

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

function mkPlayer(id: string, isAI: boolean): any {
    return {
        id,
        civName: "ForgeClans",
        color: "#fff",
        isAI,
        aiGoal: "Balanced",
        techs: BASE_TECHS,
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

function mkCity(ownerId: string, id: string, q: number, r: number, capital: boolean): any {
    return {
        id,
        ownerId,
        name: id,
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
        isCapital: capital,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkUnit(ownerId: string, id: string, q: number, r: number): any {
    return {
        id,
        ownerId,
        type: UnitType.SpearGuard,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        hasAttacked: false,
        state: "Normal",
    };
}

describe("diplomacy opponent context", () => {
    it("computes distance, stance, and applies human bias", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", true), mkPlayer("p2", false)];
        state.cities = [
            mkCity("p1", "c1", 0, 0, true),
            mkCity("p2", "e1", 3, 0, true),
        ];
        state.units = [mkUnit("p2", "u2", 3, 1)];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

        const result = buildDiplomacyOpponentContext({
            state,
            playerId: "p1",
            other: state.players[1] as any,
            myPower: 10,
            myOffensivePower: 8,
            myAnchor: state.cities[0] as any,
            influence: undefined,
            humanBias: 1.25,
        });

        expect(result.stance).toBe(DiplomacyState.War);
        expect(result.dist).toBe(3);
        expect(result.frontRatio).toBe(0);
        expect(result.pressureRatio).toBe(0);
        expect(result.frontDistanceBonus).toBe(0);
        expect(result.effectiveRatio).toBeCloseTo(result.ratio * 1.25);
    });

    it("falls back to max distance and keeps AI bias neutral", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", true), mkPlayer("p3", true)];
        state.cities = [mkCity("p1", "c1", 0, 0, true)];
        state.units = [mkUnit("p3", "u3", 8, 8)];
        state.diplomacy = { p1: { p3: DiplomacyState.Peace }, p3: { p1: DiplomacyState.Peace } };

        const result = buildDiplomacyOpponentContext({
            state,
            playerId: "p1",
            other: state.players[1] as any,
            myPower: 10,
            myOffensivePower: 8,
            myAnchor: undefined,
            influence: undefined,
            humanBias: 2.0,
        });

        expect(result.stance).toBe(DiplomacyState.Peace);
        expect(result.dist).toBe(DIPLOMACY_DISTANCE_FALLBACK_MAX);
        expect(result.effectiveRatio).toBe(result.ratio);
    });
});
