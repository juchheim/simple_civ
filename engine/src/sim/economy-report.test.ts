import { describe, expect, it } from "vitest";
import {
    DEVELOPED_GOLD_SHARE_LABEL,
    LEGACY_GOLD_SHARE_LABEL,
    STRATEGIC_SITE_RATE_LABEL,
    evaluateGoldHubCity,
    evaluateScarcityPillars,
    isDevelopedEconomySample,
    summarizeDevelopedGoldHubShipGate,
} from "./economy-report.js";

describe("economy-report helpers", () => {
    it("samples the developed gold-hub metric only after turn 100 with at least three cities", () => {
        expect(isDevelopedEconomySample(100, 3)).toBe(false);
        expect(isDevelopedEconomySample(101, 2)).toBe(false);
        expect(isDevelopedEconomySample(101, 3)).toBe(true);
    });

    it("evaluates the developed gold-hub target at 45%", () => {
        expect(evaluateGoldHubCity({ avgDevelopedTopCityGoldShare: 0.44 })).toBe(true);
        expect(evaluateGoldHubCity({ avgDevelopedTopCityGoldShare: 0.45 })).toBe(true);
        expect(evaluateGoldHubCity({ avgDevelopedTopCityGoldShare: 0.46 })).toBe(false);
    });

    it("keeps the scarcity pillar tied to the developed gold-share metric", () => {
        const scarcity = evaluateScarcityPillars({
            avgNet: 8,
            deficitRate: 0.18,
            austerityRate: 0.1,
            lateNet: 12,
            avgGoldEconomyCities: 2.2,
            multiGoldEconomyTurnRate: 0.45,
            marketAdoptionRate: 0.6,
            bankAdoptionRate: 0.4,
            avgDevelopedTopCityGoldShare: 0.44,
            militaryProducedPer100Turns: 2.5,
            supplyPerCity: 1.8,
            deficitEntryCount: 4,
            deficitRecoveryRate: 0.25,
            militaryProducedUnderStressRate: 0.2,
        });

        expect(scarcity.goldHubHealthy).toBe(true);
        expect(scarcity.verdict).toBe("Healthy");
    });

    it("summarizes the developed gold-hub ship gate separately from legacy metrics", () => {
        const gate = summarizeDevelopedGoldHubShipGate([
            { civName: "A", avgDevelopedTopCityGoldShare: 0.41 },
            { civName: "B", avgDevelopedTopCityGoldShare: 0.43 },
            { civName: "C", avgDevelopedTopCityGoldShare: 0.45 },
            { civName: "D", avgDevelopedTopCityGoldShare: 0.44 },
            { civName: "E", avgDevelopedTopCityGoldShare: 0.42 },
            { civName: "F", avgDevelopedTopCityGoldShare: 0.49 },
        ]);

        expect(gate).toEqual({
            passingCivs: 5,
            totalCivs: 6,
            maxShare: 0.49,
            met: true,
        });
    });

    it("exports the report labels for developed share, legacy share, and terrain context", () => {
        expect(DEVELOPED_GOLD_SHARE_LABEL).toBe("Developed Top Gold City Share");
        expect(LEGACY_GOLD_SHARE_LABEL).toBe("Legacy Top Gold City Share (All Turns)");
        expect(STRATEGIC_SITE_RATE_LABEL).toBe("Strategic Site Rate");
    });
});
