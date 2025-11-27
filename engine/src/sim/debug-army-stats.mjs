import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

// Check all unit types that have "Army" in them
const armyUnitTypes = new Set();
const allUnitTypes = new Map();

data.forEach(sim => {
    sim.events.forEach(e => {
        if (e.type === "UnitDeath" || e.type === "UnitProduction") {
            allUnitTypes.set(e.unitType, (allUnitTypes.get(e.unitType) || 0) + 1);
            if (e.unitType?.includes("Army")) {
                armyUnitTypes.add(e.unitType);
            }
        }
    });
});

console.log('All unit types with counts:');
Array.from(allUnitTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });

console.log('\nArmy unit types found:', Array.from(armyUnitTypes));

// Check army formations vs deaths
let formations = 0;
let armyDeaths = 0;

data.forEach(sim => {
    sim.events.forEach(e => {
        if (e.type === "ProjectComplete" && e.project?.startsWith("FormArmy_")) {
            formations++;
        }
        if (e.type === "UnitDeath" && e.unitType?.startsWith("Army")) {
            armyDeaths++;
        }
    });
});

console.log('\nArmy Formations (projects):', formations);
console.log('Army Deaths:', armyDeaths);

