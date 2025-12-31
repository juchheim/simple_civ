import { describe, expect, it } from "vitest";
import { UnitType } from "../../core/types.js";
import { getUnitCapabilityProfile } from "./schema.js";

describe("Unit capability profile", () => {
    it("flags Trebuchet as city-only siege and not garrison-eligible", () => {
        const profile = getUnitCapabilityProfile(UnitType.Trebuchet);
        expect(profile.isCityOnlySiege).toBe(true);
        expect(profile.tags.siege_specialist).toBe(true);
        expect(profile.canAttackUnits).toBe(false);
        expect(profile.canAttackCities).toBe(true);
        expect(profile.garrisonEligible).toBe(false);
    });

    it("marks BowGuard as ranged siege skirmisher", () => {
        const profile = getUnitCapabilityProfile(UnitType.BowGuard);
        expect(profile.isRanged).toBe(true);
        expect(profile.isSiege).toBe(true);
        expect(profile.tags.skirmisher).toBe(true);
        expect(profile.tags.frontline).toBe(false);
    });

    it("marks SpearGuard as frontline capturer", () => {
        const profile = getUnitCapabilityProfile(UnitType.SpearGuard);
        expect(profile.tags.frontline).toBe(true);
        expect(profile.tags.capturer).toBe(true);
        expect(profile.garrisonEligible).toBe(true);
    });

    it("keeps Riders mobile capturers", () => {
        const profile = getUnitCapabilityProfile(UnitType.Riders);
        expect(profile.tags.capturer).toBe(true);
        expect(profile.mobility).toBe(2);
        expect(profile.tags.frontline).toBe(true);
    });

    it("identifies Titan as a capturer", () => {
        const profile = getUnitCapabilityProfile(UnitType.Titan);
        expect(profile.isTitan).toBe(true);
        expect(profile.canCaptureCities).toBe(true);
    });

    it("treats Scout as non-garrison vision unit", () => {
        const profile = getUnitCapabilityProfile(UnitType.Scout);
        expect(profile.role).toBe("vision");
        expect(profile.garrisonEligible).toBe(false);
    });

    it("marks Lorekeeper as support", () => {
        const profile = getUnitCapabilityProfile(UnitType.Lorekeeper);
        expect(profile.tags.support).toBe(true);
        expect(profile.isRanged).toBe(true);
    });
});
