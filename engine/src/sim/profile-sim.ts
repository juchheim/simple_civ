/**
 * Performance profiler for the simulation
 * Run with: npx ts-node --esm src/sim/profile-sim.ts
 */

import { generateWorld } from "../map/map-generator.js";
import { runAiTurn } from "../game/ai.js";
import { MapSize, GameState } from "../core/types.js";
import { clearWarVetoLog } from "../game/ai-decisions.js";
import { performance } from "perf_hooks";

const CIV_OPTIONS = ["ForgeClans", "ScholarKingdoms", "RiverLeague", "AetherianVanguard", "StarborneSeekers", "JadeCovenant"];

function runProfile() {
    console.log("🔬 Profiling simulation performance...\n");

    // Track time spent in each phase
    const timings: { [key: string]: number[] } = {
        mapGen: [],
        aiTurn: [],
        total: [],
    };

    const NUM_GAMES = 3;
    const TURN_LIMIT = 100;

    for (let game = 0; game < NUM_GAMES; game++) {
        const seed = 42 + game;
        console.log(`\n📊 Game ${game + 1}/${NUM_GAMES} (seed: ${seed})`);

        const gameStart = performance.now();

        // Map generation
        const mapStart = performance.now();
        const players = CIV_OPTIONS.slice(0, 4).map((c, i) => ({ id: `p${i}`, civName: c, color: "#fff" }));
        let state = generateWorld({ mapSize: "Standard" as MapSize, players, seed });
        clearWarVetoLog();
        timings.mapGen.push(performance.now() - mapStart);

        // Force initial contact
        for (const a of state.players) {
            for (const b of state.players) {
                if (a.id !== b.id) {
                    state.contacts[a.id] ??= {} as any;
                    state.contacts[a.id][b.id] = true;
                }
            }
        }

        // Track per-turn AI timing
        const turnTimes: number[] = [];
        let turn = 0;

        while (!state.winnerId && state.turn <= TURN_LIMIT) {
            const turnStart = performance.now();
            const playerId = state.currentPlayerId;
            state = runAiTurn(state, playerId);
            turnTimes.push(performance.now() - turnStart);
            turn++;
        }

        const avgTurnTime = turnTimes.reduce((a, b) => a + b, 0) / turnTimes.length;
        const maxTurnTime = Math.max(...turnTimes);
        timings.aiTurn.push(avgTurnTime);

        console.log(`  Turns: ${turn}, Avg turn: ${avgTurnTime.toFixed(1)}ms, Max: ${maxTurnTime.toFixed(1)}ms`);
        console.log(`  Winner: ${state.winnerId || "none"} at turn ${state.turn}`);

        timings.total.push(performance.now() - gameStart);
    }

    console.log("\n📈 Summary:");
    console.log(`  Map Gen:    ${avg(timings.mapGen).toFixed(0)}ms avg`);
    console.log(`  AI Turn:    ${avg(timings.aiTurn).toFixed(1)}ms avg per turn`);
    console.log(`  Total Game: ${avg(timings.total).toFixed(0)}ms avg`);

    // Now let's profile specific functions
    console.log("\n🔍 Profiling hot path with detailed timing...");
    profileHotPath();
}

function avg(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// More granular profiling
function profileHotPath() {
    const seed = 99;
    const players = CIV_OPTIONS.slice(0, 4).map((c, i) => ({ id: `p${i}`, civName: c, color: "#fff" }));
    let state = generateWorld({ mapSize: "Standard" as MapSize, players, seed });
    clearWarVetoLog();

    // Force initial contact
    for (const a of state.players) {
        for (const b of state.players) {
            if (a.id !== b.id) {
                state.contacts[a.id] ??= {} as any;
                state.contacts[a.id][b.id] = true;
            }
        }
    }

    // Run 50 turns and measure
    const TURNS = 50;
    const start = performance.now();

    for (let i = 0; i < TURNS; i++) {
        state = runAiTurn(state, state.currentPlayerId);
    }

    const elapsed = performance.now() - start;
    console.log(`  ${TURNS} turns in ${elapsed.toFixed(0)}ms = ${(elapsed / TURNS).toFixed(1)}ms/turn`);
    console.log(`  Units: ${state.units.length}, Cities: ${state.cities.length}, Turn: ${state.turn}`);
}

runProfile();
