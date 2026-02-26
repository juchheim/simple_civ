import { describe, expect, it } from "vitest";
import {
    addProductionCandidate,
    formatProductionBreakdown,
    ProductionCandidate
} from "./scoring.js";

type CandidateOption = { type: "Unit"; id: string };

describe("production scoring helpers", () => {
    it("adds scored candidates with clamped totals", () => {
        const candidates: ProductionCandidate<CandidateOption>[] = [];
        addProductionCandidate(candidates, {
            option: { type: "Unit", id: "SpearGuard" },
            reason: "test",
            base: 0.9,
            components: { extra: 0.4 },
            notes: ["note-a"],
        });

        expect(candidates).toHaveLength(1);
        expect(candidates[0].score).toBe(1);
        expect(candidates[0].breakdown.components).toEqual({ base: 0.9, extra: 0.4 });
        expect(candidates[0].breakdown.notes).toEqual(["note-a"]);
    });

    it("ignores null options", () => {
        const candidates: ProductionCandidate<CandidateOption>[] = [];
        addProductionCandidate(candidates, {
            option: null,
            reason: "skip",
            base: 0.5,
        });
        expect(candidates).toHaveLength(0);
    });

    it("formats breakdown with sorted components and notes", () => {
        const text = formatProductionBreakdown({
            total: 0.7,
            components: {
                tiny: 0.009,
                threat: 0.12,
                recovery: -0.05,
            },
            notes: ["economy:Crisis"],
        });

        expect(text).toContain("threat:0.12");
        expect(text).toContain("recovery:-0.05");
        expect(text).not.toContain("tiny");
        expect(text).toContain("notes:economy:Crisis");
    });
});
