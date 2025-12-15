import { generateWorld } from "../map/map-generator.js";
import { runAiTurn } from "../game/ai.js";
import { MapSize, DiplomacyState, ProjectId } from "../core/types.js";
import { clearWarVetoLog } from "../game/ai-decisions.js";
import {
    CivName,
    Event,
    TurnSnapshot,
    estimateMilitaryPower,
    seededRandom,
    shuffleWithSeed,
    civList,
    calculateCivStats,
    createTurnSnapshot
} from "./shared-analysis.js";
import { writeFileSync, statSync } from "fs";

function runComprehensiveSimulation(seed = 42, mapSize: MapSize = "Huge", turnLimit = 200, playerCount?: number) {
    let state = generateWorld({ mapSize, players: civList(playerCount, seed), seed, aiSystem: "UtilityV2" });
    clearWarVetoLog();

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

    const warsLoggedThisTurn = new Set<string>();
    const peaceLoggedThisTurn = new Set<string>();
    const eliminationsLogged = new Set<string>();

    let winTurn: number | null = null;
    let lastStatusTurn = 0;
    const STATUS_INTERVAL = 25;

    while (!state.winnerId && state.turn <= turnLimit) {
        const playerId = state.currentPlayerId;

        if (state.turn - lastStatusTurn >= STATUS_INTERVAL) {
            const activeCivs = state.players.filter(p => !p.isEliminated).length;
            const totalCities = state.cities.length;
            const totalUnits = state.units.length;
            console.error(`  [Seed ${seed}] Turn ${state.turn}: ${activeCivs} civs, ${totalCities} cities, ${totalUnits} units`);
            lastStatusTurn = state.turn;
        }

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

        beforeUnits.forEach((prevUnit, unitId) => {
            const currentUnit = state.units.find(u => u.id === unitId);
            if (!currentUnit) {
                const isSettlerWhoFounded = prevUnit.type === "Settler" && newCityOwners.has(prevUnit.ownerId);

                if (!isSettlerWhoFounded) {
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

        state.units.forEach(u => {
            if (!beforeUnits.has(u.id)) {
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

        beforeCities.forEach((prevCity, cityId) => {
            const currentCity = state.cities.find(c => c.id === cityId);
            if (!currentCity) {
                events.push({
                    type: "CityRaze",
                    turn: state.turn,
                    cityId,
                    owner: prevCity.ownerId,
                });
            } else if (currentCity.ownerId !== prevCity.ownerId) {
                events.push({
                    type: "CityCapture",
                    turn: state.turn,
                    cityId,
                    from: prevCity.ownerId,
                    to: currentCity.ownerId,
                });
            }
        });

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

        beforeProjects.forEach((prevProjectsCount, civId) => {
            const player = state.players.find(p => p.id === civId);
            if (player) {
                const currentCounts = new Map<ProjectId, number>();
                player.completedProjects.forEach(p => {
                    currentCounts.set(p, (currentCounts.get(p) || 0) + 1);
                });

                currentCounts.forEach((count, projectId) => {
                    const prevCount = prevProjectsCount.get(projectId) || 0;
                    if (count > prevCount) {
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

        if (state.currentPlayerId === state.players[0].id) {
            warsLoggedThisTurn.clear();
            peaceLoggedThisTurn.clear();
        }

        beforeDiplomacy.forEach((prevDipMap, civ1) => {
            prevDipMap.forEach((prevState, civ2) => {
                const currentState = state.diplomacy[civ1]?.[civ2] || DiplomacyState.Peace;
                if (currentState !== prevState) {
                    if (currentState === DiplomacyState.War) {
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
                    } else if (currentState === DiplomacyState.Peace) {
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

        state.players.forEach(p => {
            if (p.isEliminated && !eliminationsLogged.has(p.id)) {
                eliminationsLogged.add(p.id);
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

const MAP_CONFIGS: { size: MapSize; maxCivs: number }[] = [
    { size: "Tiny", maxCivs: 2 },
    { size: "Small", maxCivs: 3 },
    { size: "Standard", maxCivs: 4 },
    { size: "Large", maxCivs: 6 },
    { size: "Huge", maxCivs: 6 },
];

const seedsCount = process.env.SIM_SEEDS_COUNT ? parseInt(process.env.SIM_SEEDS_COUNT) : 10;
const seeds = [1001, 2002, 3003, 4004, 5005, 6006, 7007, 8008, 9009, 10010].slice(0, seedsCount);
const allResults: any[] = [];

const totalSims = MAP_CONFIGS.length * seeds.length;
let completedSims = 0;
const startTime = Date.now();

for (const config of MAP_CONFIGS) {
    const mapIndex = MAP_CONFIGS.indexOf(config);
    console.error(`\n${"=".repeat(60)}`);
    console.error(`Running 10 simulations for ${config.size} map (${config.maxCivs} civs)`);
    console.error(`${"=".repeat(60)}`);

    for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i] + (mapIndex * 100000);
        completedSims++;
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const avgTime = elapsedSeconds / completedSims;
        const remaining = (totalSims - completedSims) * avgTime;

        console.error(`\n[${completedSims}/${totalSims}] Starting ${config.size} simulation ${i + 1}/10 (seed ${seed})`);
        console.error(`  Elapsed: ${elapsedSeconds.toFixed(0)}s | Est. remaining: ${remaining.toFixed(0)}s`);

        const result = runComprehensiveSimulation(seed, config.size, 200, config.maxCivs);
        allResults.push(result);

        const simEndTime = Date.now();
        const simTime = (simEndTime - startTime) / 1000 - elapsedSeconds;
        console.error(`  ✓ Completed in ${simTime.toFixed(1)}s - Turn ${result.turnReached}, Winner: ${result.winner?.civ || "None"} (${result.victoryType || "None"})`);
    }

    console.error(`\n✓ Completed all ${config.size} simulations`);
}

const totalTimeSeconds = (Date.now() - startTime) / 1000;
console.error(`\n${"=".repeat(60)}`);
console.error(`ALL SIMULATIONS COMPLETE!`);
console.error(`${"=".repeat(60)}`);
console.error(`Total simulations: ${allResults.length}`);
console.error(`Total time: ${totalTimeSeconds.toFixed(0)}s (${(totalTimeSeconds / allResults.length).toFixed(1)}s per simulation)`);
console.error(`Writing results...`);

writeFileSync("/tmp/comprehensive-simulation-results.json", JSON.stringify(allResults, null, 2));

console.error(`✓ Results written to /tmp/comprehensive-simulation-results.json (${allResults.length} simulations total)`);
console.error(`\nFile size: ${(statSync("/tmp/comprehensive-simulation-results.json").size / 1024 / 1024).toFixed(1)} MB`);
console.error(`\nSimulation complete. Exiting...`);
process.exit(0);
