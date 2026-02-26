import { describe, expect, it } from "vitest";
import { buildPeaceCandidates } from "./peace-candidates.js";

function makeInput(overrides: Partial<Parameters<typeof buildPeaceCandidates>[0]> = {}): Parameters<typeof buildPeaceCandidates>[0] {
    return {
        targetId: "enemy",
        ratio: 1,
        warAge: 10,
        turnsSinceCapture: 10,
        lostCities: 0,
        warMomentum: 0.2,
        siegeFailureCount: 0,
        progressThreatNow: false,
        thirdPartyThreat: false,
        incomingPeace: false,
        aggressive: false,
        minStanceTurns: 12,
        turn: 50,
        lastStanceTurn: 40,
        peacePowerThreshold: 1.0,
        ...overrides,
    };
}

describe("diplomacy peace candidate helpers", () => {
    it("adds military-collapse peace proposal when badly losing", () => {
        const candidates = buildPeaceCandidates(makeInput({
            ratio: 0.6,
            lostCities: 1,
            warAge: 12,
            warMomentum: 0.3,
        }));
        const collapse = candidates.find(c => c.reason === "military-collapse");
        expect(collapse?.type).toBe("ProposePeace");
        expect(collapse?.score).toBeCloseTo(0.81);
    });

    it("suppresses military-collapse branch under active progress threat", () => {
        const candidates = buildPeaceCandidates(makeInput({
            ratio: 0.6,
            lostCities: 2,
            warAge: 20,
            warMomentum: 0.2,
            progressThreatNow: true,
        }));
        expect(candidates.some(c => c.reason === "military-collapse")).toBe(false);
    });

    it("accepts incoming peace for stalled winner conditions", () => {
        const candidates = buildPeaceCandidates(makeInput({
            ratio: 1.1,
            warAge: 55,
            turnsSinceCapture: 45,
            incomingPeace: true,
        }));
        const stalled = candidates.find(c => c.reason === "stalled-winner");
        expect(stalled?.type).toBe("AcceptPeace");
    });

    it("switches low-advantage action to accept when peace offer is present", () => {
        const withoutOffer = buildPeaceCandidates(makeInput({
            ratio: 0.9,
            peacePowerThreshold: 1.0,
            incomingPeace: false,
        }));
        const withOffer = buildPeaceCandidates(makeInput({
            ratio: 0.9,
            peacePowerThreshold: 1.0,
            incomingPeace: true,
        }));

        expect(withoutOffer.find(c => c.reason === "low-advantage")?.type).toBe("ProposePeace");
        expect(withOffer.find(c => c.reason === "low-advantage")?.type).toBe("AcceptPeace");
    });
});
