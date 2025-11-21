import { ResearchState, TechID } from "../types/techTypes";
import { TECHS, ERA_GATE_REQS } from "../data/techData";

export function canResearchTech(state:ResearchState, techId:TechID): boolean {
  if (state.completed.has(techId)) return false;

  const tech = TECHS.find(t=>t.id===techId)!;

  // era gates
  if (tech.era === "Banner") {
    const hearthDone = TECHS.filter(t=>t.era==="Hearth" && state.completed.has(t.id)).length;
    if (hearthDone < ERA_GATE_REQS.Banner.completedCount) return false;
  }
  if (tech.era === "Engine") {
    const bannerDone = TECHS.filter(t=>t.era==="Banner" && state.completed.has(t.id)).length;
    if (bannerDone < ERA_GATE_REQS.Engine.completedCount) return false;
  }

  // prereqs
  for (const p of tech.prereqs) if (!state.completed.has(p)) return false;
  return true;
}

export function applyResearch(state:ResearchState, sciencePerTurn:number): { completedTechId?:TechID } {
  if (!state.currentTechId) return {};
  state.progressS += sciencePerTurn;

  const tech = TECHS.find(t=>t.id===state.currentTechId)!;
  if (state.progressS >= tech.costS) {
    state.completed.add(tech.id);
    state.currentTechId = undefined;
    state.progressS = 0;
    return {completedTechId: tech.id};
  }
  return {};
}