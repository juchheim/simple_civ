import { canBuild } from "../../rules.js";
import { City, GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { getAiMemoryV2 } from "../memory.js";
import type { BuildOption, ProductionContext } from "../production.js";

/**
 * Proactive Reinforcement:
 * Even if we have "enough" units by standard metrics, if we are at WAR or STAGING,
 * we should assume we will take losses and keep the production queue moving.
 * 
 * This prevents the "stop-and-go" production where AI waits for units to die before building more.
 */
export function pickProactiveReinforcementBuild(
    state: GameState,
    playerId: string,
    city: City,
    context: ProductionContext
): BuildOption | null {
    const { atWar } = context;
    const memory = getAiMemoryV2(state, playerId);

    // Condition 1: Must be effectively at war (actual war state OR staging for an attack)
    const isStaging = !!memory.focusTargetPlayerId;
    if (!atWar && !isStaging) return null;

    // Condition 2: Respect economy state and civ-specific deficit tolerance.
    const economy = context.economy;
    if (economy.economyState === "Crisis") return null;
    if (economy.netGold < 0 && economy.deficitRiskTurns <= context.profile.economy.deficitToleranceTurns) return null;
    const upkeepOverLimit = economy.upkeepRatio > context.profile.economy.upkeepRatioLimit;
    const hasWarChest = economy.treasury >= (economy.reserveFloor + 30);
    const hasEconomicHeadroom = economy.netGold >= 3 || (economy.netGold >= 0 && hasWarChest);
    if (!isStaging && upkeepOverLimit && !hasEconomicHeadroom) return null;

    // Condition 3: Context-sensitive military cap.
    // Jade runs wide and can over-spend if treated like full conquest aggressors.
    const civName = context.profile.civName;
    const isDefensive = ["ScholarKingdoms", "StarborneSeekers"].includes(civName);
    const capPerCity = civName === "JadeCovenant"
        ? 4.4
        : (isDefensive ? 2.5 : 6.0);

    const militaryCount = context.myMilitaryUnits.length;
    const cityCount = context.myCities.length;

    // If we have "enough" units, stop building more.
    if (militaryCount > cityCount * capPerCity) return null;

    // If we are here, we are at war/staging, have money, and space. BUILD!
    // We defaults to the 3:2:1 composition logic by "forcing" a fallback-like choice.

    const unlockedUnits = context.unlockedUnits;
    const profile = context.profile;

    // Reuse a simplified version of the 3:2:1 logic
    const spearCount = context.myMilitaryUnits.filter(u => u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard).length;
    const bowCount = context.myMilitaryUnits.filter(u => u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard).length;
    const riderCount = context.myMilitaryUnits.filter(u => u.type === UnitType.Riders || u.type === UnitType.ArmyRiders).length;

    // Target ratios vary by civ type:
    // - Conquest-heavy civs (Forge/River/Aetherian): 2:2:1.5 (more riders for flanking)
    // - Others, including Jade: 3:2:1 (standard)
    // We just pick the one that is most "behind" relative to the others
    // Normalize: Spear/ratio, Bow/ratio, Rider/ratio. Lowest number needs the most help.

    const isAggressive = ["ForgeClans", "RiverLeague", "AetherianVanguard"].includes(profile.civName);
    const spearRatio = isAggressive ? 2.0 : 3.0;
    const bowRatio = 2.0;
    const riderRatio = isAggressive ? 1.5 : 1.0; // More riders for aggressive civs

    const sScore = spearCount / spearRatio;
    const bScore = bowCount / bowRatio;
    const rScore = riderCount / riderRatio;

    let targetUnit: UnitType | null = null;
    let typeName = "";

    // Pick lowest score
    if (rScore <= sScore && rScore <= bScore) {
        // Riders needed
        if (unlockedUnits.includes(UnitType.ArmyRiders)) targetUnit = UnitType.ArmyRiders;
        else if (unlockedUnits.includes(UnitType.Riders)) targetUnit = UnitType.Riders;
        typeName = "Riders";
    }

    if (!targetUnit && bScore <= sScore) {
        // Bows needed (or riders failed)
        if (unlockedUnits.includes(UnitType.ArmyBowGuard)) targetUnit = UnitType.ArmyBowGuard;
        else if (unlockedUnits.includes(UnitType.BowGuard)) targetUnit = UnitType.BowGuard;
        typeName = "Bow";
    }

    if (!targetUnit) {
        // Spears needed (or others failed)
        if (unlockedUnits.includes(UnitType.ArmySpearGuard)) targetUnit = UnitType.ArmySpearGuard;
        else if (unlockedUnits.includes(UnitType.SpearGuard)) targetUnit = UnitType.SpearGuard;
        typeName = "Spear";
    }

    if (targetUnit && canBuild(city, "Unit", targetUnit, state)) {
        aiInfo(`[AI Build] ${profile.civName} PROACTIVE WAR (${atWar ? "War" : "Staging"}): Anticipating losses, building ${typeName} (${targetUnit})`);
        return { type: "Unit", id: targetUnit };
    }

    return null;
}
