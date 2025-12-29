import { canBuild } from "../../rules.js";
import { City, GameState, UnitType } from "../../../core/types.js";
import { aiInfo } from "../../ai/debug-logging.js";
import { getBestUnitForRole } from "../strategic-plan.js";
import type { BuildOption, ProductionContext } from "../production.js";

type GapKey = "siege" | "capture" | "defense" | "vision";

const GAP_LOG_LABELS: Record<GapKey, string> = {
    siege: "siege",
    capture: "capture",
    defense: "defense",
    vision: "vision",
};

function resolveGapUnit(
    context: ProductionContext,
    priority: GapKey
): { unit: UnitType | null; remaining: number } {
    const { gaps, unlockedUnits } = context;

    switch (priority) {
        case "siege":
            return { unit: getBestUnitForRole("siege", unlockedUnits), remaining: gaps.needSiege };
        case "capture":
            return { unit: getBestUnitForRole("capture", unlockedUnits), remaining: gaps.needCapture };
        case "defense":
            return { unit: getBestUnitForRole("defense", unlockedUnits), remaining: gaps.needDefense };
        case "vision":
            return { unit: getBestUnitForRole("vision", unlockedUnits), remaining: gaps.needVision };
    }
}

export function pickCapabilityGapBuild(
    state: GameState,
    city: City,
    context: ProductionContext
): BuildOption | null {
    const { gaps, profile } = context;

    if (gaps.priority === "garrison") return null;

    const priority = gaps.priority as GapKey;
    const { unit: targetUnit, remaining } = resolveGapUnit(context, priority);

    if (remaining > 0) {
        aiInfo(`[AI Build] ${profile.civName} GAP: Need ${GAP_LOG_LABELS[priority]} (${remaining})`);
    }

    if (targetUnit && canBuild(city, "Unit", targetUnit, state)) {
        return { type: "Unit", id: targetUnit };
    }

    return null;
}
