import { HexCoord } from "./engine/src/core/types.js";
import { hexNeighbor, hexToString } from "./engine/src/core/hex.js";

// Mock HEX_CORNER_OFFSETS logic to confirm corner positions
const HEX_SIZE = 75;
const HEX_CORNER_OFFSETS = Array.from({ length: 6 }, (_v, i) => {
    const angleDeg = 60 * i - 30;
    return { i, angleDeg };
});

console.log("Corner Angles:", HEX_CORNER_OFFSETS);

// Directions from hex.ts
const DIRECTIONS = [
    { q: 1, r: 0 },  // 0: East
    { q: 1, r: -1 }, // 1: NE
    { q: 0, r: -1 }, // 2: NW
    { q: -1, r: 0 }, // 3: West
    { q: -1, r: 1 }, // 4: SW
    { q: 0, r: 1 },  // 5: SE
];

// Expected mapping based on geometry analysis:
// Edge 0->1 (NE->SE) is East (Dir 0)
// Edge 1->2 (SE->S) is SE (Dir 5)
// Edge 2->3 (S->SW) is SW (Dir 4)
// Edge 3->4 (SW->NW) is West (Dir 3)
// Edge 4->5 (NW->N) is NW (Dir 2)
// Edge 5->0 (N->NE) is NE (Dir 1)

const expectedMapping = [0, 5, 4, 3, 2, 1];

console.log("Verifying mapping logic:");
for (let i = 0; i < 6; i++) {
    const calculatedDir = (6 - i) % 6;
    const expected = expectedMapping[i];
    const status = calculatedDir === expected ? "PASS" : "FAIL";
    console.log(`Corner ${i} -> ${i + 1}: Calculated Dir ${calculatedDir}, Expected ${expected} -> ${status}`);
}
