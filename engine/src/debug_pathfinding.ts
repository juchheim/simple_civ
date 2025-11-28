import { generateWorld } from './map/map-generator.js';
import { findPath, getMovementCost } from './game/helpers/pathfinding.js';
import { TerrainType } from './core/types.js';
import { hexToString } from './core/hex.js';

const state = generateWorld({
    mapSize: 'Tiny',
    seed: 12345,
    players: [{ id: 'p1', civName: 'ForgeClans', color: '#ff0000' }]
});

const unit = state.units[0]; // Settler
const start = unit.coord;

// Find a target at distance 4
const targetTile = state.map.tiles.find(t => {
    const dist = Math.max(Math.abs(t.coord.q - start.q), Math.abs(t.coord.r - start.r), Math.abs(t.coord.q + t.coord.r - start.q - start.r));
    return dist === 4 && t.terrain === TerrainType.Plains;
});

if (!targetTile) {
    console.log("No target found");
    process.exit(1);
}

const target = targetTile.coord;

console.log(`Start: ${hexToString(start)}`);
console.log(`Target: ${hexToString(target)}`);

// Check cost of target
const cost = getMovementCost(targetTile, unit, state);
console.log(`Target Cost: ${cost}`);

// Find path
const path = findPath(start, target, unit, state);
console.log(`Path length: ${path.length}`);
console.log(`Path: ${path.map(hexToString).join(' -> ')}`);

if (path.length === 0) {
    console.error("Pathfinding failed!");
    process.exit(1);
} else {
    console.log("Pathfinding success!");
}
