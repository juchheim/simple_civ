import { readFileSync, writeFileSync } from 'fs';

// Configuration
const RESULTS_FILE = '/tmp/comprehensive-simulation-results.json';
const OUTPUT_FILE = '/tmp/tech-path-analysis-report.md';

// All techs in roughly research order
const ALL_TECHS = [
    // Hearth Era
    "ScriptLore", "FormationTraining", "Fieldcraft", "StoneworkHalls",
    // Banner Era
    "Wellworks", "DrilledRanks", "ScholarCourts", "CityWards",
    // Engine Era
    "ArmyDoctrine", "SignalRelay", "TimberMills", "UrbanPlans", "SteamForges", "StarCharts",
    // Aether Era
    "CompositeArmor", "PlasmaShields", "ZeroPointEnergy", "Aerodynamics", "DimensionalGate", "TrailMaps"
];

// Load Results
let results;
try {
    results = JSON.parse(readFileSync(RESULTS_FILE, 'utf8'));
} catch (e) {
    console.error(`Failed to load results from ${RESULTS_FILE}:`, e);
    process.exit(1);
}

console.log(`Analyzing tech paths for ${results.length} simulations...`);

// Data structures
const stats = {
    totalSims: results.length,
    // civName -> { techId -> { count, avgTurn, turns[] } }
    techPathsByCiv: {},
    // civName -> { sequence -> count } (tracks common tech sequences)
    techSequencesByCiv: {},
    // civName -> { first 5 techs -> count }
    earlyPathsByCiv: {},
    // Tech order correlation with victory
    techOrderWins: {}, // civName -> { techId -> { asFirst: wins, asSecond: wins, ...} }
};

// Initialize civ tracking
const CIVS = ["ForgeClans", "ScholarKingdoms", "RiverLeague", "AetherianVanguard", "StarborneSeekers", "JadeCovenant"];
CIVS.forEach(civ => {
    stats.techPathsByCiv[civ] = {};
    stats.techSequencesByCiv[civ] = {};
    stats.earlyPathsByCiv[civ] = {};
    stats.techOrderWins[civ] = {};
    ALL_TECHS.forEach(tech => {
        stats.techPathsByCiv[civ][tech] = { count: 0, avgTurn: 0, turns: [] };
        stats.techOrderWins[civ][tech] = {};
    });
});

results.forEach(sim => {
    // Track techs by civ for this sim
    const civTechEvents = {}; // civName -> [{tech, turn}]

    sim.events.forEach(e => {
        if (e.type === "TechComplete") {
            const civName = sim.finalState?.civs.find(c => c.id === e.civ)?.civName;
            if (civName && CIVS.includes(civName)) {
                if (!civTechEvents[civName]) civTechEvents[civName] = [];
                civTechEvents[civName].push({ tech: e.tech, turn: e.turn });

                // Update stats
                const techStats = stats.techPathsByCiv[civName][e.tech];
                if (techStats) {
                    techStats.count++;
                    techStats.turns.push(e.turn);
                }
            }
        }
    });

    // Process tech sequences for each civ
    Object.entries(civTechEvents).forEach(([civName, techs]) => {
        // Sort by turn
        techs.sort((a, b) => a.turn - b.turn);

        // Get early path (first 5 techs)
        const earlyPath = techs.slice(0, 5).map(t => t.tech).join(" → ");
        if (earlyPath) {
            stats.earlyPathsByCiv[civName][earlyPath] = (stats.earlyPathsByCiv[civName][earlyPath] || 0) + 1;
        }

        // Track tech order position for victory correlation
        const isWinner = sim.winner?.civ === civName;
        techs.forEach((t, idx) => {
            const pos = idx + 1;
            if (!stats.techOrderWins[civName][t.tech][pos]) {
                stats.techOrderWins[civName][t.tech][pos] = { total: 0, wins: 0 };
            }
            stats.techOrderWins[civName][t.tech][pos].total++;
            if (isWinner) {
                stats.techOrderWins[civName][t.tech][pos].wins++;
            }
        });
    });
});

