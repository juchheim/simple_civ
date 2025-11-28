import { generateWorld } from "../map/map-generator.js";
import { runAiTurn } from "../game/ai.js";
import { MapSize, TechId, ProjectId, GameState, Player, City } from "../core/types.js";
import { getWarVetoLog, clearWarVetoLog } from "../game/ai-decisions.js";

type CivName =
    | "ForgeClans"
    | "ScholarKingdoms"
    | "RiverLeague"
    | "AetherianVanguard"
    | "StarborneSeekers"
    | "JadeCovenant";

type CaptureEvent = { turn: number; cityId: string; from: string; to: string };
type EliminationInfo = { turn: number; by?: string };

type PlayerSnapshot = {
    cities: number;
    pop: number;
    techs: number;
    projects: number;
};

// Seeded random number generator for reproducible civ selection
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = Math.imul(48271, s) | 0 % 2147483647;
        return (s & 2147483647) / 2147483648;
    };
}

// Fisher-Yates shuffle with seeded random
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const result = [...array];
    const random = seededRandom(seed);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function civList(limit?: number, seed?: number): { id: string; civName: CivName; color: string; ai: boolean }[] {
    const allCivs: CivName[] = [
        "ForgeClans",
        "ScholarKingdoms",
        "RiverLeague",
        "AetherianVanguard",
        "StarborneSeekers",
        "JadeCovenant",
    ];
    // RANDOMIZE civ selection based on seed so all civs get equal representation
    const shuffled = seed !== undefined ? shuffleWithSeed(allCivs, seed) : allCivs;
    const chosen = limit ? shuffled.slice(0, limit) : shuffled;
    const colors = ["#e25822", "#4b9be0", "#2fa866", "#8a4dd2", "#f4b400", "#888888"];
    return chosen.map((civ, idx) => ({
        id: `p${idx + 1}`,
        civName: civ,
        color: colors[idx] ?? `#${(Math.random() * 0xffffff) | 0}`,
        ai: true,
    }));
}

function snapshot(state: GameState): Map<string, PlayerSnapshot> {
    const snaps = new Map<string, PlayerSnapshot>();
    for (const p of state.players) {
        const cities = state.cities.filter(c => c.ownerId === p.id);
        snaps.set(p.id, {
            cities: cities.length,
            pop: cities.reduce((s, c) => s + c.pop, 0),
            techs: p.techs.length,
            projects: p.completedProjects.length,
        });
    }
    return snaps;
}

function summarizeTechs(p: Player) {
    const keyTechs: TechId[] = [
        TechId.StarCharts,
        TechId.ArmyDoctrine,
        TechId.SteamForges,
        TechId.SignalRelay,
        TechId.UrbanPlans,
        TechId.Wellworks,
    ];
    return {
        count: p.techs.length,
        keys: keyTechs.filter(t => p.techs.includes(t)),
    };
}

function summarizeProjects(p: Player) {
    const keyProjects: ProjectId[] = [
        ProjectId.Observatory,
        ProjectId.GrandAcademy,
        ProjectId.GrandExperiment,
        ProjectId.FormArmy_SpearGuard,
        ProjectId.FormArmy_BowGuard,
        ProjectId.FormArmy_Riders,
        ProjectId.JadeGranaryComplete,
    ];
    return keyProjects.filter(pr => p.completedProjects.includes(pr));
}

function firstPop10Turn(city: City, turn: number, tracker: Map<string, number>) {
    if (city.pop >= 10 && !tracker.has(city.id)) {
        tracker.set(city.id, turn);
    }
}

