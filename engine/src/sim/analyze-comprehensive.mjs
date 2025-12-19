import { readFileSync, writeFileSync } from 'fs';

const results = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

console.log(`\n${'='.repeat(80)}`);
console.log(`COMPREHENSIVE SIMULATION ANALYSIS`);
console.log(`${'='.repeat(80)}\n`);
console.log(`Total Simulations: ${results.length}`);
console.log(`Map Sizes: ${[...new Set(results.map(r => r.mapSize))].join(', ')}\n`);

// Group by map size
const byMapSize = new Map();
results.forEach(sim => {
    if (!byMapSize.has(sim.mapSize)) {
        byMapSize.set(sim.mapSize, []);
    }
    byMapSize.get(sim.mapSize).push(sim);
});

const MAP_ORDER = ["Tiny", "Small", "Standard", "Large", "Huge"];
const CIVS = ["ForgeClans", "ScholarKingdoms", "RiverLeague", "AetherianVanguard", "StarborneSeekers", "JadeCovenant"];

// Total techs in game for reference
const TOTAL_TECHS = 15;

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeVictories(results) {
    const victories = results.filter(r => r.winTurn !== null);
    const byType = { Conquest: 0, Progress: 0, None: 0 };
    const byCiv = new Map();
    const byMapSize = new Map();

    // NEW: Track victory type by civ
    const victoryTypeByCiv = new Map();
    CIVS.forEach(civ => victoryTypeByCiv.set(civ, { Conquest: 0, Progress: 0 }));

    // NEW: Track victory turns distribution
    const victoryTurns = [];

    results.forEach(r => {
        const type = r.victoryType || "None";
        byType[type]++;

        if (r.winner) {
            const civ = r.winner.civ;
            byCiv.set(civ, (byCiv.get(civ) || 0) + 1);

            // Track victory type per civ
            if (victoryTypeByCiv.has(civ)) {
                victoryTypeByCiv.get(civ)[type]++;
            }

            victoryTurns.push(r.winTurn);
        }

        if (!byMapSize.has(r.mapSize)) byMapSize.set(r.mapSize, { total: 0, victories: 0, conquest: 0, progress: 0 });
        const stats = byMapSize.get(r.mapSize);
        stats.total++;
        if (r.winTurn) {
            stats.victories++;
            if (type === "Conquest") stats.conquest++;
            if (type === "Progress") stats.progress++;
        }
    });

    return {
        victories,
        byType,
        byCiv,
        byMapSize,
        victoryTypeByCiv,
        victoryTurns,
        avgTurn: victories.length > 0 ? victories.reduce((s, r) => s + r.winTurn, 0) / victories.length : null
    };
}

function analyzeWars(results) {
    // Track unique wars (A-B pair counts as one war, regardless of who declared)
    const uniqueWars = new Map(); // key: "simSeed-civA-civB" (sorted), value: { startTurn, endTurn, initiator }
    const peaceTreaties = [];
    const warDurations = [];

    // NEW: Track war participation by civ
    const warsInitiatedByCiv = new Map();
    const warsReceivedByCiv = new Map();
    CIVS.forEach(civ => {
        warsInitiatedByCiv.set(civ, 0);
        warsReceivedByCiv.set(civ, 0);
    });

    // NEW: Track time spent at war vs peace
    const warTurnsByCiv = new Map();
    const totalTurnsByCiv = new Map();

    results.forEach(sim => {
        const activeWars = new Map(); // key: "civ1-civ2" (sorted), value: startTurn

        // Initialize turn tracking
        const civIds = sim.finalState?.civs.map(c => c.id) || [];
        civIds.forEach(id => {
            const civName = sim.finalState.civs.find(c => c.id === id)?.civName;
            if (civName) {
                warTurnsByCiv.set(civName, (warTurnsByCiv.get(civName) || 0));
                totalTurnsByCiv.set(civName, (totalTurnsByCiv.get(civName) || 0) + sim.turnReached);
            }
        });

        sim.events.forEach(e => {
            if (e.type === "WarDeclaration") {
                const key = [e.initiator, e.target].sort().join("-");
                const uniqueKey = `${sim.seed}-${key}`;

                if (!uniqueWars.has(uniqueKey)) {
                    uniqueWars.set(uniqueKey, {
                        startTurn: e.turn,
                        endTurn: null,
                        initiator: e.initiator,
                        target: e.target,
                        powerRatio: e.initiatorPower / e.targetPower,
                        mapSize: sim.mapSize,
                    });
                    activeWars.set(key, e.turn);

                    // Track by civ name
                    const initiatorCiv = sim.finalState?.civs.find(c => c.id === e.initiator)?.civName;
                    const targetCiv = sim.finalState?.civs.find(c => c.id === e.target)?.civName;
                    if (initiatorCiv) warsInitiatedByCiv.set(initiatorCiv, (warsInitiatedByCiv.get(initiatorCiv) || 0) + 1);
                    if (targetCiv) warsReceivedByCiv.set(targetCiv, (warsReceivedByCiv.get(targetCiv) || 0) + 1);
                }
            } else if (e.type === "PeaceTreaty") {
                const key = [e.civ1, e.civ2].sort().join("-");
                const uniqueKey = `${sim.seed}-${key}`;

                if (activeWars.has(key)) {
                    const duration = e.turn - activeWars.get(key);
                    warDurations.push(duration);

                    if (uniqueWars.has(uniqueKey)) {
                        uniqueWars.get(uniqueKey).endTurn = e.turn;
                    }

                    activeWars.delete(key);
                }

                peaceTreaties.push({
                    turn: e.turn,
                    civ1: e.civ1,
                    civ2: e.civ2,
                    mapSize: sim.mapSize,
                });
            }
        });

        // Wars that never ended - add their duration
        activeWars.forEach((startTurn, key) => {
            const duration = sim.turnReached - startTurn;
            warDurations.push(duration);
        });
    });

    return {
        uniqueWars: Array.from(uniqueWars.values()),
        peaceTreaties,
        warDurations,
        warsInitiatedByCiv,
        warsReceivedByCiv,
    };
}

