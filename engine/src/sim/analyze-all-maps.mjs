import { readFileSync } from 'fs';

const results = JSON.parse(readFileSync('/tmp/city-growth-results-all-maps.json', 'utf8'));

console.log(`\n=== CITY GROWTH ANALYSIS - ALL MAP SIZES ===\n`);
console.log(`Total simulations: ${results.length}\n`);

// Group results by map size
const byMapSize = new Map();
results.forEach(sim => {
    if (!byMapSize.has(sim.mapSize)) {
        byMapSize.set(sim.mapSize, []);
    }
    byMapSize.get(sim.mapSize).push(sim);
});

const MAP_ORDER = ["Tiny", "Small", "Standard", "Large", "Huge"];

// Analyze each map size
MAP_ORDER.forEach(mapSize => {
    const sims = byMapSize.get(mapSize) || [];
    if (sims.length === 0) return;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`${mapSize.toUpperCase()} MAPS (${sims.length} simulations)`);
    console.log(`${'='.repeat(70)}\n`);

    // Aggregate statistics
    const allPop10Turns = [];
    const allWinTurns = [];
    const perSimPop10Counts = [];
    const perSimGaps = [];
    const totalCities = [];

    sims.forEach(sim => {
        const pop10Turns = Object.values(sim.pop10Turns).map(t => parseInt(t));
        pop10Turns.forEach(t => allPop10Turns.push(t));
        perSimPop10Counts.push(pop10Turns.length);
        totalCities.push(sim.finalCities.length);

        if (sim.winTurn) {
            allWinTurns.push(sim.winTurn);
            if (pop10Turns.length > 0) {
                const avgPop10 = pop10Turns.reduce((s, t) => s + t, 0) / pop10Turns.length;
                perSimGaps.push(sim.winTurn - avgPop10);
            }
        }
    });

    console.log(`Game Outcomes:`);
    const victories = allWinTurns.length;
    const avgWinTurn = victories > 0 ? (allWinTurns.reduce((s, t) => s + t, 0) / victories).toFixed(1) : 'N/A';
    const medianWinTurn = victories > 0 ? allWinTurns.sort((a, b) => a - b)[Math.floor(victories / 2)] : 'N/A';
    console.log(`  Victories: ${victories} of ${sims.length} (${((victories / sims.length) * 100).toFixed(1)}%)`);
    if (victories > 0) {
        console.log(`  Average victory turn: ${avgWinTurn}`);
        console.log(`  Median victory turn: ${medianWinTurn}`);
        console.log(`  Range: [${Math.min(...allWinTurns)}, ${Math.max(...allWinTurns)}]`);
    }

    console.log(`\nCity Statistics:`);
    const avgCities = (totalCities.reduce((s, c) => s + c, 0) / totalCities.length).toFixed(1);
    console.log(`  Average cities per game: ${avgCities}`);
    console.log(`  Range: [${Math.min(...totalCities)}, ${Math.max(...totalCities)}]`);

    console.log(`\nPop 10 Achievement:`);
    if (allPop10Turns.length > 0) {
        allPop10Turns.sort((a, b) => a - b);
        const avgPop10 = (allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length).toFixed(1);
        const medianPop10 = allPop10Turns[Math.floor(allPop10Turns.length / 2)];
        const q1Pop10 = allPop10Turns[Math.floor(allPop10Turns.length * 0.25)];
        const q3Pop10 = allPop10Turns[Math.floor(allPop10Turns.length * 0.75)];
        const avgCitiesReachingPop10 = (perSimPop10Counts.reduce((s, c) => s + c, 0) / perSimPop10Counts.length).toFixed(1);

        console.log(`  Total cities reaching pop 10: ${allPop10Turns.length}`);
        console.log(`  Average per simulation: ${avgCitiesReachingPop10}`);
        console.log(`  Percentage of cities: ${((allPop10Turns.length / totalCities.reduce((s, c) => s + c, 0)) * 100).toFixed(1)}%`);
        console.log(`\n  Timing Statistics:`);
        console.log(`    First: Turn ${allPop10Turns[0]}`);
        console.log(`    Q1 (25th percentile): Turn ${q1Pop10}`);
        console.log(`    Median: Turn ${medianPop10}`);
        console.log(`    Q3 (75th percentile): Turn ${q3Pop10}`);
        console.log(`    Last: Turn ${allPop10Turns[allPop10Turns.length - 1]}`);
        console.log(`    Average: Turn ${avgPop10}`);
    } else {
        console.log(`  No cities reached pop 10 in any simulation.`);
    }

    if (allWinTurns.length > 0 && allPop10Turns.length > 0) {
        const avgWin = allWinTurns.reduce((s, t) => s + t, 0) / allWinTurns.length;
        const avgPop10 = allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length;
        const gap = avgWin - avgPop10;
        const avgGap = perSimGaps.length > 0 ? (perSimGaps.reduce((s, g) => s + g, 0) / perSimGaps.length).toFixed(1) : gap.toFixed(1);

        console.log(`\n  Victory vs Pop 10 Alignment:`);
        console.log(`    Average victory turn: ${avgWin.toFixed(1)}`);
        console.log(`    Average pop 10 turn: ${avgPop10.toFixed(1)}`);
        console.log(`    Average gap: ${avgGap} turns`);
        console.log(`    Per-simulation gaps: [${perSimGaps.map(g => g.toFixed(1)).join(', ')}]`);

        // Growth milestones analysis
        const milestones = [3, 5, 7, 10];
        const milestoneData = new Map();
        milestones.forEach(m => milestoneData.set(m, { turns: [], cities: new Set() }));

        sims.forEach(sim => {
            sim.cityGrowthHistory.forEach(snapshot => {
                milestones.forEach(milestone => {
                    if (snapshot.pop >= milestone) {
                        const data = milestoneData.get(milestone);
                        if (!data.cities.has(snapshot.cityId)) {
                            data.cities.add(snapshot.cityId);
                            data.turns.push(snapshot.turn);
                        }
                    }
                });
            });
        });

        console.log(`\n  Growth Milestones (all cities across all simulations):`);
        milestones.forEach(milestone => {
            const data = milestoneData.get(milestone);
            if (data.turns.length > 0) {
                data.turns.sort((a, b) => a - b);
                const avg = (data.turns.reduce((s, t) => s + t, 0) / data.turns.length).toFixed(1);
                const totalCitiesCount = totalCities.reduce((s, c) => s + c, 0);
                const pct = ((data.cities.size / totalCitiesCount) * 100).toFixed(1);
                console.log(`    Pop ${milestone}: ${data.cities.size} cities (${pct}%), avg turn ${avg}, range [${data.turns[0]}, ${data.turns[data.turns.length - 1]}]`);
            }
        });
    }

    // Per-simulation breakdown
    console.log(`\n  Per-Simulation Details:`);
    sims.forEach((sim, idx) => {
        const pop10Turns = Object.values(sim.pop10Turns).map(t => parseInt(t));
        const gap = sim.winTurn && pop10Turns.length > 0 
            ? (sim.winTurn - (pop10Turns.reduce((s, t) => s + t, 0) / pop10Turns.length)).toFixed(1)
            : 'N/A';
        console.log(`    Sim ${idx + 1} (seed ${sim.seed}): Victory ${sim.winTurn || 'None'}, ${pop10Turns.length} cities @ pop 10, gap ${gap} turns`);
    });
});

