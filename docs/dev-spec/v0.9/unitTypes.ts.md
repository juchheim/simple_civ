export enum UnitClass {
  Civilian="Civilian",
  Scout="Scout",
  Melee="Melee",
  Ranged="Ranged",
  Cavalry="Cavalry",
  Naval="Naval"
}

export enum UnitType {
  Settler="Settler",
  Scout="Scout",
  SpearGuard="SpearGuard",
  BowGuard="BowGuard",
  Riders="Riders",
  RiverBoat="RiverBoat",
  // Armies are upgrade-state on base types:
}

export type UnitStats = {
  atk: number;
  def: number;
  range: number;
  move: number;
  maxHP: number;
  costP: number;
  class: UnitClass;
  canCaptureCity: boolean;
  domain: "Land" | "Naval";
};

export type Unit = {
  id: string;
  ownerPlayerId: string;
  type: UnitType;
  isArmy: boolean;
  hp: number;
  coord: import("./mapTypes").TileCoord;
  hasMovedThisTurn: boolean;
  hasAttackedThisTurn: boolean;
  fortified: boolean;
};