import { BuildingType } from "../types/cityTypes";

export const BUILDING_COSTS: Record<BuildingType, number> = {
  Farmstead:40, StoneWorkshop:40, Scriptorium:40,
  Reservoir:60, LumberMill:60, Academy:60, CityWard:60,
  Forgeworks:80, CitySquare:80,
};

export const BUILDING_EFFECTS = {
  Farmstead: { cityYields:{F:+1}, growthCostMult:0.9 },
  StoneWorkshop: { cityYields:{P:+1} },
  Scriptorium: { cityYields:{S:+1} },
  Reservoir: { cityYields:{F:+1}, riverCityBonusF:+1 },
  LumberMill: { cityYields:{P:+1}, forestWorkedBonusP:+1 },
  Academy: { cityYields:{S:+2} },
  CityWard: { cityDefenseBonus:+4, cityAttackBonus:+1 },
  Forgeworks: { cityYields:{P:+2} },
  CitySquare: { cityYields:{F:+1, P:+1} },
};