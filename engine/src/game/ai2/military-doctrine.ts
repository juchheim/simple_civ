import { GameState } from "../../core/types.js";
import { getAiProfileV2 } from "./rules.js";

export type MilitaryDoctrineType = "SiegeBreaker" | "Swarm" | "Standard";

export type MilitaryDoctrine = {
    type: MilitaryDoctrineType;

    // City Siege Parameters
    breachThresholdRatio: number; // Ratio of force needed to ignore safety and breach (e.g. 1.2)
    cityAttackPriorityMult: number; // Multiplier for attacking breach target city
    ignoreCityArmor: boolean; // Accept bad trades against cities

    // Unit Combat Parameters
    flankingBonusMult: number; // Multiplier for seeking flanking positions
    unitCycleAggression: number; // 0-1, How aggressive to cycle wounded units (0=never, 1=always)
    preferredTradeRatio: number; // 1.0 = equal trade, 0.8 = willing to lose slightly more
};

const SIEGE_BREAKER: MilitaryDoctrine = {
    type: "SiegeBreaker",
    breachThresholdRatio: 1.2, // Aggressive: breach with only small advantage
    cityAttackPriorityMult: 5.0, // HUGE priority on city
    ignoreCityArmor: true, // Will suicide units to damage walls
    flankingBonusMult: 1.0,
    unitCycleAggression: 0.9, // Very aggressive cycling to keep pressure up
    preferredTradeRatio: 0.6 // Willing to take bad trades to win objective
};

const SWARM: MilitaryDoctrine = {
    type: "Swarm",
    breachThresholdRatio: 2.0, // Need overwhelming advantage to breach
    cityAttackPriorityMult: 1.5,
    ignoreCityArmor: false,
    flankingBonusMult: 3.0, // Huge bonus for flanking/surrounding
    unitCycleAggression: 0.5,
    preferredTradeRatio: 0.9
};

const STANDARD: MilitaryDoctrine = {
    type: "Standard",
    breachThresholdRatio: 2.5, // Conservative
    cityAttackPriorityMult: 2.0,
    ignoreCityArmor: false,
    flankingBonusMult: 1.5,
    unitCycleAggression: 0.3,
    preferredTradeRatio: 1.1 // Wants winning trades
};

export function getMilitaryDoctrine(state: GameState, playerId: string): MilitaryDoctrine {
    const profile = getAiProfileV2(state, playerId);

    // Assign doctrine based on Civilization personality/name
    switch (profile.civName) {
        case "ForgeClans":
            return SIEGE_BREAKER;

        case "JadeCovenant":
        case "RiverLeague":
        case "AetherianVanguard":
            return SWARM;

        case "ScholarKingdoms":
        case "StarborneSeekers":
        default:
            return STANDARD;
    }
}
