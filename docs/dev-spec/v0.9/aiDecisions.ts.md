export function aiChooseTech(playerId:string, game:any): string {
  // follow priorities:
  // - if Progress bias: path to StarCharts
  // - if Conquest bias: path to DrilledRanks/ArmyDoctrine
  // - else: cheapest useful tech
  return techId;
}

export function aiWarPeaceDecision(playerId:string, game:any): "DeclareWar"|"ProposePeace"|"None" {
  // Declare war if enemy city <=8 tiles AND power >= defender
  // Accept peace freely if losing OR Progress risk
  return "None";
}

export function aiVictoryBias(playerId:string, game:any): "Progress"|"Conquest" {
  // if Observatory done and capitals not falling quickly => Progress
  // if enemy capital in strike range & Armies => Conquest
  return "Balanced";
}