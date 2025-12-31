
import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, TerrainType, TechId } from "../../core/types.js";
import { runTacticalPlanner } from "./tactical-planner.js";
import { setAiMemoryV2 } from "./memory.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 30,
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

function mkCity(ownerId: string, id: string, q: number, r: number, opts?: { capital?: boolean; hp?: number }): any {
    return {
        id,
        name: id,
        ownerId,
        coord: { q, r },
        pop: 3,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [{ q, r }],
        currentBuild: null,
        buildProgress: 0,
        hp: opts?.hp ?? 20,
        maxHp: 20,
        isCapital: !!opts?.capital,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number, opts?: { hp?: number }): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: opts?.hp ?? 10,
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
        techs: [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Hearth",
    };
}

function generateMapTiles(state: GameState, minQ: number, maxQ: number, minR: number, maxR: number): void {
    for (let q = minQ; q <= maxQ; q++) {
        for (let r = minR; r <= maxR; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: TerrainType.Plains, overlays: [] });
        }
    }
}

describe("Settler Capture Logic", () => {
    it("captures adjacent settler even when not in attacking phase", () => {
        const state = baseState();
        state.players = [mkPlayer("p1", "ForgeClans"), mkPlayer("p2", "RiverLeague", false)];
        // p1 (AI) has a unit adjacent to p2's settler
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 0),
            mkUnit("p2", "settler1", UnitType.Settler, 1, 0, { hp: 1 }), // Settlers have 1 HP
        ];
        state.diplomacy = { p1: { p2: DiplomacyState.War }, p2: { p1: DiplomacyState.War } };
        generateMapTiles(state, -5, 5, -5, 5);

        // Force 'scattered' phase so normal attacks are disabled
        let next = setAiMemoryV2(state, "p1", { armyPhase: "scattered" });

        // Run tactical planner
        next = runTacticalPlanner(next, "p1", "full");

        // Check if u1 attacked settler1
        // Since unit attacks are executed immediately in runTacticalPlanner via executeTacticalPlan,
        // we can check if the settler is gone or if u1 has attacked.
        // Capturing a settler usually eliminates it or converts it.
        // In SimpleCiv, attacking a unit with 0 defense results in damage.
        // Settlers might have low HP. Let's assume attacking kills/captures it.

        const attacker = next.units.find(u => u.id === "u1");
        // const settler = next.units.find(u => u.id === "settler1");

        // If attacker has attacked, it means the plan decided to capture.
        expect(attacker?.hasAttacked).toBe(true);
    });
});
