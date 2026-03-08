import { readFileSync, writeFileSync } from 'fs';
import { analyzeWarConversion } from './war-conversion-analysis.mjs';

const resultsFile = process.argv[2] || '/tmp/comprehensive-simulation-results.json';
const results = JSON.parse(readFileSync(resultsFile, 'utf8'));

console.log(`\n${'='.repeat(80)}`);
console.log(`ENHANCED COMPREHENSIVE ANALYSIS`);
console.log(`${'='.repeat(80)}\n`);

const MAP_ORDER = ["Tiny", "Small", "Standard", "Large", "Huge"];
const CIVS = ["ForgeClans", "ScholarKingdoms", "RiverLeague", "AetherianVanguard", "StarborneSeekers", "JadeCovenant"];
const SETTLER_DEATH_CAUSE_ORDER = ["escort_lost", "unescorted", "native_camp", "enemy_near_city", "wartime", "long_route", "other"];
const NATIVE_CAMP_CONTEXT_ORDER = ["near_city", "frontier_route", "deep_field"];

function formatMaybe(value, digits = 1) {
    return value == null || !Number.isFinite(value) ? 'N/A' : value.toFixed(digits);
}

function classifyProducedSettlerDeath(event) {
    const telemetry = event?.settlerTelemetry;
    if (!telemetry?.produced) return null;
    if (telemetry.linkedEscortLost) return "escort_lost";
    if (!telemetry.hadLinkedEscort && !telemetry.hadAdjacentEscort) return "unescorted";
    if (telemetry.nearNativeCamp || telemetry.nearbyNativeMilitary) return "native_camp";
    if (telemetry.enemyNearFriendlyCity) return "enemy_near_city";
    if (telemetry.atWar) return "wartime";
    if ((telemetry.nearestFriendlyCityDistance ?? 0) >= 5) return "long_route";
    return "other";
}

function classifyNativeCampSettlerDeathContext(event) {
    if (classifyProducedSettlerDeath(event) !== "native_camp") return null;
    const telemetry = event?.settlerTelemetry;
    const nearestFriendlyCityDistance = telemetry?.nearestFriendlyCityDistance;
    if ((nearestFriendlyCityDistance ?? Number.POSITIVE_INFINITY) <= 1) return "near_city";
    if ((nearestFriendlyCityDistance ?? Number.POSITIVE_INFINITY) <= 4) return "frontier_route";
    return "deep_field";
}

function countSimulationsByMapSize(results) {
    const counts = new Map();
    MAP_ORDER.forEach(size => counts.set(size, 0));

    results.forEach(sim => {
        counts.set(sim.mapSize, (counts.get(sim.mapSize) ?? 0) + 1);
    });

    return counts;
}

function formatSimulationSummary(results, simulationCountsByMapSize) {
    const counts = MAP_ORDER.map(size => simulationCountsByMapSize.get(size) ?? 0).filter(count => count > 0);
    if (counts.length === 0) {
        return `${results.length} total`;
    }

    const allEqual = counts.every(count => count === counts[0]);
    if (allEqual) {
        return `${results.length} total (${counts[0]} per map size)`;
    }

    const breakdown = MAP_ORDER
        .map(size => `${size}: ${simulationCountsByMapSize.get(size) ?? 0}`)
        .join(", ");

    return `${results.length} total (${breakdown})`;
}

// ============================================================================
// QUESTION 1: Which civs win by which victory type
// ============================================================================

function analyzeVictoryTypesByCiv(results) {
    const byCiv = new Map();
    CIVS.forEach(civ => {
        byCiv.set(civ, { Conquest: 0, Progress: 0, total: 0 });
    });

    results.forEach(sim => {
        if (sim.winner) {
            const civ = sim.winner.civ;
            const stats = byCiv.get(civ);
            if (stats) {
                stats.total++;
                if (sim.victoryType === "Conquest") stats.Conquest++;
                if (sim.victoryType === "Progress") stats.Progress++;
            }
        }
    });

    return byCiv;
}

// ============================================================================
// QUESTION 1b: Victory Types by Map Size
// ============================================================================

function analyzeVictoryByMapSize(results) {
    const byMap = new Map();
    MAP_ORDER.forEach(size => {
        byMap.set(size, {
            total: 0,
            Conquest: 0,
            Progress: 0,
            byCiv: new Map()
        });
        CIVS.forEach(civ => {
            byMap.get(size).byCiv.set(civ, { Conquest: 0, Progress: 0 });
        });
    });

    results.forEach(sim => {
        if (sim.winner) {
            const sizeStats = byMap.get(sim.mapSize);
            if (sizeStats) {
                sizeStats.total++;
                if (sim.victoryType === "Conquest") sizeStats.Conquest++;
                if (sim.victoryType === "Progress") sizeStats.Progress++;

                const civStats = sizeStats.byCiv.get(sim.winner.civ);
                if (civStats) {
                    if (sim.victoryType === "Conquest") civStats.Conquest++;
                    if (sim.victoryType === "Progress") civStats.Progress++;
                }
            }
        }
    });

    return byMap;
}

// ============================================================================
// QUESTION 2: Accurate participation/win rates per civ
// ============================================================================

