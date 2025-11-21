import { describe, it, expect } from "vitest";
import {
    OverlayType,
    TerrainType,
    PlayerPhase,
    DiplomacyState,
    UnitType,
    ProjectId,
    TechId,
} from "../core/types.js";
import { scoreCitySite, tileWorkingPriority } from "./ai-heuristics.js";
import { aiChooseTech, aiVictoryBias, aiWarPeaceDecision } from "./ai-decisions.js";
import { runAiTurn } from "./ai.js";

type HexCoord = { q: number; r: number };

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
        map: { width: 3, height: 3, tiles: [], rivers: [] as { a: HexCoord; b: HexCoord }[] },
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

describe("ai heuristics", () => {
    it("scores city sites with yields, rivers, and overlays per docs", () => {
        const state = baseState();
        const center = { coord: hex(0, 0), terrain: TerrainType.Plains, overlays: [OverlayType.RichSoil] };
        const riverAdj = { coord: hex(1, 0), terrain: TerrainType.Plains, overlays: [OverlayType.RiverEdge] };
        const best1 = { coord: hex(1, -1), terrain: TerrainType.Hills, overlays: [OverlayType.OreVein] }; // 3P
        const best2 = { coord: hex(-1, 0), terrain: TerrainType.Forest, overlays: [OverlayType.SacredSite] }; // 1F1P1S
        const best3 = { coord: hex(0, 1), terrain: TerrainType.Marsh, overlays: [] }; // 2F
        const filler = { coord: hex(-1, 1), terrain: TerrainType.Desert, overlays: [] };
        state.map.tiles = [center, riverAdj, best1, best2, best3, filler] as any;
        const score = scoreCitySite(center as any, state as any);
        // With river adjacency on nearby tiles: center 4 + best tiles (3 + 4 + 3) + river bonus 1 + overlay bonus 3 = 18
        expect(score).toBeCloseTo(18);
    });

    it("orders tile working priority per goal and behind-curve food bias", () => {
        const state = baseState();
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0), pop: 1 } as any,
            { id: "c2", ownerId: "p", coord: hex(1, 0), pop: 4 } as any,
        ];
        const city = state.cities[0];
        expect(tileWorkingPriority("Balanced", city as any, state as any)).toEqual(["F", "P", "S"]);

        city.pop = 3;
        state.cities = [city];
        expect(tileWorkingPriority("Progress", city as any, state as any)).toEqual(["S", "P", "F"]);
        expect(tileWorkingPriority("Conquest", city as any, state as any)).toEqual(["P", "F", "S"]);
    });
});

describe("ai decisions", () => {
    it("chooses tech along Progress/Conquest paths", () => {
        const state = baseState();
        state.players = [{ id: "p", techs: [], currentTech: null }] as any;
        expect(aiChooseTech("p", state as any, "Progress")).toBe(TechId.ScriptLore);
        expect(aiChooseTech("p", state as any, "Conquest")).toBe(TechId.FormationTraining);
    });

    it("switches victory bias after Observatory or strike-range capital with Armies", () => {
        const state = baseState();
        state.players = [{ id: "p", aiGoal: "Balanced", completedProjects: [ProjectId.Observatory] }] as any;
        state.cities = [{ id: "cap", ownerId: "p", isCapital: true, coord: hex(0, 0), hp: 20, maxHp: 20 }] as any;
        expect(aiVictoryBias("p", state as any)).toBe("Progress");

        const enemyCity = { id: "ecap", ownerId: "e", isCapital: true, coord: hex(1, 0) };
        state.players = [
            { id: "p", aiGoal: "Balanced", completedProjects: [] },
            { id: "e", aiGoal: "Balanced", completedProjects: [] },
        ] as any;
        state.cities = [
            { id: "cap", ownerId: "p", isCapital: true, coord: hex(0, 0), hp: 20, maxHp: 20 },
            enemyCity as any,
        ] as any;
        state.units = [{ id: "u", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0) }] as any;
        expect(aiVictoryBias("p", state as any)).toBe("Conquest");
    });

    it("declares war at <=8 tiles when stronger and accepts peace when losing", () => {
        const state = baseState();
        state.players = [
            { id: "p", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null },
            { id: "e", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null },
        ] as any;
        state.contacts = { p: { e: true }, e: { p: true } };
        state.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0), buildings: [], hp: 20, maxHp: 20 },
            { id: "c2", ownerId: "e", coord: hex(0, 8), buildings: [], hp: 20, maxHp: 20 },
        ] as any;
        state.units = [{ id: "a", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 }] as any;
        expect(aiWarPeaceDecision("p", "e", state as any)).toBe("DeclareWar");

        state.diplomacy = { p: { e: DiplomacyState.War }, e: { p: DiplomacyState.War } } as any;
        state.units.push({ id: "b", ownerId: "e", type: UnitType.ArmyRiders, coord: hex(0, 1), hp: 15 } as any);
        state.units.push({ id: "c", ownerId: "e", type: UnitType.ArmyRiders, coord: hex(0, 2), hp: 15 } as any); // ensure enemy power lead
        state.diplomacyOffers = [{ from: "e", to: "p", type: "Peace" }];
        expect(aiWarPeaceDecision("p", "e", state as any)).toBe("AcceptPeace");
    });
});

describe("engine AI executor", () => {
    it("runs an AI turn choosing tech and assigning goal", () => {
        const state = baseState();
        state.currentPlayerId = "p";
        state.players = [
            {
                id: "p",
                civName: "ForgeClans",
                color: "#fff",
                isAI: true,
                aiGoal: "Balanced",
                techs: [],
                currentTech: null,
                completedProjects: [ProjectId.Observatory], // forces Progress bias
                isEliminated: false,
            },
        ] as any;
        state.visibility = { p: [] };
        state.revealed = { p: [] };

        const after = runAiTurn(state as any, "p");
        const player = after.players[0];
        expect(player.aiGoal).toBe("Progress");
        expect(player.currentTech?.id).toBe(TechId.ScriptLore);
        expect(after.currentPlayerId).toBe("p"); // single player loops back
    });
});
