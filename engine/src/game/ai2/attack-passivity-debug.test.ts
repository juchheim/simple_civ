import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, DiplomacyState, UnitType, TerrainType, TechId } from "../../core/types.js";
import { setAiMemoryV2, getAiMemoryV2 } from "./memory.js";
import { hexDistance } from "../../core/hex.js";
import { runAiTurnSequenceV2 } from "./turn-runner.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 71, // Matching user's turn
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

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number, opts?: { hp?: number; movesLeft?: number }): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: opts?.hp ?? 10,
        maxHp: 10,
        movesLeft: opts?.movesLeft ?? 2,
        hasAttacked: false,
        state: "Normal",
    };
}

// JADE COVENANT specific test - matches user's scenario
function mkPlayer(id: string, civName: string, ai = true): any {
    return {
        id,
        civName,
        color: "#fff",
        isAI: ai,
        aiGoal: "Balanced",
        techs: [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.ScriptLore, TechId.FormationTraining, TechId.DrilledRanks],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: "Rise",
    };
}

function generateMapTiles(state: GameState, minQ: number, maxQ: number, minR: number, maxR: number): void {
    for (let q = minQ; q <= maxQ; q++) {
        for (let r = minR; r <= maxR; r++) {
            state.map.tiles.push({ coord: { q, r }, terrain: TerrainType.Plains, overlays: [] });
        }
    }
}

describe("JadeCovenant Passivity Bug", () => {
    it("JadeCovenant with many spearguards should attack player city", () => {
        const state = baseState();
        // JADE COVENANT is the AI (p1)
        // Player is human (p2)
        state.players = [mkPlayer("p1", "JadeCovenant"), mkPlayer("p2", "RiverLeague", false)];

        // Player 2 (human) has cities (like Xylos, Cosmos from screenshot)
        state.cities = [
            mkCity("p2", "Xylos", 5, 5, { capital: false }),
            mkCity("p2", "Cosmos", 8, 5, { capital: false }),
            mkCity("p1", "AICapital", 0, 0, { capital: true }),
        ];

        // Place MANY AI ArmySpearguards around player cities (simulating screenshot)
        // Around Xylos (5,5)
        state.units = [
            mkUnit("p1", "u1", UnitType.ArmySpearGuard, 5, 4), // Adjacent N
            mkUnit("p1", "u2", UnitType.ArmySpearGuard, 6, 4), // Near NE
            mkUnit("p1", "u3", UnitType.ArmySpearGuard, 6, 5), // Adjacent E
            mkUnit("p1", "u4", UnitType.ArmySpearGuard, 5, 6), // Adjacent S
            mkUnit("p1", "u5", UnitType.ArmySpearGuard, 4, 6), // Near SW
            mkUnit("p1", "u6", UnitType.ArmySpearGuard, 4, 5), // Adjacent W
            // Around Cosmos (8,5)
            mkUnit("p1", "u7", UnitType.ArmySpearGuard, 8, 4), // Adjacent N
            mkUnit("p1", "u8", UnitType.ArmySpearGuard, 9, 5), // Adjacent E
        ];

        // Set war (like user's 20+ turn war)
        state.diplomacy = {
            p1: { p2: DiplomacyState.War },
            p2: { p1: DiplomacyState.War }
        };

        // Generate map
        generateMapTiles(state, -5, 15, -5, 15);

        // NO preset armyPhase - let the system calculate
        // but set focus to Xylos
        const next = setAiMemoryV2(state, "p1", {
            focusTargetPlayerId: "p2",
            focusCityId: "Xylos"
        });

        console.log("=== JADE COVENANT PASSIVITY TEST ===");
        console.log("Turn:", next.turn);
        console.log("AI Memory before:", getAiMemoryV2(next, "p1"));
        console.log("AI units count:", next.units.filter(u => u.ownerId === "p1").length);

        // Run FULL AI turn sequence
        const afterTurn = runAiTurnSequenceV2(next, "p1");

        console.log("=== AFTER AI TURN ===");
        const memory = getAiMemoryV2(afterTurn, "p1");
        console.log("AI Memory after:", memory);
        console.log("Army phase:", memory.armyPhase);

        const xylos = afterTurn.cities.find(c => c.id === "Xylos");
        const cosmos = afterTurn.cities.find(c => c.id === "Cosmos");
        console.log("Xylos HP:", xylos?.hp, "/", xylos?.maxHp);
        console.log("Cosmos HP:", cosmos?.hp, "/", cosmos?.maxHp);

        const aiUnits = afterTurn.units.filter(u => u.ownerId === "p1");
        let attackedCount = 0;
        let movedCount = 0;
        for (const u of aiUnits) {
            const orig = next.units.find(ou => ou.id === u.id);
            const moved = !orig || u.coord.q !== orig.coord.q || u.coord.r !== orig.coord.r;
            if (u.hasAttacked) attackedCount++;
            if (moved) movedCount++;
            console.log(`Unit ${u.id}: hasAttacked=${u.hasAttacked}, moved=${moved}, coord=${JSON.stringify(u.coord)}`);
        }

        console.log("=== RESULT ===");
        console.log("Units that attacked:", attackedCount);
        console.log("Units that moved:", movedCount);
        console.log("Xylos damaged:", xylos && xylos.hp < xylos.maxHp);
        console.log("Cosmos damaged:", cosmos && cosmos.hp < cosmos.maxHp);

        // At least SOME units should attack when we have 6+ units around a city!
        const anyDamage = (xylos && xylos.hp < xylos.maxHp) || (cosmos && cosmos.hp < cosmos.maxHp);
        expect(attackedCount).toBeGreaterThan(0);
        expect(anyDamage).toBe(true);
    });
});
