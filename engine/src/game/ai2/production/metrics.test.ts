import { describe, expect, it } from "vitest";
import { computeExpansionNeed, computeGapSeverity, getInfluenceRatio } from "./metrics.js";

describe("production metrics helpers", () => {
    it("computes normalized gap severity", () => {
        const severity = computeGapSeverity({
            needSiege: 2,
            needCapture: 1,
            needDefense: 0,
            needVision: 0,
            needGarrison: 0,
        }, 2);
        // (2+1)/max(1,2+2)=3/4
        expect(severity).toBeCloseTo(0.75);
    });

    it("returns zero gap severity for missing baseline fields", () => {
        expect(computeGapSeverity(undefined, 2)).toBe(0);
        expect(computeGapSeverity({ needCapture: 2 }, 2)).toBe(0);
    });

    it("computes expansion need and clamps bounds", () => {
        expect(computeExpansionNeed(0, 1)).toBe(0);
        expect(computeExpansionNeed(4, 2)).toBeCloseTo(0.5);
        expect(computeExpansionNeed(4, 8)).toBe(0);
    });

    it("computes influence ratio with guard rails", () => {
        const layer = {
            max: 10,
            get: () => 6,
        } as any;
        expect(getInfluenceRatio(layer, { q: 0, r: 0 })).toBeCloseTo(0.6);
        expect(getInfluenceRatio(undefined, { q: 0, r: 0 })).toBe(0);
        expect(getInfluenceRatio({ max: 0, get: () => 99 } as any, { q: 0, r: 0 })).toBe(0);
    });
});
