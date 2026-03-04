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
const CITY_STATE_YIELD_ORDER = ["Science", "Production", "Food", "Gold"];
const SUZERAIN_CHANGE_CAUSES = ["Investment", "PassiveContestation", "WartimeRelease", "WarBreak", "Other"];
const CAMP_OUTCOME_ORDER = ["ClearedBySelf", "ClearedByOther", "TimedOut", "WarPrepCancelled", "WartimeEmergencyCancelled", "CampVanished", "Retargeted", "Eliminated", "OtherCancelled", "StillActive"];
const CAMP_READINESS_ORDER = ["PreArmy", "ArmyTech", "ArmyFielded"];

// Total techs in game for reference (Hearth/Banner/Engine/Aether eras combined)
const TOTAL_TECHS = 20;

function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function avg(total, count) {
    return count > 0 ? total / count : 0;
}

function pct(part, total) {
    return total > 0 ? (part / total) * 100 : 0;
}

function createCauseAggregate() {
    return Object.fromEntries(SUZERAIN_CHANGE_CAUSES.map(cause => [cause, 0]));
}

function createCampOutcomeAggregate() {
    return Object.fromEntries(CAMP_OUTCOME_ORDER.map(outcome => [outcome, 0]));
}

function createCampReadinessAggregate() {
    return {
        episodes: 0,
        selfClears: 0,
        timedOut: 0,
        reachedReady: 0,
        totalPrepTurns: 0,
        prepToReadyTurns: 0,
        prepToReadySamples: 0,
    };
}

function addCauseAggregate(target, source) {
    for (const cause of SUZERAIN_CHANGE_CAUSES) {
        target[cause] += num(source?.[cause], 0);
    }
}

function formatCauseBreakdown(counter) {
    const parts = SUZERAIN_CHANGE_CAUSES
        .map(cause => [cause, num(counter?.[cause], 0)])
        .filter(([, value]) => value > 0)
        .map(([cause, value]) => `${cause} ${value}`);
    return parts.length > 0 ? parts.join(", ") : "none";
}

function formatPairBreakdown(counter, idToCiv) {
    const parts = Object.entries(counter || {})
        .map(([pairKey, count]) => {
            const [a = "?", b = "?"] = pairKey.split("|");
            return [`${idToCiv.get(a) || a} <> ${idToCiv.get(b) || b}`, num(count, 0)];
        })
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([pair, value]) => `${pair} ${value}`);
    return parts.length > 0 ? parts.join(", ") : "none";
}

