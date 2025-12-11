/**
 * Seeded 2D Perlin noise implementation for procedural map generation.
 * Self-contained with no external dependencies.
 */

import { WorldRng } from "./seeding.js";

// Permutation table size (must be power of 2)
const TABLE_SIZE = 256;
const TABLE_MASK = TABLE_SIZE - 1;

/**
 * Creates a seeded 2D Perlin noise function.
 * @param seed - Random seed for reproducible noise
 * @returns Function that takes (x, y) and returns noise value in range [-1, 1]
 */
export function createNoise2D(seed: number): (x: number, y: number) => number {
    const rng = new WorldRng(seed);

    // Generate shuffled permutation table
    const perm = new Uint8Array(TABLE_SIZE);
    for (let i = 0; i < TABLE_SIZE; i++) {
        perm[i] = i;
    }
    // Fisher-Yates shuffle
    for (let i = TABLE_SIZE - 1; i > 0; i--) {
        const j = rng.int(0, i + 1);
        [perm[i], perm[j]] = [perm[j], perm[i]];
    }

    // Double the permutation table for overflow handling
    const p = new Uint8Array(TABLE_SIZE * 2);
    for (let i = 0; i < TABLE_SIZE; i++) {
        p[i] = perm[i];
        p[i + TABLE_SIZE] = perm[i];
    }

    // Gradient vectors for 2D (8 directions)
    const gradients: [number, number][] = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [-1, 1], [1, -1], [-1, -1]
    ];
    // Normalize diagonal gradients
    const sqrt2 = Math.SQRT1_2;
    for (let i = 4; i < 8; i++) {
        gradients[i][0] *= sqrt2;
        gradients[i][1] *= sqrt2;
    }

    // Fade function for smooth interpolation (6t^5 - 15t^4 + 10t^3)
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

    // Linear interpolation
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);

    // Dot product of gradient and distance vector
    const grad = (hash: number, x: number, y: number): number => {
        const g = gradients[hash & 7];
        return g[0] * x + g[1] * y;
    };

    return (x: number, y: number): number => {
        // Find unit grid cell containing point
        const xi = Math.floor(x) & TABLE_MASK;
        const yi = Math.floor(y) & TABLE_MASK;

        // Relative position within cell
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        // Fade curves for interpolation
        const u = fade(xf);
        const v = fade(yf);

        // Hash coordinates of 4 corners
        const aa = p[p[xi] + yi];
        const ab = p[p[xi] + yi + 1];
        const ba = p[p[xi + 1] + yi];
        const bb = p[p[xi + 1] + yi + 1];

        // Blend contributions from 4 corners
        const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
        const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);

        return lerp(x1, x2, v);
    };
}

/**
 * Generates fractal (octave) noise by combining multiple noise samples.
 * Higher octaves add finer detail; persistence controls their amplitude falloff.
 * 
 * @param noise - Base noise function
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param octaves - Number of noise layers (4-6 typical)
 * @param persistence - Amplitude multiplier per octave (0.5 typical)
 * @returns Combined noise value, normalized to approximately [-1, 1]
 */
export function fractalNoise(
    noise: (x: number, y: number) => number,
    x: number,
    y: number,
    octaves: number,
    persistence: number = 0.5
): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        total += noise(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }

    // Normalize to [-1, 1] range
    return total / maxValue;
}

/**
 * Smoothstep function for smooth edge falloff.
 * Returns 0 when x <= edge0, 1 when x >= edge1, smooth interpolation between.
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}
