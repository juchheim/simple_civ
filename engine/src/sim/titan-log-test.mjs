/**
 * Debug script to run a single simulation with Titan logging enabled.
 * Usage: node src/sim/titan-log-test.mjs [seed] [mapSize]
 */
import { setAiDebug } from "../../dist/game/ai/debug-logging.js";
import { runSimulation } from "../../dist/sim/ai-autoplay.js";

// Enable AI debug logging
setAiDebug(true);

const seed = parseInt(process.argv[2] || "301001");
const mapSize = process.argv[3] || "Large";

console.log(`Running simulation with seed ${seed} on ${mapSize} map...`);
console.log("=".repeat(60));

const result = runSimulation(seed, mapSize);

console.log("=".repeat(60));
console.log(`Game ended on turn ${result.turnReached}`);
console.log(`Winner: ${result.winner?.civ || "None"} (${result.victoryType})`);

// Check Titan events
console.log(`\n(For detailed logs, check specific analysis scripts or enable stdout logging)`);
