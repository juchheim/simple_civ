import { readFileSync } from 'fs';

const results = JSON.parse(readFileSync('/tmp/city-growth-results-clean.json', 'utf8'));

console.log(`\n=== EXHAUSTIVE CITY GROWTH ANALYSIS ===\n`);
console.log(`Analyzing ${results.length} simulations with 6 civs each on Huge maps\n`);

// Detailed per-simulation analysis
results.forEach((sim, idx) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`SIMULATION ${idx + 1} - Seed: ${sim.seed}`);
    console.log(`${'='.repeat(70)}`);
    
    console.log(`\nGame Outcome:`);
    console.log(`  Final Turn: ${sim.turnReached}`);
    console.log(`  Victory Turn: ${sim.winTurn || 'None (200 turn limit)'}`);
    console.log(`  Winner: ${sim.winner ? `${sim.winner.civ} (${sim.winner.id})` : 'None'}`);
    console.log(`  Total Cities: ${sim.finalCities.length}`);
    
    // Group cities by owner
    const citiesByOwner = new Map();
    sim.finalCities.forEach(city => {
        if (!citiesByOwner.has(city.ownerId)) {
            citiesByOwner.set(city.ownerId, []);
        }
        citiesByOwner.get(city.ownerId).push(city);
    });
    
    console.log(`\nCities by Civilization:`);
    citiesByOwner.forEach((cities, ownerId) => {
        const totalPop = cities.reduce((sum, c) => sum + c.finalPop, 0);
        const avgPop = (totalPop / cities.length).toFixed(1);
        const maxPop = Math.max(...cities.map(c => c.finalPop));
        console.log(`  ${ownerId}: ${cities.length} cities, total pop ${totalPop}, avg ${avgPop}, max ${maxPop}`);
    });
    
    // Analyze pop 10 achievement
    const pop10Cities = Object.keys(sim.pop10Turns);
    console.log(`\nCities Reaching Pop 10: ${pop10Cities.length} of ${sim.finalCities.length} (${((pop10Cities.length / sim.finalCities.length) * 100).toFixed(1)}%)`);
    
    if (pop10Cities.length > 0) {
        const pop10Turns = pop10Cities.map(cid => parseInt(sim.pop10Turns[cid])).sort((a, b) => a - b);
        const avgPop10 = pop10Turns.reduce((s, t) => s + t, 0) / pop10Turns.length;
        const medianPop10 = pop10Turns[Math.floor(pop10Turns.length / 2)];
        
        console.log(`  First: Turn ${pop10Turns[0]}`);
        console.log(`  Last: Turn ${pop10Turns[pop10Turns.length - 1]}`);
        console.log(`  Average: Turn ${avgPop10.toFixed(1)}`);
        console.log(`  Median: Turn ${medianPop10}`);
        console.log(`  All turns: [${pop10Turns.join(', ')}]`);
        
        // Calculate growth rate to pop 10
        const growthRates = [];
        pop10Cities.forEach(cityId => {
            const pop10Turn = parseInt(sim.pop10Turns[cityId]);
            const cityHistory = sim.cityGrowthHistory.filter(h => h.cityId === cityId && h.turn <= pop10Turn);
            if (cityHistory.length > 0) {
                const firstTurn = Math.min(...cityHistory.map(h => h.turn));
                const turnsToPop10 = pop10Turn - firstTurn;
                if (turnsToPop10 > 0) {
                    growthRates.push(10 / turnsToPop10); // pop per turn
                }
            }
        });
        
        if (growthRates.length > 0) {
            const avgRate = growthRates.reduce((s, r) => s + r, 0) / growthRates.length;
            console.log(`  Average growth rate to pop 10: ${avgRate.toFixed(3)} pop/turn`);
        }
        
        if (sim.winTurn) {
            const gap = sim.winTurn - avgPop10;
            console.log(`\n  Timing vs Victory:`);
            console.log(`    Victory: Turn ${sim.winTurn}`);
            console.log(`    Avg Pop 10: Turn ${avgPop10.toFixed(1)}`);
            console.log(`    Gap: ${gap > 0 ? '+' : ''}${gap.toFixed(1)} turns (${gap > 0 ? 'victory after' : 'victory before'} pop 10)`);
        }
    } else {
        console.log(`  No cities reached pop 10 in this simulation.`);
        if (sim.winTurn) {
            console.log(`  Victory occurred at turn ${sim.winTurn} without any city reaching pop 10.`);
        }
    }
    
    // Analyze growth milestones for all cities
    const milestones = [3, 5, 7, 10];
    const milestoneData = new Map();
    milestones.forEach(m => milestoneData.set(m, { turns: [], cities: new Set() }));
    
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
    
    console.log(`\nGrowth Milestones (all cities):`);
    milestones.forEach(milestone => {
        const data = milestoneData.get(milestone);
        if (data.turns.length > 0) {
            data.turns.sort((a, b) => a - b);
            const avg = data.turns.reduce((s, t) => s + t, 0) / data.turns.length;
            const pct = ((data.cities.size / sim.finalCities.length) * 100).toFixed(1);
            console.log(`  Pop ${milestone}: ${data.cities.size} cities (${pct}%), avg turn ${avg.toFixed(1)}, range [${data.turns[0]}, ${data.turns[data.turns.length - 1]}]`);
        }
    });
    
    // Analyze growth trajectory
    const growthByTurn = new Map();
    sim.cityGrowthHistory.forEach(snapshot => {
        if (!growthByTurn.has(snapshot.turn)) {
            growthByTurn.set(snapshot.turn, { totalPop: 0, cityCount: 0, pop10Count: 0 });
        }
        const stats = growthByTurn.get(snapshot.turn);
        stats.totalPop += snapshot.pop;
        stats.cityCount++;
        if (snapshot.pop >= 10) stats.pop10Count++;
    });
    
    // Find key growth points
    const turns = Array.from(growthByTurn.keys()).sort((a, b) => a - b);
    const keyTurns = [25, 50, 75, 100, 125, 150, 175, 200].filter(t => t <= sim.turnReached);
    if (keyTurns.length > 0) {
        console.log(`\nGrowth Trajectory (key turns):`);
        keyTurns.forEach(targetTurn => {
            // Find closest actual turn
            const actualTurn = turns.reduce((closest, t) => 
                Math.abs(t - targetTurn) < Math.abs(closest - targetTurn) ? t : closest
            );
            const stats = growthByTurn.get(actualTurn);
            if (stats) {
                const avgPop = (stats.totalPop / stats.cityCount).toFixed(1);
                console.log(`  Turn ${actualTurn}: ${stats.cityCount} cities, avg pop ${avgPop}, ${stats.pop10Count} at pop 10+`);
            }
        });
    }
});