// Cross-map-size comparison
console.log(`\n\n${'='.repeat(70)}`);
console.log(`CROSS-MAP-SIZE COMPARISON`);
console.log(`${'='.repeat(70)}\n`);

console.log(`Map Size | Avg Victory Turn | Avg Pop 10 Turn | Gap | Cities @ Pop 10 | Total Cities`);
console.log(`---------|------------------|-----------------|-----|-----------------|-------------`);

MAP_ORDER.forEach(mapSize => {
    const sims = byMapSize.get(mapSize) || [];
    if (sims.length === 0) return;

    const allPop10Turns = [];
    const allWinTurns = [];
    const totalCities = [];

    sims.forEach(sim => {
        Object.values(sim.pop10Turns).forEach(t => allPop10Turns.push(parseInt(t)));
        if (sim.winTurn) allWinTurns.push(sim.winTurn);
        totalCities.push(sim.finalCities.length);
    });

    if (allWinTurns.length > 0 && allPop10Turns.length > 0) {
        const avgWin = (allWinTurns.reduce((s, t) => s + t, 0) / allWinTurns.length).toFixed(1);
        const avgPop10 = (allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length).toFixed(1);
        const gap = (parseFloat(avgWin) - parseFloat(avgPop10)).toFixed(1);
        const totalCitiesCount = totalCities.reduce((s, c) => s + c, 0);
        const pct = ((allPop10Turns.length / totalCitiesCount) * 100).toFixed(1);

        console.log(`${mapSize.padEnd(8)} | ${avgWin.padStart(16)} | ${avgPop10.padStart(15)} | ${gap.padStart(3)} | ${allPop10Turns.length.toString().padStart(15)} (${pct}%) | ${totalCitiesCount.toString().padStart(11)}`);
    } else {
        console.log(`${mapSize.padEnd(8)} | ${'N/A'.padStart(16)} | ${'N/A'.padStart(15)} | N/A | ${allPop10Turns.length.toString().padStart(15)} | ${totalCities.reduce((s, c) => s + c, 0).toString().padStart(11)}`);
    }
});

