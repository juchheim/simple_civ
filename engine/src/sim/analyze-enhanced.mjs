import { readFileSync, writeFileSync } from 'fs';

const results = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

console.log(`\n${'='.repeat(80)}`);
console.log(`ENHANCED COMPREHENSIVE ANALYSIS`);
console.log(`${'='.repeat(80)}\n`);

const MAP_ORDER = ["Tiny", "Small", "Standard", "Large", "Huge"];
const CIVS = ["ForgeClans", "ScholarKingdoms", "RiverLeague", "AetherianVanguard", "StarborneSeekers", "JadeCovenant"];

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
                settlerDeaths.push({
                    turn: e.turn,
                    owner: e.owner,
                    mapSize: sim.mapSize,
                });
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
    
    return { settlerDeaths, settlerProductions, byCiv };
}

// ============================================================================
// QUESTION 5: Army usage patterns
// ============================================================================

function analyzeArmyUsage(results) {
    const armyFormations = [];
    const armyDeaths = [];
    const armyProductions = [];
    const byCiv = new Map();
    CIVS.forEach(civ => {
        byCiv.set(civ, { formations: 0, deaths: 0, productions: 0 });
    });
    
    results.forEach(sim => {
        sim.events.forEach(e => {
            if (e.type === "ProjectComplete" && e.project?.startsWith("FormArmy_")) {
                armyFormations.push({
                    turn: e.turn,
                    civ: e.civ,
                    project: e.project,
                    mapSize: sim.mapSize,
                });
                const stats = byCiv.get(e.civ);
                if (stats) stats.formations++;
            } else if (e.type === "UnitDeath" && (e.unitType?.includes("Army") || e.unitType === "ArmyScout" || e.unitType === "ArmySpearGuard" || e.unitType === "ArmyBowGuard" || e.unitType === "ArmyRiders")) {
                armyDeaths.push({
                    turn: e.turn,
                    owner: e.owner,
                    unitType: e.unitType,
                    mapSize: sim.mapSize,
                });
                const civ = sim.finalState?.civs.find(c => c.id === e.owner);
                if (civ) {
                    const stats = byCiv.get(civ.civName);
                    if (stats) stats.deaths++;
                }
            } else if (e.type === "UnitProduction" && (e.unitType?.includes("Army") || e.unitType === "ArmyScout" || e.unitType === "ArmySpearGuard" || e.unitType === "ArmyBowGuard" || e.unitType === "ArmyRiders")) {
                armyProductions.push({
                    turn: e.turn,
                    owner: e.owner,
                    unitType: e.unitType,
                    mapSize: sim.mapSize,
                });
                const civ = sim.finalState?.civs.find(c => c.id === e.owner);
                if (civ) {
                    const stats = byCiv.get(civ.civName);
                    if (stats) stats.productions++;
                }
            }
        });
    });
    
    return { armyFormations, armyDeaths, armyProductions, byCiv };
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
                        if (i === 0 || (sim.turnSnapshots[i-1]?.cities.find(c => c.id === city.id)?.pop || 0) < 10) {
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
// RUN ALL ANALYSES
// ============================================================================

console.log("Running enhanced analyses...\n");

const victoryTypesByCiv = analyzeVictoryTypesByCiv(results);
const participationRates = analyzeParticipationAndWinRates(results);
const stallDiagnostics = analyzeStallDiagnostics(results);
const settlerStats = analyzeSettlerStats(results);
const armyUsage = analyzeArmyUsage(results);
const pop10VsVictory = analyzePop10VsVictory(results);

// ============================================================================
// GENERATE ENHANCED REPORT
// ============================================================================

let report = `# Enhanced Comprehensive Analysis Report\n\n`;
report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
report += `**Simulations:** ${results.length} total (10 per map size)\n\n`;

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
report += `## 3. Why Smaller Maps Stall - Detailed Diagnostics\n\n`;
MAP_ORDER.forEach(mapSize => {
    const stats = stallDiagnostics.get(mapSize);
    report += `### ${mapSize} Maps\n`;
    report += `- **Games Without Victory:** ${stats.noVictory.length} of 10 (${((stats.noVictory.length / 10) * 100).toFixed(0)}%)\n`;
    report += `- **Detected Stalls:** ${stats.stalls.length}\n\n`;
    
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

// QUESTION 5: Army Usage
report += `## 5. Army Usage Patterns\n\n`;
report += `### Overall Statistics\n`;
report += `- **Army Formations (via projects):** ${armyUsage.armyFormations.length}\n`;
report += `- **Army Units Killed:** ${armyUsage.armyDeaths.length}\n`;
report += `- **Average Deaths per Formation:** ${armyUsage.armyFormations.length > 0 ? (armyUsage.armyDeaths.length / armyUsage.armyFormations.length).toFixed(1) : 'N/A'}\n\n`;

report += `### By Civilization\n`;
Array.from(armyUsage.byCiv.entries()).forEach(([civ, stats]) => {
    if (stats.formations > 0 || stats.deaths > 0) {
        report += `- **${civ}:** ${stats.formations} formed, ${stats.deaths} killed\n`;
    }
});
report += `\n`;

// QUESTION 6: Pop 10 vs Victory
report += `## 6. Pop 10 vs Victory Timing Gap\n\n`;
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

writeFileSync('/tmp/enhanced-analysis-report.md', report);
console.log("Enhanced analysis complete!");
console.log(`Report written to /tmp/enhanced-analysis-report.md`);

