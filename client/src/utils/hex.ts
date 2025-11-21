import { HexCoord } from "./engine-types";

export const DIRECTIONS: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
];

export function addHex(a: HexCoord, b: HexCoord): HexCoord {
    return { q: a.q + b.q, r: a.r + b.r };
}

export function scaleHex(a: HexCoord, k: number): HexCoord {
    return { q: a.q * k, r: a.r * k };
}

export function hexNeighbor(hex: HexCoord, direction: number): HexCoord {
    return addHex(hex, DIRECTIONS[direction % 6]);
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function getNeighbors(hex: HexCoord): HexCoord[] {
    return DIRECTIONS.map((d) => addHex(hex, d));
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
    return a.q === b.q && a.r === b.r;
}

export function hexToString(hex: HexCoord): string {
    return `${hex.q},${hex.r}`;
}

export function stringToHex(s: string): HexCoord {
    const [q, r] = s.split(",").map(Number);
    return { q, r };
}

// Axial to Cube conversion for some algorithms if needed
export function axialToCube(hex: HexCoord): { x: number; y: number; z: number } {
    const x = hex.q;
    const z = hex.r;
    const y = -x - z;
    return { x, y, z };
}

export function cubeToAxial(cube: { x: number; y: number; z: number }): HexCoord {
    return { q: cube.x, r: cube.z };
}

export function hexRing(center: HexCoord, radius: number): HexCoord[] {
    const results: HexCoord[] = [];
    let hex = addHex(center, scaleHex(DIRECTIONS[4], radius));
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < radius; j++) {
            results.push(hex);
            hex = hexNeighbor(hex, i);
        }
    }
    return results;
}

export function hexSpiral(center: HexCoord, radius: number): HexCoord[] {
    const results: HexCoord[] = [center];
    for (let k = 1; k <= radius; k++) {
        results.push(...hexRing(center, k));
    }
    return results;
}

// --- Line/LoS helpers ---

function cubeRound(cube: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    let rx = Math.round(cube.x);
    let ry = Math.round(cube.y);
    let rz = Math.round(cube.z);

    const xDiff = Math.abs(rx - cube.x);
    const yDiff = Math.abs(ry - cube.y);
    const zDiff = Math.abs(rz - cube.z);

    if (xDiff > yDiff && xDiff > zDiff) {
        rx = -ry - rz;
    } else if (yDiff > zDiff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }

    return { x: rx, y: ry, z: rz };
}

export function hexLine(a: HexCoord, b: HexCoord): HexCoord[] {
    const aCube = axialToCube(a);
    const bCube = axialToCube(b);
    const dist = hexDistance(a, b);
    const results: HexCoord[] = [];
    for (let i = 0; i <= dist; i++) {
        const t = dist === 0 ? 0 : i / dist;
        const lerp = { x: aCube.x + (bCube.x - aCube.x) * t, y: aCube.y + (bCube.y - aCube.y) * t, z: aCube.z + (bCube.z - aCube.z) * t };
        results.push(cubeToAxial(cubeRound(lerp)));
    }
    return results;
}
