import type { Action, City, GameState } from "../../core/types.js";
import type { MoveAttackPlan, PlannedAttack } from "./attack-order.js";
import { getCityValueProfile } from "./tactical-threat.js";

export type DefenseMoveIntent = "garrison" | "support" | "retreat";

type MoveAction = Extract<Action, { type: "MoveUnit" }>;
type FortifyAction = Extract<Action, { type: "FortifyUnit" }>;

export type DefenseMovePlan = {
    intent: DefenseMoveIntent;
    unitId: string;
    action: MoveAction | FortifyAction;
    score: number;
    cityId?: string;
    reason: string;
};

export type DefenseAttackPlan = {
    intent: "attack" | "move-attack";
    unitId: string;
    score: number;
    wouldKill: boolean;
    plan: PlannedAttack | MoveAttackPlan;
    cityId?: string;
    reason: string;
};

export const DEFENSE_THREAT_WEIGHT: Record<"none" | "probe" | "raid" | "assault", number> = {
    none: 10,
    probe: 40,
    raid: 80,
    assault: 120,
};

export function getDefenseCityValueBonus(state: GameState, playerId: string, city: City): number {
    const value = getCityValueProfile(state, playerId, city);
    return Math.min(60, Math.round(value.totalValue * 0.05));
}

export function scoreDefenseMove(
    threat: "none" | "probe" | "raid" | "assault",
    distance: number,
    cityValueBonus: number = 0
): number {
    const base = DEFENSE_THREAT_WEIGHT[threat] ?? 0;
    return base + cityValueBonus - (distance * 2);
}
