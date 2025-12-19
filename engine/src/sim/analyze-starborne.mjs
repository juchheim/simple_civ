import { readFileSync, writeFileSync } from 'fs';

const results = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

console.log(`\n${'='.repeat(80)}`);
console.log(`SCHOLAR KINGDOMS DEEP DIVE ANALYSIS`);
console.log(`${'='.repeat(80)}\n`);

const TARGET_CIV = "StarborneSeekers";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCivName(sim, playerId) {
    return sim.finalState?.civs.find(c => c.id === playerId)?.civName || playerId;
}

function getPlayerId(sim, civName) {
    return sim.finalState?.civs.find(c => c.civName === civName)?.id;
}

// ============================================================================
// EXTRACT SCHOLAR KINGDOMS DATA
// ============================================================================

const starborneData = [];

results.forEach(sim => {
    const starborneCiv = sim.finalState?.civs.find(c => c.civName === TARGET_CIV);
    if (!starborneCiv) return; // Starborne Seekers didn't participate in this game

    const starborneId = starborneCiv.id;

    // Find elimination event
    const eliminationEvent = sim.events.find(e =>
        e.type === "Elimination" && e.eliminated === starborneId
    );

    // Track all events involving Starborne Seekers
    const warsReceived = sim.events.filter(e =>
        e.type === "WarDeclaration" && e.target === starborneId
    );
    const warsInitiated = sim.events.filter(e =>
        e.type === "WarDeclaration" && e.initiator === starborneId
    );
    const citiesLost = sim.events.filter(e =>
        e.type === "CityCapture" && e.from === starborneId
    );
    const citiesCaptured = sim.events.filter(e =>
        e.type === "CityCapture" && e.to === starborneId
    );
    const citiesFounded = sim.events.filter(e =>
        e.type === "CityFound" && e.owner === starborneId
    );
    const techsResearched = sim.events.filter(e =>
        e.type === "TechComplete" && e.civ === starborneId
    );
    const projectsCompleted = sim.events.filter(e =>
        e.type === "ProjectComplete" && e.civ === starborneId
    );
    const buildingsBuilt = sim.events.filter(e =>
        e.type === "BuildingComplete" && e.owner === starborneId
    );
    const unitsDied = sim.events.filter(e =>
        e.type === "UnitDeath" && e.owner === starborneId
    );
    const unitsProduced = sim.events.filter(e =>
        e.type === "UnitProduction" && e.owner === starborneId
    );

    const gameData = {
        seed: sim.seed,
        mapSize: sim.mapSize,
        turnReached: sim.turnReached,
        isWinner: sim.winner?.id === starborneId,
        victoryType: sim.winner?.id === starborneId ? sim.victoryType : null,
        isEliminated: starborneCiv.isEliminated || !!eliminationEvent,
        eliminationTurn: eliminationEvent?.turn || null,
        eliminatedBy: eliminationEvent?.by ? getCivName(sim, eliminationEvent.by) : null,

        // Final state
        finalCities: starborneCiv.cities,
        finalPop: starborneCiv.totalPop,
        finalTechs: starborneCiv.techs,
        finalProjects: starborneCiv.projects,
        finalPower: starborneCiv.militaryPower,

        // Events timeline
        warsReceived: warsReceived.map(e => ({
            turn: e.turn,
            from: getCivName(sim, e.initiator),
            powerRatio: e.targetPower > 0 ? e.initiatorPower / e.targetPower : null
        })),
        warsInitiated: warsInitiated.map(e => ({
            turn: e.turn,
            target: getCivName(sim, e.target),
            powerRatio: e.targetPower > 0 ? e.initiatorPower / e.targetPower : null
        })),
        citiesLost: citiesLost.map(e => ({
            turn: e.turn,
            to: getCivName(sim, e.to)
        })),
        citiesCaptured: citiesCaptured.map(e => ({
            turn: e.turn,
            from: getCivName(sim, e.from)
        })),
        citiesFounded: citiesFounded.map(e => e.turn),
        techsResearched: techsResearched.map(e => ({ turn: e.turn, tech: e.tech })),
        projectsCompleted: projectsCompleted.map(e => ({ turn: e.turn, project: e.project })),
        buildingsBuilt: buildingsBuilt.map(e => ({ turn: e.turn, building: e.building })),
        unitsDied: unitsDied.map(e => ({ turn: e.turn, type: e.unitType, killedBy: getCivName(sim, e.killedBy) })),
        unitsProduced: unitsProduced.map(e => ({ turn: e.turn, type: e.unitType })),
    };

    starborneData.push(gameData);
});