function analyzeUnitKills(results) {
    const kills = [];
    const deathsByCiv = new Map();
    const deathsByType = new Map();
    const killsByCiv = new Map();

    // NEW: Track production
    const productionByType = new Map();
    const productionByCiv = new Map();
    // Track deaths of units that were actually produced (excluding starting units).
    const producedDeathsByType = new Map();

    results.forEach(sim => {
        // Two-pass: events are not guaranteed to be sorted by turn (or production before death),
        // so first collect all produced unitIds, then attribute deaths to "produced vs starting".
        const producedIds = new Set();

        sim.events.forEach(e => {
            if (e.type !== "UnitProduction") return;
            productionByType.set(e.unitType, (productionByType.get(e.unitType) || 0) + 1);
            if (e.unitId) producedIds.add(e.unitId);

            const ownerCiv = sim.finalState?.civs.find(c => c.id === e.owner)?.civName;
            if (ownerCiv) {
                productionByCiv.set(ownerCiv, (productionByCiv.get(ownerCiv) || 0) + 1);
            }
        });

        sim.events.forEach(e => {
            if (e.type !== "UnitDeath") return;
            kills.push({
                turn: e.turn,
                unitType: e.unitType,
                owner: e.owner,
                killedBy: e.killedBy,
                mapSize: sim.mapSize,
            });

            // Get civ name for owner
            const ownerCiv = sim.finalState?.civs.find(c => c.id === e.owner)?.civName;
            if (ownerCiv) {
                deathsByCiv.set(ownerCiv, (deathsByCiv.get(ownerCiv) || 0) + 1);
            }
            deathsByType.set(e.unitType, (deathsByType.get(e.unitType) || 0) + 1);

            // Produced-only death tracking (exclude starting units)
            if (e.unitId && producedIds.has(e.unitId)) {
                producedDeathsByType.set(e.unitType, (producedDeathsByType.get(e.unitType) || 0) + 1);
            }

            if (e.killedBy) {
                const killerCiv = sim.finalState?.civs.find(c => c.id === e.killedBy)?.civName;
                if (killerCiv) {
                    killsByCiv.set(killerCiv, (killsByCiv.get(killerCiv) || 0) + 1);
                }
            }
        });
    });

    return { kills, deathsByCiv, deathsByType, producedDeathsByType, killsByCiv, productionByType, productionByCiv };
}

function analyzeCityGrowth(results) {
    const pop10Turns = [];
    const cityFoundings = [];
    const cityCaptures = [];
    const cityRazes = [];

    // NEW: Track growth milestones with more detail
    const popMilestones = { pop3: [], pop5: [], pop7: [], pop10: [] };

    // NEW: Track cities founded per civ
    const citiesFoundedByCiv = new Map();
    const citiesCapturedByCiv = new Map();
    const citiesLostByCiv = new Map();

    results.forEach(sim => {
        sim.events.forEach(e => {
            if (e.type === "CityFound") {
                cityFoundings.push({ turn: e.turn, owner: e.owner, mapSize: sim.mapSize });

                const ownerCiv = sim.finalState?.civs.find(c => c.id === e.owner)?.civName;
                if (ownerCiv) {
                    citiesFoundedByCiv.set(ownerCiv, (citiesFoundedByCiv.get(ownerCiv) || 0) + 1);
                }
            } else if (e.type === "CityCapture") {
                cityCaptures.push({ turn: e.turn, from: e.from, to: e.to, mapSize: sim.mapSize });

                const fromCiv = sim.finalState?.civs.find(c => c.id === e.from)?.civName;
                const toCiv = sim.finalState?.civs.find(c => c.id === e.to)?.civName;
                if (fromCiv) citiesLostByCiv.set(fromCiv, (citiesLostByCiv.get(fromCiv) || 0) + 1);
                if (toCiv) citiesCapturedByCiv.set(toCiv, (citiesCapturedByCiv.get(toCiv) || 0) + 1);
            } else if (e.type === "CityRaze") {
                cityRazes.push({ turn: e.turn, owner: e.owner, mapSize: sim.mapSize });
            }
        });

        // Track pop milestones from snapshots
        const cityPopTracked = new Map(); // cityId -> { pop3Turn, pop5Turn, pop7Turn, pop10Turn }

        sim.turnSnapshots.forEach(snap => {
            snap.cities.forEach(city => {
                if (!cityPopTracked.has(city.id)) {
                    cityPopTracked.set(city.id, { owner: city.owner });
                }
                const tracked = cityPopTracked.get(city.id);

                if (city.pop >= 3 && !tracked.pop3Turn) {
                    tracked.pop3Turn = snap.turn;
                    popMilestones.pop3.push({ turn: snap.turn, cityId: city.id, owner: city.owner, mapSize: sim.mapSize });
                }
                if (city.pop >= 5 && !tracked.pop5Turn) {
                    tracked.pop5Turn = snap.turn;
                    popMilestones.pop5.push({ turn: snap.turn, cityId: city.id, owner: city.owner, mapSize: sim.mapSize });
                }
                if (city.pop >= 7 && !tracked.pop7Turn) {
                    tracked.pop7Turn = snap.turn;
                    popMilestones.pop7.push({ turn: snap.turn, cityId: city.id, owner: city.owner, mapSize: sim.mapSize });
                }
                if (city.pop >= 10 && !tracked.pop10Turn) {
                    tracked.pop10Turn = snap.turn;
                    popMilestones.pop10.push({ turn: snap.turn, cityId: city.id, owner: city.owner, mapSize: sim.mapSize });
                    pop10Turns.push({ turn: snap.turn, cityId: city.id, owner: city.owner, mapSize: sim.mapSize });
                }
            });
        });
    });

    return { pop10Turns, cityFoundings, cityCaptures, cityRazes, popMilestones, citiesFoundedByCiv, citiesCapturedByCiv, citiesLostByCiv };
}

