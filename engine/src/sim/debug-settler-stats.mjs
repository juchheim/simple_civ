import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('/tmp/comprehensive-simulation-results.json', 'utf8'));

const CIVS = ['ForgeClans', 'ScholarKingdoms', 'RiverLeague', 'AetherianVanguard', 'StarborneSeekers', 'JadeCovenant'];

// Track stats properly
const stats = {};
CIVS.forEach(c => stats[c] = { produced: 0, deaths: 0, founded: 0, gamesPlayed: 0 });

data.forEach(sim => {
    const civMap = new Map();
    sim.finalState?.civs?.forEach(c => civMap.set(c.id, c.civName));
    
    // Track which games each civ played
    civMap.forEach((civName, id) => {
        if (stats[civName]) stats[civName].gamesPlayed++;
    });
    
    sim.events.forEach(e => {
        const civName = civMap.get(e.owner);
        if (!civName || !stats[civName]) return;
        
        if (e.type === 'UnitProduction' && e.unitType === 'Settler') {
            stats[civName].produced++;
        }
        if (e.type === 'CityFound') {
            stats[civName].founded++;
        }
        if (e.type === 'UnitDeath' && e.unitType === 'Settler') {
            stats[civName].deaths++;
        }
    });
});

console.log('Current Issue Analysis:');
console.log('=======================');
CIVS.forEach(c => {
    const s = stats[c];
    if (s.gamesPlayed > 0) {
        const startingSettlers = s.gamesPlayed * 2;
        const totalAvailable = s.produced + startingSettlers;
        const currentDeathRate = s.produced > 0 ? ((s.deaths / s.produced) * 100).toFixed(1) : 'N/A';
        
        console.log();
        console.log(`${c}:`);
        console.log(`  Games played: ${s.gamesPlayed}`);
        console.log(`  Starting settlers: ${startingSettlers}`);
        console.log(`  Settlers produced: ${s.produced}`);
        console.log(`  Total settlers available: ${totalAvailable}`);
        console.log(`  Cities founded: ${s.founded}`);
        console.log(`  Settler "deaths" logged: ${s.deaths}`);
        console.log(`  Current rate (deaths/produced): ${currentDeathRate}%`);
        console.log(`  PROBLEM: Deaths(${s.deaths}) = foundings(${s.founded}) + actual deaths(${s.deaths - s.founded})`);
    }
});

console.log('\n\nROOT CAUSE IDENTIFIED:');
console.log('1. UnitDeath events are logged when settlers FOUND CITIES (settler unit removed)');
console.log('2. UnitProduction does NOT count the 2 starting settlers per civ');
console.log('3. This causes deaths > productions when civs found many cities');

