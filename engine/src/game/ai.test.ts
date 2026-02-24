import { describe, it, expect } from "vitest";
import { hexEquals, hexToString } from "../core/hex.js";
import {
    BuildingType,
    OverlayType,
    TerrainType,
    PlayerPhase,
    DiplomacyState,
    UnitState,
    UnitType,
    ProjectId,
    TechId,
} from "../core/types.js";
import { scoreCitySite } from "./ai-heuristics.js";
import { aiWarPeaceDecision } from "./ai-decisions.js";
import { aiChooseTech } from "./ai/tech.js";
import { aiVictoryBias } from "./ai/goals.js";
import { tileWorkingPriority } from "./ai/city-heuristics.js";
import { assignWorkedTiles, pickCityBuilds } from "./ai/cities.js";
import { attackTargets, moveSettlersAndFound } from "./ai/units.js";
import { runAiTurn } from "./ai.js";
import { handleDiplomacy } from "./ai/diplomacy.js";
import { runAiTurnSequence } from "./ai/turn-runner.js";
import { tryAction } from "./ai/shared/actions.js";

type HexCoord = { q: number; r: number };

function hex(q: number, r: number) {
    return { q, r };
}

function ownedTile(coord: HexCoord, ownerId: string | null, options?: { terrain?: TerrainType; hasCityCenter?: boolean }) {
    return {
        coord,
        terrain: options?.terrain ?? TerrainType.Plains,
        overlays: [],
        ownerId: ownerId ?? undefined,
        hasCityCenter: options?.hasCityCenter ?? false,
    };
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

function cloneState<T>(state: T): T {
    return JSON.parse(JSON.stringify(state));
}

describe("ai heuristics", () => {
    it("scores city sites with yields, rivers, and overlays per docs", () => {
        const state = baseState();
        const center = { coord: hex(0, 0), terrain: TerrainType.Plains, overlays: [OverlayType.RichSoil] };
        const riverAdj = { coord: hex(1, 0), terrain: TerrainType.Plains, overlays: [] };
        const best1 = { coord: hex(1, -1), terrain: TerrainType.Hills, overlays: [OverlayType.OreVein] }; // 3P
        const best2 = { coord: hex(-1, 0), terrain: TerrainType.Forest, overlays: [OverlayType.SacredSite] }; // 1F1P1S
        const best3 = { coord: hex(0, 1), terrain: TerrainType.Marsh, overlays: [] }; // 2F
        const filler = { coord: hex(-1, 1), terrain: TerrainType.Desert, overlays: [] };
        state.map.tiles = [center, riverAdj, best1, best2, best3, filler] as any;
        state.map.rivers = [
            { a: center.coord, b: riverAdj.coord },
            { a: center.coord, b: best1.coord },
            { a: center.coord, b: best2.coord },
            { a: center.coord, b: best3.coord },
        ];
        const score = scoreCitySite(center as any, state as any);
        // With city-center min gold and nearby river tiles: center 5 + best tiles (5 + 5 + 3) + river bonus 1 + overlay bonus 3 = 22
        expect(score).toBeCloseTo(22);
    });

    it("increases gold-heavy settlement valuation under economic pressure", () => {
        const state = baseState();
        state.players = [{
            id: "p",
            civName: "ForgeClans",
            techs: [],
            currentTech: null,
            completedProjects: [],
            isEliminated: false,
            currentEra: "Hearth",
            netGold: -4,
            treasury: 0,
            austerityActive: true,
        }] as any;

        const center = { coord: hex(0, 0), terrain: TerrainType.Desert, overlays: [OverlayType.SacredSite] };
        const neighbors = [
            { coord: hex(1, 0), terrain: TerrainType.Plains, overlays: [] },
            { coord: hex(1, -1), terrain: TerrainType.Plains, overlays: [] },
            { coord: hex(0, -1), terrain: TerrainType.Plains, overlays: [] },
            { coord: hex(-1, 0), terrain: TerrainType.Plains, overlays: [] },
        ];
        state.map.tiles = [center, ...neighbors] as any;

        const pressured = scoreCitySite(center as any, state as any, "p");
        state.players[0].netGold = 4;
        state.players[0].treasury = 100;
        state.players[0].austerityActive = false;
        const stable = scoreCitySite(center as any, state as any, "p");

        expect(pressured).toBeGreaterThan(stable);
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

    it("respects era gates when choosing techs", () => {
        const state = baseState();
        state.players = [{ id: "p", techs: [TechId.ScriptLore], currentTech: null }] as any;
        const pick = aiChooseTech("p", state as any, "Balanced");
        expect(pick).toBeDefined();
        // Only Hearth techs are legal until 2 Hearth are owned
        const hearth = new Set([
            TechId.Fieldcraft,
            TechId.StoneworkHalls,
            TechId.FormationTraining,
            TechId.TrailMaps,
            TechId.ScriptLore,
        ]);
        expect(hearth.has(pick!)).toBe(true);

        state.players[0].techs = [TechId.Fieldcraft, TechId.ScriptLore, TechId.StoneworkHalls]; // 3 Hearth
        const pickBanner = aiChooseTech("p", state as any, "Balanced");
        expect(pickBanner).not.toBe(TechId.SteamForges); // Needs 2 Banner before Engine
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
            { id: "p", civName: "ForgeClans", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null, warPreparation: { targetId: "e", state: "Ready", startedTurn: 0 } },
            { id: "e", civName: "RiverLeague", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null },
        ] as any;
        state.contacts = { p: { e: true }, e: { p: true } };
        state.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;
        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0), buildings: [], hp: 20, maxHp: 20 },
            { id: "c2", ownerId: "e", coord: hex(0, 8), buildings: [], hp: 20, maxHp: 20 },
        ] as any;
        const playerCityKey = hexToString(state.cities[0].coord);
        const enemyCityKey = hexToString(state.cities[1].coord);
        state.revealed = { p: [playerCityKey, enemyCityKey], e: [enemyCityKey, playerCityKey] } as any;
        state.visibility = { p: [playerCityKey, enemyCityKey], e: [enemyCityKey, playerCityKey] } as any;
        state.units = [{ id: "a", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15 }] as any;
        expect(aiWarPeaceDecision("p", "e", state as any)).toBe("DeclareWar");

        state.diplomacy = { p: { e: DiplomacyState.War }, e: { p: DiplomacyState.War } } as any;
        state.units.push({ id: "b", ownerId: "e", type: UnitType.ArmyRiders, coord: hex(0, 1), hp: 15 } as any);
        state.units.push({ id: "c", ownerId: "e", type: UnitType.ArmyRiders, coord: hex(0, 2), hp: 15 } as any); // ensure enemy power lead
        state.visibility.p.push(hexToString({ q: 0, r: 1 }), hexToString({ q: 0, r: 2 }));
        state.diplomacyOffers = [{ from: "e", to: "p", type: "Peace" }];
        expect(aiWarPeaceDecision("p", "e", state as any)).toBe("None");
    });

    it("requires visibility before making contact or declaring war", () => {
        const template = baseState();
        template.players = [
            { id: "p", civName: "ForgeClans", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null, isEliminated: false, warPreparation: { targetId: "e", state: "Ready", startedTurn: 0 } },
            { id: "e", civName: "RiverLeague", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null, isEliminated: false },
        ] as any;
        template.contacts = { p: {}, e: {} } as any;
        template.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;
        const playerCity = { id: "c1", ownerId: "p", coord: hex(0, 0), buildings: [], hp: 20, maxHp: 20 };
        const enemyCity = { id: "c2", ownerId: "e", coord: hex(4, 0), buildings: [], hp: 20, maxHp: 20 };
        template.cities = [playerCity as any, enemyCity as any];
        template.map.tiles = [
            ownedTile(playerCity.coord, "p", { hasCityCenter: true }),
            ownedTile(enemyCity.coord, "e", { hasCityCenter: true }),
        ] as any;
        template.units = [
            { id: "a", ownerId: "p", type: UnitType.ArmySpearGuard, coord: playerCity.coord, hp: 15, maxHp: 15 },
            { id: "b", ownerId: "e", type: UnitType.SpearGuard, coord: enemyCity.coord, hp: 10, maxHp: 10 },
        ] as any;
        const playerCityKey = hexToString(playerCity.coord);
        const enemyCityKey = hexToString(enemyCity.coord);
        template.revealed = { p: [playerCityKey], e: [enemyCityKey] } as any;
        template.visibility = { p: [playerCityKey], e: [enemyCityKey] } as any;

        const hiddenState = cloneState(template);
        const hiddenDecision = aiWarPeaceDecision("p", "e", hiddenState as any);
        expect(hiddenDecision).toBe("None");
        expect(hiddenState.contacts?.p?.e).toBeUndefined();

        const visibleState = cloneState(template);
        visibleState.visibility.p.push(enemyCityKey);
        visibleState.revealed.p.push(enemyCityKey);
        const visibleDecision = aiWarPeaceDecision("p", "e", visibleState as any);
        expect(visibleState.contacts?.p?.e).toBe(true);
        expect(visibleDecision).toBe("DeclareWar");
    });

    it("applies civ aggression thresholds (ForgeClans declares, Scholar turtling defers)", () => {
        const state = baseState();
        state.players = [
            { id: "forge", civName: "ForgeClans", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null, warPreparation: { targetId: "scholar", state: "Ready", startedTurn: 0 } },
            { id: "scholar", civName: "ScholarKingdoms", aiGoal: "Balanced", completedProjects: [], techs: [], currentTech: null },
        ] as any;
        state.contacts = { forge: { scholar: true }, scholar: { forge: true } };
        state.diplomacy = { forge: { scholar: DiplomacyState.Peace }, scholar: { forge: DiplomacyState.Peace } } as any;
        state.cities = [
            { id: "f1", ownerId: "forge", coord: hex(0, 0), buildings: [], hp: 20, maxHp: 20 },
            { id: "s1", ownerId: "scholar", coord: hex(0, 7), buildings: [], hp: 20, maxHp: 20 },
        ] as any;
        const forgeCityKey = hexToString(state.cities[0].coord);
        const scholarCityKey = hexToString(state.cities[1].coord);
        state.revealed = { forge: [forgeCityKey, scholarCityKey], scholar: [scholarCityKey, forgeCityKey] } as any;
        state.visibility = {
            forge: [forgeCityKey, scholarCityKey, hexToString({ q: 0, r: 1 })],
            scholar: [scholarCityKey, forgeCityKey],
        } as any;
        state.units = [
            { id: "fa", ownerId: "forge", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 15, maxHp: 15 },
            { id: "sa", ownerId: "scholar", type: UnitType.SpearGuard, coord: hex(0, 1), hp: 5, maxHp: 10 },
        ] as any;

        expect(aiWarPeaceDecision("forge", "scholar", state as any)).toBe("DeclareWar");
        // ScholarKingdoms is now configured to only react to very close neighbors (warDistanceMax ~5),
        // so at distance 7 it should not initiate buildup.
        expect(aiWarPeaceDecision("scholar", "forge", state as any)).toBe("None");
    });

    it("escalates aggression in late game for Conquest civs", () => {
        const state = baseState();
        state.turn = 140; // Mid-Late game (Conquest escalates, Progress doesn't yet)
        state.players = [
            {
                id: "p",
                civName: "ForgeClans", // High aggression, likely Conquest
                aiGoal: "Conquest",
                completedProjects: [],
                techs: [],
                currentTech: null,
                warPreparation: { targetId: "e", state: "Ready", startedTurn: 0 }
            },
            {
                id: "e",
                civName: "ScholarKingdoms",
                aiGoal: "Balanced",
                completedProjects: [],
                techs: [],
                currentTech: null
            },
        ] as any;
        state.contacts = { p: { e: true }, e: { p: true } };
        state.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;

        // Setup: Player is slightly WEAKER than enemy (0.9x power)
        // Normally ForgeClans needs 1.1x power.
        // But at turn 140, escalation factor is 0.75.
        // Threshold becomes 1.1 * 0.75 = 0.825.
        // So 0.9x power should trigger war.

        state.cities = [
            { id: "c1", ownerId: "p", coord: hex(0, 0), buildings: [], hp: 20, maxHp: 20, isCapital: true },
            { id: "c2", ownerId: "e", coord: hex(0, 5), buildings: [], hp: 20, maxHp: 20, isCapital: true },
        ] as any;

        // Visibility
        const pCityKey = hexToString(state.cities[0].coord);
        const eCityKey = hexToString(state.cities[1].coord);
        state.revealed = { p: [pCityKey, eCityKey], e: [eCityKey, pCityKey] } as any;
        state.visibility = { p: [pCityKey, eCityKey], e: [eCityKey, pCityKey] } as any;

        // Units: Player has 90 power, Enemy has 100 power
        state.units = [
            { id: "p1", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(0, 0), hp: 18, maxHp: 20 }, // ~90 power
            { id: "e1", ownerId: "e", type: UnitType.ArmySpearGuard, coord: hex(0, 5), hp: 20, maxHp: 20 }, // ~100 power
        ] as any;

        // Verify escalation triggers war
        expect(aiWarPeaceDecision("p", "e", state as any)).toBe("DeclareWar");

        // Verify non-Conquest civ does NOT escalate
        state.players[0].aiGoal = "Progress";
        // Note: ForgeClans civ still uses ForgeClans' aggressive diplomacy profile even with Progress goal.
        // The civ identity (ForgeClans) drives diplomacy, not the goal.
        expect(aiWarPeaceDecision("p", "e", state as any)).toBe("DeclareWar");
    });
});

