import { VictoryType } from "../types/gameTypes";

export function checkConquestVictory(game:any): { winnerId?:string } {
  const alivePlayers = Object.keys(game.players).filter(pid=>!game.players[pid].eliminated);
  for (const pid of alivePlayers) {
    const ownsAllCaps = alivePlayers.every(other=>{
      if (other===pid) return true;
      return game.capitals[other] && game.cities[game.capitals[other]].ownerPlayerId===pid;
    });
    if (ownsAllCaps) return {winnerId: pid};
  }
  return {};
}

export function checkProgressVictory(game:any): { winnerId?:string } {
  for (const pid of Object.keys(game.players)) {
    if (game.progressMilestones[pid]?.GrandExperiment) {
      if (playerHasAnyCity(pid, game)) return {winnerId: pid};
    }
  }
  return {};
}

export function resolveEndOfRoundVictory(game:any): { type?:VictoryType, winnerId?:string } {
  const prog = checkProgressVictory(game);
  const conq = checkConquestVictory(game);

  if (prog.winnerId) return {type:VictoryType.Progress, winnerId:prog.winnerId};
  if (conq.winnerId) return {type:VictoryType.Conquest, winnerId:conq.winnerId};

  return {};
}

export function score(playerId:string, game:any): number {
  const pop = totalPopulation(playerId, game);
  const cities = playerCities(playerId, game).length;
  const techs = game.research[playerId].completed.size;
  return pop + cities + techs;
}