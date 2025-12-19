import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

// Check army production and death events
let armyProductions = 0;
let armyDeaths = 0;

const armyEventDetails = [];

data.forEach(sim => {
    sim.events.forEach(e => {
        if (e.type === "UnitProduction" && e.unitType?.startsWith("Army")) {
            armyProductions++;
            armyEventDetails.push({
                sim: sim.seed,
                type: "Production",
                unitType: e.unitType,
                turn: e.turn,
            });
        }
        if (e.type === "UnitDeath" && e.unitType?.startsWith("Army")) {
            armyDeaths++;
        }
    });
});

console.log('Army Statistics:');
console.log('================');
console.log('Army Unit Productions detected:', armyProductions);
console.log('Army Unit Deaths:', armyDeaths);
console.log('Survival Rate:', armyProductions > 0 ? (((armyProductions - armyDeaths) / armyProductions) * 100).toFixed(1) + '%' : 'N/A');
console.log();
console.log('Sample army production events:', armyEventDetails.slice(0, 10));
console.log();

// Group by unit type
const byType = new Map();
armyEventDetails.forEach(e => {
    byType.set(e.unitType, (byType.get(e.unitType) || 0) + 1);
});

console.log('Army unit productions by type:');
byType.forEach((count, type) => {
    console.log(`  ${type}: ${count}`);
});
