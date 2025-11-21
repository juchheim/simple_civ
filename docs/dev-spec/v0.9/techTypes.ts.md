export type TechEra = "Hearth" | "Banner" | "Engine";

export type TechID =
  | "Fieldcraft" | "StoneworkHalls" | "ScriptLore" | "FormationTraining" | "TrailMaps"
  | "Wellworks" | "TimberMills" | "ScholarCourts" | "DrilledRanks" | "CityWards"
  | "SteamForges" | "SignalRelay" | "UrbanPlans" | "ArmyDoctrine" | "StarCharts";

export type Tech = {
  id: TechID;
  era: TechEra;
  costS: number;
  prereqs: TechID[];
  unlock: { kind:"Building"|"Unit"|"Project"|"Passive", id:string };
  tags: string[];
};

export type ResearchState = {
  currentTechId?: TechID;
  progressS: number;
  completed: Set<TechID>;
};