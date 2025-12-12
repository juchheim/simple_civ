import { readFileSync, writeFileSync } from 'fs';

const results = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

console.log(`\n${'='.repeat(80)}`);
console.log(`AETHERIAN VANGUARD ANALYSIS`);
console.log(`${'='.repeat(80)}\n`);
console.log(`Total Simulations: ${results.length}`);

// ============================================================================
// ANALYSIS
// ============================================================================

const aetherianData = [];

results.forEach(sim => {
    const aetherianCiv = sim.finalState?.civs.find(c => c.civName === "AetherianVanguard");
    if (!aetherianCiv) return;

    const aetherianPlayerId = aetherianCiv.id;

    aetherianData.push({
        seed: sim.seed,
        mapSize: sim.mapSize,
        turnReached: sim.turnReached,
        isWinner: sim.winner?.civ === "AetherianVanguard",
        victoryType: sim.victoryType,
        isEliminated: aetherianCiv.isEliminated,
        scavengerDoctrineStats: aetherianCiv.scavengerDoctrineStats || { kills: 0, scienceGained: 0 },
        titanStats: aetherianCiv.titanStats || { kills: 0, cityCaptures: 0, deathballCaptures: 0 },
        finalCities: aetherianCiv.cities,
        finalPop: aetherianCiv.totalPop,
        finalPower: aetherianCiv.militaryPower,
        finalTechs: aetherianCiv.techs,
    });
});

// ============================================================================
// GENERATE REPORT
// ============================================================================

let report = `# AetherianVanguard Analysis Report\n\n`;
report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
report += `**Simulations Analyzed:** ${aetherianData.length}\n\n`;

// Overall Stats
const totalGames = aetherianData.length;
const wins = aetherianData.filter(d => d.isWinner).length;
const conquestWins = aetherianData.filter(d => d.isWinner && d.victoryType === "Conquest").length;
const progressWins = aetherianData.filter(d => d.isWinner && d.victoryType === "Progress").length;
const eliminations = aetherianData.filter(d => d.isEliminated).length;

report += `## Summary\n`;
report += `- **Win Rate:** ${((wins / totalGames) * 100).toFixed(1)}% (${wins}/${totalGames})\n`;
report += `  - Conquest: ${conquestWins} | Progress: ${progressWins}\n`;
report += `- **Elimination Rate:** ${((eliminations / totalGames) * 100).toFixed(1)}%\n\n`;

// Scavenger Doctrine Stats
report += `## Scavenger Doctrine (Science from Kills)\n`;
const totalScavengerKills = aetherianData.reduce((s, d) => s + d.scavengerDoctrineStats.kills, 0);
const totalScienceGained = aetherianData.reduce((s, d) => s + d.scavengerDoctrineStats.scienceGained, 0);

report += `- **Total Kills:** ${totalScavengerKills}\n`;
report += `- **Total Science Gained:** ${totalScienceGained}\n`;
report += `- **Average Kills per Game:** ${(totalScavengerKills / totalGames).toFixed(1)}\n`;
report += `- **Average Science per Game:** ${(totalScienceGained / totalGames).toFixed(1)}\n`;
if (totalScavengerKills > 0) {
    report += `- **Science per Kill:** ${(totalScienceGained / totalScavengerKills).toFixed(1)}\n`;
}
report += `\n`;

// Per-game breakdown
report += `### Per-Game Scavenger Doctrine Stats\n`;
report += `| Seed | Map Size | Kills | Science | Winner |\n`;
report += `|------|----------|-------|---------|--------|\n`;
aetherianData.forEach(d => {
    const winStatus = d.isWinner ? "✅" : (d.isEliminated ? "❌" : "−");
    report += `| ${d.seed} | ${d.mapSize} | ${d.scavengerDoctrineStats.kills} | ${d.scavengerDoctrineStats.scienceGained} | ${winStatus} |\n`;
});
report += `\n`;

// Titan Stats
report += `## Titan Performance\n`;
const totalTitanKills = aetherianData.reduce((s, d) => s + d.titanStats.kills, 0);
const totalTitanCaptures = aetherianData.reduce((s, d) => s + d.titanStats.cityCaptures, 0);
const totalDeathballCaptures = aetherianData.reduce((s, d) => s + (d.titanStats.deathballCaptures || 0), 0);
const gamesWithTitan = aetherianData.filter(d => d.titanStats.kills > 0 || d.titanStats.cityCaptures > 0).length;

report += `- **Games with Titan Activity:** ${gamesWithTitan}/${totalGames}\n`;
report += `- **Total Titan Kills:** ${totalTitanKills}\n`;
report += `- **Total Titan City Captures:** ${totalTitanCaptures}\n`;
report += `- **Total Deathball Captures:** ${totalDeathballCaptures}\n`;
report += `- **Average Kills per Game:** ${(totalTitanKills / totalGames).toFixed(1)}\n`;
report += `- **Average City Captures per Game:** ${(totalTitanCaptures / totalGames).toFixed(1)}\n`;
report += `- **Average Deathball Captures per Game:** ${(totalDeathballCaptures / totalGames).toFixed(1)}\n`;
if (gamesWithTitan > 0) {
    report += `- **Avg Kills per Game (Titan spawned):** ${(totalTitanKills / gamesWithTitan).toFixed(1)}\n`;
    report += `- **Avg Captures per Game (Titan spawned):** ${(totalTitanCaptures / gamesWithTitan).toFixed(1)}\n`;
    report += `- **Avg Deathball Captures (Titan spawned):** ${(totalDeathballCaptures / gamesWithTitan).toFixed(1)}\n`;
}
report += `\n`;