function analyzeTechProgress(results) {
    const techCompletions = [];
    const techsByCiv = new Map();
    const techTiming = new Map();

    // NEW: Track tech completion rates
    const techsCompletedPerGame = [];
    const techTreeCompletionByCiv = new Map(); // civ -> array of completion percentages

    CIVS.forEach(civ => techTreeCompletionByCiv.set(civ, []));

    results.forEach(sim => {
        const civTechCounts = new Map();

        sim.events.forEach(e => {
            if (e.type === "TechComplete") {
                techCompletions.push({
                    turn: e.turn,
                    civ: e.civ,
                    tech: e.tech,
                    mapSize: sim.mapSize,
                });

                // Get civ name
                const civName = sim.finalState?.civs.find(c => c.id === e.civ)?.civName;
                if (civName) {
                    if (!techsByCiv.has(civName)) techsByCiv.set(civName, []);
                    techsByCiv.get(civName).push(e.tech);
                    civTechCounts.set(civName, (civTechCounts.get(civName) || 0) + 1);
                }

                if (!techTiming.has(e.tech)) techTiming.set(e.tech, []);
                techTiming.get(e.tech).push(e.turn);
            }
        });

        // Track completion percentage per civ in this sim
        civTechCounts.forEach((count, civName) => {
            const completion = (count / TOTAL_TECHS) * 100;
            techTreeCompletionByCiv.get(civName)?.push(completion);
        });

        // Total techs this game
        let gameTotal = 0;
        civTechCounts.forEach(count => gameTotal += count);
        techsCompletedPerGame.push(gameTotal);
    });

    return { techCompletions, techsByCiv, techTiming, techsCompletedPerGame, techTreeCompletionByCiv };
}

function analyzeProjects(results) {
    const projectCompletions = [];
    const projectsByCiv = new Map();
    const projectTiming = new Map();

    // Break down by project category
    const progressChainCompletions = []; // Observatory, GrandAcademy, GrandExperiment
    const uniqueBuildingCompletions = []; // JadeGranaryComplete, etc.

    results.forEach(sim => {
        sim.events.forEach(e => {
            if (e.type === "ProjectComplete") {
                projectCompletions.push({
                    turn: e.turn,
                    civ: e.civ,
                    project: e.project,
                    mapSize: sim.mapSize,
                });

                const civName = sim.finalState?.civs.find(c => c.id === e.civ)?.civName;
                if (civName) {
                    if (!projectsByCiv.has(civName)) projectsByCiv.set(civName, []);
                    projectsByCiv.get(civName).push(e.project);
                }

                if (!projectTiming.has(e.project)) projectTiming.set(e.project, []);
                projectTiming.get(e.project).push(e.turn);

                // Categorize
                if (["Observatory", "GrandAcademy", "GrandExperiment"].includes(e.project)) {
                    progressChainCompletions.push({ turn: e.turn, civ: civName, project: e.project, mapSize: sim.mapSize });
                } else {
                    uniqueBuildingCompletions.push({ turn: e.turn, civ: civName, project: e.project, mapSize: sim.mapSize });
                }
            }
        });
    });

    return { projectCompletions, projectsByCiv, projectTiming, progressChainCompletions, uniqueBuildingCompletions };
}

function analyzeBuildings(results) {
    const buildingCompletions = [];
    const buildingsByCiv = new Map();
    const buildingTiming = new Map();
    const buildingsByType = new Map();

    results.forEach(sim => {
        sim.events.forEach(e => {
            if (e.type === "BuildingComplete") {
                buildingCompletions.push({
                    turn: e.turn,
                    cityId: e.cityId,
                    owner: e.owner,
                    building: e.building,
                    mapSize: sim.mapSize,
                });

                const civName = sim.finalState?.civs.find(c => c.id === e.owner)?.civName;
                if (civName) {
                    if (!buildingsByCiv.has(civName)) buildingsByCiv.set(civName, []);
                    buildingsByCiv.get(civName).push(e.building);
                }

                if (!buildingTiming.has(e.building)) buildingTiming.set(e.building, []);
                buildingTiming.get(e.building).push(e.turn);

                buildingsByType.set(e.building, (buildingsByType.get(e.building) || 0) + 1);
            }
        });
    });

    return { buildingCompletions, buildingsByCiv, buildingTiming, buildingsByType };
}

