export enum YieldType { Food="F", Production="P", Science="S" }

export type Yields = {
  F: number;
  P: number;
  S: number;
};

export enum GamePhase {
  StartOfTurn="StartOfTurn",
  Planning="Planning",
  Action="Action",
  EndOfTurn="EndOfTurn"
}

export enum VictoryType {
  Conquest="Conquest",
  Progress="Progress",
  ScoreTiebreak="ScoreTiebreak"
}

export enum DiplomacyState { Peace="Peace", War="War" }

export type PlayerID = string;
export type CityID = string;
export type UnitID = string;
export type CivID = "ForgeClans" | "ScholarKingdoms" | "RiverLeague";

export type RNG = () => number; // returns [0,1)