function analyzeParticipationAndWinRates(results) {
    const civStats = new Map();
    CIVS.forEach(civ => {
        civStats.set(civ, {
            gamesParticipated: 0,
            wins: 0,
            eliminations: 0,
            avgFinalCities: 0,
            avgFinalPop: 0,
            totalFinalCities: 0,
            totalFinalPop: 0,
        });
    });

    results.forEach(sim => {
        // Track which civs participated in this game
        const participatingCivs = new Set();
        sim.finalState?.civs?.forEach(c => {
            participatingCivs.add(c.civName);
            const stats = civStats.get(c.civName);
            if (stats) {
                stats.gamesParticipated++;
                stats.totalFinalCities += c.cities;
                stats.totalFinalPop += c.totalPop;
            }
        });

        // Track eliminations
        sim.events.forEach(e => {
            if (e.type === "Elimination") {
                const civ = sim.finalState?.civs.find(c => c.id === e.eliminated);
                if (civ) {
                    const stats = civStats.get(civ.civName);
                    if (stats) stats.eliminations++;
                }
            }
        });

        // Track wins
        if (sim.winner) {
            const stats = civStats.get(sim.winner.civ);
            if (stats) stats.wins++;
        }
    });

    // Calculate averages
    civStats.forEach((stats, civ) => {
        if (stats.gamesParticipated > 0) {
            stats.avgFinalCities = stats.totalFinalCities / stats.gamesParticipated;
            stats.avgFinalPop = stats.totalFinalPop / stats.gamesParticipated;
        }
    });

    return civStats;
}

// ============================================================================
// QUESTION 3: Why smaller maps stall (detailed diagnostics)
// ============================================================================

function analyzeStallDiagnostics(results) {
    const byMapSize = new Map();
    MAP_ORDER.forEach(size => byMapSize.set(size, { noVictory: [], stalls: [], diagnostics: [] }));

    results.forEach(sim => {
        const size = sim.mapSize;
        const stats = byMapSize.get(size);

        if (!sim.winTurn) {
            stats.noVictory.push({
                seed: sim.seed,
                turnReached: sim.turnReached,
                finalCivs: sim.finalState?.civs?.length || 0,
                finalCities: sim.finalState?.cities?.length || 0,
                totalPop: sim.finalState?.civs?.reduce((sum, c) => sum + c.totalPop, 0) || 0,
                eventsLast10Turns: sim.events.filter(e => e.turn > sim.turnReached - 10).length,
            });
        }

        // Check for stagnation periods (no meaningful events)
        const eventsByTurn = new Map();
        sim.events.forEach(e => {
            if (!eventsByTurn.has(e.turn)) eventsByTurn.set(e.turn, []);
            eventsByTurn.get(e.turn).push(e);
        });

        let lastSignificantEvent = 0;
        for (let turn = Math.max(1, sim.turnReached - 50); turn <= sim.turnReached; turn++) {
            const turnEvents = eventsByTurn.get(turn) || [];
            const significantEvents = turnEvents.filter(e =>
                e.type === "CityCapture" ||
                e.type === "CityFound" ||
                e.type === "TechComplete" ||
                e.type === "ProjectComplete" ||
                e.type === "WarDeclaration"
            );

            if (significantEvents.length > 0) {
                lastSignificantEvent = turn;
            } else if (turn - lastSignificantEvent > 20 && lastSignificantEvent > 0) {
                stats.stalls.push({
                    seed: sim.seed,
                    stallStart: lastSignificantEvent,
                    stallEnd: turn,
                    duration: turn - lastSignificantEvent,
                });
            }
        }

        // Detailed diagnostics for no-victory games
        if (!sim.winTurn) {
            const finalState = sim.finalState;
            const diagnostics = {
                seed: sim.seed,
                turnReached: sim.turnReached,
                civs: finalState?.civs?.map(c => ({
                    civ: c.civName,
                    cities: c.cities,
                    pop: c.totalPop,
                    techs: c.techs,
                    projects: c.projects,
                    power: c.militaryPower,
                    isEliminated: c.isEliminated,
                })) || [],
                recentWars: sim.events.filter(e => e.type === "WarDeclaration" && e.turn > sim.turnReached - 20).length,
                recentTechs: sim.events.filter(e => e.type === "TechComplete" && e.turn > sim.turnReached - 20).length,
                recentProjects: sim.events.filter(e => e.type === "ProjectComplete" && e.turn > sim.turnReached - 20).length,
            };
            stats.diagnostics.push(diagnostics);
        }
    });

    return byMapSize;
}

// ============================================================================
// QUESTION 4: Settler death rates vs production
// ============================================================================