console.log(`Starborne Seekers participated in ${starborneData.length} games\n`);

// ============================================================================
// GENERATE REPORT
// ============================================================================

let report = `# Starborne Seekers Deep Dive Analysis\n\n`;
report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
report += `**Games Analyzed:** ${starborneData.length}\n\n`;

// Overall Stats
const wins = starborneData.filter(d => d.isWinner);
const eliminations = starborneData.filter(d => d.isEliminated);
const survived = starborneData.filter(d => !d.isWinner && !d.isEliminated);

report += `## Summary\n\n`;
report += `| Metric | Value |\n`;
report += `|--------|-------|\n`;
report += `| Games Played | ${starborneData.length} |\n`;
report += `| **Wins** | ${wins.length} (${((wins.length / starborneData.length) * 100).toFixed(1)}%) |\n`;
report += `| **Eliminations** | ${eliminations.length} (${((eliminations.length / starborneData.length) * 100).toFixed(1)}%) |\n`;
report += `| Survived (no win/elim) | ${survived.length} |\n\n`;

// ============================================================================
// ELIMINATION DETAILS - THE MAIN FOCUS
// ============================================================================

report += `## Elimination Details\n\n`;
report += `> [!IMPORTANT]\n`;
report += `> This section tracks exactly when Starborne Seekers was eliminated and by whom.\n\n`;

if (eliminations.length > 0) {
    const avgElimTurn = eliminations.reduce((s, d) => s + (d.eliminationTurn || d.turnReached), 0) / eliminations.length;
    const elimTurns = eliminations.map(d => d.eliminationTurn || d.turnReached).sort((a, b) => a - b);

    report += `### Overall Elimination Statistics\n`;
    report += `- **Total Eliminations:** ${eliminations.length}\n`;
    report += `- **Average Elimination Turn:** ${avgElimTurn.toFixed(1)}\n`;
    report += `- **Earliest Elimination:** Turn ${elimTurns[0]}\n`;
    report += `- **Latest Elimination:** Turn ${elimTurns[elimTurns.length - 1]}\n`;
    report += `- **Median Elimination Turn:** ${elimTurns[Math.floor(elimTurns.length / 2)]}\n\n`;

    // Who eliminated them?
    const byEliminator = new Map();
    eliminations.forEach(d => {
        const eliminator = d.eliminatedBy || "Unknown";
        byEliminator.set(eliminator, (byEliminator.get(eliminator) || 0) + 1);
    });

    report += `### Eliminated By (Civ Breakdown)\n`;
    const sortedEliminators = Array.from(byEliminator.entries()).sort((a, b) => b[1] - a[1]);
    sortedEliminators.forEach(([civ, count]) => {
        report += `- **${civ}:** ${count} times (${((count / eliminations.length) * 100).toFixed(1)}%)\n`;
    });
    report += `\n`;

    // Detailed elimination timeline
    report += `### Elimination Log (All Games)\n\n`;
    report += `| Seed | Map | Turn | Eliminated By | Cities at Death | Techs | Was Attacked By |\n`;
    report += `|------|-----|------|---------------|-----------------|-------|------------------|\n`;

    eliminations.sort((a, b) => (a.eliminationTurn || a.turnReached) - (b.eliminationTurn || b.turnReached)).forEach(d => {
        const attackers = [...new Set(d.warsReceived.map(w => w.from))].join(", ") || "None";
        report += `| ${d.seed} | ${d.mapSize} | ${d.eliminationTurn || d.turnReached} | ${d.eliminatedBy || "Unknown"} | ${d.finalCities} | ${d.finalTechs} | ${attackers} |\n`;
    });
    report += `\n`;

    // By map size
    report += `### Elimination by Map Size\n`;
    const byMapSize = new Map();
    ["Tiny", "Small", "Standard", "Large", "Huge"].forEach(size => {
        const sizeElims = eliminations.filter(d => d.mapSize === size);
        if (sizeElims.length > 0) {
            const avgTurn = sizeElims.reduce((s, d) => s + (d.eliminationTurn || d.turnReached), 0) / sizeElims.length;
            report += `- **${size}:** ${sizeElims.length} eliminations (avg turn ${avgTurn.toFixed(1)})\n`;
        }
    });
    report += `\n`;
} else {
    report += `*No eliminations occurred.*\n\n`;
}

