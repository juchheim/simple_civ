import { Tech } from "../types/techTypes";

export const TECHS: Tech[] = [
  // Hearth (20)
  {id:"Fieldcraft", era:"Hearth", costS:20, prereqs:[], unlock:{kind:"Building", id:"Farmstead"}, tags:["growth"]},
  {id:"StoneworkHalls", era:"Hearth", costS:20, prereqs:[], unlock:{kind:"Building", id:"StoneWorkshop"}, tags:["production"]},
  {id:"ScriptLore", era:"Hearth", costS:20, prereqs:[], unlock:{kind:"Building", id:"Scriptorium"}, tags:["science"]},
  {id:"FormationTraining", era:"Hearth", costS:20, prereqs:[], unlock:{kind:"Passive", id:"MeleeDefPlus1"}, tags:["military"]},
  {id:"TrailMaps", era:"Hearth", costS:20, prereqs:[], unlock:{kind:"Unit", id:"Skiff"}, tags:["science","military"]},

  // Banner (50)
  {id:"Wellworks", era:"Banner", costS:50, prereqs:["Fieldcraft"], unlock:{kind:"Building", id:"Reservoir"}, tags:["growth"]},
  {id:"TimberMills", era:"Banner", costS:50, prereqs:["StoneworkHalls"], unlock:{kind:"Building", id:"LumberMill"}, tags:["production"]},
  {id:"ScholarCourts", era:"Banner", costS:50, prereqs:["ScriptLore"], unlock:{kind:"Building", id:"Academy"}, tags:["science"]},
  {id:"DrilledRanks", era:"Banner", costS:50, prereqs:["FormationTraining"], unlock:{kind:"Passive", id:"MeleeRangedAtkPlus1"}, tags:["military"]},
  {id:"CityWards", era:"Banner", costS:50, prereqs:["StoneworkHalls"], unlock:{kind:"Building", id:"CityWard"}, tags:["military","production"]},

  // Engine (85)
  {id:"SteamForges", era:"Engine", costS:85, prereqs:["TimberMills"], unlock:{kind:"Building", id:"Forgeworks"}, tags:["production"]},
  {id:"SignalRelay", era:"Engine", costS:85, prereqs:["ScholarCourts"], unlock:{kind:"Passive", id:"SciencePerCityPlus1"}, tags:["science"]},
  {id:"UrbanPlans", era:"Engine", costS:85, prereqs:["Wellworks"], unlock:{kind:"Building", id:"CitySquare"}, tags:["growth","production"]},
  {id:"ArmyDoctrine", era:"Engine", costS:85, prereqs:["DrilledRanks"], unlock:{kind:"Passive", id:"ArmiesEnabled"}, tags:["military"]},
  {id:"StarCharts", era:"Engine", costS:85, prereqs:["ScriptLore","ScholarCourts"], unlock:{kind:"Project", id:"Observatory"}, tags:["science","progress"]},
];

export const ERA_GATE_REQS = {
  Banner: { requiresEra:"Hearth", completedCount:2 },
  Engine: { requiresEra:"Banner", completedCount:2 },
};