import { describe, it, expect } from "vitest";
import { hexEquals } from "../core/hex.js";
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
        // With river adjacency on nearby tiles: center 5 + best tiles (3 + 4 + 3) + river bonus 1 + overlay bonus 3 = 19
        expect(score).toBeCloseTo(19);
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
        expect(aiVictoryBias("p", state as any)).toBe("Balanced"); // default fallback when no stored goal
    });

    it("keeps tech picks deterministic for a fixed progress path state", () => {
        const state = baseState();
        state.players = [
            { id: "p", techs: [TechId.ScriptLore], currentTech: null } as any,
        ];

        const pick1 = aiChooseTech("p", state as any, "Progress");
        const pick2 = aiChooseTech("p", state as any, "Progress");

        expect(pick1).toBe(TechId.ScholarCourts);
        expect(pick2).toBe(TechId.ScholarCourts);
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
        expect(city.currentBuild?.type).toBe("Building");
        expect(city.currentBuild?.id).toBe(BuildingType.Farmstead); // first available option after exhausted progress projects + Scriptorium
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
        const movedSettler = after.units.find(u => u.id === "settler");
        expect(movedSettler?.coord).toEqual(rich);
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
            type: UnitType.BowGuard,
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
        expect(strongCity?.hp).toBe(15);
        expect(weakCity).toBeDefined();
        if (weakCity) {
            expect(weakCity.ownerId === "p" || weakCity.hp < 5).toBe(true);
        }
    });

    it("updates diplomacy state based on declare-war decisions", () => {
        const state = baseState();
        state.currentPlayerId = "p";
        state.players = [
            { id: "p", aiGoal: "Balanced", techs: [], currentTech: null, completedProjects: [], isEliminated: false },
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
        expect(peaceUnit?.coord).toEqual(hex(0, 0)); // no war ⇒ stays put (fortify equivalent)
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