// ============================================================================
// VICTORY DETAILS
// ============================================================================

report += `## Victory Details\n\n`;
if (wins.length > 0) {
    const avgWinTurn = wins.reduce((s, d) => s + d.turnReached, 0) / wins.length;

    report += `### Victory Statistics\n`;
    report += `- **Total Wins:** ${wins.length}\n`;
    report += `- **Average Victory Turn:** ${avgWinTurn.toFixed(1)}\n`;
    report += `- **Victory Types:** Progress: ${wins.filter(d => d.victoryType === "Progress").length}, Conquest: ${wins.filter(d => d.victoryType === "Conquest").length}\n\n`;

    report += `### Victory Log\n\n`;
    report += `| Seed | Map | Victory Turn | Type | Final Cities | Final Pop |\n`;
    report += `|------|-----|--------------|------|--------------|----------|\n`;
    wins.forEach(d => {
        report += `| ${d.seed} | ${d.mapSize} | ${d.turnReached} | ${d.victoryType} | ${d.finalCities} | ${d.finalPop} |\n`;
    });
    report += `\n`;
} else {
    report += `*No victories recorded.*\n\n`;
}

// ============================================================================
// WAR ANALYSIS
// ============================================================================

report += `## Warfare Analysis\n\n`;

// Wars received
const allWarsReceived = starborneData.flatMap(d => d.warsReceived.map(w => ({ ...w, seed: d.seed, mapSize: d.mapSize })));
const attackerCounts = new Map();
allWarsReceived.forEach(w => {
    attackerCounts.set(w.from, (attackerCounts.get(w.from) || 0) + 1);
});

report += `### Wars Received (Attacked By)\n`;
report += `- **Total Wars Received:** ${allWarsReceived.length}\n`;
report += `- **Average Wars per Game:** ${(allWarsReceived.length / starborneData.length).toFixed(1)}\n\n`;

if (allWarsReceived.length > 0) {
    report += `**Most Frequent Attackers:**\n`;
    Array.from(attackerCounts.entries()).sort((a, b) => b[1] - a[1]).forEach(([civ, count]) => {
        report += `- **${civ}:** ${count} wars (${((count / allWarsReceived.length) * 100).toFixed(1)}%)\n`;
    });
    report += `\n`;

    // When are they attacked?
    const warTurns = allWarsReceived.map(w => w.turn);
    const avgWarTurn = warTurns.reduce((s, t) => s + t, 0) / warTurns.length;
    warTurns.sort((a, b) => a - b);

    report += `**War Timing:**\n`;
    report += `- Average first attack: Turn ${avgWarTurn.toFixed(1)}\n`;
    report += `- Earliest attack: Turn ${warTurns[0]}\n`;
    report += `- Latest attack: Turn ${warTurns[warTurns.length - 1]}\n\n`;
}

// ============================================================================
// CITY LOSS ANALYSIS
// ============================================================================

report += `## City Loss Analysis\n\n`;

const allCitiesLost = starborneData.flatMap(d => d.citiesLost.map(c => ({ ...c, seed: d.seed })));
const cityTakerCounts = new Map();
allCitiesLost.forEach(c => {
    cityTakerCounts.set(c.to, (cityTakerCounts.get(c.to) || 0) + 1);
});

