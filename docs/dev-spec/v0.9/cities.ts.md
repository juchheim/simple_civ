import { City, ProjectType } from "../types/cityTypes";
import { UNIT_STATS } from "../data/unitData";
import { PROJECT_COSTS } from "../data/projectData";

export function cityDefenseStrength(city:City): number {
  const base = 5;
  const popBonus = Math.floor(city.pop / 2);
  const wardBonus = city.buildings.has("CityWard" as any) ? 4 : 0;
  return base + popBonus + wardBonus;
}

export function cityAttackPower(city:City): number {
  const base = 3;
  const wardBonus = city.buildings.has("CityWard" as any) ? 1 : 0;
  return base + wardBonus;
}

export function canCaptureCity(unit:any): boolean {
  return UNIT_STATS[unit.type].canCaptureCity;
}

export function onCityCaptured(city:City): void {
  city.hp = 10; // reset to half
  city.pop = Math.max(1, city.pop - 1);
  // buildings retained
  // current project/build cancels elsewhere
}

export function razeCity(cityId:string, game:any): void {
  const city = game.cities[cityId];
  const centerTile = game.map.getTile(city.coord);

  // remove ownership/borders/links
  for (const t of game.map.tiles) {
    if (t.ownerCityId === cityId) t.ownerCityId = undefined;
  }

  centerTile.hasCityCenter = false;
  centerTile.ownerCityId = undefined;

  delete game.cities[cityId];
}

export function completeProject(city:City, projectId:ProjectType, game:any): void {
  if (projectId === "Observatory") {
    game.progressMilestones[city.ownerPlayerId].Observatory = true;
    city.buildings.add("Scriptorium" as any); // optional if you model Obs as building-like
  }
  if (projectId === "GrandAcademy") {
    game.progressMilestones[city.ownerPlayerId].GrandAcademy = true;
  }
  if (projectId === "GrandExperiment") {
    game.progressMilestones[city.ownerPlayerId].GrandExperiment = true;
    game.victoryPending = {type:"Progress", playerId: city.ownerPlayerId};
  }
}

export function projectCost(projectId:ProjectType, param?:any): number {
  if (projectId === "FormArmy") return Math.ceil(param.baseUnitCost * 0.5);
  return (PROJECT_COSTS as any)[projectId];
}