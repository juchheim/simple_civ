export enum BuildingType {
  Farmstead="Farmstead",
  StoneWorkshop="StoneWorkshop",
  Scriptorium="Scriptorium",
  Reservoir="Reservoir",
  LumberMill="LumberMill",
  Academy="Academy",
  CityWard="CityWard",
  Forgeworks="Forgeworks",
  CitySquare="CitySquare",
}

export enum ProjectType {
  Observatory="Observatory",
  GrandAcademy="GrandAcademy",
  GrandExperiment="GrandExperiment",
  FormArmy="FormArmy", // parameterized by unit type
}

export type City = {
  id: string;
  ownerPlayerId: string;
  name: string;
  coord: import("./mapTypes").TileCoord; // city center tile
  pop: number;
  storedFood: number;
  storedProd: number;
  currentBuild?: {
    kind: "Unit" | "Building" | "Project";
    id: string;            // UnitType | BuildingType | ProjectType
    param?: any;           // e.g. FormArmy(unitType)
    costP: number;
    investedP: number;
    finished: boolean;
  };
  buildings: Set<BuildingType>;
  workedTiles: import("./mapTypes").TileCoord[];
  isCapital: boolean;
  pendingSpawnQueue: UnitType[]; // v0.7 spawn delay
};