function analyzeSettlerStats(results) {
    const settlerDeaths = [];
    const settlerProductions = [];
    const producedDeathCauseBreakdown = Object.fromEntries(SETTLER_DEATH_CAUSE_ORDER.map(cause => [cause, 0]));
    const nativeCampDeathContextBreakdown = Object.fromEntries(NATIVE_CAMP_CONTEXT_ORDER.map(context => [context, 0]));
    const byCiv = new Map();
    CIVS.forEach(civ => {
        byCiv.set(civ, { deaths: 0, productions: 0, gamesPlayed: 0, citiesFounded: 0 });
    });

    results.forEach(sim => {
        // Track games played per civ
        sim.finalState?.civs?.forEach(c => {
            const stats = byCiv.get(c.civName);
            if (stats) stats.gamesPlayed++;
        });

        sim.events.forEach(e => {
            if (e.type === "UnitDeath" && e.unitType === "Settler") {
                const producedDeathCause = classifyProducedSettlerDeath(e);
                settlerDeaths.push({
                    turn: e.turn,
                    owner: e.owner,
                    mapSize: sim.mapSize,
                    producedDeathCause,
                });
                if (producedDeathCause) {
                    producedDeathCauseBreakdown[producedDeathCause]++;
                }
                const nativeCampContext = classifyNativeCampSettlerDeathContext(e);
                if (nativeCampContext) {
                    nativeCampDeathContextBreakdown[nativeCampContext]++;
                }
                const civ = sim.finalState?.civs.find(c => c.id === e.owner);
                if (civ) {
                    const stats = byCiv.get(civ.civName);
                    if (stats) stats.deaths++;
                }
            } else if (e.type === "UnitProduction" && e.unitType === "Settler") {
                settlerProductions.push({
                    turn: e.turn,
                    owner: e.owner,
                    mapSize: sim.mapSize,
                });
                const civ = sim.finalState?.civs.find(c => c.id === e.owner);
                if (civ) {
                    const stats = byCiv.get(civ.civName);
                    if (stats) stats.productions++;
                }
            } else if (e.type === "CityFound") {
                const civ = sim.finalState?.civs.find(c => c.id === e.owner);
                if (civ) {
                    const stats = byCiv.get(civ.civName);
                    if (stats) stats.citiesFounded++;
                }
            }
        });
    });

    return { settlerDeaths, settlerProductions, producedDeathCauseBreakdown, nativeCampDeathContextBreakdown, byCiv };
}

// ============================================================================
// QUESTION 5: Army usage patterns
// ============================================================================

function analyzeArmyUsage(results) {
    const armyDeaths = [];
    const armyProductions = [];
    const byCiv = new Map();
    CIVS.forEach(civ => {
        byCiv.set(civ, { deaths: 0, productions: 0 });
    });

    results.forEach(sim => {
        // Build a player ID to civ name lookup for this simulation
        const playerIdToCivName = new Map();
        sim.finalState?.civs?.forEach(c => {
            playerIdToCivName.set(c.id, c.civName);
        });

        sim.events.forEach(e => {
            if (e.type === "UnitDeath" && (e.unitType?.startsWith("Army") || e.unitType === "ArmySpearGuard" || e.unitType === "ArmyBowGuard" || e.unitType === "ArmyRiders")) {
                armyDeaths.push({
                    turn: e.turn,
                    owner: e.owner,
                    unitType: e.unitType,
                    mapSize: sim.mapSize,
                });
                const civName = playerIdToCivName.get(e.owner);
                if (civName) {
                    const stats = byCiv.get(civName);
                    if (stats) stats.deaths++;
                }
            } else if (e.type === "UnitProduction" && (e.unitType?.startsWith("Army") || e.unitType === "ArmySpearGuard" || e.unitType === "ArmyBowGuard" || e.unitType === "ArmyRiders")) {
                armyProductions.push({
                    turn: e.turn,
                    owner: e.owner,
                    unitType: e.unitType,
                    mapSize: sim.mapSize,
                });
                const civName = playerIdToCivName.get(e.owner);
                if (civName) {
                    const stats = byCiv.get(civName);
                    if (stats) stats.productions++;
                }
            }
        });
    });

    return { armyDeaths, armyProductions, byCiv };
}

// ============================================================================
// QUESTION 6: Pop 10 vs Victory timing gap
// ============================================================================

function analyzePop10VsVictory(results) {
    const pop10Data = [];

    results.forEach(sim => {
        if (!sim.winTurn) return;

        // Find all cities that reached pop 10
        const pop10Cities = [];
        sim.finalState?.cities?.forEach(city => {
            if (city.pop >= 10) {
                // Find when it reached pop 10 from snapshots
                for (let i = sim.turnSnapshots.length - 1; i >= 0; i--) {
                    const snap = sim.turnSnapshots[i];
                    const snapCity = snap.cities.find(c => c.id === city.id);
                    if (snapCity && snapCity.pop >= 10) {
                        if (i === 0 || (sim.turnSnapshots[i - 1]?.cities.find(c => c.id === city.id)?.pop || 0) < 10) {
                            pop10Cities.push({
                                turn: snap.turn,
                                cityId: city.id,
                                owner: city.owner,
                            });
                            break;
                        }
                    }
                }
            }
        });

        if (pop10Cities.length > 0) {
            const avgPop10Turn = pop10Cities.reduce((sum, c) => sum + c.turn, 0) / pop10Cities.length;
            const firstPop10Turn = Math.min(...pop10Cities.map(c => c.turn));
            const gap = sim.winTurn - avgPop10Turn;

            pop10Data.push({
                seed: sim.seed,
                mapSize: sim.mapSize,
                winTurn: sim.winTurn,
                victoryType: sim.victoryType,
                avgPop10Turn,
                firstPop10Turn,
                gap,
                citiesAtPop10: pop10Cities.length,
            });
        }
    });

    return pop10Data;
}

// ============================================================================
// QUESTION 7: Titan Performance Analysis
// ============================================================================

