import { describe, expect, it } from "vitest";
import { PlayerPhase, UnitType } from "../../../core/types.js";
import { pickMovementTargetForUnit } from "./offense-movement-target-selection.js";

function hex(q: number, r: number) {
    return { q, r };
}

function baseState() {
    return {
        id: "g",
        turn: 1,
        players: [],
        currentPlayerId: "p",
        phase: PlayerPhase.Planning,
        map: { width: 8, height: 8, tiles: [] as any[], rivers: [] as any[] },
        units: [] as any[],
        cities: [] as any[],
        seed: 1,
        visibility: { p: [] as string[] },
        revealed: { p: [] as string[] },
        diplomacy: {} as any,
        sharedVision: {} as any,
        contacts: {} as any,
        diplomacyOffers: [] as any[],
    };
}

describe("offense movement target selection", () => {
    it("prefers capturable city for capture-capable units", () => {
        const state = baseState();
        const unit = { id: "u", ownerId: "p", type: UnitType.SpearGuard, coord: hex(0, 0) } as any;
        const targetCities = [
            { id: "c1", ownerId: "e", name: "Healthy", coord: hex(2, 0), hp: 10, maxHp: 20 },
            { id: "c2", ownerId: "e", name: "Fallen", coord: hex(1, 0), hp: 0, maxHp: 20 },
        ] as any[];
        const result = pickMovementTargetForUnit({
            state: state as any,
            playerId: "p",
            unit,
            targetCities: targetCities as any,
        });
        expect(result?.name).toBe("Fallen");
    });

    it("uses titan target city for trebuchet support", () => {
        const state = baseState();
        const unit = { id: "u", ownerId: "p", type: UnitType.Trebuchet, coord: hex(0, 0) } as any;
        const titan = { id: "t", ownerId: "p", type: UnitType.Titan, coord: hex(4, 0) } as any;
        const primaryCity = { id: "c1", ownerId: "e", name: "Capital", coord: hex(6, 0), hp: 20, maxHp: 20 } as any;
        const result = pickMovementTargetForUnit({
            state: state as any,
            playerId: "p",
            unit,
            targetCities: [primaryCity] as any,
            primaryCity,
            titan,
        });
        expect(result?.name).toBe("Capital");
    });

    it("rallies far units to titan when distant", () => {
        const state = baseState();
        const unit = { id: "u", ownerId: "p", type: UnitType.BowGuard, coord: hex(0, 0) } as any;
        const titan = { id: "t", ownerId: "p", type: UnitType.Titan, coord: hex(6, 0) } as any;
        const result = pickMovementTargetForUnit({
            state: state as any,
            playerId: "p",
            unit,
            targetCities: [] as any,
            titan,
        });
        expect(result?.name).toBe("The Titan");
        expect(result?.coord).toEqual(hex(6, 0));
    });
});
