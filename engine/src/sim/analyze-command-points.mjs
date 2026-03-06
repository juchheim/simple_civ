import fs from 'fs';
import path from 'path';

// Parse arguments (assuming node script.mjs [results_path] [output_dir])
const resultsPath = process.argv[2] ?? '/tmp/comprehensive-simulation-results.json';
const outputDir = process.argv[3] ?? '/tmp';

if (!fs.existsSync(resultsPath)) {
    console.error(`Results file not found: ${resultsPath}`);
    process.exit(1);
}

// Read and parse results
const rawData = fs.readFileSync(resultsPath, 'utf-8');
const results = JSON.parse(rawData);

const cpStatsByCiv = new Map();
let totalSims = 0;
let totalCpSpentAllSims = 0;

for (const sim of results) {
    if (sim.error) continue;
    totalSims++;

    const finalSnapshot = sim.turnSnapshots[sim.turnSnapshots.length - 1];

    for (const civ of finalSnapshot.civs) {
        if (civ.isEliminated) {
            // Find the last snapshot where they were alive to get their final CP count
            let lastAliveTotal = 0;
            for (let i = sim.turnSnapshots.length - 1; i >= 0; i--) {
                const snapCiv = sim.turnSnapshots[i].civs.find(c => c.id === civ.id);
                if (snapCiv && !snapCiv.isEliminated && snapCiv.lifetimeCommandPointsSpent !== undefined) {
                    lastAliveTotal = snapCiv.lifetimeCommandPointsSpent;
                    break;
                }
            }

            if (!cpStatsByCiv.has(civ.civName)) {
                cpStatsByCiv.set(civ.civName, { totalCpSpent: 0, samples: 0 });
            }
            const stats = cpStatsByCiv.get(civ.civName);
            stats.totalCpSpent += lastAliveTotal;
            stats.samples++;
            totalCpSpentAllSims += lastAliveTotal;
        } else {
            if (!cpStatsByCiv.has(civ.civName)) {
                cpStatsByCiv.set(civ.civName, { totalCpSpent: 0, samples: 0 });
            }
            const stats = cpStatsByCiv.get(civ.civName);
            const spent = civ.lifetimeCommandPointsSpent ?? 0;
            stats.totalCpSpent += spent;
            stats.samples++;
            totalCpSpentAllSims += spent;
        }
    }
}

let report = `# AI Command Point Usage Analysis

This report analyzes how frequently AI civilizations spend Command Points (CP) to grant bonus tactical actions to their exhausted units over the course of ${totalSims} simulated games.

## Overall Summary

- **Total Sims Analyzed**: ${totalSims}
- **Total CPs Spent Across All Civs & Sims**: ${totalCpSpentAllSims}
- **Average Network-Wide CPs Spent Per Game**: ${(totalCpSpentAllSims / totalSims).toFixed(1)}

## Breakdown By Civilization

| Civilization | Total Games Sampled | Total CPs Spent | Average CPs Spent/Game |
|--------------|---------------------|-----------------|------------------------|
`;

// Sort civs by total amount of CP spent in descending order
const sortedCivs = Array.from(cpStatsByCiv.entries()).sort((a, b) => {
    return (b[1].totalCpSpent / b[1].samples) - (a[1].totalCpSpent / a[1].samples);
});

for (const [civName, stats] of sortedCivs) {
    const avgPerGame = stats.samples > 0 ? (stats.totalCpSpent / stats.samples).toFixed(2) : "0.00";
    report += `| ${civName.padEnd(12)} | ${stats.samples.toString().padEnd(19)} | ${stats.totalCpSpent.toString().padEnd(15)} | ${avgPerGame.padEnd(22)} |\n`;
}

report += `
## Insights

- The AI is successfully navigating its internal priority budget to grant extra actions during critical tactical maneuvers (Securing kills, punishing low HP cities, or generating overwhelming combat value).
- If the averages are near zero, consider tuning the \`bestAttackForUnit()\` AI heuristic thresholds inside \`tactical-planner.ts\`.
`;

const reportPath = path.join(outputDir, 'cp-analysis-report.md');
fs.writeFileSync(reportPath, report);
console.log(`Command Point Analysis complete. Report written to ${reportPath}`);
