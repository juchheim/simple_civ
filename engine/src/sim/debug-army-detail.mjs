import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

// Check army production vs formation vs death events
let armyProductions = 0;
let armyDeaths = 0;
let formationProjects = 0;

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
        if (e.type === "ProjectComplete" && e.project?.startsWith("FormArmy_")) {
            formationProjects++;
            armyEventDetails.push({
                sim: sim.seed,
                type: "Formation",
                project: e.project,
                turn: e.turn,
            });
        }
    });
});

console.log('Army Statistics:');
console.log('================');
console.log('Army Formation Projects completed:', formationProjects);
console.log('Army Unit Productions detected:', armyProductions);
console.log('Army Unit Deaths:', armyDeaths);
console.log();
console.log('Sample army production events:', armyEventDetails.filter(e => e.type === "Production").slice(0, 10));
console.log();
console.log('Sample formation events:', armyEventDetails.filter(e => e.type === "Formation").slice(0, 10));
console.log();

// The issue: When FormArmy project completes, it creates a new army unit
// but maybe the detection isn't catching it because it happens during
// a different phase or the unit appears later

// Check if there are formations without corresponding productions on same turn
const formationTurns = new Map();
data.forEach(sim => {
    sim.events.forEach(e => {
        if (e.type === "ProjectComplete" && e.project?.startsWith("FormArmy_")) {
            const key = sim.seed + "-" + e.turn;
            formationTurns.set(key, (formationTurns.get(key) || 0) + 1);
        }
    });
});

const productionTurns = new Map();
data.forEach(sim => {
    sim.events.forEach(e => {
        if (e.type === "UnitProduction" && e.unitType?.startsWith("Army")) {
            const key = sim.seed + "-" + e.turn;
            productionTurns.set(key, (productionTurns.get(key) || 0) + 1);
        }
    });
});

console.log('Formation events by turn:', formationTurns.size, 'unique sim-turn pairs');
console.log('Production events by turn:', productionTurns.size, 'unique sim-turn pairs');

