import { Action } from "../../core/types.js";

export type MoveUnitAction = Extract<Action, { type: "MoveUnit" }>;
export type AttackAction = Extract<Action, { type: "Attack" }>;
export type LinkUnitsAction = Extract<Action, { type: "LinkUnits" }>;
export type UnlinkUnitsAction = Extract<Action, { type: "UnlinkUnits" }>;
export type SwapUnitsAction = Extract<Action, { type: "SwapUnits" }>;
export type FortifyUnitAction = Extract<Action, { type: "FortifyUnit" }>;
export type DisbandUnitAction = Extract<Action, { type: "DisbandUnit" }>;
export type SetAutoMoveTargetAction = Extract<Action, { type: "SetAutoMoveTarget" }>;
export type ClearAutoMoveTargetAction = Extract<Action, { type: "ClearAutoMoveTarget" }>;
export type SetAutoExploreAction = Extract<Action, { type: "SetAutoExplore" }>;
export type ClearAutoExploreAction = Extract<Action, { type: "ClearAutoExplore" }>;

export type UnitAutomationAction =
    | SetAutoMoveTargetAction
    | ClearAutoMoveTargetAction
    | SetAutoExploreAction
    | ClearAutoExploreAction;

export type UnitAction =
    | MoveUnitAction
    | AttackAction
    | LinkUnitsAction
    | UnlinkUnitsAction
    | SwapUnitsAction
    | FortifyUnitAction
    | DisbandUnitAction
    | UnitAutomationAction;
