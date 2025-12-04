
import { generateWorld } from "./engine/src/map/map-generator";
import { OverlayType, TerrainType } from "./engine/src/core/types";
import { hexEquals, getNeighbors, hexToString } from "./engine/src/core/hex";

function testRiverAdjacency() {
    const settings = {
        mapSize: "Small" as const,
        players: [{ id: "p1", civName: "CivA", color: "red" }],
        seed: 12345
    };

    const state = generateWorld(settings);
    const map = state.map;

    console.log(`Generated map with ${map.rivers?.length} river edges.`);

    let asymmetryCount = 0;

    // Helper to check if a tile has the overlay
    const hasRiverOverlay = (coord) => {
        const t = map.tiles.find(tile => hexEquals(tile.coord, coord));
        return t?.overlays.includes(OverlayType.RiverEdge);
    };

    // We need to check if the river logic in rivers-polylines.ts implies adjacency
    // But we don't have access to the internal polylines here easily unless we reconstruct them
    // However, we can check for the specific symptom:
    // A tile that is NOT in the river path (not marked) but shares an edge with a river segment?

    // Actually, map.rivers contains {a, b}.
    // If map.rivers defines the edges, then BOTH a and b MUST have the overlay.
    // Let's check that first.

    if (map.rivers) {
        for (const edge of map.rivers) {
            const tileA = map.tiles.find(t => hexEquals(t.coord, edge.a));
            const tileB = map.tiles.find(t => hexEquals(t.coord, edge.b));

            if (!tileA || !tileB) continue;

            // Filter out Coast and Mountain (as per map-generator isLand)
            if (tileA.terrain === TerrainType.Coast || tileB.terrain === TerrainType.Coast) continue;
            if (tileA.terrain === TerrainType.Mountain || tileB.terrain === TerrainType.Mountain) continue;

            const hasOverlayA = tileA.overlays.includes(OverlayType.RiverEdge);
            const hasOverlayB = tileB.overlays.includes(OverlayType.RiverEdge);

            if (hasOverlayA !== hasOverlayB) {
                console.log(`Asymmetry found at edge ${JSON.stringify(edge)}:`);
                console.log(`  Tile A (${tileA.terrain}): ${hasOverlayA}`);
                console.log(`  Tile B (${tileB.terrain}): ${hasOverlayB}`);
                asymmetryCount++;
            } else if (!hasOverlayA && !hasOverlayB) {
                console.log(`Neither side has overlay at edge ${JSON.stringify(edge)}`);
                asymmetryCount++;
            }
        }
    }

    if (asymmetryCount > 0) {
        console.log(`FAIL: Found ${asymmetryCount} asymmetric inland river edges.`);
        process.exit(1);
    } else {
        console.log("PASS: All inland river edges have symmetric overlays.");
    }
}

testRiverAdjacency();