// Calculate averages
Object.values(stats.techPathsByCiv).forEach(civTechs => {
    Object.values(civTechs).forEach(techStats => {
        if (techStats.turns.length > 0) {
            techStats.avgTurn = Math.round(techStats.turns.reduce((a, b) => a + b, 0) / techStats.turns.length);
        }
    });
});

// Generate Report
let report = `# Tech Path Analysis Report\n\n`;
report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
report += `**Simulations Analyzed:** ${stats.totalSims}\n\n`;

report += `---\n\n`;
report += `## Tech Research Timing by Civilization\n\n`;
report += `Shows when each civ typically researches each tech.\n\n`;

CIVS.forEach(civ => {
    report += `### ${civ}\n\n`;
    report += `| Tech | Times Researched | Avg Turn |\n`;
    report += `|------|-----------------|----------|\n`;

    // Sort techs by average turn
    const sortedTechs = Object.entries(stats.techPathsByCiv[civ])
        .filter(([_, data]) => data.count > 0)
        .sort((a, b) => a[1].avgTurn - b[1].avgTurn);

    sortedTechs.forEach(([tech, data]) => {
        report += `| ${tech} | ${data.count} | ${data.avgTurn} |\n`;
    });
    report += `\n`;
});

report += `---\n\n`;
report += `## Common Early Tech Paths (First 5 Techs)\n\n`;
report += `Shows the most common early research sequences for each civ.\n\n`;

CIVS.forEach(civ => {
    report += `### ${civ}\n\n`;

    const sortedPaths = Object.entries(stats.earlyPathsByCiv[civ])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedPaths.length === 0) {
        report += `*No data*\n\n`;
    } else {
        sortedPaths.forEach(([path, count], idx) => {
            report += `${idx + 1}. **${path}** (${count} games)\n`;
        });
        report += `\n`;
    }
});

report += `---\n\n`;
report += `## Key Tech Research Order Analysis\n\n`;
report += `Shows which position in the research order correlates with wins for key techs.\n\n`;

const KEY_TECHS = ["StarCharts", "PlasmaShields", "CompositeArmor", "SignalRelay", "CityWards"];

CIVS.forEach(civ => {
    report += `### ${civ}\n\n`;
    report += `| Tech | Best Position for Wins | Win Rate at Best |\n`;
    report += `|------|----------------------|------------------|\n`;

    KEY_TECHS.forEach(tech => {
        const positions = stats.techOrderWins[civ][tech];
        if (!positions) return;

        let bestPos = 0;
        let bestWinRate = 0;
        Object.entries(positions).forEach(([pos, data]) => {
            if (data.total >= 3) { // Minimum sample size
                const winRate = data.wins / data.total;
                if (winRate > bestWinRate) {
                    bestWinRate = winRate;
                    bestPos = parseInt(pos);
                }
            }
        });

        if (bestPos > 0) {
            report += `| ${tech} | #${bestPos} | ${(bestWinRate * 100).toFixed(1)}% |\n`;
        }
    });
    report += `\n`;
});

report += `---\n\n`;
report += `## Hybrid Victory Tech Adoption\n\n`;
report += `Tracks whether Conquest civs are researching StarCharts (hybrid path).\n\n`;

const CONQUEST_CIVS = ["ForgeClans", "AetherianVanguard", "JadeCovenant"];
report += `| Civ | StarCharts Researched | Avg Turn | SignalRelay Researched | Avg Turn |\n`;
report += `|-----|----------------------|----------|----------------------|----------|\n`;

CONQUEST_CIVS.forEach(civ => {
    const starCharts = stats.techPathsByCiv[civ]["StarCharts"];
    const signalRelay = stats.techPathsByCiv[civ]["SignalRelay"];
    report += `| ${civ} | ${starCharts.count} | ${starCharts.avgTurn || 'N/A'} | ${signalRelay.count} | ${signalRelay.avgTurn || 'N/A'} |\n`;
});

report += `\n`;

writeFileSync(OUTPUT_FILE, report);
console.log(`Report saved to ${OUTPUT_FILE}`);
