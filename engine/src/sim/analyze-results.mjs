import { readFileSync } from 'fs';

const results = JSON.parse(readFileSync('/tmp/city-growth-results-clean.json', 'utf8'));

console.log(`\n=== CITY GROWTH ANALYSIS ===\n`);
console.log(`Simulations completed: ${results.length}\n`);

// Analyze each simulation
results.forEach((sim, idx) => {
    console.log(`\n--- Simulation ${idx + 1} (Seed: ${sim.seed}) ---`);
    console.log(`Turn reached: ${sim.turnReached}`);
    console.log(`Win turn: ${sim.winTurn || 'None (200 turn limit)'}`);
    console.log(`Winner: ${sim.winner ? sim.winner.civ : 'None'}`);
    console.log(`Total cities: ${sim.finalCities.length}`);
    console.log(`Cities reaching pop 10: ${Object.keys(sim.pop10Turns).length}`);
    
    // Analyze pop 10 timing
    const pop10Turns = Object.values(sim.pop10Turns).map(t => parseInt(t));
    if (pop10Turns.length > 0) {
        pop10Turns.sort((a, b) => a - b);
        const avg = pop10Turns.reduce((s, t) => s + t, 0) / pop10Turns.length;
        const median = pop10Turns[Math.floor(pop10Turns.length / 2)];
        const first = pop10Turns[0];
        const last = pop10Turns[pop10Turns.length - 1];
        
        console.log(`\nPop 10 Analysis:`);
        console.log(`  First city to reach pop 10: Turn ${first}`);
        console.log(`  Last city to reach pop 10: Turn ${last}`);
        console.log(`  Average turn to reach pop 10: ${avg.toFixed(1)}`);
        console.log(`  Median turn to reach pop 10: ${median}`);
        console.log(`  All pop 10 turns: [${pop10Turns.join(', ')}]`);
        
        if (sim.winTurn) {
            const diff = sim.winTurn - avg;
            console.log(`\n  Victory vs Pop 10 timing:`);
            console.log(`    Victory turn: ${sim.winTurn}`);
            console.log(`    Avg pop 10 turn: ${avg.toFixed(1)}`);
            console.log(`    Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} turns`);
        }
    } else {
        console.log(`\nNo cities reached pop 10 in this simulation.`);
    }
    
    // Analyze city growth over time
    const cityGrowthByTurn = new Map();
    sim.cityGrowthHistory.forEach(snapshot => {
        const key = `${snapshot.cityId}_${snapshot.turn}`;
        if (!cityGrowthByTurn.has(snapshot.turn)) {
            cityGrowthByTurn.set(snapshot.turn, []);
        }
        cityGrowthByTurn.get(snapshot.turn).push(snapshot);
    });
    
    // Find when cities reach key population milestones
    const milestones = [3, 5, 7, 10];
    const milestoneTurns = new Map();
    milestones.forEach(milestone => {
        milestoneTurns.set(milestone, []);
    });
    
    sim.cityGrowthHistory.forEach(snapshot => {
        milestones.forEach(milestone => {
            if (snapshot.pop >= milestone) {
                const existing = milestoneTurns.get(milestone).find(e => e.cityId === snapshot.cityId);
                if (!existing) {
                    milestoneTurns.get(milestone).push({
                        cityId: snapshot.cityId,
                        turn: snapshot.turn,
                        ownerId: snapshot.ownerId
                    });
                }
            }
        });
    });
    
    console.log(`\nCity Growth Milestones:`);
    milestones.forEach(milestone => {
        const turns = milestoneTurns.get(milestone).map(e => e.turn).sort((a, b) => a - b);
        if (turns.length > 0) {
            const avg = turns.reduce((s, t) => s + t, 0) / turns.length;
            console.log(`  Pop ${milestone}: ${turns.length} cities, avg turn ${avg.toFixed(1)}, range [${turns[0]}, ${turns[turns.length - 1]}]`);
        }
    });
});

// Aggregate analysis across all simulations
console.log(`\n\n=== AGGREGATE ANALYSIS ACROSS ALL SIMULATIONS ===\n`);

const allPop10Turns = [];
const allWinTurns = [];
const allVictoryTypes = [];

results.forEach(sim => {
    Object.values(sim.pop10Turns).forEach(turn => {
        allPop10Turns.push(parseInt(turn));
    });
    if (sim.winTurn) {
        allWinTurns.push(sim.winTurn);
        allVictoryTypes.push(sim.victoryType);
    }
});

if (allPop10Turns.length > 0) {
    allPop10Turns.sort((a, b) => a - b);
    const avgPop10 = allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length;
    const medianPop10 = allPop10Turns[Math.floor(allPop10Turns.length / 2)];
    
    console.log(`Pop 10 Statistics (${allPop10Turns.length} cities across all sims):`);
    console.log(`  First: Turn ${allPop10Turns[0]}`);
    console.log(`  Last: Turn ${allPop10Turns[allPop10Turns.length - 1]}`);
    console.log(`  Average: Turn ${avgPop10.toFixed(1)}`);
    console.log(`  Median: Turn ${medianPop10}`);
    console.log(`  Distribution: ${JSON.stringify(allPop10Turns)}`);
}

if (allWinTurns.length > 0) {
    allWinTurns.sort((a, b) => a - b);
    const avgWin = allWinTurns.reduce((s, t) => s + t, 0) / allWinTurns.length;
    const medianWin = allWinTurns[Math.floor(allWinTurns.length / 2)];
    
    console.log(`\nVictory Statistics (${allWinTurns.length} victories):`);
    console.log(`  Average victory turn: ${avgWin.toFixed(1)}`);
    console.log(`  Median victory turn: ${medianWin}`);
    console.log(`  Victory types: ${allVictoryTypes.join(', ')}`);
    
    if (allPop10Turns.length > 0) {
        const avgPop10 = allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length;
        const diff = avgWin - avgPop10;
        console.log(`\n  Victory vs Pop 10 Alignment:`);
        console.log(`    Avg victory turn: ${avgWin.toFixed(1)}`);
        console.log(`    Avg pop 10 turn: ${avgPop10.toFixed(1)}`);
        console.log(`    Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} turns`);
        console.log(`    Recommendation: ${diff > 10 ? 'Speed up growth significantly' : diff > 5 ? 'Speed up growth moderately' : diff > -5 ? 'Growth is well-aligned' : 'Consider slowing growth slightly'}`);
    }
} else {
    console.log(`\nNo victories achieved in any simulation (all hit 200 turn limit).`);
    if (allPop10Turns.length > 0) {
        const avgPop10 = allPop10Turns.reduce((s, t) => s + t, 0) / allPop10Turns.length;
        console.log(`\n  Average pop 10 turn: ${avgPop10.toFixed(1)}`);
        console.log(`  Recommendation: Cities reach pop 10 well before turn limit. Consider speeding up growth to align with expected victory timing.`);
    }
}

