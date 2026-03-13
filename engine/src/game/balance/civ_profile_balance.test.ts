import { describe, expect, it } from "vitest";
import { BuildingType, GameState, ProjectId, TechId } from "../../core/types.js";
import { getAiProfileV2 } from "../ai2/rules.js";

function createMockState(civName: string): GameState {
    return {
        turn: 1,
        players: [{ id: "p1", civName }],
        cities: [],
        units: [],
        map: { width: 10, height: 10, tiles: [] },
        diplomacy: {},
    } as unknown as GameState;
}

describe("Civ profile balance safeguards", () => {
    it("restores ForgeClans baseline swarm profile", () => {
        const state = createMockState("ForgeClans");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(0.9);
        expect(profile.diplomacy.minWarTurn).toBe(10);
        expect(profile.diplomacy.maxConcurrentWars).toBe(2);
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(5);
        expect(profile.diplomacy.targetPreference).toBe("Finishable");
        expect(profile.diplomacy.earlyRushChance).toBe(0.7);
        expect(profile.build.armyPerCity).toBe(2.1);
        expect(profile.tactics.forceConcentration).toBe(0.75);
        expect(profile.tactics.siegeCommitment).toBe(0.85);
        expect(profile.tactics.retreatHpFrac).toBe(0.25);
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(1.0);
    });

    it("gives JadeCovenant a moderate progress recovery without overcorrecting", () => {
        const state = createMockState("JadeCovenant");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(1.15);
        expect(profile.diplomacy.minWarTurn).toBe(28);
        expect(profile.diplomacy.targetPreference).toBe("Nearest");
        expect(profile.build.settlerCap).toBe(3);
        expect(profile.build.desiredCities).toBe(7);
        expect(profile.build.weights.building[BuildingType.JadeGranary]).toBe(1.35);
        expect(profile.build.weights.building[BuildingType.Scriptorium]).toBe(1.15);
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(1.6);
        expect(profile.economy.reserveMultiplier).toBe(1.02);
        expect(profile.economy.rushBuyAggression).toBe(0.82);
        expect(profile.tech.weights[TechId.SignalRelay]).toBe(1.4);
        expect(profile.tech.weights[TechId.StarCharts]).toBe(1.5);
    });

    it("restores RiverLeague baseline war cadence", () => {
        const state = createMockState("RiverLeague");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(0.9);
        expect(profile.diplomacy.warDistanceMax).toBe(15);
        expect(profile.diplomacy.peaceIfBelowRatio).toBe(0.6);
        expect(profile.diplomacy.minWarTurn).toBe(8);
        expect(profile.diplomacy.maxConcurrentWars).toBe(2);
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(5);
        expect(profile.diplomacy.targetPreference).toBe("Nearest");
        expect(profile.build.armyPerCity).toBe(2.3);
        expect(profile.build.desiredCities).toBe(7);
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(1.1);
        expect(profile.build.weights.project[ProjectId.GrandAcademy]).toBe(1.1);
        expect(profile.build.weights.project[ProjectId.GrandExperiment]).toBe(1.1);
        expect(profile.tech.weights[TechId.SignalRelay]).toBe(1.0);
        expect(profile.tech.weights[TechId.StarCharts]).toBe(1.0);
    });

    it("keeps ScholarKingdoms on the stronger-but-still-measured recovery profile", () => {
        const state = createMockState("ScholarKingdoms");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(1.15);
        expect(profile.diplomacy.minWarTurn).toBe(55);
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(1);
        expect(profile.diplomacy.targetPreference).toBe("Finishable");
        expect(profile.tech.weights[TechId.SignalRelay]).toBe(1.2);
        expect(profile.tech.weights[TechId.StarCharts]).toBe(1.3);
        expect(profile.build.armyPerCity).toBe(1.9);
        expect(profile.build.settlerCap).toBe(4);
        expect(profile.build.desiredCities).toBe(6);
        expect(profile.build.weights.building[BuildingType.Bulwark]).toBe(1.0);
        expect(profile.build.weights.building[BuildingType.CityWard]).toBe(1.15);
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(2.15);
        expect(profile.build.weights.project[ProjectId.GrandAcademy]).toBe(1.55);
        expect(profile.build.weights.project[ProjectId.GrandExperiment]).toBe(1.65);
        expect(profile.economy.reserveMultiplier).toBe(0.95);
        expect(profile.economy.rushBuyAggression).toBe(1.05);
    });

    it("keeps StarborneSeekers defensive without preserving the over-buff", () => {
        const state = createMockState("StarborneSeekers");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(1.45);
        expect(profile.diplomacy.minWarTurn).toBe(70);
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(1);
        expect(profile.diplomacy.targetPreference).toBe("Nearest");
        expect(profile.build.armyPerCity).toBe(2.6);
        expect(profile.build.settlerCap).toBe(3);
        expect(profile.build.desiredCities).toBe(4);
        expect(profile.build.weights.building[BuildingType.Bulwark]).toBe(1.4);
        expect(profile.build.weights.building[BuildingType.CityWard]).toBe(1.4);
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(1.45);
        expect(profile.build.weights.project[ProjectId.GrandAcademy]).toBe(0.95);
        expect(profile.build.weights.project[ProjectId.GrandExperiment]).toBe(0.95);
        expect(profile.tech.weights[TechId.CityWards]).toBe(1.6);
        expect(profile.tech.weights[TechId.UrbanPlans]).toBe(1.15);
        expect(profile.tech.weights[TechId.SignalRelay]).toBe(0.95);
        expect(profile.tech.weights[TechId.StarCharts]).toBe(0.95);
        expect(profile.economy.reserveMultiplier).toBe(1.15);
        expect(profile.economy.rushBuyAggression).toBe(0.7);
        expect(profile.tech.pathsByGoal?.Progress).toEqual([
            TechId.StoneworkHalls,
            TechId.CityWards,
            TechId.Fieldcraft,
            TechId.ScriptLore,
            TechId.Wellworks,
            TechId.ScholarCourts,
            TechId.UrbanPlans,
            TechId.SignalRelay,
            TechId.StarCharts,
        ]);
    });

    it("keeps AetherianVanguard dangerous while slowing the snowball profile", () => {
        const state = createMockState("AetherianVanguard");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(1.25);
        expect(profile.diplomacy.minWarTurn).toBe(80);
        expect(profile.diplomacy.maxConcurrentWars).toBe(1);
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(1);
        expect(profile.build.armyPerCity).toBe(1.95);
        expect(profile.build.settlerCap).toBe(3);
        expect(profile.build.desiredCities).toBe(4);
        expect(profile.build.weights.building[BuildingType.TitansCore]).toBe(1.8);
        expect(profile.tech.weights[TechId.SteamForges]).toBe(2.1);
        expect(profile.economy.rushBuyAggression).toBe(1.1);
        expect(profile.tactics.riskTolerance).toBe(0.45);
        expect(profile.tactics.siegeCommitment).toBe(0.75);
        expect(profile.tactics.retreatHpFrac).toBe(0.38);
    });

});
