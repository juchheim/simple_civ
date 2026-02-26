import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { runAiTurn } from "../game/ai.js";
import { setAiDebug } from "../game/ai/debug-logging.js";
import { clearWarVetoLog } from "../game/ai-decisions.js";
import { MapSize } from "../core/types.js";
import { generateWorld } from "../map/map-generator.js";
import { civList, seededRandom } from "./shared-analysis.js";

type PerfConfig = {
    seed: number;
    mapSize: MapSize;
    playerCount: number;
    rounds: number;
    repetitions: number;
    warmupRuns: number;
    forceInitialContact: boolean;
    quiet: boolean;
};

type PerfRunResult = {
    durationMs: number;
    msPerPlayerTurn: number;
    playerTurnsExecuted: number;
    fingerprint: string;
    endTurn: number;
};

const MAP_SIZES: MapSize[] = ["Tiny", "Small", "Standard", "Large", "Huge"];
const MAX_CIVS_BY_SIZE: Record<MapSize, number> = {
    Tiny: 2,
    Small: 3,
    Standard: 4,
    Large: 6,
    Huge: 6,
};

function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
    const raw = process.env[name];
    if (raw === undefined) return defaultValue;
    return raw === "1" || raw.toLowerCase() === "true";
}

function parseIntegerEnv(name: string, defaultValue: number): number {
    const raw = process.env[name];
    if (!raw) return defaultValue;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseMapSizeEnv(name: string, defaultValue: MapSize): MapSize {
    const raw = process.env[name];
    if (!raw) return defaultValue;
    const normalized = raw.trim() as MapSize;
    return MAP_SIZES.includes(normalized) ? normalized : defaultValue;
}

function forceInitialContact(state: ReturnType<typeof generateWorld>): void {
    for (const a of state.players) {
        for (const b of state.players) {
            if (a.id === b.id) continue;
            state.contacts[a.id] ??= {} as any;
            state.contacts[b.id] ??= {} as any;
            state.contacts[a.id][b.id] = true;
            state.contacts[b.id][a.id] = true;
            (state.contacts[a.id] as any)[`metTurn_${b.id}`] = state.turn;
            (state.contacts[b.id] as any)[`metTurn_${a.id}`] = state.turn;
        }
    }
}

function fingerprintState(state: ReturnType<typeof generateWorld>): string {
    const payload = {
        turn: state.turn,
        currentPlayerId: state.currentPlayerId,
        players: state.players
            .map(p => ({
                id: p.id,
                isEliminated: p.isEliminated,
                treasury: p.treasury ?? 0,
                netGold: p.netGold ?? 0,
                techs: [...p.techs].sort(),
                projects: [...p.completedProjects].sort(),
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        cities: state.cities
            .map(c => ({
                ownerId: c.ownerId,
                pop: c.pop,
                q: c.coord.q,
                r: c.coord.r,
                buildings: [...c.buildings].sort(),
            }))
            .sort((a, b) =>
                a.ownerId.localeCompare(b.ownerId) ||
                a.q - b.q ||
                a.r - b.r ||
                a.pop - b.pop
            ),
        units: state.units
            .map(u => ({
                ownerId: u.ownerId,
                type: u.type,
                hp: u.hp,
                q: u.coord.q,
                r: u.coord.r,
            }))
            .sort((a, b) =>
                a.ownerId.localeCompare(b.ownerId) ||
                a.type.localeCompare(b.type) ||
                a.q - b.q ||
                a.r - b.r ||
                a.hp - b.hp
            ),
    };
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

function runDeterministicPerf(config: PerfConfig): PerfRunResult {
    const originalMathRandom = Math.random;
    const deterministicRandom = seededRandom((config.seed ^ 0x9e3779b9) >>> 0);
    Math.random = deterministicRandom;
    try {
        let state = generateWorld({
            mapSize: config.mapSize,
            players: civList(config.playerCount, config.seed),
            seed: config.seed,
            aiSystem: "UtilityV2",
        });
        clearWarVetoLog();
        if (config.forceInitialContact) {
            forceInitialContact(state);
        }

        const playerTurnsTarget = config.rounds * state.players.length;
        const start = performance.now();

        for (let i = 0; i < playerTurnsTarget; i++) {
            if (state.winnerId) {
                throw new Error(
                    `Winner reached early on turn ${state.turn} after ${i} player-turns. ` +
                    `Use a lower SIM_PERF_ROUNDS or choose another SIM_PERF_SEED.`
                );
            }
            state = runAiTurn(state, state.currentPlayerId);
        }

        const durationMs = performance.now() - start;
        return {
            durationMs,
            msPerPlayerTurn: durationMs / playerTurnsTarget,
            playerTurnsExecuted: playerTurnsTarget,
            fingerprint: fingerprintState(state),
            endTurn: state.turn,
        };
    } finally {
        Math.random = originalMathRandom;
    }
}

function mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

function stdDev(values: number[]): number {
    const m = mean(values);
    const variance = mean(values.map(v => (v - m) ** 2));
    return Math.sqrt(variance);
}

function loadConfig(): PerfConfig {
    const mapSize = parseMapSizeEnv("SIM_PERF_MAP_SIZE", "Standard");
    const defaultPlayers = MAX_CIVS_BY_SIZE[mapSize];
    return {
        seed: parseIntegerEnv("SIM_PERF_SEED", 101001),
        mapSize,
        playerCount: parseIntegerEnv("SIM_PERF_PLAYERS", defaultPlayers),
        rounds: parseIntegerEnv("SIM_PERF_ROUNDS", 80),
        repetitions: parseIntegerEnv("SIM_PERF_REPS", 5),
        warmupRuns: parseIntegerEnv("SIM_PERF_WARMUP", 1),
        forceInitialContact: parseBooleanEnv("SIM_PERF_FORCE_CONTACT", true),
        quiet: parseBooleanEnv("SIM_PERF_QUIET", false),
    };
}

function main(): void {
    setAiDebug(false);
    const config = loadConfig();

    if (!config.quiet) {
        console.log("Deterministic Simulation Perf Benchmark");
        console.log(`Seed: ${config.seed}`);
        console.log(`Map: ${config.mapSize} | Players: ${config.playerCount}`);
        console.log(`Rounds: ${config.rounds} | Reps: ${config.repetitions} | Warmup: ${config.warmupRuns}`);
        console.log(`Force Initial Contact: ${config.forceInitialContact ? "yes" : "no"}`);
        console.log("");
    }

    for (let i = 0; i < config.warmupRuns; i++) {
        runDeterministicPerf(config);
        if (!config.quiet) {
            console.log(`[warmup ${i + 1}/${config.warmupRuns}] complete`);
        }
    }

    const results: PerfRunResult[] = [];
    for (let i = 0; i < config.repetitions; i++) {
        const result = runDeterministicPerf(config);
        results.push(result);
        if (!config.quiet) {
            console.log(
                `[run ${i + 1}/${config.repetitions}] ` +
                `${result.durationMs.toFixed(1)}ms total | ` +
                `${result.msPerPlayerTurn.toFixed(3)}ms/player-turn | ` +
                `endTurn=${result.endTurn} | fp=${result.fingerprint}`
            );
        }
    }

    const durations = results.map(r => r.durationMs);
    const perTurn = results.map(r => r.msPerPlayerTurn);
    const fingerprints = new Set(results.map(r => r.fingerprint));
    const deterministic = fingerprints.size === 1;

    console.log("");
    console.log("Summary");
    console.log(`runs=${results.length} deterministic=${deterministic ? "yes" : "no"}`);
    console.log(
        `total_ms mean=${mean(durations).toFixed(1)} median=${median(durations).toFixed(1)} ` +
        `min=${Math.min(...durations).toFixed(1)} max=${Math.max(...durations).toFixed(1)} ` +
        `stddev=${stdDev(durations).toFixed(2)}`
    );
    console.log(
        `ms_per_player_turn mean=${mean(perTurn).toFixed(3)} median=${median(perTurn).toFixed(3)} ` +
        `min=${Math.min(...perTurn).toFixed(3)} max=${Math.max(...perTurn).toFixed(3)} ` +
        `stddev=${stdDev(perTurn).toFixed(4)}`
    );
    console.log(`fingerprint=${results[0]?.fingerprint ?? "n/a"}`);

    if (!deterministic) {
        process.exitCode = 1;
        console.error("Non-deterministic final fingerprints detected across repetitions.");
    }
}

main();
