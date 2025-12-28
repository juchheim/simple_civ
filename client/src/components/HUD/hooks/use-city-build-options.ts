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
    { id: UnitType.ArmySpearGuard, name: "Army Spear Guard" },
    { id: UnitType.ArmyBowGuard, name: "Army Bow Guard" },
    { id: UnitType.ArmyRiders, name: "Army Riders" },
    { id: UnitType.Lorekeeper, name: "Lorekeeper" },
    { id: UnitType.Skiff, name: "Skiff" },
    { id: UnitType.Settler, name: "Settler" },
    // v6.0: Aether Era units
    { id: UnitType.Landship, name: "Landship" },
    { id: UnitType.Airship, name: "Airship" },
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

    { id: BuildingType.JadeGranary, name: "Jade Granary" },
    { id: BuildingType.Bulwark, name: "Bulwark" },
    // v6.0: Aether Era buildings
    { id: BuildingType.AetherReactor, name: "Aether Reactor" },
    { id: BuildingType.ShieldGenerator, name: "Shield Generator" },
];

const PROJECT_OPTIONS: BuildOption<ProjectId>[] = [
    { id: ProjectId.Observatory, name: "Observatory" },
    { id: ProjectId.GrandAcademy, name: "Grand Academy" },
    { id: ProjectId.GrandExperiment, name: "Grand Experiment" },
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