function analyzeTitanPerformance(results) {
    const titanStats = {
        totalTitans: 0,
        totalDeaths: 0,
        totalWinsWithTitan: 0,
        conquestWinsWithTitan: 0,
        avgSupport: 0,
        totalSupportAtCaptures: 0,
        totalTitanCaptures: 0,
        // v6.6h diagnostic fields
        escortsMarkedTotal: 0,
        escortsAtCaptureTotal: 0,
        totalMilitaryAtCaptures: 0,
        // v6.6j: Per-capture breakdown (aggregated across all games)
        supportByCapture: [], // [sum1stCapture, sum2ndCapture, ...] 
        captureCountByIndex: [], // [count1stCaptures, count2ndCaptures, ...]
        byCiv: new Map()
    };

    CIVS.forEach(civ => {
        titanStats.byCiv.set(civ, {
            spawned: 0,
            died: 0,
            wins: 0,
            conquestWins: 0,
            avgSupport: 0,
            totalSupportAtCaptures: 0,
            totalTitanCaptures: 0,
            escortsMarkedTotal: 0,
            escortsAtCaptureTotal: 0,
            totalMilitaryAtCaptures: 0
        });
    });

    results.forEach(sim => {
        const titanSpawns = sim.events.filter(e => e.type === "TitanSpawn");
        const titanDeaths = sim.events.filter(e => e.type === "TitanDeath");

        titanSpawns.forEach(spawn => {
            titanStats.totalTitans++;
            const civStats = titanStats.byCiv.get(sim.finalState.civs.find(c => c.id === spawn.owner)?.civName);
            if (civStats) civStats.spawned++;
        });

        titanDeaths.forEach(death => {
            titanStats.totalDeaths++;
            const civStats = titanStats.byCiv.get(sim.finalState.civs.find(c => c.id === death.owner)?.civName);
            if (civStats) civStats.died++;
        });

        // Use player's titanStats for support tracking (captured at city capture moments)
        sim.finalState?.civs?.forEach(civData => {
            if (civData.titanStats) {
                const captures = civData.titanStats.cityCaptures || 0;
                const support = civData.titanStats.totalSupportAtCaptures || 0;
                const escortsMarked = civData.titanStats.escortsMarkedTotal || 0;
                const escortsAtCapture = civData.titanStats.escortsAtCaptureTotal || 0;
                const totalMilitary = civData.titanStats.totalMilitaryAtCaptures || 0;
                const perCapture = civData.titanStats.supportByCapture || [];

                titanStats.totalTitanCaptures += captures;
                titanStats.totalSupportAtCaptures += support;
                titanStats.escortsMarkedTotal += escortsMarked;
                titanStats.escortsAtCaptureTotal += escortsAtCapture;
                titanStats.totalMilitaryAtCaptures += totalMilitary;

                // v6.6j: Aggregate per-capture support
                perCapture.forEach((supportAtCapture, index) => {
                    while (titanStats.supportByCapture.length <= index) {
                        titanStats.supportByCapture.push(0);
                        titanStats.captureCountByIndex.push(0);
                    }
                    titanStats.supportByCapture[index] += supportAtCapture;
                    titanStats.captureCountByIndex[index]++;
                });

                const civStats = titanStats.byCiv.get(civData.civName);
                if (civStats) {
                    civStats.totalTitanCaptures += captures;
                    civStats.totalSupportAtCaptures += support;
                    civStats.escortsMarkedTotal += escortsMarked;
                    civStats.escortsAtCaptureTotal += escortsAtCapture;
                    civStats.totalMilitaryAtCaptures += totalMilitary;
                }
            }
        });

        // Did the winner have a Titan?
        if (sim.winner) {
            const winnerId = sim.winner.id;
            const hadTitan = titanSpawns.some(s => s.owner === winnerId);
            if (hadTitan) {
                titanStats.totalWinsWithTitan++;
                if (sim.victoryType === "Conquest") {
                    titanStats.conquestWinsWithTitan++;
                }

                const civStats = titanStats.byCiv.get(sim.winner.civ);
                if (civStats) {
                    civStats.wins++;
                    if (sim.victoryType === "Conquest") civStats.conquestWins++;
                }
            }
        }
    });

    // Calculate average support from captures
    if (titanStats.totalTitanCaptures > 0) {
        titanStats.avgSupport = titanStats.totalSupportAtCaptures / titanStats.totalTitanCaptures;
        titanStats.avgEscortsMarked = titanStats.escortsMarkedTotal / results.length; // Per game with Titan
        titanStats.avgEscortsAtCapture = titanStats.escortsAtCaptureTotal / titanStats.totalTitanCaptures;
        titanStats.avgMilitaryAtCapture = titanStats.totalMilitaryAtCaptures / titanStats.totalTitanCaptures;
    }

    titanStats.byCiv.forEach(stats => {
        if (stats.totalTitanCaptures > 0) {
            stats.avgSupport = stats.totalSupportAtCaptures / stats.totalTitanCaptures;
            stats.avgEscortsAtCapture = stats.escortsAtCaptureTotal / stats.totalTitanCaptures;
            stats.avgMilitaryAtCapture = stats.totalMilitaryAtCaptures / stats.totalTitanCaptures;
        }
    });

    return titanStats;
}

