export type CivTrait = {
  id: string;
  description: string;
  applyCityYieldBonus?: (ctx:any) => import("./gameTypes").Yields;
  applyTileYieldBonus?: (ctx:any) => import("./gameTypes").Yields;
};

export type Civ = {
  id: import("./gameTypes").CivID;
  trait: CivTrait;
};