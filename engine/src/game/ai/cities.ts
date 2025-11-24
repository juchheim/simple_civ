import { hexEquals } from "../../core/hex.js";
import {
    AiVictoryGoal,
    BuildingType,
    GameState,
    ProjectId,
    UnitType,
} from "../../core/types.js";
import { canBuild } from "../rules.js";
import { tryAction } from "./shared/actions.js";
import { tileWorkingPriority, tilesByPriority } from "./city-heuristics.js";

type BuildOption = { type: "Unit" | "Building" | "Project"; id: string };

function buildPriorities(goal: AiVictoryGoal): BuildOption[] {
    const progress: BuildOption[] = [
        { type: "Project", id: ProjectId.Observatory },
        { type: "Project", id: ProjectId.GrandAcademy },
        { type: "Project", id: ProjectId.GrandExperiment },
        { type: "Building", id: BuildingType.Scriptorium },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Unit", id: UnitType.Settler },
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Unit", id: UnitType.Riders },
    ];
    const conquest: BuildOption[] = [
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Unit", id: UnitType.Riders },
        { type: "Unit", id: UnitType.BowGuard },
        { type: "Project", id: ProjectId.FormArmy_SpearGuard },
        { type: "Project", id: ProjectId.FormArmy_Riders },
        { type: "Project", id: ProjectId.FormArmy_BowGuard },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Unit", id: UnitType.Settler },
    ];
    const balanced: BuildOption[] = [
        { type: "Unit", id: UnitType.Settler },
        { type: "Unit", id: UnitType.SpearGuard },
        { type: "Building", id: BuildingType.Farmstead },
        { type: "Building", id: BuildingType.StoneWorkshop },
        { type: "Building", id: BuildingType.Scriptorium },
        { type: "Unit", id: UnitType.Riders },
    ];

    if (goal === "Progress") return progress;
    if (goal === "Conquest") return conquest;
    return balanced;
}

export function pickCityBuilds(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const cityOrder = next.cities.filter(c => c.ownerId === playerId);
    const priorities = buildPriorities(goal);
    for (const city of cityOrder) {
        if (city.currentBuild) continue;
        for (const option of priorities) {
            if (canBuild(city, option.type, option.id, next)) {
                next = tryAction(next, {
                    type: "SetCityBuild",
                    playerId,
                    cityId: city.id,
                    buildType: option.type,
                    buildId: option.id,
                });
                break;
            }
        }
    }
    return next;
}

export function assignWorkedTiles(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const cities = next.cities.filter(c => c.ownerId === playerId);
    for (const city of cities) {
        const priority = tileWorkingPriority(goal, city, next);
        const sorted = tilesByPriority(city, next, priority);
        const worked: typeof city.workedTiles = [city.coord];
        for (const tile of sorted) {
            if (worked.length >= city.pop) break;
            if (hexEquals(tile.coord, city.coord)) continue;
            worked.push(tile.coord);
        }
        next = tryAction(next, {
            type: "SetWorkedTiles",
            playerId,
            cityId: city.id,
            tiles: worked,
        });
    }
    return next;
}