// ============================================================================
// RUN ALL ANALYSES
// ============================================================================

console.log("Running enhanced analyses...\n");

const victoryTypesByCiv = analyzeVictoryTypesByCiv(results);
const victoryByMapSize = analyzeVictoryByMapSize(results);
const participationRates = analyzeParticipationAndWinRates(results);
const stallDiagnostics = analyzeStallDiagnostics(results);
const settlerStats = analyzeSettlerStats(results);
const armyUsage = analyzeArmyUsage(results);
const warConversion = analyzeWarConversion(results, CIVS);
const pop10VsVictory = analyzePop10VsVictory(results);
const titanPerformance = analyzeTitanPerformance(results);
const simulationCountsByMapSize = countSimulationsByMapSize(results);

// ============================================================================
// GENERATE ENHANCED REPORT
// ============================================================================

let report = `# Enhanced Comprehensive Analysis Report\n\n`;
report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
report += `**Simulations:** ${formatSimulationSummary(results, simulationCountsByMapSize)}\n\n`;

report += `---\n\n`;

// QUESTION 1: Victory Types by Civ
report += `## 1. Which Civs Win by Which Victory Type\n\n`;
report += `### Victory Distribution by Civilization\n\n`;
const sortedVictories = Array.from(victoryTypesByCiv.entries()).sort((a, b) => b[1].total - a[1].total);
sortedVictories.forEach(([civ, stats]) => {
    if (stats.total > 0) {
        report += `#### ${civ}\n`;
        report += `- **Total Wins:** ${stats.total}\n`;
        report += `- **Conquest Victories:** ${stats.Conquest} (${((stats.Conquest / stats.total) * 100).toFixed(1)}%)\n`;
        report += `- **Progress Victories:** ${stats.Progress} (${((stats.Progress / stats.total) * 100).toFixed(1)}%)\n\n`;
    }
});

// QUESTION 1b: Victory Types by Map Size
report += `## 1b. Victory Types by Map Size\n\n`;
MAP_ORDER.forEach(size => {
    const stats = victoryByMapSize.get(size);
    if (stats.total > 0) {
        const conquestPct = ((stats.Conquest / stats.total) * 100).toFixed(1);
        const progressPct = ((stats.Progress / stats.total) * 100).toFixed(1);

        report += `### ${size} Maps (${stats.total} wins)\n`;
        report += `- **Conquest:** ${stats.Conquest} (${conquestPct}%)\n`;
        report += `- **Progress:** ${stats.Progress} (${progressPct}%)\n\n`;

        report += `**Breakdown by Civ:**\n`;
        let hasWinners = false;
        stats.byCiv.forEach((civStats, civ) => {
            const total = civStats.Conquest + civStats.Progress;
            if (total > 0) {
                hasWinners = true;
                report += `- **${civ}:** ${total} wins (Conquest: ${civStats.Conquest}, Progress: ${civStats.Progress})\n`;
            }
        });
        if (!hasWinners) report += `- No winners yet.\n`;
        report += `\n`;
    } else {
        report += `### ${size} Maps\n- No victories recorded.\n\n`;
    }
});

// QUESTION 2: Participation and Win Rates
report += `## 2. Accurate Participation & Win Rates per Civ\n\n`;
const sortedParticipation = Array.from(participationRates.entries()).sort((a, b) => b[1].gamesParticipated - a[1].gamesParticipated);
sortedParticipation.forEach(([civ, stats]) => {
    const winRate = stats.gamesParticipated > 0 ? ((stats.wins / stats.gamesParticipated) * 100).toFixed(1) : '0.0';
    const eliminationRate = stats.gamesParticipated > 0 ? ((stats.eliminations / stats.gamesParticipated) * 100).toFixed(1) : '0.0';
    report += `#### ${civ}\n`;
    report += `- **Games Participated:** ${stats.gamesParticipated}\n`;
    report += `- **Wins:** ${stats.wins} (${winRate}% win rate)\n`;
    report += `- **Eliminations:** ${stats.eliminations} (${eliminationRate}% elimination rate)\n`;
    report += `- **Avg Final Cities:** ${stats.avgFinalCities.toFixed(1)}\n`;
    report += `- **Avg Final Population:** ${stats.avgFinalPop.toFixed(1)}\n\n`;
});

