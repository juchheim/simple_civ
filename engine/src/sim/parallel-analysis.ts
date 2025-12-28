import { generateWorld } from "../map/map-generator.js";
import { runAiTurn } from "../game/ai.js";
import { MapSize, UnitType, DiplomacyState, ProjectId } from "../core/types.js";
import { UNITS } from "../core/constants.js";
import { clearWarVetoLog } from "../game/ai-decisions.js";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { writeFileSync, statSync } from "fs";
import * as os from "os";
import { fileURLToPath } from "url";
import { setAiDebug } from "../game/ai/debug-logging.js";
import {
    Event,
    TurnSnapshot,
    estimateMilitaryPower,
    civList,
    createTurnSnapshot
} from "./shared-analysis.js";

// Disable AI debug logging for simulation performance
setAiDebug(false);

function runComprehensiveSimulation(seed = 42, mapSize: MapSize = "Huge", turnLimit = 200, playerCount?: number) {
    // Pass seed to civList for randomized civ selection
    let state = generateWorld({ mapSize, players: civList(playerCount, seed), seed, aiSystem: "UtilityV2" });
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
        const actingPlayerId = state.currentPlayerId;

        // Capture snapshot BEFORE turn
        const beforeUnits = new Map(state.units.map(u => [u.id, { ...u, hp: u.hp }]));
        if (state.currentPlayerId === state.players[0].id) {
            console.log(`--- TURN ${state.turn} ---`);
        }
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

        state = runAiTurn(state, actingPlayerId);

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
                        unitId: u.id,
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
                            unitId: u.id,
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
                            // Attribute initiator to the acting player when possible; symmetric diplomacy updates
                            // otherwise cause random initiator assignment depending on iteration order.
                            const initiator = (actingPlayerId === civ1 || actingPlayerId === civ2) ? actingPlayerId : civ1;
                            const target = initiator === civ1 ? civ2 : civ1;
                            const initiatorPower = estimateMilitaryPower(initiator, state);
                            const targetPower = estimateMilitaryPower(target, state);
                            events.push({
                                type: "WarDeclaration",
                                turn: state.turn,
                                initiator,
                                target,
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
        // Per-turn TitanStep events are expensive (event volume + JSON size). Keep them off by default.
        // Enable detailed Titan step logging with SIM_LOG_TITAN_STEPS=true (or DEBUG_AI_LOGS=true).
        if (process.env.DEBUG_AI_LOGS === "true" || process.env.SIM_LOG_TITAN_STEPS === "true") {
            state.units.forEach(u => {
                if (u.type === UnitType.Titan) {
                    const supportCount = state.units.filter(other =>
                        other.ownerId === u.ownerId &&
                        other.id !== u.id &&
                        UNITS[other.type].domain !== "Civilian" &&
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
        } else {
            // Still log spawns (rare) so reports can track Titan timing.
            state.units.forEach(u => {
                if (u.type === UnitType.Titan && !beforeUnits.has(u.id)) {
                    events.push({
                        type: "TitanSpawn",
                        turn: state.turn,
                        owner: u.ownerId,
                        unitId: u.id,
                        unitCount: state.units.filter(unit => unit.ownerId === u.ownerId).length
                    });
                }
            });
        }

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
    const allConfigs: { size: MapSize; maxCivs: number }[] = [
        { size: "Tiny", maxCivs: 2 },
        { size: "Small", maxCivs: 3 },
        { size: "Standard", maxCivs: 4 },
        { size: "Large", maxCivs: 6 },
        { size: "Huge", maxCivs: 6 },
    ];

    const allowedSizes = process.env.SIM_MAP_SIZES
        ? process.env.SIM_MAP_SIZES.split(",").map(s => s.trim())
        : [];

    const MAP_CONFIGS = allowedSizes.length > 0
        ? allConfigs.filter(c => allowedSizes.includes(c.size))
        : allConfigs;

    if (MAP_CONFIGS.length === 0) {
        console.error(`Error: No valid map sizes found in SIM_MAP_SIZES: ${process.env.SIM_MAP_SIZES}`);
        process.exit(1);
    }

    const seedsCount = process.env.SIM_SEEDS_COUNT ? parseInt(process.env.SIM_SEEDS_COUNT) : 10;
    const seedOverride = process.env.SIM_SEED_OVERRIDE ? parseInt(process.env.SIM_SEED_OVERRIDE) : null;

    const seeds: number[] = [];
    for (let i = 0; i < seedsCount; i++) {
        seeds.push((i + 1) * 1001);
    }

    // Create task queue
    const tasks: { seed: number; config: typeof MAP_CONFIGS[0]; mapIndex: number; debug: boolean }[] = [];
    const debug = process.env.DEBUG_AI_LOGS === "true";
    const quiet = process.env.SIM_QUIET === "true";

    if (seedOverride) {
        // Find which map config corresponds to this seed (assuming standard generation)
        // seed = base + (mapIndex * 100000)
        // mapIndex = floor((seed - base) / 100000)
        // But base is variable.
        // Instead, just try to find a matching map config or default to Standard
        // Actually, for debugging, we usually know the map size.
        // Let's just run it as a single task with "Standard" or infer from seed if possible.
        // For 101001: 101001 % 100000 = 1001. 101001 / 100000 = 1. Map Index 1 = Small.
        const mapIndex = Math.floor(seedOverride / 100000);
        const config = MAP_CONFIGS[mapIndex] || MAP_CONFIGS[2]; // Default to Standard if out of bounds
        console.log(`Overriding simulation to run ONLY Seed ${seedOverride} on ${config.size} map`);
        tasks.push({ seed: seedOverride, config, mapIndex, debug });
    } else {
        for (const config of MAP_CONFIGS) {
            const mapIndex = MAP_CONFIGS.indexOf(config);
            for (let i = 0; i < seeds.length; i++) {
                const seed = seeds[i] + (mapIndex * 100000);
                tasks.push({ seed, config, mapIndex, debug });
            }
        }
    }

    const totalTasks = tasks.length;
    let completedTasks = 0;
    const allResults: any[] = [];
    const startTime = Date.now();

    // Determine worker count (use 90% of cores for better utilization with some headroom)
    const numCPUs = os.cpus().length;
    // v2.0: Changed from numCPUs - 1 (~70%) to 90% of cores for faster simulation
    const workerCount = Math.max(1, Math.floor(numCPUs * 0.9));
    if (!quiet) {
        console.log(`Starting parallel simulation with ${workerCount} workers (90% of ${numCPUs} CPUs) for ${totalTasks} tasks...`);
        if (debug) console.log("DEBUG LOGGING ENABLED - Output logs may be large.");
    }

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

            // NOTE: monitor-flexible.sh relies on the "Completed" token for progress tracking (grep -c "Completed").
            console.log(
                `[${completedTasks}/${totalTasks}] Completed ${result.mapSize} (Seed ${result.seed}) in ${(result.duration / 1000).toFixed(1)}s ` +
                `| Winner: ${result.winner?.civ || "None"} | ${Math.round(completedTasks / totalTasks * 100)}% | ETA ${remaining.toFixed(0)}s`
            );
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
        if (!quiet) {
            console.log(`\n${"=".repeat(60)}`);
            console.log(`ALL SIMULATIONS COMPLETE!`);
            console.log(`${"=".repeat(60)}`);
            console.log(`Total simulations: ${allResults.length}`);
            console.log(`Total time: ${totalTimeSeconds.toFixed(0)}s (${(totalTimeSeconds / allResults.length).toFixed(1)}s per simulation)`);
        } else {
            console.log(`ALL SIMULATIONS COMPLETE`);
        }

        // Writing minified JSON is materially faster and smaller for large runs (e.g. 120 sims).
        writeFileSync("/tmp/comprehensive-simulation-results.json", JSON.stringify(allResults));

        if (!quiet) {
            console.log(`✓ Results written to /tmp/comprehensive-simulation-results.json`);
            console.log(`File size: ${(statSync("/tmp/comprehensive-simulation-results.json").size / 1024 / 1024).toFixed(1)} MB`);
        }
        process.exit(0);
    };

} else {
    // Worker thread logic
    const { seed, config, debug } = workerData;

    // Enable debug logging if requested
    if (debug) {
        setAiDebug(true);
    }

    const start = Date.now();

    try {
        const result = runComprehensiveSimulation(seed, config.size, 300, config.maxCivs);
        const duration = Date.now() - start;
        parentPort?.postMessage({ ...result, duration });
    } catch (err) {
        console.error(`Error in worker (Seed ${seed}):`, err);
        process.exit(1);
    }
}
