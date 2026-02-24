import { describe, it, expect } from "vitest";
import {
    getTechPathTo,
    calculateTechPathCost,
    estimateTurnsToProgress,
    estimateTurnsToConquest,
    evaluateBestVictoryPath,
    shouldConsiderProgressPivot,
} from "./victory-evaluator";
import { generateWorld } from "../../map/map-generator";
import {
    BuildingType,
    City,
    ProjectId,
    TechId,
    UnitType,
} from "../../core/types";

describe("Victory Evaluator", () => {
    // ==========================================================================
    // Tech Path Calculation Tests
    // ==========================================================================
    describe("getTechPathTo", () => {
        it("should return empty array if tech already researched", () => {
            const playerTechs = [TechId.StarCharts];
            const path = getTechPathTo(playerTechs, TechId.StarCharts);
            expect(path).toEqual([]);
        });

        it("should return single tech if no prereqs needed", () => {
            const playerTechs: TechId[] = [];
            const path = getTechPathTo(playerTechs, TechId.Fieldcraft);
            expect(path).toEqual([TechId.Fieldcraft]);
        });

        it("should return full prereq chain for StarCharts from scratch", () => {
            const playerTechs: TechId[] = [];
            const path = getTechPathTo(playerTechs, TechId.StarCharts);

            // StarCharts requires: ScriptLore -> ScholarCourts -> SignalRelay -> StarCharts
            expect(path).toContain(TechId.ScriptLore);
            expect(path).toContain(TechId.ScholarCourts);
            expect(path).toContain(TechId.SignalRelay);
            expect(path).toContain(TechId.StarCharts);
            expect(path.length).toBe(4);

            // Order should be prereqs first
            const scriptIdx = path.indexOf(TechId.ScriptLore);
            const scholarIdx = path.indexOf(TechId.ScholarCourts);
            const signalIdx = path.indexOf(TechId.SignalRelay);
            const starIdx = path.indexOf(TechId.StarCharts);

            expect(scriptIdx).toBeLessThan(scholarIdx);
            expect(scholarIdx).toBeLessThan(signalIdx);
            expect(signalIdx).toBeLessThan(starIdx);
        });

        it("should skip already researched techs in chain", () => {
            const playerTechs = [TechId.ScriptLore, TechId.ScholarCourts];
            const path = getTechPathTo(playerTechs, TechId.StarCharts);

            // Should only need SignalRelay -> StarCharts
            expect(path).not.toContain(TechId.ScriptLore);
            expect(path).not.toContain(TechId.ScholarCourts);
            expect(path).toContain(TechId.SignalRelay);
            expect(path).toContain(TechId.StarCharts);
            expect(path.length).toBe(2);
        });
    });

    describe("calculateTechPathCost", () => {
        it("should return 0 for empty path", () => {
            expect(calculateTechPathCost([])).toBe(0);
        });

        it("should sum costs correctly for full StarCharts path", () => {
            // ScriptLore (40) + ScholarCourts (100) + SignalRelay (200) + StarCharts (200) = 540
            const path = [TechId.ScriptLore, TechId.ScholarCourts, TechId.SignalRelay, TechId.StarCharts];
            expect(calculateTechPathCost(path)).toBe(540);
        });
    });

    // ==========================================================================
    // Progress Victory Estimation Tests
    // ==========================================================================
    describe("estimateTurnsToProgress", () => {
        it("should return Infinity for player with no cities", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "ForgeClans", color: "red" }] });
            state.cities = [];

            const turns = estimateTurnsToProgress(state, "p1");
            expect(turns).toBe(Infinity);
        });

        it("should return lower estimate when more techs are already researched", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "ForgeClans", color: "red" }] });

            // Create a city with some production
            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.StoneWorkshop, BuildingType.Scriptorium],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            };
            state.cities = [city];

            // Baseline: No techs
            const player = state.players.find(p => p.id === "p1")!;
            player.techs = [];
            player.completedProjects = [];
            const turnsNoTechs = estimateTurnsToProgress(state, "p1");

            // With some techs researched
            player.techs = [TechId.ScriptLore, TechId.ScholarCourts];
            const turnsSomeTechs = estimateTurnsToProgress(state, "p1");

            expect(turnsSomeTechs).toBeLessThan(turnsNoTechs);
        });

        it("should return lower estimate when projects are already completed", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "ForgeClans", color: "red" }] });

            const city: City = {
                id: "c1",
                name: "City",
                ownerId: "p1",
                coord: { q: 0, r: 0 },
                pop: 3,
                storedFood: 0,
                storedProduction: 0,
                buildings: [BuildingType.StoneWorkshop],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null,
                buildProgress: 0,
                hp: 20,
                maxHp: 20,
                isCapital: true,
                hasFiredThisTurn: false,
                milestones: [],
            };
            state.cities = [city];

            const player = state.players.find(p => p.id === "p1")!;
            player.techs = [TechId.StarCharts];

            // Baseline: No projects
            player.completedProjects = [];
            const turnsNoProjects = estimateTurnsToProgress(state, "p1");

            // With Observatory done
            player.completedProjects = [ProjectId.Observatory];
            const turnsWithObservatory = estimateTurnsToProgress(state, "p1");

            expect(turnsWithObservatory).toBeLessThan(turnsNoProjects);
        });
    });

    // ==========================================================================
    // Conquest Victory Estimation Tests
    // ==========================================================================
    describe("estimateTurnsToConquest", () => {
        it("should return 0 when no enemy capitals remain", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "ForgeClans", color: "red" }] });

            // Only our cities, no enemies
            const city: City = {
                id: "c1",
                name: "City",
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
            };
            state.cities = [city];

            const turns = estimateTurnsToConquest(state, "p1");
            expect(turns).toBe(0);
        });

        it("should return higher estimate with more enemy capitals", () => {
            const state = generateWorld({
                mapSize: "Small",
                players: [
                    { id: "p1", civName: "ForgeClans", color: "red" },
                    { id: "p2", civName: "ScholarKingdoms", color: "blue" },
                    { id: "p3", civName: "RiverLeague", color: "green" },
                ]
            });

            // Our city
            const ourCity: City = {
                id: "c1", name: "Our City", ownerId: "p1",
                coord: { q: 0, r: 0 }, pop: 3, storedFood: 0, storedProduction: 0,
                buildings: [], workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };

            // Enemy capitals
            const enemy1Capital: City = {
                id: "c2", name: "Enemy 1", ownerId: "p2",
                coord: { q: 5, r: 0 }, pop: 2, storedFood: 0, storedProduction: 0,
                buildings: [], workedTiles: [],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };

            const enemy2Capital: City = {
                id: "c3", name: "Enemy 2", ownerId: "p3",
                coord: { q: 10, r: 0 }, pop: 2, storedFood: 0, storedProduction: 0,
                buildings: [], workedTiles: [],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };

            // Give us some military
            state.units = [
                { id: "u1", type: UnitType.SpearGuard, ownerId: "p1", coord: { q: 0, r: 0 }, hp: 10, hasMoved: false, remainingMoves: 1, hasAttacked: false },
                { id: "u2", type: UnitType.BowGuard, ownerId: "p1", coord: { q: 1, r: 0 }, hp: 10, hasMoved: false, remainingMoves: 1, hasAttacked: false },
            ];

            // Test with 1 enemy
            state.cities = [ourCity, enemy1Capital];
            const turnsWith1Enemy = estimateTurnsToConquest(state, "p1");

            // Test with 2 enemies
            state.cities = [ourCity, enemy1Capital, enemy2Capital];
            const turnsWith2Enemies = estimateTurnsToConquest(state, "p1");

            expect(turnsWith2Enemies).toBeGreaterThan(turnsWith1Enemy);
        });

        it("should return higher estimate when militarily weaker", () => {
            const state = generateWorld({
                mapSize: "Small",
                players: [
                    { id: "p1", civName: "ForgeClans", color: "red" },
                    { id: "p2", civName: "ScholarKingdoms", color: "blue" },
                ]
            });

            const ourCity: City = {
                id: "c1", name: "Our City", ownerId: "p1",
                coord: { q: 0, r: 0 }, pop: 3, storedFood: 0, storedProduction: 0,
                buildings: [], workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };

            const enemyCapital: City = {
                id: "c2", name: "Enemy", ownerId: "p2",
                coord: { q: 5, r: 0 }, pop: 2, storedFood: 0, storedProduction: 0,
                buildings: [], workedTiles: [],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };

            state.cities = [ourCity, enemyCapital];

            // Weak military
            state.units = [
                { id: "u1", type: UnitType.SpearGuard, ownerId: "p1", coord: { q: 0, r: 0 }, hp: 10, hasMoved: false, remainingMoves: 1, hasAttacked: false },
            ];
            const turnsWeak = estimateTurnsToConquest(state, "p1");

            // Strong military
            state.units = [
                { id: "u1", type: UnitType.ArmySpearGuard, ownerId: "p1", coord: { q: 0, r: 0 }, hp: 15, hasMoved: false, remainingMoves: 1, hasAttacked: false },
                { id: "u2", type: UnitType.ArmyBowGuard, ownerId: "p1", coord: { q: 1, r: 0 }, hp: 15, hasMoved: false, remainingMoves: 1, hasAttacked: false },
                { id: "u3", type: UnitType.ArmyRiders, ownerId: "p1", coord: { q: 2, r: 0 }, hp: 15, hasMoved: false, remainingMoves: 2, hasAttacked: false },
            ];
            const turnsStrong = estimateTurnsToConquest(state, "p1");

            expect(turnsWeak).toBeGreaterThan(turnsStrong);
        });
    });

    // ==========================================================================
    // Best Victory Path Evaluation Tests
    // ==========================================================================
    describe("evaluateBestVictoryPath", () => {
        it("should calculate estimates and compare them correctly", () => {
            const state = generateWorld({
                mapSize: "Small",
                players: [
                    { id: "p1", civName: "ScholarKingdoms", color: "blue" },
                    { id: "p2", civName: "ForgeClans", color: "red" },
                ]
            });

            // City with some production
            const ourCity: City = {
                id: "c1", name: "Our City", ownerId: "p1",
                coord: { q: 0, r: 0 }, pop: 5, storedFood: 0, storedProduction: 0,
                buildings: [BuildingType.Academy, BuildingType.Scriptorium],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };

            // Enemy capital
            const enemyCapital: City = {
                id: "c2", name: "Enemy", ownerId: "p2",
                coord: { q: 10, r: 10 }, pop: 5, storedFood: 0, storedProduction: 0,
                buildings: [BuildingType.CityWard],
                workedTiles: [],
                currentBuild: null, buildProgress: 0, hp: 35, maxHp: 35,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };

            state.cities = [ourCity, enemyCapital];

            const player = state.players.find(p => p.id === "p1")!;
            player.techs = [TechId.StarCharts, TechId.SignalRelay, TechId.ScholarCourts, TechId.ScriptLore];
            player.completedProjects = [ProjectId.Observatory];

            state.units = [];

            const result = evaluateBestVictoryPath(state, "p1");

            // Verify the result has valid structure
            expect(result.turnsToProgress).toBeGreaterThan(0);
            expect(result.turnsToConquest).toBeGreaterThanOrEqual(0);
            expect(["Progress", "Conquest"]).toContain(result.path);
            expect(["high", "medium", "low"]).toContain(result.confidence);
            expect(result.reason).toBeTruthy();

            // Verify the progressFaster flag matches the comparison
            if (result.progressFaster) {
                // With 10% threshold, turnsToProgress * 0.9 < turnsToConquest
                expect(result.turnsToProgress * 0.9).toBeLessThan(result.turnsToConquest);
            } else {
                // Not faster means turnsToProgress * 0.9 >= turnsToConquest
                expect(result.turnsToProgress * 0.9).toBeGreaterThanOrEqual(result.turnsToConquest);
            }
        });

        it("should return confidence levels based on turn difference", () => {
            const state = generateWorld({
                mapSize: "Small",
                players: [{ id: "p1", civName: "ForgeClans", color: "red" }]
            });

            const city: City = {
                id: "c1", name: "City", ownerId: "p1",
                coord: { q: 0, r: 0 }, pop: 3, storedFood: 0, storedProduction: 0,
                buildings: [], workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };
            state.cities = [city];

            const result = evaluateBestVictoryPath(state, "p1");

            // Confidence should be one of the three levels
            expect(["high", "medium", "low"]).toContain(result.confidence);
        });
    });

    // ==========================================================================
    // Progress Pivot Trigger Tests
    // ==========================================================================
    describe("shouldConsiderProgressPivot", () => {
        it("should return false with fewer than 3 cities", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "ForgeClans", color: "red" }] });

            const city: City = {
                id: "c1", name: "City", ownerId: "p1",
                coord: { q: 0, r: 0 }, pop: 3, storedFood: 0, storedProduction: 0,
                buildings: [BuildingType.Academy],
                workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };
            state.cities = [city];

            expect(shouldConsiderProgressPivot(state, "p1")).toBe(false);
        });

        it("should return true when already invested in Progress chain", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "ForgeClans", color: "red" }] });

            // Even with 1 city, if we have Observatory, should continue
            const city: City = {
                id: "c1", name: "City", ownerId: "p1",
                coord: { q: 0, r: 0 }, pop: 3, storedFood: 0, storedProduction: 0,
                buildings: [], workedTiles: [{ q: 0, r: 0 }],
                currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                isCapital: true, hasFiredThisTurn: false, milestones: [],
            };
            state.cities = [city];

            const player = state.players.find(p => p.id === "p1")!;
            player.completedProjects = [ProjectId.Observatory];

            expect(shouldConsiderProgressPivot(state, "p1")).toBe(true);
        });

        it("should return true with 3+ cities and good science output", () => {
            const state = generateWorld({ mapSize: "Small", players: [{ id: "p1", civName: "ScholarKingdoms", color: "blue" }] });

            // Create 3 cities with science buildings
            const cities: City[] = [
                {
                    id: "c1", name: "City1", ownerId: "p1",
                    coord: { q: 0, r: 0 }, pop: 3, storedFood: 0, storedProduction: 0,
                    buildings: [BuildingType.Scriptorium, BuildingType.Academy],
                    workedTiles: [{ q: 0, r: 0 }],
                    currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                    isCapital: true, hasFiredThisTurn: false, milestones: [],
                },
                {
                    id: "c2", name: "City2", ownerId: "p1",
                    coord: { q: 5, r: 0 }, pop: 2, storedFood: 0, storedProduction: 0,
                    buildings: [BuildingType.Scriptorium],
                    workedTiles: [{ q: 5, r: 0 }],
                    currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                    isCapital: false, hasFiredThisTurn: false, milestones: [],
                },
                {
                    id: "c3", name: "City3", ownerId: "p1",
                    coord: { q: 10, r: 0 }, pop: 2, storedFood: 0, storedProduction: 0,
                    buildings: [BuildingType.Scriptorium],
                    workedTiles: [{ q: 10, r: 0 }],
                    currentBuild: null, buildProgress: 0, hp: 20, maxHp: 20,
                    isCapital: false, hasFiredThisTurn: false, milestones: [],
                },
            ];
            state.cities = cities;

            // With 3 cities and science buildings, should trigger
            const result = shouldConsiderProgressPivot(state, "p1");
            expect(result).toBe(true);
        });
    });
});