function runSimulation(seed = 42, mapSize: MapSize = "Huge", turnLimit = 200, debug = false, playerCount?: number) {
    // Pass seed to civList for randomized civ selection
    let state = generateWorld({ mapSize, players: civList(playerCount, seed), seed });
    clearWarVetoLog();
    // Force contact for diagnostics so war logic can trigger
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
    const captureLog: CaptureEvent[] = [];
    const eliminationLog = new Map<string, EliminationInfo>();
    const lastActive = new Map<string, number>();
    const pop10Tracker = new Map<string, number>();
    const maxPopTracker = new Map<string, number>();
    let winTurn: number | null = null;

    for (const p of state.players) {
        lastActive.set(p.id, state.turn);
    }

    const stalledThreshold = 25;

    const foundLog: { turn: number; playerId: string; cityId: string }[] = [];

    while (!state.winnerId && state.turn <= turnLimit) {
        const playerId = state.currentPlayerId;
        const beforeCities = new Map(state.cities.map(c => [c.id, { ownerId: c.ownerId, pop: c.pop }]));
        const beforeSnap = snapshot(state);

        state = runAiTurn(state, playerId);

        // track pop reaching 10
        for (const city of state.cities) {
            firstPop10Turn(city, state.turn, pop10Tracker);
            if (!maxPopTracker.has(city.id)) {
                maxPopTracker.set(city.id, city.pop);
            } else if (city.pop > (maxPopTracker.get(city.id) ?? city.pop)) {
                maxPopTracker.set(city.id, city.pop);
            }
        }

        // capture/found logs
        const _beforeIds = new Set(beforeCities.keys());
        for (const city of state.cities) {
            const prev = beforeCities.get(city.id);
            if (!prev) {
                foundLog.push({ turn: state.turn, playerId: city.ownerId, cityId: city.id });
                continue;
            }
            if (prev.ownerId !== city.ownerId) {
                captureLog.push({ turn: state.turn, cityId: city.id, from: prev.ownerId, to: city.ownerId });
            }
        }

        // activity tracking
        const afterSnap = snapshot(state);
        for (const [pid, snap] of afterSnap.entries()) {
            const prev = beforeSnap.get(pid);
            if (!prev) continue;
            if (
                snap.cities !== prev.cities ||
                snap.pop !== prev.pop ||
                snap.techs !== prev.techs ||
                snap.projects !== prev.projects
            ) {
                lastActive.set(pid, state.turn);
            }
        }

        // eliminations
        for (const p of state.players) {
            if (p.isEliminated && !eliminationLog.has(p.id)) {
                const lastCapture = [...captureLog].reverse().find(c => c.from === p.id);
                eliminationLog.set(p.id, { turn: state.turn, by: lastCapture?.to });
            }
        }

        if (state.winnerId) {
            winTurn = state.turn;
            break;
        }
    }

    const winner = state.players.find(p => p.id === state.winnerId);
    const victoryType =
        winner && winner.completedProjects.includes(ProjectId.GrandExperiment)
            ? "Progress"
            : state.winnerId
                ? "Conquest"
                : "None";

    const civSummaries = state.players.map(p => {
        const cities = state.cities.filter(c => c.ownerId === p.id);
        const maxCityPop = cities.reduce((m, c) => Math.max(m, maxPopTracker.get(c.id) ?? c.pop), 0);
        const firstPop10 = Math.min(
            ...cities
                .map(c => pop10Tracker.get(c.id))
                .filter((t): t is number => t !== undefined)
        );
        const stalledTurns = (state.turn - (lastActive.get(p.id) ?? state.turn)) || 0;
        return {
            id: p.id,
            civ: p.civName,
            eliminated: p.isEliminated,
            elimination: eliminationLog.get(p.id),
            cities: cities.length,
            maxCityPop,
            firstPop10Turn: Number.isFinite(firstPop10) ? firstPop10 : null,
            tech: summarizeTechs(p),
            projects: summarizeProjects(p),
            stalled: !state.winnerId && !p.isEliminated && stalledTurns >= stalledThreshold,
        };
    });

    const debugPlayers = debug
        ? state.players.map(p => ({
              id: p.id,
              civ: p.civName,
              techs: p.techs,
              currentTech: p.currentTech,
              completedProjects: p.completedProjects,
              cities: state.cities.filter(c => c.ownerId === p.id).map(c => ({ id: c.id, pop: c.pop })),
          }))
        : undefined;

    return {
        seed,
        mapSize,
        turnReached: state.turn,
        winTurn,
        winner: winner ? { id: winner.id, civ: winner.civName } : null,
        victoryType,
        captures: captureLog,
        foundings: foundLog,
        eliminations: Array.from(eliminationLog.entries()).map(([pid, info]) => ({ playerId: pid, ...info })),
        civSummaries,
        debugPlayers,
        warVetoLog: debug ? getWarVetoLog() : undefined,
    };
}

if (process.argv[1] && process.argv[1].endsWith("ai-autoplay.js")) {
    const seedArg = process.argv.find(arg => arg.startsWith("--seed="));
    const turnArg = process.argv.find(arg => arg.startsWith("--turns="));
    const sizeArg = process.argv.find(arg => arg.startsWith("--size="));
    const debug = process.argv.includes("--debug");
    const playersArg = process.argv.find(arg => arg.startsWith("--players="));
    const seed = seedArg ? parseInt(seedArg.split("=")[1], 10) : 42;
    const turnLimit = turnArg ? parseInt(turnArg.split("=")[1], 10) : 200;
    const size = (sizeArg ? sizeArg.split("=")[1] : "Huge") as MapSize;
    const players = playersArg ? parseInt(playersArg.split("=")[1], 10) : undefined;
    const result = runSimulation(seed, size, turnLimit, debug, players);
    console.log(JSON.stringify(result, null, 2));
}

export { runSimulation };