// QUESTION 3: Stall Diagnostics
report += `## 3. No-Victory & Stall Diagnostics by Map Size\n\n`;
MAP_ORDER.forEach(mapSize => {
    const stats = stallDiagnostics.get(mapSize);
    const totalGames = simulationCountsByMapSize.get(mapSize) ?? 0;
    const noVictoryPct = totalGames > 0 ? ((stats.noVictory.length / totalGames) * 100).toFixed(1) : "0.0";
    const uniqueStalledSeeds = new Set(stats.stalls.map(stall => stall.seed)).size;
    report += `### ${mapSize} Maps\n`;
    report += `- **Games Without Victory:** ${stats.noVictory.length} of ${totalGames} (${noVictoryPct}%)\n`;
    report += `- **Games With Stall Windows:** ${uniqueStalledSeeds} of ${totalGames}\n`;
    report += `- **Detected Stall Windows:** ${stats.stalls.length}\n\n`;

    if (stats.noVictory.length > 0) {
        report += `#### No-Victory Game Details:\n`;
        stats.noVictory.forEach(game => {
            report += `- **Seed ${game.seed}:** Reached turn ${game.turnReached}, ${game.finalCivs} civs, ${game.finalCities} cities, ${game.totalPop} total pop, ${game.eventsLast10Turns} events in last 10 turns\n`;
        });
        report += `\n`;

        if (stats.diagnostics.length > 0) {
            report += `#### Detailed Diagnostics:\n`;
            stats.diagnostics.slice(0, 3).forEach(diag => {
                report += `**Seed ${diag.seed} (Turn ${diag.turnReached}):**\n`;
                report += `- Recent wars: ${diag.recentWars}\n`;
                report += `- Recent techs: ${diag.recentTechs}\n`;
                report += `- Recent projects: ${diag.recentProjects}\n`;
                report += `- Civs at end:\n`;
                diag.civs.forEach(c => {
                    report += `  - ${c.civ}: ${c.cities} cities, ${c.pop} pop, ${c.techs} techs, ${c.projects} projects, ${c.power.toFixed(0)} power${c.isEliminated ? ' (ELIMINATED)' : ''}\n`;
                });
                report += `\n`;
            });
        }
    }
});

// QUESTION 4: Settler Stats
report += `## 4. Settler Death Rates vs Production\n\n`;

// Calculate total starting settlers (2 per civ per game)
let totalStartingSettlers = 0;
settlerStats.byCiv.forEach((stats) => {
    totalStartingSettlers += stats.gamesPlayed * 2;
});
const totalSettlers = settlerStats.settlerProductions.length + totalStartingSettlers;
const overallDeathRate = totalSettlers > 0 ? ((settlerStats.settlerDeaths.length / totalSettlers) * 100).toFixed(1) : 'N/A';

report += `### Overall Statistics\n`;
report += `- **Total Settlers (produced + starting):** ${totalSettlers} (${settlerStats.settlerProductions.length} produced + ${totalStartingSettlers} starting)\n`;
report += `- **Total Settlers Killed:** ${settlerStats.settlerDeaths.length}\n`;
report += `- **Death Rate:** ${overallDeathRate}%\n\n`;

report += `### By Civilization\n`;
Array.from(settlerStats.byCiv.entries()).forEach(([civ, stats]) => {
    if (stats.gamesPlayed > 0) {
        const startingSettlers = stats.gamesPlayed * 2;
        const totalAvailable = stats.productions + startingSettlers;
        const deathRate = totalAvailable > 0 ? ((stats.deaths / totalAvailable) * 100).toFixed(1) : 'N/A';
        report += `- **${civ}:** ${totalAvailable} total (${stats.productions} produced + ${startingSettlers} starting), ${stats.deaths} killed (${deathRate}% death rate), ${stats.citiesFounded} cities founded\n`;
    }
});
report += `\n`;

const producedSettlerDeaths = settlerStats.settlerDeaths.filter(death => death.producedDeathCause);
if (producedSettlerDeaths.length > 0) {
    report += `### Produced Settler Death Causes\n`;
    SETTLER_DEATH_CAUSE_ORDER.forEach(cause => {
        const count = settlerStats.producedDeathCauseBreakdown[cause] || 0;
        const share = producedSettlerDeaths.length > 0 ? ((count / producedSettlerDeaths.length) * 100).toFixed(1) : "0.0";
        report += `- **${cause}:** ${count} (${share}% of produced settler deaths)\n`;
    });
    report += `\n`;

    const nativeCampDeaths = settlerStats.producedDeathCauseBreakdown.native_camp || 0;
    if (nativeCampDeaths > 0) {
        report += `### Native Camp Death Context\n`;
        NATIVE_CAMP_CONTEXT_ORDER.forEach(context => {
            const count = settlerStats.nativeCampDeathContextBreakdown[context] || 0;
            const share = nativeCampDeaths > 0 ? ((count / nativeCampDeaths) * 100).toFixed(1) : "0.0";
            report += `- **${context}:** ${count} (${share}% of native camp settler deaths)\n`;
        });
        report += `\n`;
    }
}

// QUESTION 5: Army Usage
report += `## 5. Army Usage Patterns\n\n`;
report += `### Overall Statistics\n`;
report += `- **Army Units Produced:** ${armyUsage.armyProductions.length}\n`;
report += `- **Army Units Killed:** ${armyUsage.armyDeaths.length}\n`;
report += `- **Survival Rate:** ${armyUsage.armyProductions.length > 0 ? (((armyUsage.armyProductions.length - armyUsage.armyDeaths.length) / armyUsage.armyProductions.length) * 100).toFixed(1) : 'N/A'}%\n\n`;

report += `### By Civilization\n`;
Array.from(armyUsage.byCiv.entries()).forEach(([civ, stats]) => {
    if (stats.productions > 0 || stats.deaths > 0) {
        report += `- **${civ}:** ${stats.productions} produced, ${stats.deaths} killed\n`;
    }
});
report += `\n`;

