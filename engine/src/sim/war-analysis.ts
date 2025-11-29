import { generateWorld } from "../map/map-generator.js";
import { runAiTurn } from "../game/ai.js";
import { MapSize, GameState, UnitType, DiplomacyState, TechId, ProjectId, BuildingType } from "../core/types.js";
import { clearWarVetoLog } from "../game/ai-decisions.js";
import { UNITS } from "../core/constants.js";
import { hexDistance } from "../core/hex.js";

// Simple military power estimation
function estimateMilitaryPower(playerId: string, state: GameState): number {
    const units = state.units.filter(u => u.ownerId === playerId);
    let power = 0;
    units.forEach(u => {
        const stats = UNITS[u.type];
        power += stats.atk + stats.def + (u.hp / stats.hp) * 2; // Weight by HP remaining
    });
    return power;
}

type CivName =
    | "ForgeClans"
    | "ScholarKingdoms"
    | "RiverLeague"
    | "AetherianVanguard"
    | "StarborneSeekers"
    | "JadeCovenant";

type Event =
    | { type: "WarDeclaration"; turn: number; initiator: string; target: string; initiatorPower: number; targetPower: number }
    | { type: "PeaceTreaty"; turn: number; civ1: string; civ2: string }
    | { type: "UnitDeath"; turn: number; unitId: string; unitType: UnitType; owner: string; killedBy?: string }
    | { type: "UnitProduction"; turn: number; cityId: string; owner: string; unitType: UnitType }
    | { type: "CityCapture"; turn: number; cityId: string; from: string; to: string; isCapital: boolean }
    | { type: "CityFound"; turn: number; cityId: string; owner: string }
    | { type: "CityRaze"; turn: number; cityId: string; owner: string }
    | { type: "TechComplete"; turn: number; civ: string; tech: TechId }
    | { type: "ProjectComplete"; turn: number; civ: string; project: ProjectId }
    | { type: "BuildingComplete"; turn: number; cityId: string; owner: string; building: BuildingType }
    | { type: "Contact"; turn: number; civ1: string; civ2: string }
    | { type: "Elimination"; turn: number; eliminated: string; by?: string }
    | { type: "WarAction"; turn: number; civ: string; action: string; details: string };

