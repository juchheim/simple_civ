import React from "react";
import { BuildingType, City, GameState, ProjectId, UnitType, canBuild } from "@simple-civ/engine";

type BuildOption<T extends string> = {
    id: T;
    name: string;
};

export type CityBuildOptions = {
    units: BuildOption<UnitType>[];
    buildings: BuildOption<BuildingType>[];
    projects: BuildOption<ProjectId>[];
};

const UNIT_OPTIONS: BuildOption<UnitType>[] = [
    { id: UnitType.Scout, name: "Scout" },
    { id: UnitType.SpearGuard, name: "Spear Guard" },
    { id: UnitType.BowGuard, name: "Bow Guard" },
    { id: UnitType.Riders, name: "Riders" },
    { id: UnitType.RiverBoat, name: "River Boat" },
    { id: UnitType.Settler, name: "Settler" },
];

const BUILDING_OPTIONS: BuildOption<BuildingType>[] = [
    { id: BuildingType.Farmstead, name: "Farmstead" },
    { id: BuildingType.StoneWorkshop, name: "Stone Workshop" },
    { id: BuildingType.Scriptorium, name: "Scriptorium" },
    { id: BuildingType.Reservoir, name: "Reservoir" },
    { id: BuildingType.LumberMill, name: "Lumber Mill" },
    { id: BuildingType.Academy, name: "Academy" },
    { id: BuildingType.CityWard, name: "City Ward" },
    { id: BuildingType.Forgeworks, name: "Forgeworks" },
    { id: BuildingType.CitySquare, name: "City Square" },
    { id: BuildingType.TitansCore, name: "Titan's Core" },
    { id: BuildingType.SpiritObservatory, name: "Spirit Observatory" },
    { id: BuildingType.JadeGranary, name: "Jade Granary" },
];

const PROJECT_OPTIONS: BuildOption<ProjectId>[] = [
    { id: ProjectId.Observatory, name: "Observatory" },
    { id: ProjectId.GrandAcademy, name: "Grand Academy" },
    { id: ProjectId.GrandExperiment, name: "Grand Experiment" },
    { id: ProjectId.FormArmy_SpearGuard, name: "Form Army (Spear)" },
    { id: ProjectId.FormArmy_BowGuard, name: "Form Army (Bow)" },
    { id: ProjectId.FormArmy_Riders, name: "Form Army (Riders)" },
    { id: ProjectId.HarvestFestival, name: "Harvest Festival" },
    { id: ProjectId.AlchemicalExperiments, name: "Alchemical Experiments" },
];

export const useCityBuildOptions = (city: City | null, gameState: GameState): CityBuildOptions => {
    return React.useMemo(() => {
        if (!city) {
            return {
                units: [] as BuildOption<UnitType>[],
                buildings: [] as BuildOption<BuildingType>[],
                projects: [] as BuildOption<ProjectId>[],
            };
        }

        return {
            units: UNIT_OPTIONS.filter(option => canBuild(city, "Unit", option.id, gameState)),
            buildings: BUILDING_OPTIONS.filter(option => canBuild(city, "Building", option.id, gameState)),
            projects: PROJECT_OPTIONS.filter(option => canBuild(city, "Project", option.id, gameState)),
        };
    }, [city, gameState]);
};