report += `- **Total Cities Lost:** ${allCitiesLost.length}\n`;
report += `- **Average Cities Lost per Game:** ${(allCitiesLost.length / starborneData.length).toFixed(1)}\n\n`;

if (allCitiesLost.length > 0) {
    report += `**Cities Captured By:**\n`;
    Array.from(cityTakerCounts.entries()).sort((a, b) => b[1] - a[1]).forEach(([civ, count]) => {
        report += `- **${civ}:** ${count} cities\n`;
    });
    report += `\n`;
}

// ============================================================================
// TECH AND PROJECT PROGRESS
// ============================================================================

report += `## Technology & Project Progress\n\n`;

const avgFinalTechs = starborneData.reduce((s, d) => s + d.finalTechs, 0) / starborneData.length;
const avgFinalProjects = starborneData.reduce((s, d) => s + d.finalProjects, 0) / starborneData.length;

report += `- **Average Techs at Game End:** ${avgFinalTechs.toFixed(1)}\n`;
report += `- **Average Projects Completed:** ${avgFinalProjects.toFixed(1)}\n\n`;

// Progress chain completion
const observatoryCount = starborneData.filter(d => d.projectsCompleted.some(p => p.project === "Observatory")).length;
const academyCount = starborneData.filter(d => d.projectsCompleted.some(p => p.project === "GrandAcademy")).length;
const experimentCount = starborneData.filter(d => d.projectsCompleted.some(p => p.project === "GrandExperiment")).length;

report += `**Progress Chain Completion:**\n`;
report += `- Observatory: ${observatoryCount} games (${((observatoryCount / starborneData.length) * 100).toFixed(1)}%)\n`;
report += `- Grand Academy: ${academyCount} games (${((academyCount / starborneData.length) * 100).toFixed(1)}%)\n`;
report += `- Grand Experiment: ${experimentCount} games (${((experimentCount / starborneData.length) * 100).toFixed(1)}%)\n\n`;

// ============================================================================
// UNIT ANALYSIS
// ============================================================================

report += `## Unit Analysis\n\n`;

const allUnitsDied = starborneData.flatMap(d => d.unitsDied);
const allUnitsProduced = starborneData.flatMap(d => d.unitsProduced);

const deathsByType = new Map();
const productionByType = new Map();
const killerCounts = new Map();

allUnitsDied.forEach(u => {
    deathsByType.set(u.type, (deathsByType.get(u.type) || 0) + 1);
    if (u.killedBy) killerCounts.set(u.killedBy, (killerCounts.get(u.killedBy) || 0) + 1);
});
allUnitsProduced.forEach(u => {
    productionByType.set(u.type, (productionByType.get(u.type) || 0) + 1);
});

report += `- **Units Produced:** ${allUnitsProduced.length}\n`;
report += `- **Units Lost:** ${allUnitsDied.length}\n\n`;

if (allUnitsDied.length > 0) {
    report += `**Units Lost By Type:**\n`;
    Array.from(deathsByType.entries()).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        const produced = productionByType.get(type) || 0;
        report += `- ${type}: ${count} died (${produced} produced)\n`;
    });
    report += `\n`;

    report += `**Units Killed By (Civ):**\n`;
    Array.from(killerCounts.entries()).sort((a, b) => b[1] - a[1]).forEach(([civ, count]) => {
        report += `- **${civ}:** ${count} kills\n`;
    });
    report += `\n`;
}

// ============================================================================
// BUILDING ANALYSIS
// ============================================================================

report += `## Buildings Constructed\n\n`;

const allBuildings = starborneData.flatMap(d => d.buildingsBuilt);
const buildingCounts = new Map();
allBuildings.forEach(b => {
    buildingCounts.set(b.building, (buildingCounts.get(b.building) || 0) + 1);
});

