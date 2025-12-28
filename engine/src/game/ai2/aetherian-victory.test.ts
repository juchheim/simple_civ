import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, TechId, ProjectId } from "../../core/types.js";
import { chooseVictoryGoalV2 } from "./strategy.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 100,
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
        pop: 5,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: !!opts?.capital,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number, opts?: { atk?: number; hp?: number }): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: opts?.hp ?? 10,
        maxHp: opts?.hp ?? 10,
        movesLeft: 2,
        hasAttacked: false,
        state: "Normal",
    };
}

function mkPlayer(id: string, civName: string, opts?: { techs?: TechId[]; completedProjects?: ProjectId[] }): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: true,
        aiGoal: "Balanced",
        techs: opts?.techs ?? [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore],
        currentTech: null,
        completedProjects: opts?.completedProjects ?? [],
        isEliminated: false,
        currentEra: "Hearth",
        buildings: [],
    };
}

describe("Aetherian Victory Decision Logic", () => {

    describe("chooseVictoryGoalV2 - Titan's Core completion", () => {

        it("returns Conquest when Aetherian has active Titan (before Titan's Core logic)", () => {
            const state = baseState();
            state.players = [
                mkPlayer("p1", "AetherianVanguard", { completedProjects: [ProjectId.TitansCoreComplete] }),
                mkPlayer("p2", "ForgeClans"),
            ];
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p2", "c2", 10, 0, { capital: true }),
            ];
            // Titan is alive - should return Conquest regardless of power ratio
            state.units = [
                mkUnit("p1", "titan", UnitType.Titan, 0, 0, { hp: 40, atk: 25 }),
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

            const goal = chooseVictoryGoalV2(state, "p1");
            expect(goal).toBe("Conquest");
        });

        it("returns Conquest when Aetherian has Titan's Core and power > 1.5x strongest enemy", () => {
            const state = baseState();
            state.players = [
                mkPlayer("p1", "AetherianVanguard", { completedProjects: [ProjectId.TitansCoreComplete] }),
                mkPlayer("p2", "ForgeClans"),
            ];
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p2", "c2", 10, 0, { capital: true }),
            ];
            // Strong Aetherian army (no Titan though)
            state.units = [
                mkUnit("p1", "u1", UnitType.Landship, 0, 0),
                mkUnit("p1", "u2", UnitType.Landship, 0, 1),
                mkUnit("p1", "u3", UnitType.Landship, 1, 0),
                mkUnit("p1", "u4", UnitType.ArmyBowGuard, 1, 1),
                mkUnit("p1", "u5", UnitType.ArmySpearGuard, 2, 0),
                // Weak enemy
                mkUnit("p2", "e1", UnitType.SpearGuard, 10, 0),
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

            const goal = chooseVictoryGoalV2(state, "p1");
            expect(goal).toBe("Conquest");
        });

        it("returns Progress when Aetherian has Titan's Core but power < 1.5x strongest enemy", () => {
            const state = baseState();
            state.players = [
                mkPlayer("p1", "AetherianVanguard", { completedProjects: [ProjectId.TitansCoreComplete] }),
                mkPlayer("p2", "ForgeClans"),
            ];
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p2", "c2", 10, 0, { capital: true }),
            ];
            // Aetherian has small army
            state.units = [
                mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
                mkUnit("p1", "u2", UnitType.BowGuard, 0, 1),
                // Enemy has LARGER army - power ratio should be < 1.5
                mkUnit("p2", "e1", UnitType.SpearGuard, 10, 0),
                mkUnit("p2", "e2", UnitType.BowGuard, 10, 1),
                mkUnit("p2", "e3", UnitType.Riders, 11, 0),
                mkUnit("p2", "e4", UnitType.ArmySpearGuard, 11, 1),
                mkUnit("p2", "e5", UnitType.ArmyBowGuard, 12, 0),
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

            const goal = chooseVictoryGoalV2(state, "p1");
            expect(goal).toBe("Progress");
        });

        it("returns Progress when Aetherian has Titan's Core and enemy is stronger", () => {
            const state = baseState();
            state.players = [
                mkPlayer("p1", "AetherianVanguard", { completedProjects: [ProjectId.TitansCoreComplete] }),
                mkPlayer("p2", "ForgeClans"),
            ];
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p2", "c2", 10, 0, { capital: true }),
            ];
            // Weak Aetherian, strong enemy
            state.units = [
                mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
                // Enemy is much stronger
                mkUnit("p2", "e1", UnitType.Landship, 10, 0),
                mkUnit("p2", "e2", UnitType.Landship, 10, 1),
                mkUnit("p2", "e3", UnitType.ArmySpearGuard, 11, 0),
                mkUnit("p2", "e4", UnitType.ArmyBowGuard, 11, 1),
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

            const goal = chooseVictoryGoalV2(state, "p1");
            expect(goal).toBe("Progress");
        });

        it("non-Aetherian civs ignore Titan's Core logic", () => {
            const state = baseState();
            state.players = [
                // ForgeClans with TitansCoreComplete (shouldn't happen, but testing guard)
                mkPlayer("p1", "ForgeClans", { completedProjects: [ProjectId.TitansCoreComplete] }),
                mkPlayer("p2", "RiverLeague"),
            ];
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p2", "c2", 10, 0, { capital: true }),
            ];
            state.units = [
                mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
                mkUnit("p2", "e1", UnitType.SpearGuard, 10, 0),
            ];
            state.diplomacy = { p1: { p2: DiplomacyState.Peace }, p2: { p1: DiplomacyState.Peace } };

            const goal = chooseVictoryGoalV2(state, "p1");
            // ForgeClans shouldn't trigger Progress just because they have TitansCoreComplete
            expect(goal).not.toBe("Progress");
        });

        it("returns Conquest when Aetherian dominates multiple enemies", () => {
            const state = baseState();
            state.players = [
                mkPlayer("p1", "AetherianVanguard", { completedProjects: [ProjectId.TitansCoreComplete] }),
                mkPlayer("p2", "ForgeClans"),
                mkPlayer("p3", "RiverLeague"),
            ];
            state.cities = [
                mkCity("p1", "c1", 0, 0, { capital: true }),
                mkCity("p2", "c2", 10, 0, { capital: true }),
                mkCity("p3", "c3", 10, 10, { capital: true }),
            ];
            // Strong Aetherian army dominates both enemies
            state.units = [
                mkUnit("p1", "u1", UnitType.Landship, 0, 0),
                mkUnit("p1", "u2", UnitType.Landship, 0, 1),
                mkUnit("p1", "u3", UnitType.Landship, 1, 0),
                mkUnit("p1", "u4", UnitType.ArmyBowGuard, 1, 1),
                mkUnit("p1", "u5", UnitType.ArmySpearGuard, 2, 0),
                mkUnit("p1", "u6", UnitType.ArmySpearGuard, 2, 1),
                // Weak enemies
                mkUnit("p2", "e1", UnitType.SpearGuard, 10, 0),
                mkUnit("p3", "e2", UnitType.SpearGuard, 10, 10),
            ];
            state.diplomacy = {
                p1: { p2: DiplomacyState.Peace, p3: DiplomacyState.Peace },
                p2: { p1: DiplomacyState.Peace, p3: DiplomacyState.Peace },
                p3: { p1: DiplomacyState.Peace, p2: DiplomacyState.Peace },
            };

            const goal = chooseVictoryGoalV2(state, "p1");
            expect(goal).toBe("Conquest");
        });
    });
});
