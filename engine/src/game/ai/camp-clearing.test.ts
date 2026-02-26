import { describe, expect, it } from "vitest";
import { DiplomacyState, GameState, NativeCamp, PlayerPhase, TerrainType, UnitState, UnitType } from "../../core/types.js";
import { manageCampClearing } from "./camp-clearing.js";

function baseState(): GameState {
    return {
        id: "camp-clearing-test",
        turn: 20,
        players: [
            {
                id: "p1",
                civName: "ForgeClans",
                color: "#fff",
                isAI: true,
                aiGoal: "Conquest",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: "Hearth",
                treasury: 100,
                netGold: 5,
            },
            {
                id: "p2",
                civName: "ScholarKingdoms",
                color: "#000",
                isAI: true,
                aiGoal: "Progress",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
                currentEra: "Hearth",
            },
        ],
        currentPlayerId: "p1",
        phase: PlayerPhase.Planning,
        map: {
            width: 20,
            height: 20,
            tiles: [{
                coord: { q: 0, r: 0 },
                terrain: TerrainType.Plains,
                overlays: [],
            }],
        },
        units: [],
        cities: [
            {
                id: "c1",
                name: "Capital",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            },
        ],
        seed: 1,
        visibility: { p1: [], p2: [] },
        revealed: { p1: [], p2: [] },
        diplomacy: {
            p1: { p2: DiplomacyState.Peace },
            p2: { p1: DiplomacyState.Peace },
        },
        sharedVision: { p1: {}, p2: {} },
        contacts: { p1: {}, p2: {} },
        diplomacyOffers: [],
        nativeCamps: [],
        cityStateTypeCycleIndex: 0,
    };
}

function addMilitary(state: GameState, count: number): void {
    for (let i = 0; i < count; i++) {
        state.units.push({
            id: `u${i}`,
            type: UnitType.SpearGuard,
            ownerId: "p1",
            coord: { q: i, r: 1 },
            hp: 10,
            maxHp: 10,
            movesLeft: 1,
            state: UnitState.Normal,
            hasAttacked: false,
        });
    }
}

function makeCamp(id: string, q: number, r: number): NativeCamp {
    return {
        id,
        coord: { q, r },
        state: "Patrol",
        aggroTurnsRemaining: 0,
    };
}

describe("camp-clearing", () => {
    it("keeps emergency camp prep active during major wars", () => {
        const state = baseState();
        state.diplomacy.p1.p2 = DiplomacyState.War;
        state.diplomacy.p2.p1 = DiplomacyState.War;
        state.nativeCamps = [makeCamp("camp-near", 1, 0)];
        addMilitary(state, 3);
        state.players[0].campClearingPrep = {
            targetCampId: "camp-near",
            state: "Buildup",
            startedTurn: state.turn - 1,
        };

        const next = manageCampClearing(state, "p1");
        const prep = next.players.find(p => p.id === "p1")?.campClearingPrep;
        expect(prep).toBeDefined();
        expect(prep?.state).toBe("Gathering");
    });

    it("cancels non-emergency camp prep during major wars", () => {
        const state = baseState();
        state.diplomacy.p1.p2 = DiplomacyState.War;
        state.diplomacy.p2.p1 = DiplomacyState.War;
        state.nativeCamps = [makeCamp("camp-far", 6, 0)];
        addMilitary(state, 5);
        state.players[0].campClearingPrep = {
            targetCampId: "camp-far",
            state: "Gathering",
            startedTurn: state.turn - 1,
        };

        const next = manageCampClearing(state, "p1");
        const prep = next.players.find(p => p.id === "p1")?.campClearingPrep;
        expect(prep).toBeUndefined();
    });

    it("targets only emergency camps while at war", () => {
        const state = baseState();
        state.diplomacy.p1.p2 = DiplomacyState.War;
        state.diplomacy.p2.p1 = DiplomacyState.War;
        state.nativeCamps = [makeCamp("camp-near", 2, 0), makeCamp("camp-far", 6, 0)];
        addMilitary(state, 4);
        state.visibility.p1 = ["2,0", "6,0"];

        const next = manageCampClearing(state, "p1");
        const prep = next.players.find(p => p.id === "p1")?.campClearingPrep;
        expect(prep?.targetCampId).toBe("camp-near");
    });
});