if (allBuildings.length > 0) {
    Array.from(buildingCounts.entries()).sort((a, b) => b[1] - a[1]).forEach(([building, count]) => {
        const avgTurn = allBuildings.filter(b => b.building === building).reduce((s, b) => s + b.turn, 0) / count;
        report += `- **${building}:** ${count} built (avg turn ${avgTurn.toFixed(1)})\n`;
    });
} else {
    report += `*No buildings recorded.*\n`;
}
report += `\n`;

// ============================================================================
// GAME-BY-GAME DETAIL (for eliminated games)
// ============================================================================

report += `## Detailed Game Logs (Eliminated Games)\n\n`;

eliminations.slice(0, 10).forEach((d, idx) => {
    report += `### Game ${idx + 1}: Seed ${d.seed} (${d.mapSize})\n`;
    report += `- **Eliminated on Turn:** ${d.eliminationTurn || d.turnReached}\n`;
    report += `- **Eliminated By:** ${d.eliminatedBy || "Unknown"}\n`;
    report += `- **Final State:** ${d.finalCities} cities, ${d.finalPop} pop, ${d.finalTechs} techs, ${d.finalPower.toFixed(0)} power\n\n`;

    // Timeline of major events
    report += `**Event Timeline:**\n`;
    const timeline = [];
    d.citiesFounded.forEach(turn => timeline.push({ turn, event: "🏛️ City Founded" }));
    d.warsReceived.forEach(w => timeline.push({ turn: w.turn, event: `⚔️ War declared by ${w.from}` }));
    d.citiesLost.forEach(c => timeline.push({ turn: c.turn, event: `💀 City lost to ${c.to}` }));
    d.techsResearched.forEach(t => timeline.push({ turn: t.turn, event: `📚 Tech: ${t.tech}` }));

    timeline.sort((a, b) => a.turn - b.turn);
    timeline.slice(0, 20).forEach(e => {
        report += `- Turn ${e.turn}: ${e.event}\n`;
    });
    if (timeline.length > 20) report += `- ... (${timeline.length - 20} more events)\n`;
    report += `\n`;
});

// ============================================================================
// KEY INSIGHTS
// ============================================================================

report += `## Key Insights\n\n`;

if (eliminations.length > 0) {
    // Re-calculate sortedEliminators for this section
    const byEliminator = new Map();
    eliminations.forEach(d => {
        const eliminator = d.eliminatedBy || "Unknown";
        byEliminator.set(eliminator, (byEliminator.get(eliminator) || 0) + 1);
    });
    const sortedEliminators = Array.from(byEliminator.entries()).sort((a, b) => b[1] - a[1]);

    // Most dangerous opponent
    const topEliminator = sortedEliminators[0];
    report += `- **Most Dangerous Opponent:** ${topEliminator[0]} (eliminated Starborne Seekers ${topEliminator[1]} times)\n`;

    // Early vs late eliminations
    const earlyElims = eliminations.filter(d => (d.eliminationTurn || d.turnReached) < 100);
    const lateElims = eliminations.filter(d => (d.eliminationTurn || d.turnReached) >= 100);
    report += `- **Early Eliminations (before turn 100):** ${earlyElims.length}\n`;
    report += `- **Late Eliminations (turn 100+):** ${lateElims.length}\n`;

    // Correlation with wars received
    const avgWarsWhenElim = eliminations.reduce((s, d) => s + d.warsReceived.length, 0) / eliminations.length;
    const avgWarsWhenSurvive = survived.length > 0 ? survived.reduce((s, d) => s + d.warsReceived.length, 0) / survived.length : 0;
    report += `- **Avg Wars Received (eliminated games):** ${avgWarsWhenElim.toFixed(1)}\n`;
    report += `- **Avg Wars Received (survived games):** ${avgWarsWhenSurvive.toFixed(1)}\n`;
}

report += `\n---\n*Report generated ${new Date().toISOString()}*\n`;

writeFileSync('/tmp/starborne-seekers-analysis.md', report);
console.log("Starborne Seekers analysis complete!");
console.log(`Report written to /tmp/starborne-seekers-analysis.md`);