function analyzeCivPerformance(results) {
    const civStats = new Map();

    CIVS.forEach(civ => {
        civStats.set(civ, {
            wins: 0,
            conquestWins: 0,
            progressWins: 0,
            eliminations: 0,
            gamesPlayed: 0,
            avgCities: 0,
            avgPop: 0,
            avgTechs: 0,
            avgProjects: 0,
            avgPower: 0,
            totalCities: 0,
            totalPop: 0,
            totalTechs: 0,
            totalProjects: 0,
            totalPower: 0,
        });
    });

    results.forEach(sim => {
        const finalState = sim.finalState;
        if (!finalState) return;

        // Use participatingCivs if available (new format), otherwise fall back to finalState.civs
        const participants = sim.participatingCivs || finalState.civs;

        // Track which civs participated
        participants.forEach(civData => {
            const civName = civData.civName;
            const stats = civStats.get(civName);
            if (!stats) return;

            stats.gamesPlayed++;

            // Get detailed stats from finalState
            const finalCivData = finalState.civs.find(c => c.civName === civName || c.id === civData.id);
            if (finalCivData) {
                stats.totalCities += finalCivData.cities;
                stats.totalPop += finalCivData.totalPop;
                stats.totalTechs += finalCivData.techs;
                stats.totalProjects += finalCivData.projects;
                stats.totalPower += finalCivData.militaryPower;
            }

            if (sim.winner?.civ === civName) {
                stats.wins++;
                if (sim.victoryType === "Conquest") stats.conquestWins++;
                if (sim.victoryType === "Progress") stats.progressWins++;
            }

            // Track eliminations
            if (civData.isEliminated) {
                stats.eliminations++;
            }
        });
    });

    // Calculate averages
    civStats.forEach((stats, civ) => {
        if (stats.gamesPlayed > 0) {
            stats.avgCities = stats.totalCities / stats.gamesPlayed;
            stats.avgPop = stats.totalPop / stats.gamesPlayed;
            stats.avgTechs = stats.totalTechs / stats.gamesPlayed;
            stats.avgProjects = stats.totalProjects / stats.gamesPlayed;
            stats.avgPower = stats.totalPower / stats.gamesPlayed;
        }
    });

    return civStats;
}

function analyzeStalls(results) {
    const stalls = [];
    const noVictory = results.filter(r => !r.winTurn);

    // NEW: Detailed stall diagnostics
    const stallDiagnostics = [];

    noVictory.forEach(sim => {
        const diagnostic = {
            seed: sim.seed,
            mapSize: sim.mapSize,
            turnReached: sim.turnReached,
            finalCivCount: sim.finalState?.civs.filter(c => !c.isEliminated).length || 0,
            finalCities: sim.finalState?.cities.length || 0,
            finalUnits: sim.finalState?.units.length || 0,
            warDeclarations: sim.events.filter(e => e.type === "WarDeclaration").length,
            peaceTreaties: sim.events.filter(e => e.type === "PeaceTreaty").length,
            unitDeaths: sim.events.filter(e => e.type === "UnitDeath").length,
            cityCaptures: sim.events.filter(e => e.type === "CityCapture").length,
            observatoryCompleted: sim.events.some(e => e.type === "ProjectComplete" && e.project === "Observatory"),
            grandAcademyCompleted: sim.events.some(e => e.type === "ProjectComplete" && e.project === "GrandAcademy"),
            // Check last 50 turns of activity
            last50TurnEvents: sim.events.filter(e => e.turn > sim.turnReached - 50).length,
            // Final state details
            civDetails: sim.finalState?.civs.map(c => ({
                name: c.civName,
                cities: c.cities,
                pop: c.totalPop,
                power: c.militaryPower,
                techs: c.techs,
                eliminated: c.isEliminated,
            })) || [],
        };
        stallDiagnostics.push(diagnostic);
    });

    return { stalls, noVictory, stallDiagnostics };
}

