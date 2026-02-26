import { describe, expect, it } from "vitest";
import {
    computeWarDeclarationScore,
    formatDiplomacyBreakdown,
    getInfluenceRatio,
    passesWarTimingGate,
    pickTopCandidate
} from "./diplomacy-helpers.js";

describe("diplomacy helpers", () => {
    it("computes normalized influence ratio with bounds", () => {
        const layer = {
            max: 10,
            get: () => 3,
        } as any;
        expect(getInfluenceRatio(layer, { q: 0, r: 0 })).toBeCloseTo(0.3);
        expect(getInfluenceRatio(undefined, { q: 0, r: 0 })).toBe(0);
        expect(getInfluenceRatio(layer, undefined)).toBe(0);
    });

    it("picks top diplomacy candidate by score", () => {
        const picked = pickTopCandidate([
            { type: "ProposePeace", targetId: "a", score: 0.2, reason: "low" },
            { type: "DeclareWar", targetId: "b", score: 0.9, reason: "high" },
        ]);
        expect(picked?.targetId).toBe("b");
    });

    it("formats diplomacy breakdown with sorted components", () => {
        const text = formatDiplomacyBreakdown({
            type: "DeclareWar",
            targetId: "e",
            score: 0.8,
            reason: "trigger",
            breakdown: {
                small: 0.001,
                ratio: 0.55,
                pressure: -0.22,
            },
        });
        expect(text).toContain("trigger |");
        expect(text).toContain("ratio:0.55");
        expect(text).toContain("pressure:-0.22");
        expect(text).not.toContain("small");
    });

    it("applies standard war timing gates when no threat override is active", () => {
        const blockedByTurn = passesWarTimingGate({
            progressThreat: false,
            conquestThreat: false,
            earlyRushActive: false,
            turn: 9,
            minWarTurn: 12,
            warsPlanned: 0,
            maxConcurrentWars: 2,
            recentInitiations: 0,
            maxInitiatedWarsPer50Turns: 2,
        });
        expect(blockedByTurn).toBe(false);

        const allowed = passesWarTimingGate({
            progressThreat: false,
            conquestThreat: false,
            earlyRushActive: false,
            turn: 14,
            minWarTurn: 12,
            warsPlanned: 0,
            maxConcurrentWars: 2,
            recentInitiations: 1,
            maxInitiatedWarsPer50Turns: 2,
        });
        expect(allowed).toBe(true);
    });

    it("allows threat overrides but keeps early-rush minimum turn", () => {
        const threatOverride = passesWarTimingGate({
            progressThreat: true,
            conquestThreat: false,
            earlyRushActive: false,
            turn: 4,
            minWarTurn: 25,
            warsPlanned: 2,
            maxConcurrentWars: 1,
            recentInitiations: 99,
            maxInitiatedWarsPer50Turns: 1,
        });
        expect(threatOverride).toBe(true);

        const earlyRushBlocked = passesWarTimingGate({
            progressThreat: false,
            conquestThreat: false,
            earlyRushActive: true,
            turn: 7,
            minWarTurn: 25,
            warsPlanned: 0,
            maxConcurrentWars: 3,
            recentInitiations: 0,
            maxInitiatedWarsPer50Turns: 3,
        });
        expect(earlyRushBlocked).toBe(false);
    });

    it("composes war declaration score with floors and influence bonus", () => {
        const baseScore = computeWarDeclarationScore({
            effectiveOffensiveRatio: 1.2,
            escalatedRatio: 1.0,
            progressThreat: false,
            conquestThreat: false,
            earlyRushActive: false,
            isDominating: false,
            frontRatio: 0,
            pressureRatio: 0,
        });
        expect(baseScore).toBeCloseTo(0.2);

        const threatScore = computeWarDeclarationScore({
            effectiveOffensiveRatio: 0.2,
            escalatedRatio: 1.0,
            progressThreat: true,
            conquestThreat: false,
            earlyRushActive: false,
            isDominating: false,
            frontRatio: 0.3,
            pressureRatio: 0.2,
        });
        // 0.8 floor plus influence bonus, clamped to 0..1.
        expect(threatScore).toBeCloseTo(0.856);
    });
});
