import { describe, expect, it } from "vitest";
import { BuildingType, DiplomacyState, PlayerPhase, ProjectId, UnitType } from "../../core/types.js";
import {
    calculateDesiredArmySize,
    getArmyDeficit,
    getProgressCityPriorities,
    isAtWar,
} from "./city-build-priorities.js";

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
        map: { width: 8, height: 8, tiles: [], rivers: [] as { a: { q: number; r: number }; b: { q: number; r: number } }[] },
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

describe("city build priorities helpers", () => {
    it("detects war state from diplomacy", () => {
        const state = baseState();
        state.players = [
            { id: "p", isEliminated: false },
            { id: "e", isEliminated: false },
        ] as any;
        state.diplomacy = { p: { e: DiplomacyState.War }, e: { p: DiplomacyState.War } } as any;
        expect(isAtWar(state as any, "p")).toBe(true);
        state.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;
        expect(isAtWar(state as any, "p")).toBe(false);
    });

    it("scales desired army size up during war prep", () => {
        const state = baseState();
        state.players = [
            {
                id: "p",
                isEliminated: false,
                civName: "ForgeClans",
                warPreparation: { targetId: "e", state: "Gathering", startedTurn: 1 },
            },
            { id: "e", isEliminated: false, civName: "RiverLeague" },
        ] as any;
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0), pop: 2 },
            { id: "c2", ownerId: "p", coord: hex(2, 0), pop: 2 },
        ] as any;
        const desired = calculateDesiredArmySize(state as any, "p");
        expect(desired).toBeGreaterThanOrEqual(8);
    });

    it("reports army deficit against desired target", () => {
        const state = baseState();
        state.players = [{ id: "p", isEliminated: false, civName: "RiverLeague" }] as any;
        state.cities = [{ id: "c1", ownerId: "p", coord: hex(0, 0), pop: 2 }] as any;
        state.units = [
            { id: "u1", ownerId: "p", type: UnitType.Scout, coord: hex(0, 0) },
            { id: "u2", ownerId: "p", type: UnitType.Settler, coord: hex(1, 0) },
        ] as any;
        const deficit = getArmyDeficit(state as any, "p");
        expect(deficit.currentMilitary).toBe(0);
        expect(deficit.deficit).toBeGreaterThanOrEqual(1);
    });

    it("prioritizes defensive cityward/bulwark for defensive civ progress city", () => {
        const priorities = getProgressCityPriorities(
            {
                civName: "ScholarKingdoms",
                techs: [],
                completedProjects: [] as ProjectId[],
            },
            1
        );
        expect(priorities[0]).toEqual({ type: "Building", id: BuildingType.CityWard });
        expect(priorities[1]).toEqual({ type: "Building", id: BuildingType.Bulwark });
    });
});