// Aggregate analysis
console.log(`\n\n${'='.repeat(70)}`);
console.log(`AGGREGATE ANALYSIS ACROSS ALL 5 SIMULATIONS`);
console.log(`${'='.repeat(70)}\n`);

const allPop10Turns = [];
const allWinTurns = [];
const allVictoryTypes = [];
const perSimPop10Counts = [];
const perSimGaps = [];

results.forEach(sim => {
    const pop10Turns = Object.values(sim.pop10Turns).map(t => parseInt(t));
    pop10Turns.forEach(t => allPop10Turns.push(t));
    perSimPop10Counts.push(pop10Turns.length);
    
    if (sim.winTurn) {
        allWinTurns.push(sim.winTurn);
        allVictoryTypes.push(sim.victoryType || 'Unknown');
        
        if (pop10Turns.length > 0) {
            const avgPop10 = pop10Turns.reduce((s, t) => s + t, 0) / pop10Turns.length;
            perSimGaps.push(sim.winTurn - avgPop10);
        }
    }
});

console.log(`Pop 10 Achievement:`);
console.log(`  Total cities reaching pop 10: ${allPop10Turns.length}`);
console.log(`  Per simulation: ${perSimPop10Counts.join(', ')} (avg ${(perSimPop10Counts.reduce((s, c) => s + c, 0) / perSimPop10Counts.length).toFixed(1)})`);

