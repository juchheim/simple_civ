import { generateWorld } from "../map/map-generator.js";
import { runAiTurn } from "../game/ai.js";
import { MapSize, GameState, UnitType, DiplomacyState, TechId, ProjectId, BuildingType } from "../core/types.js";
import { clearWarVetoLog } from "../game/ai-decisions.js";
import { UNITS } from "../core/constants.js";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { writeFileSync, statSync } from "fs";
import * as os from "os";
import { fileURLToPath } from 'url';

// ==========================================
// SHARED LOGIC (Copied from comprehensive-analysis.ts)
// ==========================================

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
    | { type: "CityCapture"; turn: number; cityId: string; from: string; to: string }
    | { type: "CityFound"; turn: number; cityId: string; owner: string }
    | { type: "CityRaze"; turn: number; cityId: string; owner: string }
    | { type: "TechComplete"; turn: number; civ: string; tech: TechId }
    | { type: "ProjectComplete"; turn: number; civ: string; project: ProjectId }
    | { type: "BuildingComplete"; turn: number; cityId: string; owner: string; building: BuildingType }
    | { type: "Contact"; turn: number; civ1: string; civ2: string }
    | { type: "SharedVision"; turn: number; civ1: string; civ2: string; action: "offer" | "accept" | "revoke" }
    | { type: "Elimination"; turn: number; eliminated: string; by?: string }
    | { type: "TitanSpawn"; turn: number; owner: string; unitId: string; unitCount: number }
    | { type: "TitanDeath"; turn: number; owner: string; killedBy?: string }
    | { type: "TitanKill"; turn: number; owner: string; victimType: string }
    | { type: "TitanStep"; turn: number; owner: string; supportCount: number };

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
        totalProduction,
        totalScience,
        techs: player.techs.length,
        projects: player.completedProjects.length,
        units: units.length,
        militaryPower: estimateMilitaryPower(civId, state),
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

