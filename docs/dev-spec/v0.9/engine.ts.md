import { computeCityYields, applyGrowth, applyProduction } from "./rules/economy";
import { applyResearch } from "./rules/tech";
import { resolveEndOfRoundVictory } from "./rules/victory";

export function takeTurn(playerId:string, game:any, rng:any): void {
  // 1) Start of Turn
  for (const city of playerCities(playerId, game)) {
    const {total} = computeCityYields(city, game.map.tiles, game.civCtx[playerId]);

    applyGrowth(city, total.F);
    applyProduction(city, total.P);

    // handle finished build
    if (city.currentBuild?.finished) resolveBuildCompletion(city, game);
  }

  // empire science
  const sciPerTurn = totalScience(playerId, game);
  const {completedTechId} = applyResearch(game.research[playerId], sciPerTurn);
  if (completedTechId) applyTechUnlock(playerId, completedTechId, game);

  // 2) Planning Phase is UI-driven (engine validates locked rules)

  // 3) Action Phase is UI-driven (engine enforces move/attack limits)

  // 4) End of Turn: nothing besides pass
}

export function endOfRound(game:any): void {
  const victory = resolveEndOfRoundVictory(game);
  if (victory.winnerId) {
    game.winner = victory;
    return;
  }
  eliminationSweep(game);
}

function eliminationSweep(game:any) {
  for (const pid of Object.keys(game.players)) {
    if (playerCities(pid, game).length === 0) {
      game.players[pid].eliminated = true;
      removeAllUnits(pid, game);
    }
  }
}