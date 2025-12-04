import { describe, it, expect } from "vitest";
import { GameState, Player, City, UnitType, BuildingType, ProjectId, TechId, TerrainType, PlayerPhase, UnitState } from "../core/types.js";
import { canBuild } from "./rules.js";
import { handleEndTurn } from "./turn-lifecycle.js";
import { pickCityBuilds } from "./ai/cities.js";

function baseState(): GameState {
    return {
        id: "g",
        turn: 1,
        players: [],
        currentPlayerId: "p",
        phase: PlayerPhase.Planning,
        map: { width: 3, height: 3, tiles: [], rivers: [] },
        units: [],
        cities: [],
        seed: 1,
        visibility: { p: [] },
        revealed: { p: [] },
        diplomacy: {},
        sharedVision: {},
        contacts: {},
        diplomacyOffers: [],
    };
}

function createPlayer(id: string): Player {
    return {
        id,
        civName: "ForgeClans",
        color: "#fff",
        isAI: false,
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
    };
}

function createCity(ownerId: string, buildings: BuildingType[] = []): City {
    return {
        id: "c1",
        ownerId,
        name: "City",
        coord: { q: 0, r: 0 },
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings,
        workedTiles: [{ q: 0, r: 0 }],
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: true,
        hasFiredThisTurn: false,
        milestones: [],
    };
}

describe("Filler Projects", () => {
    it("should allow building Harvest Festival only with Farmstead", () => {
        const state = baseState();
        state.players = [createPlayer("p")];
        state.cities = [createCity("p")];
        state.map.tiles = [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], hasCityCenter: true } as any];

        const city = state.cities[0];

        // Initially no Farmstead
        expect(canBuild(city, "Project", ProjectId.HarvestFestival, state)).toBe(false);

        // Add Farmstead
        // Note: canBuild checks state.players to find owner.
        // It also checks city.buildings.
        city.buildings.push(BuildingType.Farmstead);
        // Also need tech? No, HarvestFestival has no tech req in my definition?
        // Wait, I didn't add tech req in constants.ts.
        // But Farmstead requires Fieldcraft.
        // If I have Farmstead, I likely have Fieldcraft.
        // But canBuild checks project prereqTechs. I didn't set any. So it should be fine.

        expect(canBuild(city, "Project", ProjectId.HarvestFestival, state)).toBe(true);
    });

    it("should allow building Alchemical Experiments only with Scriptorium", () => {
        const state = baseState();
        state.players = [createPlayer("p")];
        state.cities = [createCity("p")];
        state.map.tiles = [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], hasCityCenter: true } as any];

        const city = state.cities[0];

        // Initially no Scriptorium
        expect(canBuild(city, "Project", ProjectId.AlchemicalExperiments, state)).toBe(false);

        // Add Scriptorium
        city.buildings.push(BuildingType.Scriptorium);
        expect(canBuild(city, "Project", ProjectId.AlchemicalExperiments, state)).toBe(true);
    });

    it("should grant 25 Food on Harvest Festival completion", () => {
        const state = baseState();
        state.players = [createPlayer("p")];
        state.cities = [createCity("p", [BuildingType.Farmstead])];
        state.map.tiles = [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], hasCityCenter: true } as any];

        const city = state.cities[0];
        city.currentBuild = { type: "Project", id: ProjectId.HarvestFestival, cost: 100 };
        city.buildProgress = 100; // Ready to complete
        city.storedFood = 0;

        // Run end turn
        const nextState = handleEndTurn(state, { type: "EndTurn", playerId: "p" });
        const nextCity = nextState.cities[0];

        // Should have completed
        expect(nextCity.currentBuild).toBeNull();
        // Should have gained 25 food + city yields (1 from center + 1 from plains = 2)
        // So >= 25 (at least the project amount)
        expect(nextCity.storedFood).toBeGreaterThanOrEqual(25);
    });

    it("should grant 25 Science on Alchemical Experiments completion", () => {
        const state = baseState();
        state.players = [createPlayer("p")];
        state.cities = [createCity("p", [BuildingType.Scriptorium])];
        state.map.tiles = [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], hasCityCenter: true } as any];

        const player = state.players[0];
        player.currentTech = { id: TechId.Fieldcraft, progress: 0, cost: 100 };

        const city = state.cities[0];
        city.currentBuild = { type: "Project", id: ProjectId.AlchemicalExperiments, cost: 100 };
        city.buildProgress = 100;

        // Run end turn
        const nextState = handleEndTurn(state, { type: "EndTurn", playerId: "p" });
        const nextPlayer = nextState.players[0];

        // Should have completed
        expect(nextState.cities[0].currentBuild).toBeNull();
        // Should have gained 25 science + city yields (1 base + 1 scriptorium = 2)
        // So >= 27
        expect(nextPlayer.currentTech?.progress).toBeGreaterThanOrEqual(27);
    });

    it("AI should pick filler project when safe and buildings done", () => {
        const state = baseState();
        const player = createPlayer("p");
        player.isAI = true;
        player.aiGoal = "Progress";
        // Give tech for Farmstead
        player.techs.push(TechId.Fieldcraft);
        state.players = [player];

        const city = createCity("p", [BuildingType.Farmstead, BuildingType.StoneWorkshop, BuildingType.Scriptorium]);
        state.cities = [city];
        state.map.tiles = [{ coord: { q: 0, r: 0 }, terrain: TerrainType.Plains, overlays: [], hasCityCenter: true } as any];

        // Give lots of military so it feels safe
        for (let i = 0; i < 5; i++) {
            state.units.push({
                id: `u${i}`,
                type: UnitType.SpearGuard,
                ownerId: "p",
                coord: { q: 0, r: 0 }, // dummy
                hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Normal, hasAttacked: false,
                moves: 0,
                domain: "Land"
            } as any);
        }
        // Add scouts to prevent scout build
        state.units.push({ type: UnitType.Scout, ownerId: "p", id: "s1", coord: { q: 0, r: 0 }, hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Normal, hasAttacked: false } as any);
        state.units.push({ type: UnitType.Scout, ownerId: "p", id: "s2", coord: { q: 0, r: 0 }, hp: 10, maxHp: 10, movesLeft: 0, state: UnitState.Normal, hasAttacked: false } as any);

        // Run AI pick
        const nextState = pickCityBuilds(state, "p", "Progress");

        const build = nextState.cities[0].currentBuild;
        expect(build).not.toBeNull();
        expect(build?.type).toBe("Project");
        // Should be HarvestFestival or AlchemicalExperiments
        // In Progress list, HarvestFestival comes first?
        // Wait, I added them as:
        // { type: "Project", id: ProjectId.HarvestFestival },
        // { type: "Project", id: ProjectId.AlchemicalExperiments }
        // So HarvestFestival is first.
        expect(build?.id).toBe(ProjectId.HarvestFestival);
    });
});