function runComprehensiveSimulation(seed = 42, mapSize: MapSize = "Huge", turnLimit = 200, playerCount?: number) {
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

    while (!state.winnerId && state.turn <= turnLimit) {
        const playerId = state.currentPlayerId;

        // Capture snapshot BEFORE turn
        const beforeUnits = new Map(state.units.map(u => [u.id, { ...u, hp: u.hp }]));
        const beforeCities = new Map(state.cities.map(c => [c.id, { ownerId: c.ownerId, pop: c.pop, buildings: [...c.buildings] }]));
        const beforeDiplomacy = new Map<string, Map<string, DiplomacyState>>();
        const beforeTechs = new Map(state.players.map(p => [p.id, new Set(p.techs)]));
        const beforeProjects = new Map(state.players.map(p => {
            const counts = new Map<ProjectId, number>();
            p.completedProjects.forEach(proj => counts.set(proj, (counts.get(proj) || 0) + 1));
            return [p.id, counts];
        }));
        const beforeContacts = new Map(state.players.map(p => [p.id, new Set(Object.keys(state.contacts[p.id] || {}))]));

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
            } else {
                // Check for upgrades (e.g. FormArmy modifies unit in-place)
                const prevUnit = beforeUnits.get(u.id)!;
                if (prevUnit.type !== u.type) {
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
                events.push({
                    type: "CityCapture",
                    turn: state.turn,
                    cityId,
                    from: prevCity.ownerId,
                    to: currentCity.ownerId,
                });
            }
        });

        // Tech completions
        beforeTechs.forEach((prevTechsSet, civId) => {
            const player = state.players.find(p => p.id === civId);
            if (player) {
                player.techs.forEach(tech => {
                    if (!prevTechsSet.has(tech)) {
                        events.push({
                            type: "TechComplete",
                            turn: state.turn,
                            civ: civId,
                            tech,
                        });
                    }
                });
            }
        });

        // Project completions
        beforeProjects.forEach((prevProjectsCount, civId) => {
            const player = state.players.find(p => p.id === civId);
            if (player) {
                // Count current projects
                const currentCounts = new Map<ProjectId, number>();
                player.completedProjects.forEach(p => {
                    currentCounts.set(p, (currentCounts.get(p) || 0) + 1);
                });

                // Compare with previous counts
                currentCounts.forEach((count, projectId) => {
                    const prevCount = prevProjectsCount.get(projectId) || 0;
                    if (count > prevCount) {
                        // Log one event for each new completion
                        for (let i = 0; i < count - prevCount; i++) {
                            events.push({
                                type: "ProjectComplete",
                                turn: state.turn,
                                civ: civId,
                                project: projectId,
                            });
                        }
                    }
                });
            }
        });

        // Building completions
        beforeCities.forEach((prevCity, cityId) => {
            const currentCity = state.cities.find(c => c.id === cityId);
            if (currentCity) {
                currentCity.buildings.forEach(building => {
                    if (!prevCity.buildings.includes(building)) {
                        events.push({
                            type: "BuildingComplete",
                            turn: state.turn,
                            cityId,
                            owner: currentCity.ownerId,
                            building,
                        });
                    }
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

        // Contact events
        beforeContacts.forEach((prevContactsSet, civId) => {
            const currentContacts = new Set(Object.keys(state.contacts[civId] || {}));
            currentContacts.forEach(contactId => {
                if (!prevContactsSet.has(contactId)) {
                    events.push({
                        type: "Contact",
                        turn: state.turn,
                        civ1: civId,
                        civ2: contactId,
                    });
                }
            });
        });

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

        // --- TITAN LOGGING ---
        state.units.forEach(u => {
            if (u.type === UnitType.Titan) {
                // Titan Step: Log support count (Deathball metric)
                const supportCount = state.units.filter(other =>
                    other.ownerId === u.ownerId &&
                    other.id !== u.id &&
                    UNITS[other.type].domain !== "Civilian" &&
                    // Simple distance check (hexDistance needs import, but we can approximate or assume it's available/copy it)
                    // Since we don't have hexDistance imported in this file scope easily without adding imports,
                    // let's just use a simple coordinate check if possible, or assume we can add the import.
                    // Actually, let's just add the import or a helper.
                    // For now, let's assume we can use a helper or just skip if too complex.
                    // Wait, we can just use the same logic as in the game code:
                    (Math.abs(other.coord.q - u.coord.q) + Math.abs(other.coord.q + other.coord.r - u.coord.q - u.coord.r) + Math.abs(other.coord.r - u.coord.r)) / 2 <= 3
                ).length;

                events.push({
                    type: "TitanStep",
                    turn: state.turn,
                    owner: u.ownerId,
                    supportCount
                });

                if (!beforeUnits.has(u.id)) {
                    events.push({
                        type: "TitanSpawn",
                        turn: state.turn,
                        owner: u.ownerId,
                        unitId: u.id,
                        unitCount: state.units.filter(unit => unit.ownerId === u.ownerId).length
                    });
                }
            }
        });

        // Titan Deaths & Kills
        beforeUnits.forEach((prevUnit, unitId) => {
            const currentUnit = state.units.find(u => u.id === unitId);
            if (!currentUnit) {
                // Unit died
                if (prevUnit.type === UnitType.Titan) {
                    events.push({
                        type: "TitanDeath",
                        turn: state.turn,
                        owner: prevUnit.ownerId
                    });
                }
            } else {
                // Unit survived. Did it kill anything?
                // We don't strictly track "who killed who" in the state, but we can infer if a Titan is on a tile where an enemy was.
                // This is hard to track perfectly without combat logs.
                // Alternative: Just track Titan survival and support for now.
                // Actually, we can check if Titan moved to a tile that was occupied by an enemy unit or city.
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

// ==========================================
// PARALLEL EXECUTION LOGIC
// ==========================================

if (isMainThread) {
    const MAP_CONFIGS: { size: MapSize; maxCivs: number }[] = [
        { size: "Tiny", maxCivs: 2 },
        { size: "Small", maxCivs: 3 },
        { size: "Standard", maxCivs: 4 },
        { size: "Large", maxCivs: 6 },
        { size: "Huge", maxCivs: 6 },
    ];

    const seedsCount = process.env.SIM_SEEDS_COUNT ? parseInt(process.env.SIM_SEEDS_COUNT) : 10;
    const seedOverride = process.env.SIM_SEED_OVERRIDE ? parseInt(process.env.SIM_SEED_OVERRIDE) : null;

    const seeds: number[] = [];
    for (let i = 0; i < seedsCount; i++) {
        seeds.push((i + 1) * 1001);
    }

    // Create task queue
    const tasks: { seed: number; config: typeof MAP_CONFIGS[0]; mapIndex: number }[] = [];

    if (seedOverride) {
        // Find which map config corresponds to this seed (assuming standard generation)
        // seed = base + (mapIndex * 100000)
        // mapIndex = floor((seed - base) / 100000)
        // But base is variable.
        // Instead, just try to find a matching map config or default to Standard
        // Actually, for debugging, we usually know the map size.
        // Let's just run it on ALL map sizes if override is set, or let user specify map size?
        // Simpler: Just run it as a single task with "Standard" or infer from seed if possible.
        // For 101001: 101001 % 100000 = 1001. 101001 / 100000 = 1. Map Index 1 = Small.
        const mapIndex = Math.floor(seedOverride / 100000);
        const config = MAP_CONFIGS[mapIndex] || MAP_CONFIGS[2]; // Default to Standard if out of bounds
        console.log(`Overriding simulation to run ONLY Seed ${seedOverride} on ${config.size} map`);
        tasks.push({ seed: seedOverride, config, mapIndex });
    } else {
        for (const config of MAP_CONFIGS) {
            const mapIndex = MAP_CONFIGS.indexOf(config);
            for (let i = 0; i < seeds.length; i++) {
                const seed = seeds[i] + (mapIndex * 100000);
                tasks.push({ seed, config, mapIndex });
            }
        }
    }

    const totalTasks = tasks.length;
    let completedTasks = 0;
    const allResults: any[] = [];
    const startTime = Date.now();

    // Determine worker count (use all cores)
    const numCPUs = os.cpus().length;
    // Use 50% of cores to prevent system stalling, leaving enough room for other tasks
    const workerCount = Math.max(1, Math.floor(numCPUs * 0.5));
    console.log(`Starting parallel simulation with ${workerCount} workers (Total CPUs: ${numCPUs}) for ${totalTasks} tasks...`);

    let activeWorkers = 0;

    const startWorker = () => {
        if (tasks.length === 0) return;

        const task = tasks.shift()!;
        activeWorkers++;

        const worker = new Worker(fileURLToPath(import.meta.url), {
            workerData: task
        });

        worker.on('message', (result) => {
            allResults.push(result);
            completedTasks++;
            const elapsed = (Date.now() - startTime) / 1000;
            const avgTime = elapsed / completedTasks;
            const remaining = (totalTasks - completedTasks) * avgTime;

            console.log(`[${completedTasks}/${totalTasks}] Completed ${result.mapSize} (Seed ${result.seed}) in ${(result.duration / 1000).toFixed(1)}s - Winner: ${result.winner?.civ || 'None'}`);
            console.log(`  Progress: ${Math.round(completedTasks / totalTasks * 100)}% | Elapsed: ${elapsed.toFixed(0)}s | Est. Remaining: ${remaining.toFixed(0)}s`);
        });

        worker.on('error', (err) => {
            console.error(`Worker error for task ${JSON.stringify(task)}:`, err);
        });

        worker.on('exit', (code) => {
            activeWorkers--;
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
            }
            // Start next task
            if (tasks.length > 0) {
                startWorker();
            } else if (activeWorkers === 0) {
                finish();
            }
        });
    };

    // Start initial batch of workers
    for (let i = 0; i < workerCount; i++) {
        startWorker();
    }

    const finish = () => {
        const totalTimeSeconds = (Date.now() - startTime) / 1000;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`ALL SIMULATIONS COMPLETE!`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Total simulations: ${allResults.length}`);
        console.log(`Total time: ${totalTimeSeconds.toFixed(0)}s (${(totalTimeSeconds / allResults.length).toFixed(1)}s per simulation)`);

        writeFileSync("/tmp/comprehensive-simulation-results.json", JSON.stringify(allResults, null, 2));

        console.log(`✓ Results written to /tmp/comprehensive-simulation-results.json`);
        console.log(`File size: ${(statSync('/tmp/comprehensive-simulation-results.json').size / 1024 / 1024).toFixed(1)} MB`);
        process.exit(0);
    };

} else {
    // Worker thread logic
    const { seed, config, mapIndex: _mapIndex } = workerData;
    const start = Date.now();

    try {
        const result = runComprehensiveSimulation(seed, config.size, 250, config.maxCivs);
        const duration = Date.now() - start;
        parentPort?.postMessage({ ...result, duration });
    } catch (err) {
        console.error(`Error in worker (Seed ${seed}):`, err);
        process.exit(1);
    }
}
