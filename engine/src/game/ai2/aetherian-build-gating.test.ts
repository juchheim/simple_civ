import { describe, expect, it } from "vitest";
import { shouldStartAetherianTitansCore } from "./production/civ-builds.js";

describe("Aetherian Titan timing", () => {
    it("waits for basic empire and rider setup before starting Titan's Core", () => {
        expect(shouldStartAetherianTitansCore(2, 2)).toBe(false);
        expect(shouldStartAetherianTitansCore(3, 1)).toBe(false);
    });

    it("starts Titan's Core once city count and rider support are ready", () => {
        expect(shouldStartAetherianTitansCore(3, 2)).toBe(true);
        expect(shouldStartAetherianTitansCore(5, 4)).toBe(true);
    });
});
