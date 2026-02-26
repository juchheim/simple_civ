import { describe, expect, it } from "vitest";
import { GameState, PlayerPhase, UnitType } from "../../../core/types.js";
import {
    computeFocusCityStagingCounts,
    evaluateWarRatioStaging,
    needsMoreWarStaging
} from "./war-staging.js";

function baseState(): GameState {
    return {
        id: "test",
        turn: 20,
        players: [],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        aiSystem: "UtilityV2",
        aiMemoryV2: {},
        map: { width: 20, height: 20, tiles: [] },
        units: [],
        cities: [],
        seed: 1,
        visibility: {},
        revealed: {},
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
        nativeCamps: [],
    };
}

function mkUnit(ownerId: string, id: string, type: UnitType, q: number, r: number): any {
    return {
        id,
        ownerId,
        type,
        coord: { q, r },
        hp: 10,
        maxHp: 10,
        movesLeft: 1,
        hasAttacked: false,
        state: "Normal",
    };
}

describe("diplomacy war staging helpers", () => {
    it("proceeds when offensive ratio and military count are sufficient", () => {
        const decision = evaluateWarRatioStaging({
            effectiveOffensiveRatio: 1.1,
            effectiveRatio: 1.0,
            escalatedRatio: 1.0,
            myMilitaryCount: 5,
            myCityCount: 2,
            frontRatio: 0,
            pressureRatio: 0,
            warsPlanned: 0,
            maxConcurrentWars: 2,
        });
        expect(decision).toEqual({ kind: "proceed" });
    });

    it("stages for offensive power when only overall ratio is sufficient", () => {
        const decision = evaluateWarRatioStaging({
            effectiveOffensiveRatio: 0.9,
            effectiveRatio: 1.05,
            escalatedRatio: 1.0,
            myMilitaryCount: 10,
            myCityCount: 3,
            frontRatio: 0.2,
            pressureRatio: 0.1,
            warsPlanned: 0,
            maxConcurrentWars: 2,
        });
        expect(decision).toEqual({ kind: "continue", shouldStageFocus: true, reason: "needs-offensive-power" });
    });

    it("stages by influence when close to threshold", () => {
        const decision = evaluateWarRatioStaging({
            effectiveOffensiveRatio: 0.7,
            effectiveRatio: 0.88,
            escalatedRatio: 1.0,
            myMilitaryCount: 10,
            myCityCount: 3,
            frontRatio: 0.4,
            pressureRatio: 0.1,
            warsPlanned: 0,
            maxConcurrentWars: 2,
        });
        expect(decision).toEqual({ kind: "continue", shouldStageFocus: true, reason: "influence" });
    });

    it("computes staging counts from nearby units only", () => {
        const state = baseState();
        state.units = [
            mkUnit("p1", "u1", UnitType.SpearGuard, 0, 1),
            mkUnit("p1", "u2", UnitType.BowGuard, 0, 2),
            mkUnit("p1", "u3", UnitType.Settler, 0, 1),
            mkUnit("p1", "u4", UnitType.Scout, 0, 1),
            mkUnit("p1", "u5", UnitType.Titan, 10, 10),
            mkUnit("p2", "e1", UnitType.SpearGuard, 0, 1),
        ];

        const counts = computeFocusCityStagingCounts(state, "p1", { q: 0, r: 0 }, 3);
        expect(counts.nearCount).toBe(2);
        expect(counts.capturersNear).toBe(1);
    });

    it("requires more staging unless progress threat bypasses readiness checks", () => {
        const needs = needsMoreWarStaging({
            progressThreat: false,
            hasTitanNow: false,
            nearCount: 2,
            capturersNear: 0,
            requiredNear: 4,
        });
        expect(needs).toBe(true);

        const bypass = needsMoreWarStaging({
            progressThreat: true,
            hasTitanNow: false,
            nearCount: 0,
            capturersNear: 0,
            requiredNear: 10,
        });
        expect(bypass).toBe(false);
    });
});