function analyzeTitanStats(results) {
    const titanSpawns = [];
    const unitCountsAtSpawn = [];
    const spawnTurns = [];

    results.forEach(sim => {
        sim.events.forEach(e => {
            if (e.type === "TitanSpawn") {
                titanSpawns.push(e);
                spawnTurns.push(e.turn);
                if (e.unitCount !== undefined) {
                    unitCountsAtSpawn.push(e.unitCount);
                }
            }
        });
    });

    const avgUnitsAtSpawn = unitCountsAtSpawn.length > 0
        ? unitCountsAtSpawn.reduce((a, b) => a + b, 0) / unitCountsAtSpawn.length
        : 0;

    const avgSpawnTurn = spawnTurns.length > 0
        ? spawnTurns.reduce((a, b) => a + b, 0) / spawnTurns.length
        : 0;

    return {
        totalSpawns: titanSpawns.length,
        avgUnitsAtSpawn,
        unitCountsAtSpawn,
        avgSpawnTurn,
        spawnTurns
    };
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

console.log("Analyzing results...\n");

const victoryAnalysis = analyzeVictories(results);
const warAnalysis = analyzeWars(results);
const unitAnalysis = analyzeUnitKills(results);
const cityAnalysis = analyzeCityGrowth(results);
const techAnalysis = analyzeTechProgress(results);
const projectAnalysis = analyzeProjects(results);
const buildingAnalysis = analyzeBuildings(results);
const civAnalysis = analyzeCivPerformance(results);
const stallAnalysis = analyzeStalls(results);
const titanAnalysis = analyzeTitanStats(results);

// ============================================================================
// GENERATE REPORT
// ============================================================================

let report = `# Comprehensive Simulation Analysis Report\n\n`;
report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
report += `**Simulations:** ${results.length} total (10 per map size) (AI vs AI)\n`;
report += `**Map Sizes:** Tiny, Small, Standard, Large, Huge (max number of civs allowed per map size: 2 for tiny, 3 for small, 4 for standard, 6 for large, 6 for huge)\n\n`;

report += `## Titan Analysis\n`;
report += `- **Total Titans Spawned:** ${titanAnalysis.totalSpawns}\n`;
report += `- **Average Spawn Turn:** ${titanAnalysis.avgSpawnTurn.toFixed(1)}\n`;
if (titanAnalysis.spawnTurns.length > 0) {
    const sorted = [...titanAnalysis.spawnTurns].sort((a, b) => a - b);
    report += `- **Median Spawn Turn:** ${sorted[Math.floor(sorted.length / 2)]}\n`;
    report += `- **Spawn Turn Range:** [${sorted[0]}, ${sorted[sorted.length - 1]}]\n`;
}
report += `- **Average Units on Creation:** ${titanAnalysis.avgUnitsAtSpawn.toFixed(1)}\n`;
if (titanAnalysis.unitCountsAtSpawn.length > 0) {
    const sorted = [...titanAnalysis.unitCountsAtSpawn].sort((a, b) => a - b);
    report += `- **Median Units on Creation:** ${sorted[Math.floor(sorted.length / 2)]}\n`;
    report += `- **Range:** [${sorted[0]}, ${sorted[sorted.length - 1]}]\n`;
}
report += `\n`;

// Note: Detailed AetherianVanguard analysis (Scavenger Doctrine, Titan stats) 
// is in a separate file: /tmp/aetherian-analysis-report.md
// Run: node engine/src/sim/analyze-aetherian.mjs

report += `---\n\n`;

// Victory Analysis
report += `## 1. Victory Analysis\n\n`;
report += `### Overall Statistics\n`;
report += `- **Total Victories:** ${victoryAnalysis.victories.length} of ${results.length} (${((victoryAnalysis.victories.length / results.length) * 100).toFixed(1)}%)\n`;
report += `- **Average Victory Turn:** ${victoryAnalysis.avgTurn ? victoryAnalysis.avgTurn.toFixed(1) : 'N/A'}\n`;
if (victoryAnalysis.victoryTurns.length > 0) {
    const sorted = [...victoryAnalysis.victoryTurns].sort((a, b) => a - b);
    report += `- **Median Victory Turn:** ${sorted[Math.floor(sorted.length / 2)]}\n`;
    report += `- **Victory Turn Range:** [${sorted[0]}, ${sorted[sorted.length - 1]}]\n`;
}
report += `\n`;

report += `### Victory Types\n`;
Object.entries(victoryAnalysis.byType).forEach(([type, count]) => {
    report += `- **${type}:** ${count} (${((count / results.length) * 100).toFixed(1)}%)\n`;
});
report += `\n`;

report += `### Victories by Civilization (with Victory Type Breakdown)\n`;
const sortedCivs = Array.from(victoryAnalysis.byCiv.entries()).sort((a, b) => b[1] - a[1]);
sortedCivs.forEach(([civ, wins]) => {
    const stats = civAnalysis.get(civ);
    const winRate = stats?.gamesPlayed > 0 ? ((wins / stats.gamesPlayed) * 100).toFixed(1) : '0.0';
    const victoryTypes = victoryAnalysis.victoryTypeByCiv.get(civ);
    report += `- **${civ}:** ${wins} wins (${winRate}% of games played)\n`;
    if (victoryTypes) {
        report += `  - Conquest: ${victoryTypes.Conquest}, Progress: ${victoryTypes.Progress}\n`;
    }
});
report += `\n`;

// War Analysis
report += `## 2. Warfare Analysis\n\n`;
report += `### War Statistics\n`;
report += `- **Total Unique Wars:** ${warAnalysis.uniqueWars.length}\n`;
report += `- **Total Peace Treaties:** ${warAnalysis.peaceTreaties.length}\n`;
report += `- **Average Wars per Game:** ${(warAnalysis.uniqueWars.length / results.length).toFixed(1)}\n\n`;

if (warAnalysis.warDurations.length > 0) {
    warAnalysis.warDurations.sort((a, b) => a - b);
    const avgWarDuration = warAnalysis.warDurations.reduce((s, d) => s + d, 0) / warAnalysis.warDurations.length;
    const medianWarDuration = warAnalysis.warDurations[Math.floor(warAnalysis.warDurations.length / 2)];
    report += `### War Durations\n`;
    report += `- **Total Wars Tracked:** ${warAnalysis.warDurations.length}\n`;
    report += `- **Average Duration:** ${avgWarDuration.toFixed(1)} turns\n`;
    report += `- **Median Duration:** ${medianWarDuration} turns\n`;
    report += `- **Range:** [${warAnalysis.warDurations[0]}, ${warAnalysis.warDurations[warAnalysis.warDurations.length - 1]}] turns\n\n`;
}

report += `### War Initiation by Civilization\n`;
CIVS.forEach(civ => {
    const initiated = warAnalysis.warsInitiatedByCiv.get(civ) || 0;
    const received = warAnalysis.warsReceivedByCiv.get(civ) || 0;
    const gamesPlayed = civAnalysis.get(civ)?.gamesPlayed || 0;
    if (gamesPlayed > 0) {
        report += `- **${civ}:** Initiated ${initiated} (${(initiated / gamesPlayed).toFixed(1)}/game), Received ${received} (${(received / gamesPlayed).toFixed(1)}/game)\n`;
    }
});
report += `\n`;

// Unit Analysis
report += `## 3. Unit Combat Analysis\n\n`;
report += `### Unit Deaths\n`;
report += `- **Total Units Killed:** ${unitAnalysis.kills.length}\n`;
report += `- **Average per Game:** ${(unitAnalysis.kills.length / results.length).toFixed(1)}\n\n`;

report += `### Deaths by Unit Type\n`;
const sortedTypes = Array.from(unitAnalysis.deathsByType.entries()).sort((a, b) => b[1] - a[1]);
sortedTypes.forEach(([type, count]) => {
    const produced = unitAnalysis.productionByType.get(type) || 0;
    const producedDeaths = unitAnalysis.producedDeathsByType.get(type) || 0;
    const producedSurvival = produced > 0
        ? (((produced - producedDeaths) / produced) * 100).toFixed(1)
        : "N/A";
    report += `- **${type}:** ${count} deaths (${produced} produced, ${producedDeaths} of produced died, ${producedSurvival}% produced survival)\n`;
});
report += `\n`;

report += `### Unit Production by Type\n`;
const sortedProduction = Array.from(unitAnalysis.productionByType.entries()).sort((a, b) => b[1] - a[1]);
sortedProduction.forEach(([type, count]) => {
    report += `- **${type}:** ${count} produced\n`;
});
report += `\n`;

// City Analysis
report += `## 4. City Growth & Development\n\n`;
report += `### City Statistics\n`;
report += `- **Total Cities Founded:** ${cityAnalysis.cityFoundings.length}\n`;
report += `- **Total Cities Captured:** ${cityAnalysis.cityCaptures.length}\n`;
report += `- **Total Cities Razed:** ${cityAnalysis.cityRazes.length}\n`;
report += `- **Cities Reaching Pop 10:** ${cityAnalysis.pop10Turns.length}\n\n`;

report += `### Population Milestones (Average Turn)\n`;
if (cityAnalysis.popMilestones.pop3.length > 0) {
    const avgPop3 = cityAnalysis.popMilestones.pop3.reduce((s, m) => s + m.turn, 0) / cityAnalysis.popMilestones.pop3.length;
    report += `- **Pop 3:** ${avgPop3.toFixed(1)} (${cityAnalysis.popMilestones.pop3.length} cities)\n`;
}
if (cityAnalysis.popMilestones.pop5.length > 0) {
    const avgPop5 = cityAnalysis.popMilestones.pop5.reduce((s, m) => s + m.turn, 0) / cityAnalysis.popMilestones.pop5.length;
    report += `- **Pop 5:** ${avgPop5.toFixed(1)} (${cityAnalysis.popMilestones.pop5.length} cities)\n`;
}
if (cityAnalysis.popMilestones.pop7.length > 0) {
    const avgPop7 = cityAnalysis.popMilestones.pop7.reduce((s, m) => s + m.turn, 0) / cityAnalysis.popMilestones.pop7.length;
    report += `- **Pop 7:** ${avgPop7.toFixed(1)} (${cityAnalysis.popMilestones.pop7.length} cities)\n`;
}
if (cityAnalysis.pop10Turns.length > 0) {
    const pop10Turns = cityAnalysis.pop10Turns.map(t => t.turn).sort((a, b) => a - b);
    const avgPop10 = pop10Turns.reduce((s, t) => s + t, 0) / pop10Turns.length;
    report += `- **Pop 10:** ${avgPop10.toFixed(1)} (${cityAnalysis.pop10Turns.length} cities) [Range: ${pop10Turns[0]}-${pop10Turns[pop10Turns.length - 1]}]\n`;
}
report += `\n`;

report += `### City Activity by Civilization\n`;
CIVS.forEach(civ => {
    const founded = cityAnalysis.citiesFoundedByCiv.get(civ) || 0;
    const captured = cityAnalysis.citiesCapturedByCiv.get(civ) || 0;
    const lost = cityAnalysis.citiesLostByCiv.get(civ) || 0;
    const gamesPlayed = civAnalysis.get(civ)?.gamesPlayed || 0;
    if (gamesPlayed > 0) {
        report += `- **${civ}:** Founded ${founded} (${(founded / gamesPlayed).toFixed(1)}/game), Captured ${captured}, Lost ${lost}\n`;
    }
});
report += `\n`;

// Tech Analysis
report += `## 5. Technology Progression\n\n`;
report += `### Tech Statistics\n`;
report += `- **Total Techs Researched:** ${techAnalysis.techCompletions.length}\n`;
report += `- **Average per Game:** ${(techAnalysis.techCompletions.length / results.length).toFixed(1)}\n`;
report += `- **Total Techs in Tree:** ${TOTAL_TECHS}\n\n`;

report += `### Tech Tree Completion Rate by Civilization\n`;
techAnalysis.techTreeCompletionByCiv.forEach((completions, civ) => {
    if (completions.length > 0) {
        const avgCompletion = completions.reduce((s, c) => s + c, 0) / completions.length;
        report += `- **${civ}:** ${avgCompletion.toFixed(1)}% average tree completion\n`;
    }
});
report += `\n`;

report += `### Tech Timing (Average Turn Researched)\n`;
const sortedTechTiming = Array.from(techAnalysis.techTiming.entries())
    .map(([tech, turns]) => [tech, turns.reduce((s, t) => s + t, 0) / turns.length])
    .sort((a, b) => a[1] - b[1]);
sortedTechTiming.forEach(([tech, avgTurn]) => {
    report += `- **${tech}:** Turn ${avgTurn.toFixed(1)}\n`;
});
report += `\n`;

// Project Analysis
report += `## 6. Project Completion\n\n`;
report += `### Project Statistics\n`;
report += `- **Total Projects Completed:** ${projectAnalysis.projectCompletions.length}\n`;
report += `- **Average per Game:** ${(projectAnalysis.projectCompletions.length / results.length).toFixed(1)}\n\n`;

report += `### Project Breakdown\n`;
report += `- **Progress Chain (Observatory/Academy/Experiment):** ${projectAnalysis.progressChainCompletions.length}\n`;
report += `- **Unique Building Markers:** ${projectAnalysis.uniqueBuildingCompletions.length}\n\n`;

report += `### Progress Chain Timing\n`;
["Observatory", "GrandAcademy", "GrandExperiment"].forEach(project => {
    const completions = projectAnalysis.progressChainCompletions.filter(p => p.project === project);
    if (completions.length > 0) {
        const avgTurn = completions.reduce((s, c) => s + c.turn, 0) / completions.length;
        report += `- **${project}:** ${completions.length} completions, avg turn ${avgTurn.toFixed(1)}\n`;
    }
});
report += `\n`;

// Army Unit Production Stats
const armyUnits = ["ArmySpearGuard", "ArmyBowGuard", "ArmyRiders"];
const armyProduced = armyUnits.reduce((sum, type) => sum + (unitAnalysis.productionByType.get(type) || 0), 0);
const armyDeaths = armyUnits.reduce((sum, type) => sum + (unitAnalysis.deathsByType.get(type) || 0), 0);
report += `### Army Unit Production\n`;
armyUnits.forEach(unitType => {
    const produced = unitAnalysis.productionByType.get(unitType) || 0;
    const deaths = unitAnalysis.deathsByType.get(unitType) || 0;
    const survivalRate = produced > 0 ? (((produced - deaths) / produced) * 100).toFixed(1) : 'N/A';
    report += `- **${unitType}:** ${produced} produced, ${deaths} killed (${survivalRate}% survival)\n`;
});
report += `- **Total Army Units:** ${armyProduced} produced, ${armyDeaths} killed\n`;
report += `\n`;

// Building Analysis
report += `## 7. Building Construction\n\n`;
report += `### Buildings by Type\n`;
const sortedBuildings = Array.from(buildingAnalysis.buildingsByType.entries()).sort((a, b) => b[1] - a[1]);
sortedBuildings.forEach(([building, count]) => {
    const timing = buildingAnalysis.buildingTiming.get(building);
    const avgTurn = timing ? (timing.reduce((s, t) => s + t, 0) / timing.length).toFixed(1) : 'N/A';
    report += `- **${building}:** ${count} built (avg turn ${avgTurn})\n`;
});
report += `\n`;

// Civ Performance
report += `## 8. Civilization Performance\n\n`;
report += `### Win Rates & Statistics\n\n`;
const sortedCivPerformance = Array.from(civAnalysis.entries()).sort((a, b) => b[1].wins - a[1].wins);
sortedCivPerformance.forEach(([civ, stats]) => {
    const winRate = stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : '0.0';
    report += `#### ${civ}\n`;
    report += `- **Games Played:** ${stats.gamesPlayed}\n`;
    report += `- **Wins:** ${stats.wins} (${winRate}% win rate)\n`;
    report += `  - Conquest: ${stats.conquestWins}, Progress: ${stats.progressWins}\n`;
    report += `- **Eliminations:** ${stats.eliminations}\n`;
    report += `- **Avg Cities:** ${stats.avgCities.toFixed(1)}\n`;
    report += `- **Avg Population:** ${stats.avgPop.toFixed(1)}\n`;
    report += `- **Avg Techs:** ${stats.avgTechs.toFixed(1)}\n`;
    report += `- **Avg Projects:** ${stats.avgProjects.toFixed(1)}\n`;
    report += `- **Avg Military Power:** ${stats.avgPower.toFixed(1)}\n\n`;
});

// Stalls
report += `## 9. Stalls & Issues\n\n`;
report += `### Games Without Victory\n`;
report += `- **Count:** ${stallAnalysis.noVictory.length} of ${results.length} (${((stallAnalysis.noVictory.length / results.length) * 100).toFixed(1)}%)\n\n`;

if (stallAnalysis.stallDiagnostics.length > 0) {
    report += `### Stall Diagnostics\n\n`;
    stallAnalysis.stallDiagnostics.forEach((diag, i) => {
        report += `#### Stalled Game ${i + 1} (${diag.mapSize}, seed ${diag.seed})\n`;
        report += `- **Turn Reached:** ${diag.turnReached}\n`;
        report += `- **Surviving Civs:** ${diag.finalCivCount}\n`;
        report += `- **Final Cities:** ${diag.finalCities}\n`;
        report += `- **Final Units:** ${diag.finalUnits}\n`;
        report += `- **War Declarations:** ${diag.warDeclarations}\n`;
        report += `- **City Captures:** ${diag.cityCaptures}\n`;
        report += `- **Observatory Completed:** ${diag.observatoryCompleted ? 'Yes' : 'No'}\n`;
        report += `- **Grand Academy Completed:** ${diag.grandAcademyCompleted ? 'Yes' : 'No'}\n`;
        report += `- **Events in Last 50 Turns:** ${diag.last50TurnEvents}\n`;
        report += `- **Civ Details:**\n`;
        diag.civDetails.forEach(c => {
            report += `  - ${c.name}: ${c.cities} cities, pop ${c.pop}, power ${c.power}, ${c.techs} techs${c.eliminated ? ' (ELIMINATED)' : ''}\n`;
        });
        report += `\n`;
    });
}

// Map Size Breakdown
report += `## 10. Map Size Analysis\n\n`;
MAP_ORDER.forEach(mapSize => {
    const sims = byMapSize.get(mapSize) || [];
    if (sims.length === 0) return;

    const stats = victoryAnalysis.byMapSize.get(mapSize);
    const victories = sims.filter(s => s.winTurn);
    report += `### ${mapSize} Maps\n`;
    report += `- **Simulations:** ${sims.length}\n`;
    report += `- **Victories:** ${victories.length} (${((victories.length / sims.length) * 100).toFixed(1)}%)\n`;
    if (stats) {
        report += `  - Conquest: ${stats.conquest}, Progress: ${stats.progress}\n`;
    }
    if (victories.length > 0) {
        const avgTurn = victories.reduce((s, v) => s + v.winTurn, 0) / victories.length;
        const turns = victories.map(v => v.winTurn).sort((a, b) => a - b);
        report += `- **Average Victory Turn:** ${avgTurn.toFixed(1)}\n`;
        report += `- **Victory Turn Range:** [${turns[0]}, ${turns[turns.length - 1]}]\n`;
    }
    report += `\n`;
});

// Balance Observations
report += `## 11. Balance Observations\n\n`;

// Auto-generate some observations based on data
report += `### Victory Timing vs Pop 10\n`;
const avgVictoryTurn = victoryAnalysis.avgTurn || 0;
const avgPop10Turn = cityAnalysis.pop10Turns.length > 0
    ? cityAnalysis.pop10Turns.reduce((s, t) => s + t.turn, 0) / cityAnalysis.pop10Turns.length
    : 0;
report += `- Average Victory Turn: ${avgVictoryTurn.toFixed(1)}\n`;
report += `- Average Pop 10 Turn: ${avgPop10Turn.toFixed(1)}\n`;
report += `- **Gap:** ${(avgPop10Turn - avgVictoryTurn).toFixed(1)} turns (Pop 10 happens ${avgPop10Turn > avgVictoryTurn ? 'AFTER' : 'BEFORE'} victory)\n\n`;

report += `### Civilization Balance\n`;
const winRates = Array.from(civAnalysis.entries())
    .filter(([_, s]) => s.gamesPlayed > 0)
    .map(([civ, s]) => ({ civ, winRate: (s.wins / s.gamesPlayed) * 100 }))
    .sort((a, b) => b.winRate - a.winRate);
const highestWinRate = winRates[0];
const lowestWinRate = winRates[winRates.length - 1];
report += `- Highest Win Rate: ${highestWinRate.civ} (${highestWinRate.winRate.toFixed(1)}%)\n`;
report += `- Lowest Win Rate: ${lowestWinRate.civ} (${lowestWinRate.winRate.toFixed(1)}%)\n`;
report += `- **Win Rate Spread:** ${(highestWinRate.winRate - lowestWinRate.winRate).toFixed(1)} percentage points\n\n`;

report += `### Settler Survival\n`;
const settlerDeaths = unitAnalysis.deathsByType.get("Settler") || 0;
const settlerProduced = unitAnalysis.productionByType.get("Settler") || 0;
const settlerSurvival = settlerProduced > 0 ? ((settlerProduced - settlerDeaths) / settlerProduced * 100).toFixed(1) : 'N/A';
report += `- Settlers Produced: ${settlerProduced}\n`;
report += `- Settlers Killed: ${settlerDeaths}\n`;
report += `- **Settler Survival Rate:** ${settlerSurvival}%\n\n`;

writeFileSync('/tmp/comprehensive-analysis-report.md', report);
console.log("Analysis complete!");
console.log(`Report written to /tmp/comprehensive-analysis-report.md`);
console.log(`\nSummary:`);
console.log(`- Victories: ${victoryAnalysis.victories.length}/${results.length}`);
console.log(`- Unique Wars: ${warAnalysis.uniqueWars.length}`);
console.log(`- Unit Deaths: ${unitAnalysis.kills.length}`);
console.log(`- Cities Founded: ${cityAnalysis.cityFoundings.length}`);
console.log(`- Techs Researched: ${techAnalysis.techCompletions.length}`);