// Overall recommendation
console.log(`\n${'='.repeat(70)}`);
console.log(`OVERALL RECOMMENDATION`);
console.log(`${'='.repeat(70)}\n`);

const allPop10TurnsGlobal = [];
const allWinTurnsGlobal = [];
const allGaps = [];

MAP_ORDER.forEach(mapSize => {
    const sims = byMapSize.get(mapSize) || [];
    sims.forEach(sim => {
        const pop10Turns = Object.values(sim.pop10Turns).map(t => parseInt(t));
        pop10Turns.forEach(t => allPop10TurnsGlobal.push(t));
        if (sim.winTurn) {
            allWinTurnsGlobal.push(sim.winTurn);
            if (pop10Turns.length > 0) {
                const avgPop10 = pop10Turns.reduce((s, t) => s + t, 0) / pop10Turns.length;
                allGaps.push(sim.winTurn - avgPop10);
            }
        }
    });
});

if (allGaps.length > 0) {
    const avgGap = (allGaps.reduce((s, g) => s + g, 0) / allGaps.length).toFixed(1);
    const avgWin = (allWinTurnsGlobal.reduce((s, t) => s + t, 0) / allWinTurnsGlobal.length).toFixed(1);
    const avgPop10 = (allPop10TurnsGlobal.reduce((s, t) => s + t, 0) / allPop10TurnsGlobal.length).toFixed(1);

    console.log(`Across all map sizes:`);
    console.log(`  Average victory turn: ${avgWin}`);
    console.log(`  Average pop 10 turn: ${avgPop10}`);
    console.log(`  Average gap: ${avgGap} turns\n`);

    const gapNum = parseFloat(avgGap);
    if (Math.abs(gapNum) <= 5) {
        console.log(`✓ Growth timing is well-aligned with victory across all map sizes.`);
        console.log(`  Current gap of ${avgGap} turns is acceptable.`);
    } else if (gapNum > 10) {
        console.log(`⚠ Significant misalignment: Cities reach pop 10 ${avgGap} turns before victory.`);
        console.log(`  The recent growth cost increases appear to be working, but may need further adjustment.`);
    } else if (gapNum > 5) {
        console.log(`⚠ Moderate misalignment: Cities reach pop 10 ${avgGap} turns before victory.`);
        console.log(`  Consider additional minor adjustments to growth costs.`);
    } else {
        console.log(`⚠ Cities reach pop 10 ${Math.abs(gapNum).toFixed(1)} turns after victory.`);
        console.log(`  This may be acceptable, or consider slightly reducing growth costs.`);
    }
}

