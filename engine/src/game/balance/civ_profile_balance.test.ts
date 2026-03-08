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
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(6);
        expect(profile.diplomacy.targetPreference).toBe("Finishable");
        expect(profile.diplomacy.earlyRushChance).toBe(0.8);
        expect(profile.build.armyPerCity).toBe(2.1);
    });

    it("gives JadeCovenant a moderate progress recovery without overcorrecting", () => {
        const state = createMockState("JadeCovenant");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(1.1);
        expect(profile.diplomacy.minWarTurn).toBe(24);
        expect(profile.build.settlerCap).toBe(3);
        expect(profile.build.desiredCities).toBe(6);
        expect(profile.build.weights.building[BuildingType.JadeGranary]).toBe(1.35);
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(1.4);
        expect(profile.economy.reserveMultiplier).toBe(0.98);
        expect(profile.economy.rushBuyAggression).toBe(0.78);
        expect(profile.tech.weights[TechId.StarCharts]).toBe(1.3);
    });

    it("restores RiverLeague baseline war cadence", () => {
        const state = createMockState("RiverLeague");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(0.9);
        expect(profile.diplomacy.minWarTurn).toBe(8);
        expect(profile.diplomacy.maxConcurrentWars).toBe(2);
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(6);
        expect(profile.diplomacy.targetPreference).toBe("Finishable");
        expect(profile.build.armyPerCity).toBe(2.3);
        expect(profile.build.desiredCities).toBe(7);
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(1.0);
        expect(profile.tech.weights[TechId.StarCharts]).toBe(0.9);
    });

    it("restores ScholarKingdoms baseline progress pacing", () => {
        const state = createMockState("ScholarKingdoms");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.tech.weights[TechId.SignalRelay]).toBeUndefined();
        expect(profile.tech.weights[TechId.StarCharts]).toBeUndefined();
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(2.0);
        expect(profile.build.weights.project[ProjectId.GrandAcademy]).toBe(1.2);
        expect(profile.build.weights.project[ProjectId.GrandExperiment]).toBe(1.2);
        expect(profile.economy.reserveMultiplier).toBe(1.0);
        expect(profile.economy.rushBuyAggression).toBe(1.0);
    });

    it("restores StarborneSeekers baseline progress pressure", () => {
        const state = createMockState("StarborneSeekers");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(1.2);
        expect(profile.diplomacy.minWarTurn).toBe(40);
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(2);
        expect(profile.diplomacy.targetPreference).toBe("Finishable");
        expect(profile.build.weights.building[BuildingType.Bulwark]).toBe(2.0);
        expect(profile.build.weights.project[ProjectId.Observatory]).toBe(2.0);
        expect(profile.build.weights.project[ProjectId.GrandAcademy]).toBe(1.2);
        expect(profile.build.weights.project[ProjectId.GrandExperiment]).toBe(1.2);
        expect(profile.tech.pathsByGoal?.Progress).toEqual([
            TechId.StoneworkHalls,
            TechId.CityWards,
            TechId.ScriptLore,
            TechId.ScholarCourts,
            TechId.SignalRelay,
            TechId.StarCharts,
        ]);
    });

    it("restores AetherianVanguard baseline conquest tempo", () => {
        const state = createMockState("AetherianVanguard");
        const profile = getAiProfileV2(state, "p1");

        expect(profile.diplomacy.warPowerRatio).toBe(1.0);
        expect(profile.diplomacy.minWarTurn).toBe(50);
        expect(profile.diplomacy.maxConcurrentWars).toBe(2);
        expect(profile.diplomacy.maxInitiatedWarsPer50Turns).toBe(4);
        expect(profile.build.armyPerCity).toBe(2.0);
        expect(profile.build.settlerCap).toBe(5);
        expect(profile.build.desiredCities).toBe(5);
        expect(profile.tactics.riskTolerance).toBe(0.55);
        expect(profile.tactics.siegeCommitment).toBe(0.9);
        expect(profile.tactics.retreatHpFrac).toBe(0.3);
    });

});
