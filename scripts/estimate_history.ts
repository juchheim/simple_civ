
interface HexCoord { q: number; r: number; }

const MAP_SIZES = {
    Tiny: { width: 40, height: 40 }, // ~1600 tiles
    Small: { width: 60, height: 60 }, // ~3600 tiles
    Standard: { width: 80, height: 80 }, // ~6400 tiles
    Large: { width: 100, height: 100 }, // ~10000 tiles
    Huge: { width: 120, height: 120 }, // ~14400 tiles
};

const TURNS = 500; // Long game

// Simulation
function simulateHistorySize(mapType: keyof typeof MAP_SIZES) {
    const { width, height } = MAP_SIZES[mapType];
    const totalTiles = width * height;

    // Stats per turn: 
    // { turn: 123, playerId: "p1", stats: { science: 100, production: 50, military: 2000, territory: 45, score: 500 } }
    // A simplified object structure.
    const statEntrySize = JSON.stringify({
        t: 123, p: "p1", s: { s: 1000, p: 500, m: 2000, t: 45, sc: 500 }
    }).length;
    // Note: In memory objects are larger than JSON string, usually 2-4x for V8 hidden classes etc.
    // But we are interested in serialization size (save file) and rough heap impact.

    // Fog History (Delta)
    // Worst case: player explores entire map over 500 turns.
    // Average tiles revealed per turn = totalTiles / 500 approx, or bursty.
    // Let's assume we store list of coords: { q: 12, r: 34 }

    // Naive coord storage
    const coordSize = JSON.stringify({ q: 123, r: 123 }).length;

    const totalFogSize = totalTiles * coordSize;
    const totalStatsSize = TURNS * statEntrySize;

    // Events: 
    // Say ~5 events per turn average (combat, buildings, etc)? Maybe high for per-turn involved events.
    // Let's say 1 big event every 5 turns.
    const eventSize = JSON.stringify({ t: 123, type: "CityCaptured", p: "p1", d: { c: "CityName", x: 1, y: 1 } }).length;
    const totalEventsSize = (TURNS / 5) * eventSize;

    const totalSizeBytes = totalFogSize + totalStatsSize + totalEventsSize;

    console.log(`\nMap: ${mapType} (${totalTiles} tiles)`);
    console.log(`- Fog History (Deltas): ${(totalFogSize / 1024).toFixed(2)} KB`);
    console.log(`- Stats History (${TURNS} turns): ${(totalStatsSize / 1024).toFixed(2)} KB`);
    console.log(`- Events History: ${(totalEventsSize / 1024).toFixed(2)} KB`);
    console.log(`Total Est. JSON Size: ${(totalSizeBytes / 1024).toFixed(2)} KB`);
    console.log(`Est. RAM Runtime (~4x JSON): ${(totalSizeBytes * 4 / 1024).toFixed(2)} KB`);
}

simulateHistorySize("Standard");
simulateHistorySize("Huge");
