import { START_GUARANTEES } from "../data/mapGenParams";

export function placeStartingSettlers(players:any[], map:any, rng:any): void {
  // loop through players:
  //   - propose candidate zones
  //   - score via AI city site scoring
  //   - verify guarantees in radius
  //   - verify minCapitalDistance from prior starts
  // retry up to maxStartRetries else accept best available
}