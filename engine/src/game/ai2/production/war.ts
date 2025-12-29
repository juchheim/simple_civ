import { canBuild } from "../../rules.js";
import { City, GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import type { BuildOption, ProductionContext } from "../production.js";

const SIEGE_FOCUSED_CIVS = ["ForgeClans", "RiverLeague", "JadeCovenant", "AetherianVanguard"];

export function pickTrebuchetProduction(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    const cityNotThreatened = context.thisCityThreat === "none" || context.thisCityThreat === "low";
    if (!context.atWar || !SIEGE_FOCUSED_CIVS.includes(context.profile.civName) || !cityNotThreatened) return null;

    const trebuchetsTotal = context.myUnits.filter(u => u.type === UnitType.Trebuchet).length;
    const militaryForCap = context.myMilitaryUnits.length;
    const trebuchetCap = Math.min(4, Math.max(2, Math.floor(militaryForCap / 4)));

    if (trebuchetsTotal < trebuchetCap) {
        if (canBuild(city, "Unit", UnitType.Trebuchet, state)) {
            aiInfo(`[AI Build] ${context.profile.civName} AT WAR: Trebuchet for siege (${trebuchetsTotal}/${trebuchetCap})`);
            return { type: "Unit", id: UnitType.Trebuchet };
        }
    }

    return null;
}
