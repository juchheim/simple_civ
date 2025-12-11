import { describe, it, expect } from "vitest";
import { createNoise2D, fractalNoise, smoothstep } from "./noise.js";

describe("noise utilities", () => {
    describe("createNoise2D", () => {
        it("produces deterministic output for same seed", () => {
            const noise1 = createNoise2D(12345);
            const noise2 = createNoise2D(12345);

            // Same seed should produce identical values
            expect(noise1(0, 0)).toBe(noise2(0, 0));
            expect(noise1(1.5, 2.3)).toBe(noise2(1.5, 2.3));
            expect(noise1(-3.7, 4.2)).toBe(noise2(-3.7, 4.2));
        });

        it("produces different output for different seeds", () => {
            const noise1 = createNoise2D(12345);
            const noise2 = createNoise2D(54321);

            // Different seeds should (almost certainly) produce different values
            // Use non-integer coords since integer lattice points can be zero
            expect(noise1(5.3, 5.7)).not.toBe(noise2(5.3, 5.7));
        });

        it("returns values in range [-1, 1]", () => {
            const noise = createNoise2D(42);

            // Sample many points to verify range
            for (let i = 0; i < 1000; i++) {
                const x = (i * 0.37) % 100;
                const y = (i * 0.73) % 100;
                const value = noise(x, y);
                expect(value).toBeGreaterThanOrEqual(-1);
                expect(value).toBeLessThanOrEqual(1);
            }
        });

        it("is continuous (nearby points have similar values)", () => {
            const noise = createNoise2D(999);
            const x = 10, y = 10;
            const delta = 0.01;

            const center = noise(x, y);
            const nearby = noise(x + delta, y + delta);

            // Small step should produce small change
            expect(Math.abs(center - nearby)).toBeLessThan(0.1);
        });
    });

    describe("fractalNoise", () => {
        it("produces deterministic output", () => {
            const noise = createNoise2D(777);

            const v1 = fractalNoise(noise, 5, 5, 4, 0.5);
            const v2 = fractalNoise(noise, 5, 5, 4, 0.5);

            expect(v1).toBe(v2);
        });

        it("returns values approximately in range [-1, 1]", () => {
            const noise = createNoise2D(888);

            for (let i = 0; i < 500; i++) {
                const x = (i * 0.41) % 50;
                const y = (i * 0.67) % 50;
                const value = fractalNoise(noise, x, y, 4, 0.5);
                expect(value).toBeGreaterThanOrEqual(-1.1);
                expect(value).toBeLessThanOrEqual(1.1);
            }
        });

        it("more octaves adds detail", () => {
            const noise = createNoise2D(111);

            // With 1 octave vs 6 octaves, we should see different patterns
            const v1 = fractalNoise(noise, 3.5, 3.5, 1, 0.5);
            const v6 = fractalNoise(noise, 3.5, 3.5, 6, 0.5);

            // They should differ due to added octaves
            expect(v1).not.toBe(v6);
        });
    });

    describe("smoothstep", () => {
        it("returns 0 below edge0", () => {
            expect(smoothstep(0, 1, -0.5)).toBe(0);
            expect(smoothstep(0, 1, 0)).toBe(0);
        });

        it("returns 1 above edge1", () => {
            expect(smoothstep(0, 1, 1)).toBe(1);
            expect(smoothstep(0, 1, 1.5)).toBe(1);
        });

        it("returns 0.5 at midpoint", () => {
            expect(smoothstep(0, 1, 0.5)).toBe(0.5);
            expect(smoothstep(2, 4, 3)).toBe(0.5);
        });

        it("interpolates smoothly between edges", () => {
            const v1 = smoothstep(0, 1, 0.25);
            const v2 = smoothstep(0, 1, 0.5);
            const v3 = smoothstep(0, 1, 0.75);

            expect(v1).toBeGreaterThan(0);
            expect(v1).toBeLessThan(0.5);
            expect(v2).toBe(0.5);
            expect(v3).toBeGreaterThan(0.5);
            expect(v3).toBeLessThan(1);
        });
    });
});
