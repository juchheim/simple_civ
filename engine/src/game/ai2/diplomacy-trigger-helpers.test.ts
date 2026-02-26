import { describe, expect, it, vi } from "vitest";
import {
    computeBorderViolationTriggerScore,
    computeEarlyRushActive,
    computeForcedWarTriggerScore,
    computeTriggerInfluenceBoost,
    getForcedWarTriggerTurn,
    selectForcedWarTarget
} from "./diplomacy-trigger-helpers.js";

vi.mock("../ai/goals.js", () => ({
    estimateMilitaryPower: (playerId: string, state: any) => state.__power?.[playerId] ?? 0,
}));

describe("diplomacy trigger helpers", () => {
    it("determines deterministic early-rush activation", () => {
        expect(computeEarlyRushActive(undefined, 5, "p1", 1)).toBe(false);
        expect(computeEarlyRushActive(0.2, 30, "p1", 1)).toBe(false);

        // ('p'.charCodeAt(0) + 1) % 100 = 13, so chance 0.14 activates.
        expect(computeEarlyRushActive(0.14, 10, "p1", 1)).toBe(true);
        expect(computeEarlyRushActive(0.13, 10, "p1", 1)).toBe(false);
    });

    it("computes trigger influence boost from front and pressure maxima", () => {
        const influence = {
            front: { max: 10, get: () => 5 },
            pressure: { max: 20, get: () => 10 },
            threat: { max: 1, get: () => 0 },
        } as any;
        const cities = [
            { id: "c1", ownerId: "p1", coord: { q: 0, r: 0 }, isCapital: true },
            { id: "c2", ownerId: "p2", coord: { q: 2, r: 0 }, isCapital: true },
        ] as any[];

        const boost = computeTriggerInfluenceBoost(influence, cities[0], cities as any, "p2");
        expect(boost.front).toBeCloseTo(0.5);
        expect(boost.pressure).toBeCloseTo(0.5);
        expect(boost.boost).toBeCloseTo(0.07);

        expect(computeTriggerInfluenceBoost(undefined, cities[0], cities as any, "p2")).toEqual({
            boost: 0,
            front: 0,
            pressure: 0,
        });
    });

    it("scores border and forced-war triggers with clamping", () => {
        expect(computeBorderViolationTriggerScore(1, 5, 0.1)).toBeCloseTo(1);
        expect(computeBorderViolationTriggerScore(0, 200, 0)).toBe(0);

        expect(computeForcedWarTriggerScore(10, 10, 0)).toBeCloseTo(0.67);
        expect(computeForcedWarTriggerScore(1, 100, 0)).toBeCloseTo(0.274);
    });

    it("computes deterministic forced-war trigger turn", () => {
        // ('p'.charCodeAt(0) + 7) % 25 = 19 -> 199
        expect(getForcedWarTriggerTurn("p1", 7)).toBe(199);
    });

    it("selects weakest eligible forced-war target", () => {
        const state = {
            players: [
                { id: "p1", isAI: true, isEliminated: false },
                { id: "p2", isAI: true, isEliminated: false },
                { id: "h1", isAI: false, isEliminated: false },
            ],
            cities: [
                { ownerId: "p1", coord: { q: 0, r: 0 } },
                { ownerId: "p2", coord: { q: 1, r: 0 } },
                { ownerId: "h1", coord: { q: 2, r: 0 } },
            ],
            units: [
                { ownerId: "p1", type: "SpearGuard", hp: 10 },
                { ownerId: "p2", type: "SpearGuard", hp: 8 },
                { ownerId: "h1", type: "SpearGuard", hp: 20 },
            ],
            __power: {
                p2: 7,
                h1: 20,
            },
        } as any;

        const selected = selectForcedWarTarget(state, "p1");
        expect(selected).not.toBeNull();
        expect(selected?.targetId).toBe("p2");
    });
});
