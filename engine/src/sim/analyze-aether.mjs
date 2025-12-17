import { readFileSync, writeFileSync } from 'fs';

// Configuration
const RESULTS_FILE = '/tmp/comprehensive-simulation-results.json';
const OUTPUT_FILE = '/tmp/aether-analysis-report.md';

const AETHER_TECHS = [
    "Aerodynamics",
    "ZeroPointEnergy",
    "CompositeArmor",
    "DimensionalGate"
];

const AETHER_UNITS = [
    "Airship",
    "Landship"
];

const AETHER_BUILDINGS = [
    "AetherReactor"
];

// Load Results
let results;
try {
    results = JSON.parse(readFileSync(RESULTS_FILE, 'utf8'));
} catch (e) {
    console.error(`Failed to load results from ${RESULTS_FILE}:`, e);
    process.exit(1);
}

console.log(`Analyzing Aether Era stats for ${results.length} simulations...`);

// Data structures
const stats = {
    totalSims: results.length,
    techsResearched: {}, // techId -> count
    unitsProduced: {}, // unitId -> count
    buildingsBuilt: {}, // buildingId -> count
    techsByCiv: {}, // civName -> { techId -> count }
    unitsByCiv: {}, // civName -> { unitId -> count }
    gamesReachingAether: 0,
    victoriesWithAether: 0,
    victoryCorrelations: {
        techs: {}, // techId -> { total: 0, wins: 0 }
        units: {}, // unitId -> { total: 0, wins: 0 }
    }
};

// Initialize counters
AETHER_TECHS.forEach(t => {
    stats.techsResearched[t] = 0;
    stats.victoryCorrelations.techs[t] = { total: 0, wins: 0 };
});
AETHER_UNITS.forEach(u => {
    stats.unitsProduced[u] = 0;
    stats.victoryCorrelations.units[u] = { total: 0, wins: 0 };
});
AETHER_BUILDINGS.forEach(b => stats.buildingsBuilt[b] = 0);

results.forEach(sim => {
    const civsInAether = new Set();
    const civsWithTechs = new Map(); // civName -> Set<TechId>
    const civsWithUnits = new Map(); // civName -> Set<UnitType>

    // Process Events
    sim.events.forEach(e => {
        const civName = sim.finalState?.civs.find(c => c.id === (e.civ || e.owner))?.civName;

        if (e.type === "TechComplete") {
            if (AETHER_TECHS.includes(e.tech)) {
                stats.techsResearched[e.tech]++;
                civsInAether.add(civName);

                if (civName) {
                    if (!stats.techsByCiv[civName]) stats.techsByCiv[civName] = {};
                    stats.techsByCiv[civName][e.tech] = (stats.techsByCiv[civName][e.tech] || 0) + 1;

                    if (!civsWithTechs.has(civName)) civsWithTechs.set(civName, new Set());
                    civsWithTechs.get(civName).add(e.tech);
                }
            }
        }

        if (e.type === "UnitProduction") {
            if (AETHER_UNITS.includes(e.unitType)) {
                stats.unitsProduced[e.unitType]++;

                if (civName) {
                    if (!stats.unitsByCiv[civName]) stats.unitsByCiv[civName] = {};
                    stats.unitsByCiv[civName][e.unitType] = (stats.unitsByCiv[civName][e.unitType] || 0) + 1;

                    if (!civsWithUnits.has(civName)) civsWithUnits.set(civName, new Set());
                    civsWithUnits.get(civName).add(e.unitType);
                }
            }
        }

        if (e.type === "BuildingComplete") {
            if (AETHER_BUILDINGS.includes(e.building)) {
                stats.buildingsBuilt[e.building]++;
            }
        }
    });

    if (civsInAether.size > 0) stats.gamesReachingAether++;

    // Victory Correlation
    if (sim.winner) {
        const winnerCiv = sim.winner.civ;

        // Did winner have Aether techs?
        const winnerTechs = civsWithTechs.get(winnerCiv);
        if (winnerTechs) {
            stats.victoriesWithAether++;
            winnerTechs.forEach(t => {
                stats.victoryCorrelations.techs[t].wins++;
            });
        }

        // Did winner have Aether units?
        const winnerUnits = civsWithUnits.get(winnerCiv);
        if (winnerUnits) {
            winnerUnits.forEach(u => {
                stats.victoryCorrelations.units[u].wins++;
            });
        }
    }

    // Update Totals for Correlation (Civs that HAD the thing, win or lose)
    civsWithTechs.forEach((techs, civ) => {
        techs.forEach(t => stats.victoryCorrelations.techs[t].total++);
    });
    civsWithUnits.forEach((units, civ) => {
        units.forEach(u => stats.victoryCorrelations.units[u].total++);
    });
});

// Generate Report
let report = `# Aether Era Analysis Report\n\n`;
report += `**Simulations Reaching Aether Era:** ${stats.gamesReachingAether} / ${stats.totalSims} (${((stats.gamesReachingAether / stats.totalSims) * 100).toFixed(1)}%)\n`;
report += `**Victories by Civs with Aether Techs:** ${stats.victoriesWithAether}\n\n`;

report += `## Technology Adoption\n`;
AETHER_TECHS.forEach(t => {
    const count = stats.techsResearched[t];
    const correlation = stats.victoryCorrelations.techs[t];
    const winRate = correlation.total > 0 ? ((correlation.wins / correlation.total) * 100).toFixed(1) : "0.0";
    report += `- **${t}**: Researched ${count} times. (Win Rate when researched: ${winRate}%)\n`;
});
report += `\n`;

report += `## Unit Production\n`;
AETHER_UNITS.forEach(u => {
    const count = stats.unitsProduced[u];
    const correlation = stats.victoryCorrelations.units[u];
    const winRate = correlation.total > 0 ? ((correlation.wins / correlation.total) * 100).toFixed(1) : "0.0";
    report += `- **${u}**: Produced ${count} times. (Win Rate when produced: ${winRate}%)\n`;
});
report += `\n`;

report += `## Building Construction\n`;
AETHER_BUILDINGS.forEach(b => {
    report += `- **${b}**: Built ${stats.buildingsBuilt[b]} times.\n`;
});
report += `\n`;

report += `## Breakdown by Civilization\n`;
Object.keys(stats.techsByCiv).forEach(civ => {
    report += `### ${civ}\n`;
    const techCounts = stats.techsByCiv[civ];
    const unitCounts = stats.unitsByCiv[civ] || {};

    report += `**Techs:**\n`;
    Object.entries(techCounts).forEach(([t, c]) => report += `- ${t}: ${c}\n`);

    if (Object.keys(unitCounts).length > 0) {
        report += `**Units:**\n`;
        Object.entries(unitCounts).forEach(([u, c]) => report += `- ${u}: ${c}\n`);
    } else {
        report += `**Units:** None\n`;
    }
    report += `\n`;
});

writeFileSync(OUTPUT_FILE, report);
console.log(`Report saved to ${OUTPUT_FILE}`);
