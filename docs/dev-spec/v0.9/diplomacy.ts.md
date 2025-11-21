import { DiplomacyState } from "../types/gameTypes";

export function declareWar(attackerId:string, defenderId:string, game:any): void {
  game.diplomacy[attackerId][defenderId] = DiplomacyState.War;
  game.diplomacy[defenderId][attackerId] = DiplomacyState.War;
}

export function proposePeace(aId:string, bId:string, game:any): void {
  // No cooldowns. AI/human may accept on their turn.
}