import { generateWorld } from "../map/map-generator.js";
import { runAiTurn } from "../game/ai.js";
import { MapSize, GameState, City } from "../core/types.js";
import { clearWarVetoLog } from "../game/ai-decisions.js";

type CivName =
    | "ForgeClans"
    | "ScholarKingdoms"
    | "RiverLeague"
    | "AetherianVanguard"
    | "StarborneSeekers"
    | "JadeCovenant";

type CityGrowthSnapshot = {
    turn: number;
    cityId: string;
    ownerId: string;
    pop: number;
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

function runCityGrowthSimulation(seed = 42, mapSize: MapSize = "Huge", turnLimit = 200, playerCount?: number) {
    // Pass seed to civList for randomized civ selection
    let state = generateWorld({ mapSize, players: civList(playerCount, seed), seed });
    clearWarVetoLog();
    
    // Force contact for diagnostics
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

    const cityGrowthHistory: CityGrowthSnapshot[] = [];
    const pop10Turns = new Map<string, number>(); // cityId -> first turn it reached pop 10
    let winTurn: number | null = null;

    while (!state.winnerId && state.turn <= turnLimit) {
        const playerId = state.currentPlayerId;
        state = runAiTurn(state, playerId);

        // Track city growth for all cities this turn
        for (const city of state.cities) {
            cityGrowthHistory.push({
                turn: state.turn,
                cityId: city.id,
                ownerId: city.ownerId,
                pop: city.pop,
            });

            // Track first time city reaches pop 10
            if (city.pop >= 10 && !pop10Turns.has(city.id)) {
                pop10Turns.set(city.id, state.turn);
            }
        }

        if (state.winnerId) {
            winTurn = state.turn;
            break;
        }
    }

    const winner = state.players.find(p => p.id === state.winnerId);

    return {
        seed,
        mapSize,
        turnReached: state.turn,
        winTurn,
        winner: winner ? { id: winner.id, civ: winner.civName } : null,
        cityGrowthHistory,
        pop10Turns: Object.fromEntries(pop10Turns),
        finalCities: state.cities.map(c => ({
            id: c.id,
            ownerId: c.ownerId,
            name: c.name,
            finalPop: c.pop,
        })),
    };
}

import { writeFileSync } from "fs";

// Map sizes and their max civ counts
const MAP_CONFIGS: { size: MapSize; maxCivs: number }[] = [
    { size: "Tiny", maxCivs: 2 },
    { size: "Small", maxCivs: 3 },
    { size: "Standard", maxCivs: 4 },
    { size: "Large", maxCivs: 6 },
    { size: "Huge", maxCivs: 6 },
];

// Run 5 simulations for each map size with different random seeds
const seeds = [1001, 2002, 3003, 4004, 5005];
const allResults: any[] = [];

for (const config of MAP_CONFIGS) {
    console.error(`Running 5 simulations for ${config.size} map (${config.maxCivs} civs)...`);
    for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i] + (MAP_CONFIGS.indexOf(config) * 10000); // Different seed range per map size
        const result = runCityGrowthSimulation(seed, config.size, 200, config.maxCivs);
        allResults.push(result);
    }
}

writeFileSync("/tmp/city-growth-results-all-maps.json", JSON.stringify(allResults, null, 2));
console.error(`Results written to /tmp/city-growth-results-all-maps.json (${allResults.length} simulations total)`);