function percentile(sortedValues, p) {
    if (!sortedValues.length) return NaN;
    if (sortedValues.length === 1) return sortedValues[0];
    const clamped = Math.max(0, Math.min(1, p));
    const idx = clamped * (sortedValues.length - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    if (low === high) return sortedValues[low];
    const weight = idx - low;
    return sortedValues[low] * (1 - weight) + sortedValues[high] * weight;
}

function summarizeDistribution(values) {
    if (!values.length) {
        return {
            min: NaN,
            p25: NaN,
            median: NaN,
            p75: NaN,
            max: NaN,
            avg: NaN,
        };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const total = sorted.reduce((sum, value) => sum + value, 0);
    return {
        min: sorted[0],
        p25: percentile(sorted, 0.25),
        median: percentile(sorted, 0.5),
        p75: percentile(sorted, 0.75),
        max: sorted[sorted.length - 1],
        avg: total / sorted.length,
    };
}

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

function analyzeCityStateSystems(results) {
    const yieldStats = new Map(CITY_STATE_YIELD_ORDER.map(yieldType => [yieldType, {
        cityStates: 0,
        activeTurns: 0,
        contestedTurns: 0,
        noSuzerainContestedTurns: 0,
        closeRaceContestedTurns: 0,
        turnoverWindowTurns: 0,
        flipWindowTurns: 0,
        safeLeadTurns: 0,
        hotspotTurns: 0,
        passiveContestationTurns: 0,
        passiveCloseRaceTurns: 0,
        suzerainChanges: 0,
        ownershipTurnovers: 0,
        uniqueSuzerains: 0,
    }]));
    const mapStats = new Map();

    let simsWithTelemetry = 0;
    let simsMissingTelemetry = 0;
    let totalCityStatesCreated = 0;
    let totalCityStateActiveTurns = 0;
    let totalContestedTurns = 0;
    let totalNoSuzerainContestedTurns = 0;
    let totalCloseRaceContestedTurns = 0;
    let totalTurnoverWindowTurns = 0;
    let totalFlipWindowTurns = 0;
    let totalSafeLeadTurns = 0;
    let totalHotspotTurns = 0;
    let totalPassiveContestationTurns = 0;
    let totalPassiveCloseRaceTurns = 0;
    let totalPassiveOpenings = 0;
    let totalPassiveOpeningTurnDelayTotal = 0;
    let totalPassiveOpeningsTreasuryAffordable = 0;
    let totalPassiveOpeningsReserveSafe = 0;
    let totalPassiveOpeningsAttemptedByNominated = 0;
    let totalPassiveOpeningAttemptTurnDelayTotal = 0;
    let totalPassiveOpeningAttemptTurnDelaySamples = 0;
    let totalPassiveOpeningsNoAttempt = 0;
    let totalPassiveOpeningsNoAttemptTreasuryBlocked = 0;
    let totalPassiveOpeningsNoAttemptReserveBlocked = 0;
    let totalPassiveOpeningsNoAttemptDespiteCapacity = 0;
    let totalPassiveOpeningsResolved = 0;
    let totalPassiveOpeningsWonByNominated = 0;
    let totalPassiveOpeningsLost = 0;
    let totalPassiveOpeningsExpired = 0;
    let totalPassiveAssistedSuzerainChanges = 0;
    let totalPassiveAssistedOwnershipTurnovers = 0;
    let totalSuzerainChanges = 0;
    let totalOwnershipTurnovers = 0;
    let totalUniqueSuzerains = 0;
    const totalSuzerainChangesByCause = createCauseAggregate();
    const totalOwnershipTurnoversByCause = createCauseAggregate();
    const totalPassiveAssistedSuzerainChangesByCause = createCauseAggregate();
    const totalPassiveAssistedOwnershipTurnoversByCause = createCauseAggregate();
    const totalPassiveOpeningsResolvedByCause = createCauseAggregate();
    const totalPassiveOpeningsWonByNominatedByCause = createCauseAggregate();
    let totalSurvivingCityStates = 0;
    const firstCreationTurns = [];
    const cityStateRows = [];
    const hotspotInstanceRows = [];

    let winnerSamples = 0;
    let winnerSuzerainTurnsTotal = 0;
    let winnersWithAnySuzerain = 0;
    let nonWinnerSamples = 0;
    let nonWinnerSuzerainTurnsTotal = 0;
    let participantsWithSuzerain = 0;
    let participantWinsWithSuzerain = 0;
    let participantsWithoutSuzerain = 0;
    let participantWinsWithoutSuzerain = 0;
    let totalInvestedGold = 0;
    let totalMaintenanceGold = 0;
    let totalSafeMaintenanceGold = 0;
    let totalTurnoverGold = 0;
    let totalFlipWindowGold = 0;
    let totalDeepChallengeGold = 0;
    let totalNeutralClaimGold = 0;
    let totalPairFatigueGold = 0;
    let totalInvestmentActions = 0;
    let totalMaintenanceInvestmentActions = 0;
    let totalSafeMaintenanceActions = 0;
    let totalTurnoverActions = 0;
    let totalFlipWindowActions = 0;
    let totalDeepChallengeActions = 0;
    let totalNeutralClaimActions = 0;
    let totalPairFatigueActions = 0;
    let totalSuzerainTurns = 0;
    let totalFocusTurns = 0;
    let totalFocusChallengeTurns = 0;
    let totalFocusMaintenanceTurns = 0;
    let totalFocusAssignments = 0;
    let totalFocusSwitches = 0;
    let totalCampClearingEpisodes = 0;
    const campOutcomeCounts = createCampOutcomeAggregate();
    const campReadinessAgg = new Map(CAMP_READINESS_ORDER.map(readiness => [readiness, createCampReadinessAggregate()]));
    const campSightedToPrepTurns = [];
    const campPrepToReadyTurns = [];
    const campPrepToSelfClearTurns = [];
    const campTotalPrepTurns = [];
    let campDirectReadyStarts = 0;
    let campReachedReadyEpisodes = 0;
    let campEpisodesWithSighting = 0;
    let campTimeoutAfterReady = 0;
    let campReadyTurnsWithoutContact = 0;
    let campReadyTurnsWithAdjacentContact = 0;
    let campReadyTurnsWithAttackOpportunity = 0;
    let campReadyTurnsWithNoProgressOpportunity = 0;
    let campReadyTurnsWithPowerDisadvantage = 0;
    let campReadyTurnsWithProgress = 0;
    let campReadyTimeoutNoContact = 0;
    let campReadyTimeoutDeclinedAttack = 0;
    let campReadyTimeoutPowerCollapse = 0;
    let campReadyTimeoutOther = 0;
    let campWarInterruptedEpisodes = 0;
    let campClearedByOtherFromBuildup = 0;
    let campClearedByOtherFromLateStart = 0;
    let campClearedByOtherOther = 0;

    for (const sim of results) {
        const mapSize = sim.mapSize || "Unknown";
        if (!mapStats.has(mapSize)) {
            mapStats.set(mapSize, {
                sims: 0,
                telemetrySims: 0,
                simsWithCityStates: 0,
                totalCreated: 0,
                firstCreationTurns: [],
            });
        }
        const mapEntry = mapStats.get(mapSize);
        mapEntry.sims += 1;

        const summary = sim.cityStateSummary;
        if (!summary || typeof summary !== "object" || !Array.isArray(summary.cityStates) || typeof summary.byPlayer !== "object") {
            simsMissingTelemetry += 1;
            continue;
        }

        simsWithTelemetry += 1;
        mapEntry.telemetrySims += 1;
        const idToCiv = new Map(
            (sim.participatingCivs || sim.finalState?.civs || [])
                .filter(participant => participant?.id && participant?.civName)
                .map(participant => [participant.id, participant.civName]),
        );

        const cityStates = summary.cityStates;
        const createdCount = num(summary.totalCityStatesCreated, cityStates.length);
        totalCityStatesCreated += createdCount;
        mapEntry.totalCreated += createdCount;
        if (createdCount > 0) {
            mapEntry.simsWithCityStates += 1;
            const createdTurns = cityStates
                .map(cityState => num(cityState.createdTurn, NaN))
                .filter(turn => Number.isFinite(turn));
            if (createdTurns.length > 0) {
                const firstCreated = Math.min(...createdTurns);
                mapEntry.firstCreationTurns.push(firstCreated);
                firstCreationTurns.push(firstCreated);
            }
        }

        const campEpisodes = Array.isArray(summary.campClearing?.episodes) ? summary.campClearing.episodes : [];
        for (const episode of campEpisodes) {
            const outcome = CAMP_OUTCOME_ORDER.includes(episode.outcome) ? episode.outcome : "OtherCancelled";
            const readiness = CAMP_READINESS_ORDER.includes(episode.readinessAtStart) ? episode.readinessAtStart : "PreArmy";
            const initialPrepState = episode.initialPrepState || "Buildup";
            const prepStartedTurn = num(episode.prepStartedTurn, NaN);
            const firstReadyTurn = num(episode.firstReadyTurn, NaN);
            const campClearedTurn = num(episode.campClearedTurn, NaN);
            const sightedTurn = num(episode.sightedTurn, NaN);
            const totalPrep = num(episode.totalPrepTurns, 0);
            const initialMilitaryCount = num(episode.initialMilitaryCount, NaN);
            const initialRequiredMilitary = num(episode.initialRequiredMilitary, NaN);
            const readyTurnsWithoutContact = num(episode.readyTurnsWithoutContact, 0);
            const readyTurnsWithAdjacentContact = num(episode.readyTurnsWithAdjacentContact, 0);
            const readyTurnsWithAttackOpportunity = num(episode.readyTurnsWithAttackOpportunity, 0);
            const readyTurnsWithNoProgressOpportunity = num(episode.readyTurnsWithNoProgressOpportunity, 0);
            const readyTurnsWithPowerDisadvantage = num(episode.readyTurnsWithPowerDisadvantage, 0);
            const readyTurnsWithProgress = num(episode.readyTurnsWithProgress, 0);

            totalCampClearingEpisodes += 1;
            campOutcomeCounts[outcome] += 1;
            const readinessEntry = campReadinessAgg.get(readiness);
            readinessEntry.episodes += 1;
            readinessEntry.totalPrepTurns += totalPrep;
            campTotalPrepTurns.push(totalPrep);

            if (initialPrepState === "Ready") {
                campDirectReadyStarts += 1;
            }
            if (Number.isFinite(sightedTurn) && Number.isFinite(prepStartedTurn)) {
                campEpisodesWithSighting += 1;
                campSightedToPrepTurns.push(prepStartedTurn - sightedTurn);
            }
            if (Number.isFinite(firstReadyTurn) && Number.isFinite(prepStartedTurn)) {
                campReachedReadyEpisodes += 1;
                readinessEntry.reachedReady += 1;
                const prepToReady = firstReadyTurn - prepStartedTurn;
                readinessEntry.prepToReadyTurns += prepToReady;
                readinessEntry.prepToReadySamples += 1;
                campPrepToReadyTurns.push(prepToReady);
            }
            campReadyTurnsWithoutContact += readyTurnsWithoutContact;
            campReadyTurnsWithAdjacentContact += readyTurnsWithAdjacentContact;
            campReadyTurnsWithAttackOpportunity += readyTurnsWithAttackOpportunity;
            campReadyTurnsWithNoProgressOpportunity += readyTurnsWithNoProgressOpportunity;
            campReadyTurnsWithPowerDisadvantage += readyTurnsWithPowerDisadvantage;
            campReadyTurnsWithProgress += readyTurnsWithProgress;
            if (outcome === "ClearedBySelf") {
                readinessEntry.selfClears += 1;
                if (Number.isFinite(campClearedTurn) && Number.isFinite(prepStartedTurn)) {
                    campPrepToSelfClearTurns.push(campClearedTurn - prepStartedTurn);
                }
            }
            if (outcome === "TimedOut") {
                readinessEntry.timedOut += 1;
                if (Number.isFinite(firstReadyTurn)) {
                    campTimeoutAfterReady += 1;
                    if (readyTurnsWithAdjacentContact === 0) {
                        campReadyTimeoutNoContact += 1;
                    } else if (readyTurnsWithPowerDisadvantage > readyTurnsWithNoProgressOpportunity) {
                        campReadyTimeoutPowerCollapse += 1;
                    } else if (readyTurnsWithNoProgressOpportunity > 0 || readyTurnsWithAttackOpportunity > 0) {
                        campReadyTimeoutDeclinedAttack += 1;
                    } else {
                        campReadyTimeoutOther += 1;
                    }
                }
            }
            if (outcome === "WarPrepCancelled" || outcome === "WartimeEmergencyCancelled") {
                campWarInterruptedEpisodes += 1;
            }
            if (outcome === "ClearedByOther") {
                if (
                    (Number.isFinite(initialMilitaryCount) && Number.isFinite(initialRequiredMilitary) && initialMilitaryCount < initialRequiredMilitary)
                    || initialPrepState === "Buildup"
                ) {
                    campClearedByOtherFromBuildup += 1;
                } else if (Number.isFinite(sightedTurn) && Number.isFinite(prepStartedTurn) && (prepStartedTurn - sightedTurn) >= 3) {
                    campClearedByOtherFromLateStart += 1;
                } else {
                    campClearedByOtherOther += 1;
                }
            }
        }

        totalCityStateActiveTurns += num(
            summary.totalCityStateActiveTurns,
            cityStates.reduce((sum, cityState) => sum + num(cityState.activeTurns, 0), 0),
        );
        totalSurvivingCityStates += num(
            summary.survivingCityStates,
            cityStates.filter(cityState => cityState.removedTurn === null || cityState.removedTurn === undefined).length,
        );

        for (const cityState of cityStates) {
            const activeTurns = num(cityState.activeTurns, 0);
            const contestedTurns = num(cityState.contestedTurns, 0);
            const hasNoSuzBreakdown = cityState?.noSuzerainContestedTurns !== undefined && cityState?.noSuzerainContestedTurns !== null;
            const hasCloseRaceBreakdown = cityState?.closeRaceContestedTurns !== undefined && cityState?.closeRaceContestedTurns !== null;
            const noSuzerainContestedTurns = hasNoSuzBreakdown ? num(cityState.noSuzerainContestedTurns, 0) : contestedTurns;
            const closeRaceContestedTurns = hasCloseRaceBreakdown ? num(cityState.closeRaceContestedTurns, 0) : 0;
            const turnoverWindowTurns = num(cityState.turnoverWindowTurns, 0);
            const flipWindowTurns = num(cityState.flipWindowTurns, 0);
            const safeLeadTurns = num(cityState.safeLeadTurns, 0);
            const hotspotTurns = num(cityState.hotspotTurns, 0);
            const passiveContestationTurns = num(cityState.passiveContestationTurns, 0);
            const passiveCloseRaceTurns = num(cityState.passiveCloseRaceTurns, 0);
            const passiveOpenings = num(cityState.passiveOpenings, 0);
            const passiveOpeningTurnDelayTotal = num(cityState.passiveOpeningTurnDelayTotal, 0);
            const passiveOpeningsTreasuryAffordable = num(cityState.passiveOpeningsTreasuryAffordable, 0);
            const passiveOpeningsReserveSafe = num(cityState.passiveOpeningsReserveSafe, 0);
            const passiveOpeningsAttemptedByNominated = num(cityState.passiveOpeningsAttemptedByNominated, 0);
            const passiveOpeningAttemptTurnDelayTotal = num(cityState.passiveOpeningAttemptTurnDelayTotal, 0);
            const passiveOpeningAttemptTurnDelaySamples = num(cityState.passiveOpeningAttemptTurnDelaySamples, 0);
            const passiveOpeningsNoAttempt = num(cityState.passiveOpeningsNoAttempt, 0);
            const passiveOpeningsNoAttemptTreasuryBlocked = num(cityState.passiveOpeningsNoAttemptTreasuryBlocked, 0);
            const passiveOpeningsNoAttemptReserveBlocked = num(cityState.passiveOpeningsNoAttemptReserveBlocked, 0);
            const passiveOpeningsNoAttemptDespiteCapacity = num(cityState.passiveOpeningsNoAttemptDespiteCapacity, 0);
            const passiveOpeningsResolved = num(cityState.passiveOpeningsResolved, 0);
            const passiveOpeningsWonByNominated = num(cityState.passiveOpeningsWonByNominated, 0);
            const passiveOpeningsLost = num(cityState.passiveOpeningsLost, 0);
            const passiveOpeningsExpired = num(cityState.passiveOpeningsExpired, 0);
            const passiveAssistedSuzerainChanges = num(cityState.passiveAssistedSuzerainChanges, 0);
            const passiveAssistedOwnershipTurnovers = num(cityState.passiveAssistedOwnershipTurnovers, 0);
            const suzerainChanges = num(cityState.suzerainChanges, 0);
            const ownershipTurnovers = num(cityState.ownershipTurnovers, 0);
            const uniqueSuzerainCount = (() => {
                const reported = num(cityState.uniqueSuzerainCount, NaN);
                if (Number.isFinite(reported) && reported >= 0) return reported;
                const ids = new Set(
                    Object.entries(cityState.suzerainTurnsByPlayer || {})
                        .filter(([, turns]) => num(turns, 0) > 0)
                        .map(([playerId]) => playerId),
                );
                if (cityState.finalSuzerainId) {
                    ids.add(cityState.finalSuzerainId);
                }
                return ids.size;
            })();

            totalContestedTurns += contestedTurns;
            totalNoSuzerainContestedTurns += noSuzerainContestedTurns;
            totalCloseRaceContestedTurns += closeRaceContestedTurns;
            totalTurnoverWindowTurns += turnoverWindowTurns;
            totalFlipWindowTurns += flipWindowTurns;
            totalSafeLeadTurns += safeLeadTurns;
            totalHotspotTurns += hotspotTurns;
            totalPassiveContestationTurns += passiveContestationTurns;
            totalPassiveCloseRaceTurns += passiveCloseRaceTurns;
            totalPassiveOpenings += passiveOpenings;
            totalPassiveOpeningTurnDelayTotal += passiveOpeningTurnDelayTotal;
            totalPassiveOpeningsTreasuryAffordable += passiveOpeningsTreasuryAffordable;
            totalPassiveOpeningsReserveSafe += passiveOpeningsReserveSafe;
            totalPassiveOpeningsAttemptedByNominated += passiveOpeningsAttemptedByNominated;
            totalPassiveOpeningAttemptTurnDelayTotal += passiveOpeningAttemptTurnDelayTotal;
            totalPassiveOpeningAttemptTurnDelaySamples += passiveOpeningAttemptTurnDelaySamples;
            totalPassiveOpeningsNoAttempt += passiveOpeningsNoAttempt;
            totalPassiveOpeningsNoAttemptTreasuryBlocked += passiveOpeningsNoAttemptTreasuryBlocked;
            totalPassiveOpeningsNoAttemptReserveBlocked += passiveOpeningsNoAttemptReserveBlocked;
            totalPassiveOpeningsNoAttemptDespiteCapacity += passiveOpeningsNoAttemptDespiteCapacity;
            totalPassiveOpeningsResolved += passiveOpeningsResolved;
            totalPassiveOpeningsWonByNominated += passiveOpeningsWonByNominated;
            totalPassiveOpeningsLost += passiveOpeningsLost;
            totalPassiveOpeningsExpired += passiveOpeningsExpired;
            totalPassiveAssistedSuzerainChanges += passiveAssistedSuzerainChanges;
            totalPassiveAssistedOwnershipTurnovers += passiveAssistedOwnershipTurnovers;
            totalSuzerainChanges += suzerainChanges;
            totalOwnershipTurnovers += ownershipTurnovers;
            addCauseAggregate(totalSuzerainChangesByCause, cityState.suzerainChangesByCause);
            addCauseAggregate(totalOwnershipTurnoversByCause, cityState.ownershipTurnoversByCause);
            addCauseAggregate(totalPassiveOpeningsResolvedByCause, cityState.passiveOpeningsResolvedByCause);
            addCauseAggregate(totalPassiveOpeningsWonByNominatedByCause, cityState.passiveOpeningsWonByNominatedByCause);
            addCauseAggregate(totalPassiveAssistedSuzerainChangesByCause, cityState.passiveAssistedSuzerainChangesByCause);
            addCauseAggregate(totalPassiveAssistedOwnershipTurnoversByCause, cityState.passiveAssistedOwnershipTurnoversByCause);
            totalUniqueSuzerains += uniqueSuzerainCount;
            cityStateRows.push({
                mapSize,
                seed: sim.seed,
                cityName: cityState.cityName || cityState.cityStateId,
                yieldType: cityState.yieldType || "Unknown",
                createdTurn: num(cityState.createdTurn, NaN),
                activeTurns,
                contestedTurns,
                hotspotTurns,
                suzerainChanges,
                ownershipTurnovers,
                uniqueSuzerainCount,
            });
            if (hotspotTurns > 0 || ownershipTurnovers > 0) {
                hotspotInstanceRows.push({
                    mapSize,
                    seed: sim.seed,
                    cityName: cityState.cityName || cityState.cityStateId,
                    yieldType: cityState.yieldType || "Unknown",
                    createdTurn: num(cityState.createdTurn, NaN),
                    activeTurns,
                    hotspotTurns,
                    suzerainChanges,
                    ownershipTurnovers,
                    pairFatigueActions: num(cityState.pairFatigueActions, 0),
                    pairFatigueGoldSpent: num(cityState.pairFatigueGoldSpent, 0),
                    ownershipPairBreakdown: formatPairBreakdown(cityState.ownershipTurnoversByPair, idToCiv),
                    ownershipCauseBreakdown: formatCauseBreakdown(cityState.ownershipTurnoversByCause),
                });
            }

            const yieldType = CITY_STATE_YIELD_ORDER.includes(cityState.yieldType) ? cityState.yieldType : undefined;
            if (!yieldType) continue;
            const yieldEntry = yieldStats.get(yieldType);
            if (!yieldEntry) continue;
            yieldEntry.cityStates += 1;
            yieldEntry.activeTurns += activeTurns;
            yieldEntry.contestedTurns += contestedTurns;
            yieldEntry.noSuzerainContestedTurns += noSuzerainContestedTurns;
            yieldEntry.closeRaceContestedTurns += closeRaceContestedTurns;
            yieldEntry.turnoverWindowTurns += turnoverWindowTurns;
            yieldEntry.flipWindowTurns += flipWindowTurns;
            yieldEntry.safeLeadTurns += safeLeadTurns;
            yieldEntry.hotspotTurns += hotspotTurns;
            yieldEntry.passiveContestationTurns += passiveContestationTurns;
            yieldEntry.passiveCloseRaceTurns += passiveCloseRaceTurns;
            yieldEntry.suzerainChanges += suzerainChanges;
            yieldEntry.ownershipTurnovers += ownershipTurnovers;
            yieldEntry.uniqueSuzerains += uniqueSuzerainCount;
        }

        const participants = sim.participatingCivs || sim.finalState?.civs || [];
        const winnerId = sim.winner?.id;
        const winnerCiv = sim.winner?.civ;
        for (const participant of participants) {
            if (!participant?.id || !participant?.civName) continue;
            const byPlayer = summary.byPlayer?.[participant.id];
            const suzerainTurns = num(byPlayer?.suzerainTurns, 0);
            const investedGold = num(byPlayer?.investedGold, 0);
            const maintenanceGold = num(byPlayer?.maintenanceGoldSpent, 0);
            const investmentActions = num(byPlayer?.investmentActions, 0);
            const maintenanceInvestmentActions = num(byPlayer?.maintenanceInvestmentActions, 0);
            const isWinner = (winnerId && participant.id === winnerId) || (winnerCiv && participant.civName === winnerCiv);
            totalSuzerainTurns += suzerainTurns;
            totalInvestedGold += investedGold;
            totalMaintenanceGold += maintenanceGold;
            totalInvestmentActions += investmentActions;
            totalMaintenanceInvestmentActions += maintenanceInvestmentActions;
            totalSafeMaintenanceGold += num(byPlayer?.safeMaintenanceGoldSpent, 0);
            totalSafeMaintenanceActions += num(byPlayer?.safeMaintenanceActions, 0);
            totalTurnoverGold += num(byPlayer?.turnoverGoldSpent, 0);
            totalTurnoverActions += num(byPlayer?.turnoverActions, 0);
            totalFlipWindowGold += num(byPlayer?.flipWindowGoldSpent, 0);
            totalFlipWindowActions += num(byPlayer?.flipWindowActions, 0);
            totalDeepChallengeGold += num(byPlayer?.deepChallengeGoldSpent, 0);
            totalDeepChallengeActions += num(byPlayer?.deepChallengeActions, 0);
            totalNeutralClaimGold += num(byPlayer?.neutralClaimGoldSpent, 0);
            totalNeutralClaimActions += num(byPlayer?.neutralClaimActions, 0);
            totalPairFatigueGold += num(byPlayer?.pairFatigueGoldSpent, 0);
            totalPairFatigueActions += num(byPlayer?.pairFatigueActions, 0);
            totalFocusTurns += num(byPlayer?.focusTurns, 0);
            totalFocusChallengeTurns += num(byPlayer?.focusChallengeTurns, 0);
            totalFocusMaintenanceTurns += num(byPlayer?.focusMaintenanceTurns, 0);
            totalFocusAssignments += num(byPlayer?.focusAssignments, 0);
            totalFocusSwitches += num(byPlayer?.focusSwitches, 0);

            if (isWinner) {
                winnerSamples += 1;
                winnerSuzerainTurnsTotal += suzerainTurns;
                if (suzerainTurns > 0) winnersWithAnySuzerain += 1;
            } else {
                nonWinnerSamples += 1;
                nonWinnerSuzerainTurnsTotal += suzerainTurns;
            }

            if (suzerainTurns > 0) {
                participantsWithSuzerain += 1;
                if (isWinner) participantWinsWithSuzerain += 1;
            } else {
                participantsWithoutSuzerain += 1;
                if (isWinner) participantWinsWithoutSuzerain += 1;
            }
        }
    }

    const sortedByChanges = [...cityStateRows].sort((a, b) => b.ownershipTurnovers - a.ownershipTurnovers || b.suzerainChanges - a.suzerainChanges || b.activeTurns - a.activeTurns);
    const topTurnoverCityStates = sortedByChanges.slice(0, 4);
    const topTurnoverChanges = topTurnoverCityStates.reduce((sum, row) => sum + row.ownershipTurnovers, 0);
    const remainingRows = sortedByChanges.slice(4);
    const remainingChanges = remainingRows.reduce((sum, row) => sum + row.ownershipTurnovers, 0);
    const remainingActiveTurns = remainingRows.reduce((sum, row) => sum + row.activeTurns, 0);
    const zeroFlipCityStates = cityStateRows.filter(row => row.ownershipTurnovers <= 0).length;
    const contestedButZeroFlipCityStates = cityStateRows.filter(row => row.ownershipTurnovers <= 0 && row.contestedTurns > 0).length;
    const challengerGold = Math.max(0, totalInvestedGold - totalMaintenanceGold);
    const challengerInvestmentActions = Math.max(0, totalInvestmentActions - totalMaintenanceInvestmentActions);
    const campSightedToPrepTiming = summarizeDistribution(campSightedToPrepTurns);
    const campPrepToReadyTiming = summarizeDistribution(campPrepToReadyTurns);
    const campPrepToSelfClearTiming = summarizeDistribution(campPrepToSelfClearTurns);
    const campTotalPrepTiming = summarizeDistribution(campTotalPrepTurns);

    return {
        simsWithTelemetry,
        simsMissingTelemetry,
        totalCityStatesCreated,
        totalCityStateActiveTurns,
        totalSurvivingCityStates,
        totalContestedTurns,
        totalNoSuzerainContestedTurns,
        totalCloseRaceContestedTurns,
        totalTurnoverWindowTurns,
        totalFlipWindowTurns,
        totalSafeLeadTurns,
        totalHotspotTurns,
        totalPassiveContestationTurns,
        totalPassiveCloseRaceTurns,
        totalPassiveOpenings,
        totalPassiveOpeningTurnDelayTotal,
        totalPassiveOpeningsTreasuryAffordable,
        totalPassiveOpeningsReserveSafe,
        totalPassiveOpeningsAttemptedByNominated,
        totalPassiveOpeningAttemptTurnDelayTotal,
        totalPassiveOpeningAttemptTurnDelaySamples,
        totalPassiveOpeningsNoAttempt,
        totalPassiveOpeningsNoAttemptTreasuryBlocked,
        totalPassiveOpeningsNoAttemptReserveBlocked,
        totalPassiveOpeningsNoAttemptDespiteCapacity,
        totalPassiveOpeningsResolved,
        totalPassiveOpeningsResolvedByCause,
        totalPassiveOpeningsWonByNominated,
        totalPassiveOpeningsWonByNominatedByCause,
        totalPassiveOpeningsLost,
        totalPassiveOpeningsExpired,
        totalPassiveAssistedSuzerainChanges,
        totalPassiveAssistedOwnershipTurnovers,
        totalSuzerainChanges,
        totalOwnershipTurnovers,
        totalSuzerainChangesByCause,
        totalOwnershipTurnoversByCause,
        totalPassiveAssistedSuzerainChangesByCause,
        totalPassiveAssistedOwnershipTurnoversByCause,
        totalUniqueSuzerains,
        firstCreationTiming: summarizeDistribution(firstCreationTurns),
        mapStats,
        yieldStats,
        winnerSamples,
        winnerSuzerainTurnsTotal,
        winnersWithAnySuzerain,
        nonWinnerSamples,
        nonWinnerSuzerainTurnsTotal,
        participantsWithSuzerain,
        participantWinsWithSuzerain,
        participantsWithoutSuzerain,
        participantWinsWithoutSuzerain,
        totalInvestedGold,
        totalMaintenanceGold,
        totalSafeMaintenanceGold,
        challengerGold,
        totalTurnoverGold,
        totalFlipWindowGold,
        totalDeepChallengeGold,
        totalNeutralClaimGold,
        totalPairFatigueGold,
        totalInvestmentActions,
        totalMaintenanceInvestmentActions,
        totalSafeMaintenanceActions,
        challengerInvestmentActions,
        totalTurnoverActions,
        totalFlipWindowActions,
        totalDeepChallengeActions,
        totalNeutralClaimActions,
        totalPairFatigueActions,
        totalSuzerainTurns,
        totalFocusTurns,
        totalFocusChallengeTurns,
        totalFocusMaintenanceTurns,
        totalFocusAssignments,
        totalFocusSwitches,
        totalCampClearingEpisodes,
        campOutcomeCounts,
        campReadinessAgg,
        campDirectReadyStarts,
        campReachedReadyEpisodes,
        campEpisodesWithSighting,
        campTimeoutAfterReady,
        campReadyTurnsWithoutContact,
        campReadyTurnsWithAdjacentContact,
        campReadyTurnsWithAttackOpportunity,
        campReadyTurnsWithNoProgressOpportunity,
        campReadyTurnsWithPowerDisadvantage,
        campReadyTurnsWithProgress,
        campReadyTimeoutNoContact,
        campReadyTimeoutDeclinedAttack,
        campReadyTimeoutPowerCollapse,
        campReadyTimeoutOther,
        campWarInterruptedEpisodes,
        campClearedByOtherFromBuildup,
        campClearedByOtherFromLateStart,
        campClearedByOtherOther,
        campSightedToPrepTiming,
        campPrepToReadyTiming,
        campPrepToSelfClearTiming,
        campTotalPrepTiming,
        topTurnoverCityStates,
        hotspotInstanceRows: hotspotInstanceRows
            .sort((a, b) => b.ownershipTurnovers - a.ownershipTurnovers || b.hotspotTurns - a.hotspotTurns || a.cityName.localeCompare(b.cityName))
            .slice(0, 6),
        hotspotInstanceCount: hotspotInstanceRows.filter(row => row.hotspotTurns > 0).length,
        hotspotOwnershipTurnovers: hotspotInstanceRows
            .filter(row => row.hotspotTurns > 0)
            .reduce((sum, row) => sum + row.ownershipTurnovers, 0),
        topTurnoverShare: pct(topTurnoverChanges, Math.max(1, totalOwnershipTurnovers)),
        nonTopTurnoverFlipRate: (remainingChanges / Math.max(1, remainingActiveTurns)) * 100,
        zeroFlipCityStates,
        contestedButZeroFlipCityStates,
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
const cityStateAnalysis = analyzeCityStateSystems(results);
const mapSizeBreakdown = MAP_ORDER
    .map(mapSize => `${mapSize}: ${(byMapSize.get(mapSize) || []).length}`)
    .join(", ");

// ============================================================================
// GENERATE REPORT
// ============================================================================

let report = `# Comprehensive Simulation Analysis Report\n\n`;
report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
report += `**Simulations:** ${results.length} total (${mapSizeBreakdown}) (AI vs AI)\n`;
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

// City-State Analysis
report += `## 9. City-State Systems\n\n`;
report += `### Telemetry Coverage\n`;
report += `- **Simulations with City-State Telemetry:** ${cityStateAnalysis.simsWithTelemetry}/${results.length}\n`;
report += `- **Simulations Missing City-State Telemetry:** ${cityStateAnalysis.simsMissingTelemetry}\n`;
report += `- **Total City-States Created:** ${cityStateAnalysis.totalCityStatesCreated}\n`;
report += `- **Average City-States Created per Telemetry Sim:** ${avg(cityStateAnalysis.totalCityStatesCreated, cityStateAnalysis.simsWithTelemetry).toFixed(2)}\n`;
report += `- **Average Surviving City-States at Game End (Telemetry Sims):** ${avg(cityStateAnalysis.totalSurvivingCityStates, cityStateAnalysis.simsWithTelemetry).toFixed(2)}\n\n`;

report += `### Activation & Turnover\n`;
report += `- **Total City-State Active Turns:** ${cityStateAnalysis.totalCityStateActiveTurns}\n`;
report += `- **First City-State Creation Turn (min / p25 / median / p75 / max):** ${Number.isFinite(cityStateAnalysis.firstCreationTiming.min) ? cityStateAnalysis.firstCreationTiming.min.toFixed(0) : "n/a"} / ${Number.isFinite(cityStateAnalysis.firstCreationTiming.p25) ? cityStateAnalysis.firstCreationTiming.p25.toFixed(0) : "n/a"} / ${Number.isFinite(cityStateAnalysis.firstCreationTiming.median) ? cityStateAnalysis.firstCreationTiming.median.toFixed(0) : "n/a"} / ${Number.isFinite(cityStateAnalysis.firstCreationTiming.p75) ? cityStateAnalysis.firstCreationTiming.p75.toFixed(0) : "n/a"} / ${Number.isFinite(cityStateAnalysis.firstCreationTiming.max) ? cityStateAnalysis.firstCreationTiming.max.toFixed(0) : "n/a"}\n`;
report += `- **First City-State Creation Turn (average, sims with any):** ${Number.isFinite(cityStateAnalysis.firstCreationTiming.avg) ? cityStateAnalysis.firstCreationTiming.avg.toFixed(1) : "n/a"}\n`;
report += `- **Global Suzerainty Flip Rate:** ${(cityStateAnalysis.totalSuzerainChanges / Math.max(1, cityStateAnalysis.totalCityStateActiveTurns) * 100).toFixed(2)} per 100 active turns\n`;
report += `- **True Ownership Turnover Rate:** ${(cityStateAnalysis.totalOwnershipTurnovers / Math.max(1, cityStateAnalysis.totalCityStateActiveTurns) * 100).toFixed(2)} per 100 active turns\n`;
report += `- **Average Unique Suzerains per City-State:** ${avg(cityStateAnalysis.totalUniqueSuzerains, cityStateAnalysis.totalCityStatesCreated).toFixed(2)}\n`;
report += `- **Total Contested Turns:** ${cityStateAnalysis.totalContestedTurns} (No Suz: ${cityStateAnalysis.totalNoSuzerainContestedTurns}, Close-race: ${cityStateAnalysis.totalCloseRaceContestedTurns})\n`;
report += `- **Contested Share of Active Turns:** ${pct(cityStateAnalysis.totalContestedTurns, cityStateAnalysis.totalCityStateActiveTurns).toFixed(2)}%\n`;
report += `- **Turnover-Window Turns:** ${cityStateAnalysis.totalTurnoverWindowTurns} (${pct(cityStateAnalysis.totalTurnoverWindowTurns, cityStateAnalysis.totalCityStateActiveTurns).toFixed(2)}% of active turns)\n`;
report += `- **Flip-Window Turns:** ${cityStateAnalysis.totalFlipWindowTurns} (${pct(cityStateAnalysis.totalFlipWindowTurns, cityStateAnalysis.totalCityStateActiveTurns).toFixed(2)}% of active turns)\n`;
report += `- **Safe-Lead Incumbent Turns:** ${cityStateAnalysis.totalSafeLeadTurns} (${pct(cityStateAnalysis.totalSafeLeadTurns, cityStateAnalysis.totalCityStateActiveTurns).toFixed(2)}% of active turns)\n`;
report += `- **Hotspot Turns:** ${cityStateAnalysis.totalHotspotTurns} (${pct(cityStateAnalysis.totalHotspotTurns, cityStateAnalysis.totalCityStateActiveTurns).toFixed(2)}% of active turns)\n`;
report += `- **Passive Contestation Pulses:** ${cityStateAnalysis.totalPassiveContestationTurns}\n`;
report += `- **Passive Contestation Close-Race Pulses:** ${cityStateAnalysis.totalPassiveCloseRaceTurns}\n`;
report += `- **City-States with Zero Suzerainty Flips:** ${cityStateAnalysis.zeroFlipCityStates}/${cityStateAnalysis.totalCityStatesCreated}\n`;
report += `- **Contested-but-Zero-Flip City-States:** ${cityStateAnalysis.contestedButZeroFlipCityStates}/${cityStateAnalysis.totalCityStatesCreated}\n`;
report += `- **Top 4 City-States Share of True Ownership Turnovers:** ${cityStateAnalysis.topTurnoverShare.toFixed(1)}%\n`;
report += `- **True Ownership Turnover Rate Outside Top 4 Turnover City-States:** ${cityStateAnalysis.nonTopTurnoverFlipRate.toFixed(2)} per 100 active turns\n`;
if (cityStateAnalysis.topTurnoverCityStates.length > 0) {
    const topTurnoverList = cityStateAnalysis.topTurnoverCityStates
        .filter(row => row.ownershipTurnovers > 0 || row.suzerainChanges > 0)
        .map(row => `${row.cityName} [${row.mapSize} ${row.seed}] (${row.ownershipTurnovers} ownership, ${row.suzerainChanges} total)`)
        .join(", ");
    if (topTurnoverList) {
        report += `- **Top Turnover City-States:** ${topTurnoverList}\n`;
    }
}
report += `\n`;
    report += `### Camp-Clearing Activation Funnel\n`;
    report += `- **Camp-Clearing Episodes:** ${cityStateAnalysis.totalCampClearingEpisodes}\n`;
    report += `- **Direct Starts in Ready:** ${cityStateAnalysis.campDirectReadyStarts} (${pct(cityStateAnalysis.campDirectReadyStarts, cityStateAnalysis.totalCampClearingEpisodes).toFixed(1)}%)\n`;
    report += `- **Episodes Reaching Ready:** ${cityStateAnalysis.campReachedReadyEpisodes} (${pct(cityStateAnalysis.campReachedReadyEpisodes, cityStateAnalysis.totalCampClearingEpisodes).toFixed(1)}%)\n`;
    report += `- **Episodes with Sighting Telemetry:** ${cityStateAnalysis.campEpisodesWithSighting} (${pct(cityStateAnalysis.campEpisodesWithSighting, cityStateAnalysis.totalCampClearingEpisodes).toFixed(1)}%)\n`;
    report += `- **Sighted -> Prep Start (avg / median):** ${Number.isFinite(cityStateAnalysis.campSightedToPrepTiming.avg) ? cityStateAnalysis.campSightedToPrepTiming.avg.toFixed(2) : "n/a"} / ${Number.isFinite(cityStateAnalysis.campSightedToPrepTiming.median) ? cityStateAnalysis.campSightedToPrepTiming.median.toFixed(0) : "n/a"} turns\n`;
    report += `- **Prep Start -> Ready (avg / median):** ${Number.isFinite(cityStateAnalysis.campPrepToReadyTiming.avg) ? cityStateAnalysis.campPrepToReadyTiming.avg.toFixed(2) : "n/a"} / ${Number.isFinite(cityStateAnalysis.campPrepToReadyTiming.median) ? cityStateAnalysis.campPrepToReadyTiming.median.toFixed(0) : "n/a"} turns\n`;
    report += `- **Prep Start -> Self Clear (avg / median):** ${Number.isFinite(cityStateAnalysis.campPrepToSelfClearTiming.avg) ? cityStateAnalysis.campPrepToSelfClearTiming.avg.toFixed(2) : "n/a"} / ${Number.isFinite(cityStateAnalysis.campPrepToSelfClearTiming.median) ? cityStateAnalysis.campPrepToSelfClearTiming.median.toFixed(0) : "n/a"} turns\n`;
    report += `- **Total Prep Duration (avg / median):** ${Number.isFinite(cityStateAnalysis.campTotalPrepTiming.avg) ? cityStateAnalysis.campTotalPrepTiming.avg.toFixed(2) : "n/a"} / ${Number.isFinite(cityStateAnalysis.campTotalPrepTiming.median) ? cityStateAnalysis.campTotalPrepTiming.median.toFixed(0) : "n/a"} turns\n`;
    report += `- **Timeouts After Ready:** ${cityStateAnalysis.campTimeoutAfterReady} (${pct(cityStateAnalysis.campTimeoutAfterReady, cityStateAnalysis.campOutcomeCounts.TimedOut).toFixed(1)}% of timeouts)\n`;
    report += `- **Ready Turn Diagnostics:** no contact ${cityStateAnalysis.campReadyTurnsWithoutContact}, adjacent contact ${cityStateAnalysis.campReadyTurnsWithAdjacentContact}, attack opportunity ${cityStateAnalysis.campReadyTurnsWithAttackOpportunity}, stalled opportunity ${cityStateAnalysis.campReadyTurnsWithNoProgressOpportunity}, power disadvantage ${cityStateAnalysis.campReadyTurnsWithPowerDisadvantage}, progress ${cityStateAnalysis.campReadyTurnsWithProgress}\n`;
    report += `- **Ready-Timeout Primary Breakdown:** no contact ${cityStateAnalysis.campReadyTimeoutNoContact}, declined attack ${cityStateAnalysis.campReadyTimeoutDeclinedAttack}, power collapse ${cityStateAnalysis.campReadyTimeoutPowerCollapse}, other ${cityStateAnalysis.campReadyTimeoutOther}\n`;
    report += `- **War-Interrupted Episodes:** ${cityStateAnalysis.campWarInterruptedEpisodes} (${pct(cityStateAnalysis.campWarInterruptedEpisodes, cityStateAnalysis.totalCampClearingEpisodes).toFixed(1)}%)\n`;
    report += `- **Cleared-By-Other Breakdown:** lacked military ${cityStateAnalysis.campClearedByOtherFromBuildup}, late start ${cityStateAnalysis.campClearedByOtherFromLateStart}, other ${cityStateAnalysis.campClearedByOtherOther}\n`;
    const campOutcomeLine = CAMP_OUTCOME_ORDER
        .filter(outcome => cityStateAnalysis.campOutcomeCounts[outcome] > 0)
        .map(outcome => `${outcome} ${cityStateAnalysis.campOutcomeCounts[outcome]}`)
        .join(", ");
    report += `- **Episode Outcomes:** ${campOutcomeLine || "none"}\n`;
    const readinessLine = CAMP_READINESS_ORDER
        .map(readiness => {
            const data = cityStateAnalysis.campReadinessAgg.get(readiness);
            return data && data.episodes > 0
                ? `${readiness} ${data.selfClears}/${data.episodes} clears, ${data.timedOut} timeouts`
                : null;
        })
        .filter(Boolean)
        .join(", ");
    report += `- **Readiness Breakdown:** ${readinessLine || "none"}\n\n`;

report += `### Investment Mix\n`;
report += `- **Total City-State Investment:** ${cityStateAnalysis.totalInvestedGold.toFixed(0)}G across ${cityStateAnalysis.totalInvestmentActions.toFixed(0)} actions\n`;
report += `- **Maintenance Investment:** ${cityStateAnalysis.totalMaintenanceGold.toFixed(0)}G (${pct(cityStateAnalysis.totalMaintenanceGold, cityStateAnalysis.totalInvestedGold).toFixed(1)}%) across ${cityStateAnalysis.totalMaintenanceInvestmentActions.toFixed(0)} actions (${pct(cityStateAnalysis.totalMaintenanceInvestmentActions, cityStateAnalysis.totalInvestmentActions).toFixed(1)}%)\n`;
report += `- **Challenger Investment:** ${cityStateAnalysis.challengerGold.toFixed(0)}G (${pct(cityStateAnalysis.challengerGold, cityStateAnalysis.totalInvestedGold).toFixed(1)}%) across ${cityStateAnalysis.challengerInvestmentActions.toFixed(0)} actions (${pct(cityStateAnalysis.challengerInvestmentActions, cityStateAnalysis.totalInvestmentActions).toFixed(1)}%)\n`;
report += `- **Maintenance Gold per Suzerainty Turn:** ${avg(cityStateAnalysis.totalMaintenanceGold, cityStateAnalysis.totalSuzerainTurns).toFixed(2)}\n`;
report += `- **Maintenance Actions per 100 Suzerainty Turns:** ${avg(cityStateAnalysis.totalMaintenanceInvestmentActions * 100, cityStateAnalysis.totalSuzerainTurns).toFixed(2)}\n\n`;

report += `### Turnover Diagnostics\n`;
report += `- **Turnover-Window Challenger Investment:** ${cityStateAnalysis.totalTurnoverGold.toFixed(0)}G across ${cityStateAnalysis.totalTurnoverActions.toFixed(0)} actions\n`;
report += `- **Flip-Window Challenger Investment:** ${cityStateAnalysis.totalFlipWindowGold.toFixed(0)}G across ${cityStateAnalysis.totalFlipWindowActions.toFixed(0)} actions\n`;
report += `- **Deep-Challenge Investment:** ${cityStateAnalysis.totalDeepChallengeGold.toFixed(0)}G across ${cityStateAnalysis.totalDeepChallengeActions.toFixed(0)} actions\n`;
report += `- **Neutral-Claim Investment:** ${cityStateAnalysis.totalNeutralClaimGold.toFixed(0)}G across ${cityStateAnalysis.totalNeutralClaimActions.toFixed(0)} actions\n`;
report += `- **Passive Openings Observed:** ${cityStateAnalysis.totalPassiveOpenings.toFixed(0)}\n`;
report += `- **Passive Openings with Treasury to Invest:** ${cityStateAnalysis.totalPassiveOpeningsTreasuryAffordable.toFixed(0)} (${pct(cityStateAnalysis.totalPassiveOpeningsTreasuryAffordable, cityStateAnalysis.totalPassiveOpenings).toFixed(1)}%)\n`;
report += `- **Passive Openings with Reserve-Safe Invest:** ${cityStateAnalysis.totalPassiveOpeningsReserveSafe.toFixed(0)} (${pct(cityStateAnalysis.totalPassiveOpeningsReserveSafe, cityStateAnalysis.totalPassiveOpenings).toFixed(1)}%)\n`;
report += `- **Passive Opening Avg Nominated Turn-Order Delay:** ${avg(cityStateAnalysis.totalPassiveOpeningTurnDelayTotal, cityStateAnalysis.totalPassiveOpenings).toFixed(2)} turns\n`;
report += `- **Passive Openings Attempted by Nominated Challenger:** ${cityStateAnalysis.totalPassiveOpeningsAttemptedByNominated.toFixed(0)} (${pct(cityStateAnalysis.totalPassiveOpeningsAttemptedByNominated, cityStateAnalysis.totalPassiveOpenings).toFixed(1)}%)\n`;
report += `- **Passive Opening Avg Delay to First Nominated Attempt:** ${avg(cityStateAnalysis.totalPassiveOpeningAttemptTurnDelayTotal, cityStateAnalysis.totalPassiveOpeningAttemptTurnDelaySamples).toFixed(2)} turns\n`;
report += `- **Passive Openings Resolved Before Expiry:** ${cityStateAnalysis.totalPassiveOpeningsResolved.toFixed(0)} (${pct(cityStateAnalysis.totalPassiveOpeningsResolved, cityStateAnalysis.totalPassiveOpenings).toFixed(1)}%)\n`;
report += `- **Passive Openings Won by Nominated Challenger:** ${cityStateAnalysis.totalPassiveOpeningsWonByNominated.toFixed(0)} (${pct(cityStateAnalysis.totalPassiveOpeningsWonByNominated, cityStateAnalysis.totalPassiveOpenings).toFixed(1)}% of openings, ${pct(cityStateAnalysis.totalPassiveOpeningsWonByNominated, cityStateAnalysis.totalPassiveOpeningsResolved).toFixed(1)}% of resolved)\n`;
report += `- **Passive Openings Lost to Someone Else:** ${cityStateAnalysis.totalPassiveOpeningsLost.toFixed(0)}\n`;
report += `- **Passive Openings Expired Unresolved:** ${cityStateAnalysis.totalPassiveOpeningsExpired.toFixed(0)}\n`;
report += `- **Passive Opening Resolutions by Cause:** ${formatCauseBreakdown(cityStateAnalysis.totalPassiveOpeningsResolvedByCause)}\n`;
report += `- **Passive Opening Nominated Wins by Cause:** ${formatCauseBreakdown(cityStateAnalysis.totalPassiveOpeningsWonByNominatedByCause)}\n`;
report += `- **Passive Openings with No Nominated Attempt:** ${cityStateAnalysis.totalPassiveOpeningsNoAttempt.toFixed(0)} (${pct(cityStateAnalysis.totalPassiveOpeningsNoAttempt, cityStateAnalysis.totalPassiveOpenings).toFixed(1)}%)\n`;
report += `- **No-Attempt Reasons:** Treasury blocked ${cityStateAnalysis.totalPassiveOpeningsNoAttemptTreasuryBlocked.toFixed(0)}, Reserve blocked ${cityStateAnalysis.totalPassiveOpeningsNoAttemptReserveBlocked.toFixed(0)}, No-attempt despite capacity ${cityStateAnalysis.totalPassiveOpeningsNoAttemptDespiteCapacity.toFixed(0)}\n`;
report += `- **Passive Direct Flip Conversion per 100 Close-Race Pulses:** ${avg(cityStateAnalysis.totalOwnershipTurnoversByCause.PassiveContestation * 100, cityStateAnalysis.totalPassiveCloseRaceTurns).toFixed(2)}\n`;
report += `- **Passive-Assisted Suzerainty Changes:** ${cityStateAnalysis.totalPassiveAssistedSuzerainChanges.toFixed(0)} (${pct(cityStateAnalysis.totalPassiveAssistedSuzerainChanges, Math.max(1, cityStateAnalysis.totalSuzerainChanges - cityStateAnalysis.totalSuzerainChangesByCause.PassiveContestation)).toFixed(1)}% of non-passive changes)\n`;
report += `- **Passive-Assisted True Ownership Turnovers:** ${cityStateAnalysis.totalPassiveAssistedOwnershipTurnovers.toFixed(0)} (${pct(cityStateAnalysis.totalPassiveAssistedOwnershipTurnovers, cityStateAnalysis.totalOwnershipTurnovers).toFixed(1)}% of ownership turnover)\n`;
report += `- **Passive-Assisted Ownership Conversion per 100 Close-Race Pulses:** ${avg(cityStateAnalysis.totalPassiveAssistedOwnershipTurnovers * 100, cityStateAnalysis.totalPassiveCloseRaceTurns).toFixed(2)}\n`;
report += `- **Passive-Involved Ownership Conversion per 100 Close-Race Pulses:** ${avg((cityStateAnalysis.totalOwnershipTurnoversByCause.PassiveContestation + cityStateAnalysis.totalPassiveAssistedOwnershipTurnovers) * 100, cityStateAnalysis.totalPassiveCloseRaceTurns).toFixed(2)}\n`;
report += `- **Passive-Assisted Ownership Causes:** ${formatCauseBreakdown(cityStateAnalysis.totalPassiveAssistedOwnershipTurnoversByCause)}\n`;
report += `- **Pair-Fatigue-Triggered Investment:** ${cityStateAnalysis.totalPairFatigueGold.toFixed(0)}G across ${cityStateAnalysis.totalPairFatigueActions.toFixed(0)} actions\n`;
report += `- **Pair-Fatigue Share of Challenger Spend:** ${pct(cityStateAnalysis.totalPairFatigueGold, cityStateAnalysis.challengerGold).toFixed(1)}%\n`;
report += `- **Safe-Maintenance Investment:** ${cityStateAnalysis.totalSafeMaintenanceGold.toFixed(0)}G across ${cityStateAnalysis.totalSafeMaintenanceActions.toFixed(0)} actions\n`;
report += `- **Focus Turns:** ${cityStateAnalysis.totalFocusTurns.toFixed(0)} (challenge ${cityStateAnalysis.totalFocusChallengeTurns.toFixed(0)}, maintenance ${cityStateAnalysis.totalFocusMaintenanceTurns.toFixed(0)})\n`;
report += `- **Focus Assignments / Switches:** ${cityStateAnalysis.totalFocusAssignments.toFixed(0)} / ${cityStateAnalysis.totalFocusSwitches.toFixed(0)}\n`;
report += `- **Flip Conversion per 100 Turnover-Window Turns:** ${avg(cityStateAnalysis.totalSuzerainChanges * 100, cityStateAnalysis.totalTurnoverWindowTurns).toFixed(2)}\n`;
report += `- **True Ownership Conversion per 100 Turnover-Window Turns:** ${avg(cityStateAnalysis.totalOwnershipTurnovers * 100, cityStateAnalysis.totalTurnoverWindowTurns).toFixed(2)}\n`;
report += `- **Safe-Maintenance Share of Maintenance Spend:** ${pct(cityStateAnalysis.totalSafeMaintenanceGold, cityStateAnalysis.totalMaintenanceGold).toFixed(1)}%\n\n`;

report += `### Flip Cause Summary\n`;
for (const cause of SUZERAIN_CHANGE_CAUSES) {
    const suzerainChanges = num(cityStateAnalysis.totalSuzerainChangesByCause[cause], 0);
    const ownershipTurnovers = num(cityStateAnalysis.totalOwnershipTurnoversByCause[cause], 0);
    report += `- **${cause}:** ${suzerainChanges} suzerainty changes, ${ownershipTurnovers} true ownership turnovers (${pct(ownershipTurnovers, Math.max(1, cityStateAnalysis.totalOwnershipTurnovers)).toFixed(1)}% of ownership turnover)\n`;
}
report += `\n`;

report += `### Hotspot Diagnostics\n`;
report += `- **Hotspot Share of Active Turns:** ${pct(cityStateAnalysis.totalHotspotTurns, cityStateAnalysis.totalCityStateActiveTurns).toFixed(2)}%\n`;
report += `- **City-State Instances with Any Hotspot Time:** ${cityStateAnalysis.hotspotInstanceCount}/${cityStateAnalysis.totalCityStatesCreated}\n`;
report += `- **True Ownership Turnovers Occurring in Hotspot Instances:** ${cityStateAnalysis.hotspotOwnershipTurnovers}/${cityStateAnalysis.totalOwnershipTurnovers}\n`;
report += `- **Flip Causes:** ${formatCauseBreakdown(cityStateAnalysis.totalSuzerainChangesByCause)}\n`;
report += `- **Ownership Causes:** ${formatCauseBreakdown(cityStateAnalysis.totalOwnershipTurnoversByCause)}\n`;
if (cityStateAnalysis.hotspotInstanceRows.length > 0) {
    const hotspotList = cityStateAnalysis.hotspotInstanceRows
        .map(row => `${row.cityName} [${row.mapSize} ${row.seed}] (${row.ownershipTurnovers} ownership, hotspot ${pct(row.hotspotTurns, Math.max(1, row.activeTurns)).toFixed(1)}%, fatigue ${row.pairFatigueGoldSpent.toFixed(0)}G/${row.pairFatigueActions.toFixed(0)}, ${row.ownershipPairBreakdown})`)
        .join("; ");
    report += `- **Top Hotspot Instances:** ${hotspotList}\n`;
}
report += `\n`;

report += `### Map-Size City-State Activation\n`;
for (const mapSize of MAP_ORDER) {
    const stats = cityStateAnalysis.mapStats.get(mapSize);
    if (!stats || stats.sims === 0) continue;
    const telemetrySims = stats.telemetrySims;
    const avgFirstTurn = stats.firstCreationTurns.length > 0
        ? avg(stats.firstCreationTurns.reduce((sum, turn) => sum + turn, 0), stats.firstCreationTurns.length)
        : NaN;
    const simsWithAny = telemetrySims > 0 ? `${stats.simsWithCityStates}/${telemetrySims}` : "n/a";
    const shareWithAny = telemetrySims > 0 ? `${pct(stats.simsWithCityStates, telemetrySims).toFixed(1)}%` : "n/a";
    const avgCreated = telemetrySims > 0 ? avg(stats.totalCreated, telemetrySims).toFixed(2) : "n/a";
    report += `- **${mapSize}:** ${simsWithAny} sims with >=1 city-state (${shareWithAny}), avg created ${avgCreated}, avg first CS turn ${Number.isFinite(avgFirstTurn) ? avgFirstTurn.toFixed(1) : "n/a"}\n`;
}
report += `\n`;

report += `### Yield-Type Turnover Summary\n`;
for (const yieldType of CITY_STATE_YIELD_ORDER) {
    const stats = cityStateAnalysis.yieldStats.get(yieldType);
    if (!stats || stats.cityStates === 0) continue;
    report += `- **${yieldType}:** ${stats.cityStates} city-states, contested ${pct(stats.contestedTurns, Math.max(1, stats.activeTurns)).toFixed(2)}% (No Suz ${pct(stats.noSuzerainContestedTurns, Math.max(1, stats.activeTurns)).toFixed(2)}%, Close-race ${pct(stats.closeRaceContestedTurns, Math.max(1, stats.activeTurns)).toFixed(2)}%), turnover window ${pct(stats.turnoverWindowTurns, Math.max(1, stats.activeTurns)).toFixed(2)}%, flip window ${pct(stats.flipWindowTurns, Math.max(1, stats.activeTurns)).toFixed(2)}%, safe lead ${pct(stats.safeLeadTurns, Math.max(1, stats.activeTurns)).toFixed(2)}%, hotspot ${pct(stats.hotspotTurns, Math.max(1, stats.activeTurns)).toFixed(2)}%, flip rate ${(stats.suzerainChanges / Math.max(1, stats.activeTurns) * 100).toFixed(2)}/100T, ownership turnover ${(stats.ownershipTurnovers / Math.max(1, stats.activeTurns) * 100).toFixed(2)}/100T, avg unique suzerains ${avg(stats.uniqueSuzerains, stats.cityStates).toFixed(2)}\n`;
}
report += `\n`;

report += `### Suzerainty vs Winning (Directional)\n`;
report += `- **Winner Average Suzerainty Turns:** ${avg(cityStateAnalysis.winnerSuzerainTurnsTotal, cityStateAnalysis.winnerSamples).toFixed(2)}\n`;
report += `- **Non-Winner Average Suzerainty Turns:** ${avg(cityStateAnalysis.nonWinnerSuzerainTurnsTotal, cityStateAnalysis.nonWinnerSamples).toFixed(2)}\n`;
report += `- **Winners with Any Suzerainty:** ${cityStateAnalysis.winnersWithAnySuzerain}/${cityStateAnalysis.winnerSamples} (${pct(cityStateAnalysis.winnersWithAnySuzerain, cityStateAnalysis.winnerSamples).toFixed(1)}%)\n`;
report += `- **Participant Win Rate with Any Suzerainty:** ${pct(cityStateAnalysis.participantWinsWithSuzerain, cityStateAnalysis.participantsWithSuzerain).toFixed(1)}%\n`;
report += `- **Participant Win Rate without Suzerainty:** ${pct(cityStateAnalysis.participantWinsWithoutSuzerain, cityStateAnalysis.participantsWithoutSuzerain).toFixed(1)}%\n\n`;

// Stalls
report += `## 10. Stalls & Issues\n\n`;
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
report += `## 11. Map Size Analysis\n\n`;
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
report += `## 12. Balance Observations\n\n`;

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