// QUESTION 6: War Conversion
report += `## 6. War-to-Win Conversion Telemetry\n\n`;
report += `### By Civilization\n`;
CIVS.forEach(civ => {
    const stats = warConversion.byCiv.get(civ);
    if (!stats || stats.gamesPlayed === 0) return;

    report += `#### ${civ}\n`;
    report += `- **Initiated Wars:** ${stats.initiatedWars}\n`;
    report += `- **Average Declaration Power Ratio:** ${formatMaybe(stats.avgDeclarationPowerRatio, 2)}\n`;
    report += `- **Initiated Wars With Capture:** ${stats.initiatedWarsWithCapture} (${formatMaybe(stats.warCaptureConversionRate)}%)\n`;
    report += `- **Cities Captured per Initiated War:** ${formatMaybe(stats.capturesPerInitiatedWar, 2)} (${stats.citiesCapturedInInitiatedWars} total)\n`;
    report += `- **Capital Captures per Initiated War:** ${formatMaybe(stats.capitalCapturesPerInitiatedWar, 2)} (${stats.capitalCapturesInInitiatedWars} total)\n`;
    report += `- **Eliminations per Initiated War:** ${formatMaybe(stats.eliminationsPerInitiatedWar, 2)} (${stats.eliminationsCausedInInitiatedWars} total)\n`;
    report += `- **Win Rate After Any Capture:** ${stats.winsWithAnyCapture}/${stats.gamesWithAnyCapture} (${formatMaybe(stats.winRateAfterAnyCapture)}%)\n`;
    report += `- **Win Rate When First to Capture:** ${stats.winsWithFirstCapture}/${stats.gamesWithFirstCapture} (${formatMaybe(stats.winRateAfterFirstCapture)}%)\n`;
    report += `- **Median Turns from Declared War to First Capture:** ${formatMaybe(stats.medianTurnsToFirstCaptureFromDeclaredWar)}\n`;
    report += `- **Median First War Turn:** wins ${formatMaybe(stats.medianFirstWarTurnInWins)}, losses ${formatMaybe(stats.medianFirstWarTurnInLosses)}\n`;
    report += `- **Median First Capture Turn:** wins ${formatMaybe(stats.medianFirstCaptureTurnInWins)}, losses ${formatMaybe(stats.medianFirstCaptureTurnInLosses)}\n`;
    report += `- **Median ${warConversion.captureBurstWindow}-Turn Capture Burst:** wins ${formatMaybe(stats.medianCaptureBurst25InWins)}, losses ${formatMaybe(stats.medianCaptureBurst25InLosses)}\n`;
    report += `- **Median Turns from First Capture to Win:** ${formatMaybe(stats.medianTurnsFromFirstCaptureToWin)}\n`;
    if (stats.progressWins > 0) {
        report += `- **Progress Wins With Prior Captures:** ${stats.progressWinsWithPriorCapture}/${stats.progressWins} (${formatMaybe(stats.progressWinPivotRate)}%), avg ${formatMaybe(stats.avgCapturesBeforeFirstProgressProject)} captures before first progress project\n`;
        report += `- **Progress Wins With Prior Capital Capture:** ${stats.progressWinsWithPriorCapitalCapture}/${stats.progressWins} (${formatMaybe(stats.progressWinCapitalPivotRate)}%)\n`;
    }
    report += `\n`;
});

const forgeConversion = warConversion.byCiv.get("ForgeClans");
if (forgeConversion) {
    const forgeBaseWinRate = forgeConversion.gamesPlayed > 0
        ? (forgeConversion.wins / forgeConversion.gamesPlayed) * 100
        : 0;
    report += `### ForgeClans Focus\n`;
    report += `- **Base Win Rate:** ${formatMaybe(forgeBaseWinRate)}%\n`;
    report += `- **Capture Conversion:** ${forgeConversion.initiatedWarsWithCapture}/${forgeConversion.initiatedWars} initiated wars led to captures (${formatMaybe(forgeConversion.warCaptureConversionRate)}%)\n`;
    report += `- **Elimination Conversion:** ${forgeConversion.initiatedWarsWithElimination}/${forgeConversion.initiatedWars} initiated wars led to eliminations (${formatMaybe(forgeConversion.warEliminationConversionRate)}%)\n`;
    report += `- **Capture-Conditional Win Rate:** ${forgeConversion.winsWithAnyCapture}/${forgeConversion.gamesWithAnyCapture} (${formatMaybe(forgeConversion.winRateAfterAnyCapture)}%)\n`;
    report += `- **First-Capture Win Rate:** ${forgeConversion.winsWithFirstCapture}/${forgeConversion.gamesWithFirstCapture} (${formatMaybe(forgeConversion.winRateAfterFirstCapture)}%)\n`;
    report += `- **Median Time to First Capture After War Declaration:** ${formatMaybe(forgeConversion.medianTurnsToFirstCaptureFromDeclaredWar)} turns\n`;
    if (forgeConversion.progressWins > 0) {
        report += `- **Progress Pivot Wins With Prior Captures:** ${forgeConversion.progressWinsWithPriorCapture}/${forgeConversion.progressWins} (${formatMaybe(forgeConversion.progressWinPivotRate)}%)\n`;
    }
    report += `\n`;
}