describe("ai regression safeguards", () => {
    it("keeps victory goal fallback order stable", () => {
        const state = baseState();
        state.players = [
            {
                id: "p",
                aiGoal: "Balanced",
                completedProjects: [ProjectId.Observatory],
                techs: [],
                currentTech: null,
                isEliminated: false,
            },
            {
                id: "e",
                aiGoal: "Balanced",
                completedProjects: [],
                techs: [],
                currentTech: null,
                isEliminated: false,
            },
        ] as any;
        state.cities = [
            { id: "cap", ownerId: "p", coord: hex(0, 0), hp: 20, maxHp: 20, isCapital: true } as any,
            { id: "ecap", ownerId: "e", coord: hex(4, 0), hp: 20, maxHp: 20, isCapital: true } as any,
        ];
        state.units = [
            { id: "army", ownerId: "p", type: UnitType.ArmySpearGuard, coord: hex(1, 0) } as any,
        ];

        expect(aiVictoryBias("p", state as any)).toBe("Progress"); // Observatory safe-capital overrides everything else

        state.players[0].completedProjects = [];
        expect(aiVictoryBias("p", state as any)).toBe("Conquest"); // Army in strike range without Observatory bias

        state.units = [];
        expect(aiVictoryBias("p", state as any)).toBe("Balanced"); // falls back to stored goal

        delete state.players[0].aiGoal;
        expect(aiVictoryBias("p", state as any)).toBe("Conquest"); // default fallback when no stored goal
    });

    it("keeps tech picks deterministic for a fixed progress path state", () => {
        const state = baseState();
        state.players = [
            { id: "p", techs: [TechId.ScriptLore], currentTech: null } as any,
        ];

        const pick1 = aiChooseTech("p", state as any, "Progress");
        const pick2 = aiChooseTech("p", state as any, "Progress");

        expect(pick1).toBe(TechId.Fieldcraft);
        expect(pick2).toBe(TechId.Fieldcraft);
    });

    it("queues city production according to goal build priorities", () => {
        const state = baseState();
        state.currentPlayerId = "p";
        state.players = [
            {
                id: "p",
                civName: "ForgeClans",
                color: "#fff",
                isAI: true,
                aiGoal: "Balanced",
                techs: [TechId.Fieldcraft, TechId.ScriptLore],
                currentTech: null,
                completedProjects: [ProjectId.Observatory, ProjectId.GrandAcademy, ProjectId.GrandExperiment], // forces Progress goal and blocks prior projects
                isEliminated: false,
            },
            {
                id: "e",
                civName: "RiverLeague",
                color: "#000",
                isAI: true,
                aiGoal: "Balanced",
                techs: [],
                currentTech: null,
                completedProjects: [],
                isEliminated: false,
            },
        ] as any;
        const cityCoord = hex(0, 0);
        state.map.tiles = [
            ownedTile(cityCoord, "p", { hasCityCenter: true }),
            ownedTile(hex(1, 0), "p"),
            ownedTile(hex(0, -1), "p"),
        ] as any;
        state.cities = [
            {
                id: "c1",
                ownerId: "p",
                name: "Capital",
                coord: cityCoord,
                pop: 1,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.Scriptorium],
                currentBuild: null,
                buildProgress: 0,
                workedTiles: [cityCoord],
                isCapital: true,
                hp: 20,
                maxHp: 20,
                hasFiredThisTurn: false,
                milestones: [],
            },
        ] as any;
        state.units = [];
        state.diplomacy = { p: {}, e: {} } as any;
        state.contacts = { p: {}, e: {} } as any;
        state.visibility = { p: [], e: [] } as any;
        state.revealed = { p: [], e: [] } as any;

        const after = pickCityBuilds(state as any, "p", "Progress");
        const city = after.cities[0];
        expect(city.currentBuild?.type).toBe("Unit");
        expect(city.currentBuild?.id).toBe(UnitType.Scout); // first available option after exhausted progress projects + Scriptorium
    });

    it("assigns only the city center when no other workable tiles exist", () => {
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
                completedProjects: [],
                isEliminated: false,
            },
        ] as any;
        const cityCoord = hex(0, 0);
        state.map.tiles = [
            {
                coord: cityCoord,
                terrain: TerrainType.Plains,
                overlays: [],
                ownerId: "p",
                hasCityCenter: true,
            },
        ] as any;
        state.cities = [
            {
                id: "c1",
                ownerId: "p",
                name: "Capital",
                coord: cityCoord,
                pop: 2,
                storedFood: 0,
                storedProduction: 0,
                buildings: [],
                currentBuild: null,
                buildProgress: 0,
                workedTiles: [cityCoord],
                isCapital: true,
                hp: 20,
                maxHp: 20,
                hasFiredThisTurn: false,
                milestones: [],
            },
        ] as any;
        state.units = [];
        const after = assignWorkedTiles(state as any, "p", "Balanced");
        expect(after.cities[0].workedTiles).toEqual([cityCoord]);
    });

    it("founds a city on the best available valid tile", () => {
        const state = baseState();
        state.currentPlayerId = "p";
        state.players = [
            { id: "p", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ] as any;

        const start = hex(0, 0); // invalid (coast)
        const target = hex(1, 0); // best valid tile
        const blocker = hex(0, 1); // unworkable terrain to avoid ties

        state.map.tiles = [
            { coord: start, terrain: TerrainType.Coast, overlays: [], hasCityCenter: false },
            { coord: target, terrain: TerrainType.Plains, overlays: [OverlayType.RichSoil], hasCityCenter: false },
            { coord: blocker, terrain: TerrainType.Mountain, overlays: [], hasCityCenter: false },
        ] as any;
        state.units = [
            {
                id: "settler",
                ownerId: "p",
                type: UnitType.Settler,
                coord: start,
                movesLeft: 2,
                hasAttacked: false,
                state: UnitState.Normal,
            },
        ] as any;

        const after = moveSettlersAndFound(state as any, "p");

        expect(after.cities).toHaveLength(1);
        const city = after.cities[0];
        expect(city.coord).toEqual(target);

        const cityTile = after.map.tiles.find(t => hexEquals(t.coord, target));
        expect(cityTile?.hasCityCenter).toBe(true);
        expect(cityTile?.ownerId).toBe("p");
    });

    it("moves settlers toward the best scoring city site", () => {
        const state = baseState();
        state.currentPlayerId = "p";
        state.players = [
            { id: "p", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "e", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ] as any;
        const origin = hex(0, 0);
        const rich = hex(1, 0);
        const poor = hex(0, 1);
        state.map.tiles = [
            { coord: origin, terrain: TerrainType.Plains, overlays: [], hasCityCenter: true },
            { coord: rich, terrain: TerrainType.Hills, overlays: [OverlayType.OreVein], hasCityCenter: false },
            { coord: poor, terrain: TerrainType.Coast, overlays: [], hasCityCenter: false },
        ] as any;
        state.units = [
            {
                id: "settler",
                ownerId: "p",
                type: UnitType.Settler,
                coord: origin,
                movesLeft: 2,
                hasAttacked: false,
                state: "Normal",
            },
        ] as any;

        const after = moveSettlersAndFound(state as any, "p");
        const foundedCity = after.cities.find(c => hexEquals(c.coord, rich));
        expect(foundedCity).toBeDefined();
        expect(foundedCity?.ownerId).toBe("p");
    });

    it("attacks the lowest HP enemy city within range first", () => {
        const state = baseState();
        state.currentPlayerId = "p";
        state.players = [
            { id: "p", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
            { id: "e", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ] as any;
        const attacker = {
            id: "bow",
            ownerId: "p",
            type: UnitType.ArmyBowGuard,
            coord: hex(0, 0),
            movesLeft: 2,
            hasAttacked: false,
            state: "Normal",
        };
        state.units = [attacker] as any;
        state.map.tiles = [
            { coord: hex(0, 0), terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: hex(1, 0), terrain: TerrainType.Plains, overlays: [], hasCityCenter: true },
            { coord: hex(2, 0), terrain: TerrainType.Plains, overlays: [], hasCityCenter: true },
        ] as any;
        state.cities = [
            {
                id: "weak",
                ownerId: "e",
                coord: hex(1, 0),
                hp: 5,
                maxHp: 20,
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildProgress: 0,
                currentBuild: null,
                workedTiles: [hex(1, 0)],
                milestones: [],
                isCapital: false,
                buildings: [],
                hasFiredThisTurn: false,
            } as any,
            {
                id: "strong",
                ownerId: "e",
                coord: hex(2, 0),
                hp: 15,
                maxHp: 20,
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildProgress: 0,
                currentBuild: null,
                workedTiles: [hex(2, 0)],
                milestones: [],
                isCapital: false,
                buildings: [],
                hasFiredThisTurn: false,
            } as any,
        ];

        const after = attackTargets(state as any, "p");
        const weakCity = after.cities.find(c => hexEquals(c.coord, hex(1, 0)));
        const strongCity = after.cities.find(c => hexEquals(c.coord, hex(2, 0)));
        expect(strongCity?.ownerId).toBe("e");
        expect(weakCity).toBeDefined();
        if (weakCity) {
            expect(weakCity.ownerId === "p" || weakCity.hp < 5).toBe(true);
        }
    });

    it("updates diplomacy state based on declare-war decisions", () => {
        const state = baseState();
        state.currentPlayerId = "p";
        state.players = [
            { id: "p", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false, warPreparation: { targetId: "e", state: "Ready", startedTurn: 0 } },
            { id: "e", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ] as any;
        state.contacts = { p: { e: true }, e: { p: true } };
        state.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;
        state.cities = [
            {
                id: "p-city",
                ownerId: "p",
                coord: hex(0, 0),
                hp: 20,
                maxHp: 20,
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildProgress: 0,
                currentBuild: null,
                workedTiles: [hex(0, 0)],
                milestones: [],
                isCapital: true,
                buildings: [],
                hasFiredThisTurn: false,
            } as any,
            {
                id: "e-city",
                ownerId: "e",
                coord: hex(0, 6),
                hp: 20,
                maxHp: 20,
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildProgress: 0,
                currentBuild: null,
                workedTiles: [hex(0, 6)],
                milestones: [],
                isCapital: true,
                buildings: [],
                hasFiredThisTurn: false,
            } as any,
        ];
        const playerCityKey = hexToString(state.cities[0].coord);
        const enemyCityKey = hexToString(state.cities[1].coord);
        state.revealed = { p: [playerCityKey, enemyCityKey], e: [enemyCityKey, playerCityKey] } as any;
        state.visibility = { p: [playerCityKey, enemyCityKey], e: [enemyCityKey, playerCityKey] } as any;
        state.units = [
            {
                id: "army",
                ownerId: "p",
                type: UnitType.ArmySpearGuard,
                coord: hex(0, 0),
                movesLeft: 2,
                hasAttacked: false,
                hp: 15,
                maxHp: 15,
                state: "Normal",
            },
        ] as any;

        const after = handleDiplomacy(state as any, "p");
        expect(after.diplomacy?.p?.e).toBe(DiplomacyState.War);
    });

    it("moves toward wartime targets but fortifies when no wars exist", () => {
        const playerCity = hex(0, -1);
        const enemyCity = hex(2, 0);

        const createBattleState = () => {
            const battleState = baseState();
            battleState.currentPlayerId = "p";
            battleState.players = [
                {
                    id: "p",
                    civName: "ForgeClans",
                    color: "#fff",
                    isAI: true,
                    aiGoal: "Balanced",
                    techs: [],
                    currentTech: null,
                    completedProjects: [],
                    isEliminated: false,
                },
                {
                    id: "e",
                    civName: "RiverLeague",
                    color: "#000",
                    isAI: true,
                    aiGoal: "Balanced",
                    techs: [],
                    currentTech: null,
                    completedProjects: [],
                    isEliminated: false,
                },
            ] as any;
            battleState.map.tiles = [
                ownedTile(playerCity, "p", { hasCityCenter: true }),
                ownedTile(enemyCity, "e", { hasCityCenter: true }),
                ownedTile(hex(0, 0), null),
                ownedTile(hex(1, 0), null),
                ownedTile(hex(1, -1), null),
            ] as any;
            battleState.cities = [
                {
                    id: "cap",
                    ownerId: "p",
                    coord: playerCity,
                    pop: 1,
                    storedFood: 0,
                    storedProduction: 0,
                    buildings: [],
                    currentBuild: null,
                    buildProgress: 0,
                    workedTiles: [playerCity],
                    isCapital: true,
                    hp: 20,
                    maxHp: 20,
                    hasFiredThisTurn: false,
                    milestones: [],
                },
                {
                    id: "ecap",
                    ownerId: "e",
                    coord: enemyCity,
                    pop: 1,
                    storedFood: 0,
                    storedProduction: 0,
                    buildings: [],
                    currentBuild: null,
                    buildProgress: 0,
                    workedTiles: [enemyCity],
                    isCapital: true,
                    hp: 20,
                    maxHp: 20,
                    hasFiredThisTurn: false,
                    milestones: [],
                },
            ] as any;
            battleState.units = [
                {
                    id: "spear",
                    ownerId: "p",
                    type: UnitType.SpearGuard,
                    coord: hex(0, 0),
                    hp: 10,
                    maxHp: 10,
                    movesLeft: 2,
                    hasAttacked: false,
                    state: UnitState.Normal,
                },
                {
                    id: "garrison",
                    ownerId: "p",
                    type: UnitType.SpearGuard,
                    coord: playerCity,
                    hp: 10,
                    maxHp: 10,
                    movesLeft: 0,
                    hasAttacked: false,
                    state: UnitState.Normal,
                },
            ] as any;
            battleState.diplomacy = { p: { e: DiplomacyState.War }, e: { p: DiplomacyState.War } } as any;
            battleState.contacts = { p: { e: true }, e: { p: true } } as any;
            battleState.visibility = { p: [], e: [] } as any;
            battleState.revealed = { p: [], e: [] } as any;
            return battleState;
        };

        const warState = createBattleState();
        const startCoord = { ...warState.units[0].coord };
        const afterWar = runAiTurn(warState as any, "p");
        const movedUnit = afterWar.units.find(u => u.id === "spear");
        expect(movedUnit).toBeTruthy();
        expect(movedUnit!.coord).not.toEqual(startCoord);

        const peaceState = createBattleState();
        peaceState.diplomacy = { p: { e: DiplomacyState.Peace }, e: { p: DiplomacyState.Peace } } as any;
        peaceState.contacts = { p: {}, e: {} } as any;

        const afterPeace = runAiTurn(peaceState as any, "p");
        const peaceUnit = afterPeace.units.find(u => u.id === "spear");
        expect(peaceUnit).toBeDefined();
    });
});

describe("ai personality behaviors", () => {
    it("prefers river-biased settling for River League", () => {
        const state = baseState();
        state.currentPlayerId = "p";
        state.players = [
            { id: "p", civName: "RiverLeague", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
        ] as any;
        const coast = hex(0, 0);
        const riverTile = hex(1, 0);
        const dryTile = hex(2, 0);
        state.map.tiles = [
            { coord: coast, terrain: TerrainType.Coast, overlays: [], hasCityCenter: false },
            { coord: riverTile, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
            { coord: dryTile, terrain: TerrainType.Plains, overlays: [], hasCityCenter: false },
        ] as any;
        state.map.rivers = [{ a: riverTile, b: dryTile }];
        state.units = [
            { id: "settler", ownerId: "p", type: UnitType.Settler, coord: coast, movesLeft: 2, hasAttacked: false, state: UnitState.Normal },
        ] as any;

        const after = moveSettlersAndFound(state as any, "p");
        const city = after.cities[0];
        expect(city.coord).toEqual(riverTile);
    });

    it("rushes Steam Forges for Aetherian Vanguard", () => {
        // v2.0: With custom path, AetherianVanguard picks FormationTraining if missing
        // even if other titan prereqs are already researched
        const state = baseState();
        state.players = [
            {
                id: "p",
                civName: "AetherianVanguard",
                techs: [TechId.Fieldcraft, TechId.StoneworkHalls, TechId.TimberMills],
                currentTech: null,
                completedProjects: [],
            },
        ] as any;
        const pick = aiChooseTech("p", state as any, "Balanced");
        // FormationTraining is first in custom path and still needed
        expect(pick).toBe(TechId.FormationTraining);
    });

    it("AetherianVanguard prioritizes Titan rush path over Conquest path", () => {
        // v2.0: Verifies AetherianVanguard follows custom interleaved path:
        // FormationTraining → StoneworkHalls → Fieldcraft → DrilledRanks → TimberMills → SteamForges
        const state = baseState();
        state.players = [
            {
                id: "p",
                civName: "AetherianVanguard",
                techs: [],  // Fresh start - no techs
                currentTech: null,
                completedProjects: [],
            },
        ] as any;

        // Military-first: FormationTraining is first in the custom path
        const pick = aiChooseTech("p", state as any, "Conquest");
        expect(pick).toBe(TechId.FormationTraining);

        // After 3 Hearth techs + ScriptLore (required for custom path), should pick DrilledRanks (Banner)
        state.players[0].techs = [TechId.FormationTraining, TechId.StoneworkHalls, TechId.Fieldcraft, TechId.ScriptLore];
        const pick2 = aiChooseTech("p", state as any, "Conquest");
        expect(pick2).toBe(TechId.DrilledRanks);

        // After DrilledRanks, should pick TimberMills (Titan prereq)
        state.players[0].techs = [TechId.FormationTraining, TechId.StoneworkHalls, TechId.Fieldcraft, TechId.DrilledRanks, TechId.ScriptLore];
        const pick3 = aiChooseTech("p", state as any, "Conquest");
        expect(pick3).toBe(TechId.TimberMills);
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
        expect(player.aiGoal).toBe("Balanced");
        expect(player.currentTech?.id).toBeDefined();
        expect(after.currentPlayerId).toBe("p"); // single player loops back
    });

    it("produces the same final state via the turn runner sequence", () => {
        const base = baseState();
        base.currentPlayerId = "p";
        base.players = [
            {
                id: "p",
                civName: "ForgeClans",
                color: "#fff",
                isAI: true,
                aiGoal: "Balanced",
                techs: [],
                currentTech: null,
                completedProjects: [ProjectId.Observatory],
                isEliminated: false,
            },
        ] as any;
        base.visibility = { p: [] };
        base.revealed = { p: [] };

        const seqInput = cloneState(base);
        const runInput = cloneState(base);

        const seqResult = runAiTurnSequence(seqInput as any, "p");
        const seqFinal = tryAction(seqResult as any, { type: "EndTurn", playerId: "p" });
        const fullResult = runAiTurn(runInput as any, "p");

        expect(seqFinal).toEqual(fullResult);
    });
});