type TurnSnapshot = {
    turn: number;
    civs: {
        id: string;
        civName: string;
        cities: number;
        totalPop: number;
        techs: number;
        projects: number;
        units: number;
        militaryPower: number;
        totalProduction: number;
        totalScience: number;
        isEliminated: boolean;
    }[];
    cities: {
        id: string;
        owner: string;
        pop: number;
        buildings: BuildingType[];
    }[];
    units: {
        id: string;
        owner: string;
        type: UnitType;
    }[];
    diplomacy: {
        civ1: string;
        civ2: string;
        state: DiplomacyState;
    }[];
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

function calculateCivStats(state: GameState, civId: string) {
    const player = state.players.find(p => p.id === civId);
    if (!player) return null;

    const cities = state.cities.filter(c => c.ownerId === civId);
    const units = state.units.filter(u => u.ownerId === civId);
    const totalPop = cities.reduce((sum, c) => sum + c.pop, 0);

    // Calculate total production/science (simplified - actual would need yield calculations)
    const totalProduction = cities.reduce((sum, c) => {
        // Estimate based on population and buildings
        let prod = c.pop; // Base production estimate
        if (c.buildings.includes(BuildingType.StoneWorkshop)) prod += 1;
        if (c.buildings.includes(BuildingType.LumberMill)) prod += 1;
        if (c.buildings.includes(BuildingType.Forgeworks)) prod += 2;
        if (c.buildings.includes(BuildingType.CitySquare)) prod += 1;
        return sum + prod;
    }, 0);

    const totalScience = cities.length + // Base 1 per city
        (cities.filter(c => c.buildings.includes(BuildingType.Scriptorium)).length) +
        (cities.filter(c => c.buildings.includes(BuildingType.Academy)).length * 2) +
        (player.techs.includes(TechId.SignalRelay) ? cities.length : 0);

    return {
        id: civId,
        civName: player.civName,
        cities: cities.length,
        totalPop,
        techs: player.techs.length,
        projects: player.completedProjects.length,
        units: units.length,
        militaryPower: estimateMilitaryPower(civId, state),
        totalProduction,
        totalScience,
        isEliminated: player.isEliminated || false,
    };
}

function createTurnSnapshot(state: GameState): TurnSnapshot {
    const civs = state.players.map(p => calculateCivStats(state, p.id)).filter(s => s !== null) as any[];

    return {
        turn: state.turn,
        civs,
        cities: state.cities.map(c => ({
            id: c.id,
            owner: c.ownerId,
            pop: c.pop,
            buildings: [...c.buildings],
        })),
        units: state.units.map(u => ({
            id: u.id,
            owner: u.ownerId,
            type: u.type,
        })),
        diplomacy: [],
    };
}

function runWarSimulation(seed = 42, mapSize: MapSize = "Huge", turnLimit = 200, playerCount?: number) {
    // Pass seed to civList for randomized civ selection
    let state = generateWorld({ mapSize, players: civList(playerCount, seed), seed });
    clearWarVetoLog();

    // Force initial contact
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

    const events: Event[] = [];
    const turnSnapshots: TurnSnapshot[] = [];
    const keyTurns = [25, 50, 75, 100, 125, 150, 175, 200];

    // Track wars/peace already logged this turn to avoid duplicates
    const warsLoggedThisTurn = new Set<string>();
    const peaceLoggedThisTurn = new Set<string>();
    const eliminationsLogged = new Set<string>();

    let winTurn: number | null = null;
    let lastStatusTurn = 0;
    const STATUS_INTERVAL = 25; // Emit status every 25 turns

    while (!state.winnerId && state.turn <= turnLimit) {
        const playerId = state.currentPlayerId;

        // Emit status updates periodically
        if (state.turn - lastStatusTurn >= STATUS_INTERVAL) {
            const activeCivs = state.players.filter(p => !p.isEliminated).length;
            const totalCities = state.cities.length;
            const totalUnits = state.units.length;
            console.error(`  [Seed ${seed}] Turn ${state.turn}: ${activeCivs} civs, ${totalCities} cities, ${totalUnits} units`);
            lastStatusTurn = state.turn;
        }

        // Capture snapshot BEFORE turn
        const beforeUnits = new Map(state.units.map(u => [u.id, { ...u, hp: u.hp, coord: u.coord }]));
        const beforeCities = new Map(state.cities.map(c => [c.id, { ownerId: c.ownerId, pop: c.pop, buildings: [...c.buildings] }]));
        const beforeDiplomacy = new Map<string, Map<string, DiplomacyState>>();

        state.players.forEach(p1 => {
            if (!beforeDiplomacy.has(p1.id)) beforeDiplomacy.set(p1.id, new Map());
            state.players.forEach(p2 => {
                if (p1.id === p2.id) return;
                const dipState = state.diplomacy[p1.id]?.[p2.id] || DiplomacyState.Peace;
                beforeDiplomacy.get(p1.id)!.set(p2.id, dipState);
            });
        });

        state = runAiTurn(state, playerId);

        // Detect changes and log events

        // First, detect city foundings (need this before unit deaths to exclude settlers that founded)
        const newCityOwners = new Set<string>();
        state.cities.forEach(c => {
            if (!beforeCities.has(c.id)) {
                events.push({
                    type: "CityFound",
                    turn: state.turn,
                    cityId: c.id,
                    owner: c.ownerId,
                });
                newCityOwners.add(c.ownerId);
            }
        });

        // Unit deaths - but exclude settlers that founded cities this turn
        beforeUnits.forEach((prevUnit, unitId) => {
            const currentUnit = state.units.find(u => u.id === unitId);
            if (!currentUnit) {
                // Check if this is a settler that founded a city (not a real death)
                const isSettlerWhoFounded = prevUnit.type === "Settler" && newCityOwners.has(prevUnit.ownerId);

                if (!isSettlerWhoFounded) {
                    // Unit actually died in combat or was disbanded
                    events.push({
                        type: "UnitDeath",
                        turn: state.turn,
                        unitId,
                        unitType: prevUnit.type,
                        owner: prevUnit.ownerId,
                    });
                }
            }
        });

        // Unit production (new units)
        state.units.forEach(u => {
            if (!beforeUnits.has(u.id)) {
                // New unit - find which city produced it (simplified - check cities of same owner)
                const city = state.cities.find(c => c.ownerId === u.ownerId);
                if (city) {
                    events.push({
                        type: "UnitProduction",
                        turn: state.turn,
                        cityId: city.id,
                        owner: u.ownerId,
                        unitType: u.type,
                    });
                }
            }
        });

        // City captures and razing
        beforeCities.forEach((prevCity, cityId) => {
            const currentCity = state.cities.find(c => c.id === cityId);
            if (!currentCity) {
                // City was razed
                events.push({
                    type: "CityRaze",
                    turn: state.turn,
                    cityId,
                    owner: prevCity.ownerId,
                });
            } else if (currentCity.ownerId !== prevCity.ownerId) {
                // City was captured
                const isCapital = state.cities.find(c => c.id === cityId)?.isCapital || false;
                events.push({
                    type: "CityCapture",
                    turn: state.turn,
                    cityId,
                    from: prevCity.ownerId,
                    to: currentCity.ownerId,
                    isCapital,
                });
            }
        });

        // Diplomacy changes (war/peace) - reset tracking at start of new global turn
        if (state.currentPlayerId === state.players[0].id) {
            warsLoggedThisTurn.clear();
            peaceLoggedThisTurn.clear();
        }

        beforeDiplomacy.forEach((prevDipMap, civ1) => {
            prevDipMap.forEach((prevState, civ2) => {
                const currentState = state.diplomacy[civ1]?.[civ2] || DiplomacyState.Peace;
                if (currentState !== prevState) {
                    if (currentState === DiplomacyState.War) {
                        // Only log once per civ pair per turn
                        const warKey = [civ1, civ2].sort().join("-") + "-" + state.turn;
                        if (!warsLoggedThisTurn.has(warKey)) {
                            warsLoggedThisTurn.add(warKey);
                            const initiatorPower = estimateMilitaryPower(civ1, state);
                            const targetPower = estimateMilitaryPower(civ2, state);
                            events.push({
                                type: "WarDeclaration",
                                turn: state.turn,
                                initiator: civ1,
                                target: civ2,
                                initiatorPower,
                                targetPower,
                            });
                        }
                    } else if (currentState === DiplomacyState.Peace && prevState === DiplomacyState.War) {
                        // Only log once per civ pair per turn
                        const peaceKey = [civ1, civ2].sort().join("-") + "-" + state.turn;
                        if (!peaceLoggedThisTurn.has(peaceKey)) {
                            peaceLoggedThisTurn.add(peaceKey);
                            events.push({
                                type: "PeaceTreaty",
                                turn: state.turn,
                                civ1,
                                civ2,
                            });
                        }
                    }
                }
            });
        });

        // WAR ACTION LOGGING
        // Check for units that are at war and see what they are doing
        const player = state.players.find(p => p.id === playerId);
        if (player && !player.isEliminated) {
            const enemies = state.players.filter(p =>
                p.id !== playerId &&
                !p.isEliminated &&
                state.diplomacy?.[playerId]?.[p.id] === DiplomacyState.War
            );

            if (enemies.length > 0) {
                const myUnits = state.units.filter(u => u.ownerId === playerId && UNITS[u.type].domain !== "Civilian");
                let attackingUnits = 0;
                let idleUnits = 0;
                let movingUnits = 0;

                myUnits.forEach(u => {
                    const prev = beforeUnits.get(u.id);
                    if (!prev) return; // New unit

                    if (u.hasAttacked) {
                        attackingUnits++;
                    } else if (u.movesLeft === UNITS[u.type].move) {
                        idleUnits++;
                    } else if (prev.coord.q !== u.coord.q || prev.coord.r !== u.coord.r) {
                        movingUnits++;
                    }
                });

                if (myUnits.length > 0) {
                    events.push({
                        type: "WarAction",
                        turn: state.turn,
                        civ: playerId,
                        action: "UnitSummary",
                        details: `Units: ${myUnits.length} | Attacking: ${attackingUnits} | Moving: ${movingUnits} | Idle: ${idleUnits}`
                    });
                }
            }
        }

        // Eliminations (only log once per eliminated player, ever)
        state.players.forEach(p => {
            if (p.isEliminated && !eliminationsLogged.has(p.id)) {
                eliminationsLogged.add(p.id);
                // Find who captured their last city
                const lastCapture = events
                    .filter(e => e.type === "CityCapture" && (e as any).from === p.id)
                    .sort((a, b) => b.turn - a.turn)[0] as any;
                events.push({
                    type: "Elimination",
                    turn: state.turn,
                    eliminated: p.id,
                    by: lastCapture?.to,
                });
            }
        });

        // Capture snapshot at key turns
        if (keyTurns.includes(state.turn)) {
            turnSnapshots.push(createTurnSnapshot(state));
        }

        if (state.winnerId) {
            winTurn = state.turn;
            turnSnapshots.push(createTurnSnapshot(state));
            break;
        }
    }

    const winner = state.players.find(p => p.id === state.winnerId);

    // Capture participating civs explicitly
    const participatingCivs = state.players.map(p => ({
        id: p.id,
        civName: p.civName,
        isEliminated: p.isEliminated || false,
    }));

    return {
        seed,
        mapSize,
        turnReached: state.turn,
        winTurn,
        winner: winner ? { id: winner.id, civ: winner.civName } : null,
        victoryType: winner?.completedProjects.includes(ProjectId.GrandExperiment) ? "Progress" : (state.winnerId ? "Conquest" : "None"),
        events,
        turnSnapshots,
        finalState: createTurnSnapshot(state),
        participatingCivs,
    };
}

import { writeFileSync, statSync } from "fs";

// Map sizes and their max civ counts
const MAP_CONFIGS: { size: MapSize; maxCivs: number }[] = [
    { size: "Standard", maxCivs: 4 },
];

// Run 1 simulation for Standard map size
const seedsCount = 1;
const seeds = [1001];
const allResults: any[] = [];

const totalSims = MAP_CONFIGS.length * seeds.length;
let completedSims = 0;
const startTime = Date.now();

for (const config of MAP_CONFIGS) {
    const mapIndex = MAP_CONFIGS.indexOf(config);
    console.error(`\n${'='.repeat(60)}`);
    console.error(`Running 1 simulation for ${config.size} map (${config.maxCivs} civs)`);
    console.error(`${'='.repeat(60)}`);

    for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i] + (mapIndex * 100000); // Different seed range per map size
        completedSims++;
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const avgTime = elapsedSeconds / completedSims;
        const remaining = (totalSims - completedSims) * avgTime;

        console.error(`\n[${completedSims}/${totalSims}] Starting ${config.size} simulation ${i + 1}/1 (seed ${seed})`);
        console.error(`  Elapsed: ${elapsedSeconds.toFixed(0)}s | Est. remaining: ${remaining.toFixed(0)}s`);

        const result = runWarSimulation(seed, config.size, 200, config.maxCivs);
        allResults.push(result);

        const simEndTime = Date.now();
        const simTime = (simEndTime - startTime) / 1000 - elapsedSeconds;
        console.error(`  ✓ Completed in ${simTime.toFixed(1)}s - Turn ${result.turnReached}, Winner: ${result.winner?.civ || 'None'} (${result.victoryType || 'None'})`);
    }

    console.error(`\n✓ Completed all ${config.size} simulations`);
}

const totalTimeSeconds = (Date.now() - startTime) / 1000;
console.error(`\n${'='.repeat(60)}`);
console.error(`ALL SIMULATIONS COMPLETE!`);
console.error(`${'='.repeat(60)}`);
console.error(`Total simulations: ${allResults.length}`);
console.error(`Total time: ${totalTimeSeconds.toFixed(0)}s (${(totalTimeSeconds / allResults.length).toFixed(1)}s per simulation)`);
console.error(`Writing results...`);

writeFileSync("/tmp/war-simulation-results.json", JSON.stringify(allResults, null, 2));

console.error(`✓ Results written to /tmp/war-simulation-results.json (${allResults.length} simulations total)`);
console.error(`\nFile size: ${(statSync('/tmp/war-simulation-results.json').size / 1024 / 1024).toFixed(1)} MB`);
console.error(`\nSimulation complete. Exiting...`);
process.exit(0);