if (allPop10Turns.length > 0) {
    allPop10Turns.sort((a, b) => a - b);
    const avgPop10 = allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length;
    const medianPop10 = allPop10Turns[Math.floor(allPop10Turns.length / 2)];
    const q1Pop10 = allPop10Turns[Math.floor(allPop10Turns.length * 0.25)];
    const q3Pop10 = allPop10Turns[Math.floor(allPop10Turns.length * 0.75)];
    
    console.log(`\n  Timing Statistics:`);
    console.log(`    First: Turn ${allPop10Turns[0]}`);
    console.log(`    Q1 (25th percentile): Turn ${q1Pop10}`);
    console.log(`    Median: Turn ${medianPop10}`);
    console.log(`    Q3 (75th percentile): Turn ${q3Pop10}`);
    console.log(`    Last: Turn ${allPop10Turns[allPop10Turns.length - 1]}`);
    console.log(`    Average: Turn ${avgPop10.toFixed(1)}`);
    console.log(`    Standard deviation: ${Math.sqrt(allPop10Turns.reduce((s, t) => s + Math.pow(t - avgPop10, 2), 0) / allPop10Turns.length).toFixed(1)}`);
}

console.log(`\nVictory Statistics:`);
if (allWinTurns.length > 0) {
    allWinTurns.sort((a, b) => a - b);
    const avgWin = allWinTurns.reduce((s, t) => s + t, 0) / allWinTurns.length;
    const medianWin = allWinTurns[Math.floor(allWinTurns.length / 2)];
    
    console.log(`  Victories: ${allWinTurns.length} of ${results.length} simulations`);
    console.log(`  Average victory turn: ${avgWin.toFixed(1)}`);
    console.log(`  Median victory turn: ${medianWin}`);
    console.log(`  Range: [${allWinTurns[0]}, ${allWinTurns[allWinTurns.length - 1]}]`);
    console.log(`  Victory types: ${allVictoryTypes.join(', ')}`);
    
    if (allPop10Turns.length > 0) {
        const avgPop10 = allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length;
        const gap = avgWin - avgPop10;
        const avgGap = perSimGaps.length > 0 ? perSimGaps.reduce((s, g) => s + g, 0) / perSimGaps.length : gap;
        
        console.log(`\n  Alignment Analysis:`);
        console.log(`    Average victory turn: ${avgWin.toFixed(1)}`);
        console.log(`    Average pop 10 turn: ${avgPop10.toFixed(1)}`);
        console.log(`    Average gap: ${avgGap.toFixed(1)} turns`);
        console.log(`    Per-simulation gaps: [${perSimGaps.map(g => g.toFixed(1)).join(', ')}]`);
        
        // Calculate how much faster growth needs to be
        const targetGap = 0; // We want pop 10 to align with victory
        const currentGap = avgGap;
        const speedupNeeded = currentGap > 0 ? (currentGap / avgPop10) * 100 : 0;
        
        console.log(`\n  Growth Adjustment Recommendation:`);
        if (Math.abs(currentGap) <= 5) {
            console.log(`    ✓ Growth is well-aligned with victory timing.`);
            console.log(`    Current gap: ${currentGap.toFixed(1)} turns (within acceptable range)`);
        } else if (currentGap > 10) {
            console.log(`    ⚠ Significant misalignment: Cities reach pop 10 ${currentGap.toFixed(1)} turns before victory.`);
            console.log(`    Recommendation: Speed up city growth by approximately ${speedupNeeded.toFixed(1)}%`);
            console.log(`    This would bring average pop 10 turn from ${avgPop10.toFixed(1)} to approximately ${(avgPop10 - currentGap).toFixed(1)}`);
            console.log(`    Methods: Reduce growth costs, increase food yields, or adjust growth formula`);
        } else if (currentGap > 5) {
            console.log(`    ⚠ Moderate misalignment: Cities reach pop 10 ${currentGap.toFixed(1)} turns before victory.`);
            console.log(`    Recommendation: Speed up city growth by approximately ${speedupNeeded.toFixed(1)}%`);
            console.log(`    This would better align pop 10 achievement with victory timing`);
        } else {
            console.log(`    ⚠ Cities reach pop 10 ${Math.abs(currentGap).toFixed(1)} turns after victory.`);
            console.log(`    Recommendation: Consider slightly slowing growth or this may be acceptable`);
        }
    }
} else {
    console.log(`  No victories achieved (all simulations hit 200 turn limit)`);
    if (allPop10Turns.length > 0) {
        const avgPop10 = allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length;
        console.log(`\n  Note: Average pop 10 turn is ${avgPop10.toFixed(1)}, well before turn limit.`);
        console.log(`  This suggests games are ending early, possibly due to conquest victories.`);
    }
}

