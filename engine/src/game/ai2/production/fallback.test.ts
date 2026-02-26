import { describe, expect, it } from "vitest";
import { UnitType } from "../../../core/types.js";
import {
    buildFallbackMixPlan,
    pickFallbackDefaultUnit,
    pickFallbackUnit
} from "./fallback.js";

describe("production fallback helpers", () => {
    it("prefers highest rider tier", () => {
        const chosen = pickFallbackUnit("rider", [UnitType.Riders, UnitType.ArmyRiders]);
        expect(chosen).toBe(UnitType.ArmyRiders);
    });

    it("forces bow-class fallback when defense pick is non-bow", () => {
        const chosen = pickFallbackUnit("bow", [UnitType.Lorekeeper, UnitType.BowGuard]);
        expect(chosen).toBe(UnitType.BowGuard);
    });

    it("builds a 3:2:1 mix plan and ignores civilian units", () => {
        const plan = buildFallbackMixPlan([
            { type: UnitType.SpearGuard },
            { type: UnitType.SpearGuard },
            { type: UnitType.SpearGuard },
            { type: UnitType.BowGuard },
            { type: UnitType.BowGuard },
            { type: UnitType.Settler },
        ]);

        expect(plan.baseline).toBe(6);
        expect(plan.deficitNote).toBe("S:0 B:0 R:1");
        expect(plan.entries[0]).toEqual({ kind: "rider", deficit: 1 });
    });

    it("picks a stable default capture fallback", () => {
        const chosen = pickFallbackDefaultUnit([UnitType.SpearGuard, UnitType.ArmySpearGuard]);
        expect(chosen).toBe(UnitType.ArmySpearGuard);
    });
});
