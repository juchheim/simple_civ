import { describe, expect, it } from "vitest";
import { BuildingType, TECHS, TechId } from "@simple-civ/engine";
import {
    canResearchTech,
    canCivSeeBuildingUnlock,
    getAdditionalBuildingUnlocks,
    getCivUniqueBuilding,
    getEraActivation,
    getTechStateForPlayer,
    getUnlockInfo
} from "./tech-tree-helpers";

describe("tech-tree-helpers", () => {
    it("gates civ-specific buildings correctly", () => {
        expect(canCivSeeBuildingUnlock("ForgeClans", BuildingType.Bulwark)).toBe(false);
        expect(canCivSeeBuildingUnlock("ScholarKingdoms", BuildingType.Bulwark)).toBe(true);
        expect(canCivSeeBuildingUnlock("ForgeClans", BuildingType.Farmstead)).toBe(true);
    });

    it("returns only visible additional building unlocks for civ", () => {
        const hidden = getAdditionalBuildingUnlocks(TechId.StoneworkHalls, "ForgeClans");
        const visible = getAdditionalBuildingUnlocks(TechId.StoneworkHalls, "ScholarKingdoms");

        expect(hidden.some(unlock => unlock.name === "Bulwark")).toBe(false);
        expect(visible.some(unlock => unlock.name === "Bulwark")).toBe(true);
    });

    it("returns civ unique building only for matching civ/tech pair", () => {
        expect(getCivUniqueBuilding(TechId.Fieldcraft, "JadeCovenant")?.name).toBe("Jade Granary");
        expect(getCivUniqueBuilding(TechId.Fieldcraft, "ForgeClans")).toBeNull();
    });

    it("builds unlock info labels for unit techs", () => {
        const unlock = getUnlockInfo(TECHS[TechId.FormationTraining]);
        expect(unlock.type).toBe("Unit");
        expect(unlock.name).toContain("Trebuchet");
        expect(unlock.stats.length).toBeGreaterThan(0);
    });

    it("applies era gates when determining research availability", () => {
        const blocked = canResearchTech(TechId.Wellworks, [TechId.Fieldcraft]);
        const available = canResearchTech(TechId.Wellworks, [
            TechId.Fieldcraft,
            TechId.StoneworkHalls,
            TechId.ScriptLore,
        ]);

        expect(blocked).toBe(false);
        expect(available).toBe(true);
    });

    it("derives tech state for current, researched, and locked", () => {
        const player = {
            techs: [TechId.Fieldcraft],
            currentTech: { id: TechId.Wellworks, progress: 5, cost: 75 },
        };

        expect(getTechStateForPlayer(TechId.Wellworks, player)).toBe("current");
        expect(getTechStateForPlayer(TechId.Fieldcraft, player)).toBe("researched");
        expect(getTechStateForPlayer(TechId.ArmyDoctrine, player)).toBe("locked");
    });

    it("computes active eras from researched techs", () => {
        const activation = getEraActivation([
            TechId.Fieldcraft,
            TechId.StoneworkHalls,
            TechId.ScriptLore,
            TechId.Wellworks,
            TechId.TimberMills,
            TechId.SteamForges,
            TechId.SignalRelay,
        ]);

        expect(activation.isHearthActive).toBe(true);
        expect(activation.isBannerActive).toBe(true);
        expect(activation.isEngineActive).toBe(true);
        expect(activation.isAetherActive).toBe(true);
    });
});