// Per-game breakdown
report += `### Per-Game Titan Stats\n`;
report += `| Seed | Map Size | Kills | T-Cap | D-Cap | Winner |\n`;
report += `|------|----------|-------|-------|-------|--------|\n`;
aetherianData.forEach(d => {
    const winStatus = d.isWinner ? "✅" : (d.isEliminated ? "❌" : "−");
    const titanActive = d.titanStats.kills > 0 || d.titanStats.cityCaptures > 0 ? "" : "(no titan)";
    const deathballCaps = d.titanStats.deathballCaptures || 0;
    report += `| ${d.seed} | ${d.mapSize} | ${d.titanStats.kills}${titanActive} | ${d.titanStats.cityCaptures} | ${deathballCaps} | ${winStatus} |\n`;
});
report += `\n`;

// Correlation analysis
report += `## Correlation Analysis\n`;
const winningGames = aetherianData.filter(d => d.isWinner);
const losingGames = aetherianData.filter(d => !d.isWinner && !d.isEliminated);
const eliminatedGames = aetherianData.filter(d => d.isEliminated);

if (winningGames.length > 0) {
    const avgKillsWhen_Win = winningGames.reduce((s, d) => s + d.scavengerDoctrineStats.kills, 0) / winningGames.length;
    const avgScienceWhen_Win = winningGames.reduce((s, d) => s + d.scavengerDoctrineStats.scienceGained, 0) / winningGames.length;
    const avgTitanKillsWhen_Win = winningGames.reduce((s, d) => s + d.titanStats.kills, 0) / winningGames.length;
    const avgTitanCapturesWhen_Win = winningGames.reduce((s, d) => s + d.titanStats.cityCaptures, 0) / winningGames.length;
    const avgDeathballCapturesWhen_Win = winningGames.reduce((s, d) => s + (d.titanStats.deathballCaptures || 0), 0) / winningGames.length;

    report += `### When AetherianVanguard WINS (${winningGames.length} games)\n`;
    report += `- Avg Scavenger Kills: ${avgKillsWhen_Win.toFixed(1)}\n`;
    report += `- Avg Scavenger Science: ${avgScienceWhen_Win.toFixed(1)}\n`;
    report += `- Avg Titan Kills: ${avgTitanKillsWhen_Win.toFixed(1)}\n`;
    report += `- Avg Titan Captures: ${avgTitanCapturesWhen_Win.toFixed(1)}\n`;
    report += `- Avg Deathball Captures: ${avgDeathballCapturesWhen_Win.toFixed(1)}\n\n`;
}

if (eliminatedGames.length > 0) {
    const avgKillsWhen_Elim = eliminatedGames.reduce((s, d) => s + d.scavengerDoctrineStats.kills, 0) / eliminatedGames.length;
    const avgScienceWhen_Elim = eliminatedGames.reduce((s, d) => s + d.scavengerDoctrineStats.scienceGained, 0) / eliminatedGames.length;
    const avgTitanKillsWhen_Elim = eliminatedGames.reduce((s, d) => s + d.titanStats.kills, 0) / eliminatedGames.length;
    const avgTitanCapturesWhen_Elim = eliminatedGames.reduce((s, d) => s + d.titanStats.cityCaptures, 0) / eliminatedGames.length;
    const avgDeathballCapturesWhen_Elim = eliminatedGames.reduce((s, d) => s + (d.titanStats.deathballCaptures || 0), 0) / eliminatedGames.length;

    report += `### When AetherianVanguard is ELIMINATED (${eliminatedGames.length} games)\n`;
    report += `- Avg Scavenger Kills: ${avgKillsWhen_Elim.toFixed(1)}\n`;
    report += `- Avg Scavenger Science: ${avgScienceWhen_Elim.toFixed(1)}\n`;
    report += `- Avg Titan Kills: ${avgTitanKillsWhen_Elim.toFixed(1)}\n`;
    report += `- Avg Titan Captures: ${avgTitanCapturesWhen_Elim.toFixed(1)}\n`;
    report += `- Avg Deathball Captures: ${avgDeathballCapturesWhen_Elim.toFixed(1)}\n\n`;
}

writeFileSync('/tmp/aetherian-analysis-report.md', report);
console.log(`\nAnalysis complete!`);
console.log(`Report written to /tmp/aetherian-analysis-report.md`);
console.log(`\nSummary:`);
console.log(`- Win Rate: ${((wins / totalGames) * 100).toFixed(1)}%`);
console.log(`- Total Scavenger Kills: ${totalScavengerKills}, Science: ${totalScienceGained}`);
console.log(`- Total Titan Kills: ${totalTitanKills}, Captures: ${totalTitanCaptures}`);
