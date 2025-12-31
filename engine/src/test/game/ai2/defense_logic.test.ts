import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, TechId } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { isPerimeterCity } from "../../../game/ai2/defense-perimeter.js";
import { shouldPrioritizeDefense } from "../../../game/ai2/production.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 10,
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

function mkPlayer(id: string, civName: string, ai = true): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: ai,
        aiGoal: "Balanced",
        techs: [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore, TechId.DrilledRanks],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

describe("AI Defense Logic (v7.2)", () => {
    describe("isPerimeterCity", () => {
        it("classifies far cities as interior when closer cities exist", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p1", "c2", 0, 1),
                mkCity("p1", "c3", 0, 20),
                mkCity("p1", "c4", 0, 21),
            ];
            state.units = [mkUnit("p2", "e1", UnitType.SpearGuard, 0, 22)];

            const nearPerimeter = isPerimeterCity(state, state.cities[3], "p1");
            const farInterior = isPerimeterCity(state, state.cities[0], "p1");

            expect(nearPerimeter).toBe(true);
            expect(farInterior).toBe(false);
        });
    });

    describe("shouldPrioritizeDefense", () => {
        it("returns 'defend' for assault threats", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            const city = mkCity("p1", "c1", 0, 0);
            state.cities = [city];
            state.units = [mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1)]; // Adjacent enemy
            state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

            const decision = shouldPrioritizeDefense(state, city, "p1", "Expand");
            expect(decision).toBe("defend");
        });

        it("returns 'expand' when significantly stronger than enemy", () => {
            const state = baseState();
            state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague")];
            const city = mkCity("p1", "c1", 0, 0);
            state.cities = [city];
            state.units = [
                mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
                mkUnit("p1", "u2", UnitType.SpearGuard, 0, -1),
                mkUnit("p1", "u3", UnitType.SpearGuard, -1, 0),
                mkUnit("p1", "u4", UnitType.SpearGuard, 1, 1),
                mkUnit("p1", "u5", UnitType.SpearGuard, 2, 2),
                mkUnit("p2", "e1", UnitType.Scout, 10, 10), // Far and weak
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };

            const decision = shouldPrioritizeDefense(state, city, "p1", "Develop");
            expect(decision).toBe("expand");
        });
    });
});