// QUESTION 7: Pop 10 vs Victory
report += `## 7. Pop 10 vs Victory Timing Gap\n\n`;
if (pop10VsVictory.length > 0) {
    const avgGap = pop10VsVictory.reduce((sum, d) => sum + d.gap, 0) / pop10VsVictory.length;
    const avgWinTurn = pop10VsVictory.reduce((sum, d) => sum + d.winTurn, 0) / pop10VsVictory.length;
    const avgPop10Turn = pop10VsVictory.reduce((sum, d) => sum + d.avgPop10Turn, 0) / pop10VsVictory.length;

    report += `### Overall Statistics\n`;
    report += `- **Games with Pop 10 Cities:** ${pop10VsVictory.length} of ${results.filter(r => r.winTurn).length} victories\n`;
    report += `- **Average Victory Turn:** ${avgWinTurn.toFixed(1)}\n`;
    report += `- **Average Pop 10 Turn:** ${avgPop10Turn.toFixed(1)}\n`;
    report += `- **Average Gap:** ${avgGap.toFixed(1)} turns (${avgGap > 0 ? 'pop 10 before victory' : 'victory before pop 10'})\n\n`;

    report += `### By Map Size\n`;
    MAP_ORDER.forEach(mapSize => {
        const sizeData = pop10VsVictory.filter(d => d.mapSize === mapSize);
        if (sizeData.length > 0) {
            const avgGap = sizeData.reduce((sum, d) => sum + d.gap, 0) / sizeData.length;
            report += `- **${mapSize}:** ${sizeData.length} games, avg gap ${avgGap.toFixed(1)} turns\n`;
        }
    });
    report += `\n`;

    report += `### By Victory Type\n`;
    const byVictoryType = { Conquest: [], Progress: [] };
    pop10VsVictory.forEach(d => {
        if (byVictoryType[d.victoryType]) {
            byVictoryType[d.victoryType].push(d);
        }
    });
    Object.entries(byVictoryType).forEach(([type, data]) => {
        if (data.length > 0) {
            const avgGap = data.reduce((sum, d) => sum + d.gap, 0) / data.length;
            report += `- **${type}:** ${data.length} games, avg gap ${avgGap.toFixed(1)} turns\n`;
        }
    });
}

// QUESTION 8: Titan Performance
report += `## 8. Titan Performance Analysis\n\n`;
const tStats = titanPerformance;
const survivalRate = tStats.totalTitans > 0 ? ((1 - tStats.totalDeaths / tStats.totalTitans) * 100).toFixed(1) : 'N/A';
const winRateWithTitan = tStats.totalTitans > 0 ? ((tStats.totalWinsWithTitan / tStats.totalTitans) * 100).toFixed(1) : 'N/A';

report += `### Overall Statistics\n`;
report += `- **Total Titans Spawned:** ${tStats.totalTitans}\n`;
report += `- **Total Titan Deaths:** ${tStats.totalDeaths} (Survival Rate: ${survivalRate}%)\n`;
report += `- **Wins with Titan:** ${tStats.totalWinsWithTitan} (${winRateWithTitan}% of Titans resulted in victory)\n`;
report += `- **Conquest Wins with Titan:** ${tStats.conquestWinsWithTitan}\n`;
report += `- **Average "Deathball" Support:** ${tStats.avgSupport.toFixed(1)} units nearby\n`;

// v6.6h diagnostic output
if (tStats.avgEscortsMarked !== undefined) {
    report += `\n### Escort Diagnostics (v6.6h)\n`;
    report += `- **Avg Escorts Marked Per Game:** ${(tStats.avgEscortsMarked || 0).toFixed(1)}\n`;
    report += `- **Avg Escorts at Capture:** ${(tStats.avgEscortsAtCapture || 0).toFixed(1)}\n`;
    report += `- **Avg Total Military at Capture:** ${(tStats.avgMilitaryAtCapture || 0).toFixed(1)}\n`;
    report += `- **Escorts Marked Total:** ${tStats.escortsMarkedTotal}\n`;
    report += `- **Escorts at Capture Total:** ${tStats.escortsAtCaptureTotal}\n`;
}

// v6.6j: Per-capture support breakdown
if (tStats.supportByCapture.length > 0) {
    report += `\n### Support by Capture Order (v6.6j)\n`;
    tStats.supportByCapture.forEach((totalSupport, index) => {
        const count = tStats.captureCountByIndex[index] || 1;
        const avg = totalSupport / count;
        const captureNum = index + 1;
        const suffix = captureNum === 1 ? 'st' : captureNum === 2 ? 'nd' : captureNum === 3 ? 'rd' : 'th';
        report += `- **${captureNum}${suffix} City Capture:** ${avg.toFixed(1)} avg support (${count} samples)\n`;
    });
}
report += `\n`;

report += `### By Civilization\n`;
tStats.byCiv.forEach((stats, civ) => {
    if (stats.spawned > 0) {
        const sRate = ((1 - stats.died / stats.spawned) * 100).toFixed(1);
        report += `- **${civ}:** ${stats.spawned} spawned, ${stats.died} died (${sRate}% survival), ${stats.wins} wins (${stats.conquestWins} Conquest), Avg Support: ${stats.avgSupport.toFixed(1)}\n`;
    }
});

writeFileSync('/tmp/enhanced-analysis-report.md', report);
console.log("Enhanced analysis complete!");
console.log(`Report written to /tmp/enhanced-analysis-report.md`);