// Additional insights
console.log(`\n${'='.repeat(70)}`);
console.log(`KEY INSIGHTS`);
console.log(`${'='.repeat(70)}\n`);

if (allPop10Turns.length > 0 && allWinTurns.length > 0) {
    const avgPop10 = allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length;
    const avgWin = allWinTurns.reduce((s, t) => s + t, 0) / allWinTurns.length;
    const gap = avgWin - avgPop10;
    
    console.log(`1. Timing Gap: Cities reach pop 10 an average of ${gap.toFixed(1)} turns before victory.`);
    console.log(`   - This suggests growth could be accelerated to better align with game end.`);
    
    const earlyWins = allWinTurns.filter(t => t < 130).length;
    const midWins = allWinTurns.filter(t => t >= 130 && t < 150).length;
    const lateWins = allWinTurns.filter(t => t >= 150).length;
    
    console.log(`\n2. Victory Timing Distribution:`);
    console.log(`   - Early victories (<130 turns): ${earlyWins}`);
    console.log(`   - Mid-game victories (130-149): ${midWins}`);
    console.log(`   - Late victories (≥150 turns): ${lateWins}`);
    
    const earlyPop10 = allPop10Turns.filter(t => t < 120).length;
    const midPop10 = allPop10Turns.filter(t => t >= 120 && t < 150).length;
    const latePop10 = allPop10Turns.filter(t => t >= 150).length;
    
    console.log(`\n3. Pop 10 Timing Distribution:`);
    console.log(`   - Early (<120 turns): ${earlyPop10} cities`);
    console.log(`   - Mid-game (120-149): ${midPop10} cities`);
    console.log(`   - Late (≥150 turns): ${latePop10} cities`);
    
    console.log(`\n4. Recommendation Summary:`);
    if (gap > 10) {
        const speedup = (gap / avgPop10) * 100;
        console.log(`   - Speed up growth by ~${speedup.toFixed(0)}% to align pop 10 with victory`);
        console.log(`   - This could be achieved by:`);
        console.log(`     * Reducing growth costs by ~${speedup.toFixed(0)}%`);
        console.log(`     * Increasing base food yields`);
        console.log(`     * Adjusting growth formula multipliers`);
        console.log(`   - Target: Bring average pop 10 turn from ${avgPop10.toFixed(1)} to ~${avgWin.toFixed(1)}`);
    } else if (gap > 5) {
        const speedup = (gap / avgPop10) * 100;
        console.log(`   - Moderate speedup of ~${speedup.toFixed(0)}% recommended`);
        console.log(`   - Target: Reduce gap from ${gap.toFixed(1)} to <5 turns`);
    } else {
        console.log(`   - Growth timing is well-aligned with victory`);
        console.log(`   - Current gap of ${gap.toFixed(1)} turns is acceptable`);
    }
}

