import { UnitType } from "../../../core/types.js";
import { isCombatUnitType } from "../schema.js";
import { getBestUnitForRole } from "../strategic-plan.js";

export type FallbackKind = "rider" | "bow" | "spear";

export type FallbackMixEntry = {
    kind: FallbackKind;
    deficit: number;
};

export type FallbackMixPlan = {
    baseline: number;
    deficitNote: string;
    entries: FallbackMixEntry[];
};

export function pickFallbackUnit(kind: FallbackKind, unlockedUnits: UnitType[]): UnitType | null {
    if (kind === "rider") {
        if (unlockedUnits.includes(UnitType.ArmyRiders)) return UnitType.ArmyRiders;
        if (unlockedUnits.includes(UnitType.Riders)) return UnitType.Riders;
        return null;
    }

    if (kind === "bow") {
        let unit = getBestUnitForRole("defense", unlockedUnits) ?? getBestUnitForRole("siege", unlockedUnits);
        if (unit && !String(unit).includes("Bow")) {
            if (unlockedUnits.includes(UnitType.ArmyBowGuard)) unit = UnitType.ArmyBowGuard;
            else if (unlockedUnits.includes(UnitType.BowGuard)) unit = UnitType.BowGuard;
        }
        return unit ?? null;
    }

    let unit = getBestUnitForRole("capture", unlockedUnits);
    if (unit && !String(unit).includes("Spear") && !String(unit).includes("Titan") && !String(unit).includes("Landship")) {
        if (unlockedUnits.includes(UnitType.ArmySpearGuard)) unit = UnitType.ArmySpearGuard;
        else if (unlockedUnits.includes(UnitType.SpearGuard)) unit = UnitType.SpearGuard;
    }
    return unit ?? null;
}

export function pickFallbackDefaultUnit(unlockedUnits: UnitType[]): UnitType {
    return getBestUnitForRole("capture", unlockedUnits) ?? UnitType.SpearGuard;
}

export function buildFallbackMixPlan(units: Array<{ type: UnitType }>): FallbackMixPlan {
    const myMilitary = units.filter(u => isCombatUnitType(u.type));

    const spearCount = myMilitary.filter(u => u.type === UnitType.SpearGuard || u.type === UnitType.ArmySpearGuard).length;
    const bowCount = myMilitary.filter(u => u.type === UnitType.BowGuard || u.type === UnitType.ArmyBowGuard).length;
    const riderCount = myMilitary.filter(u => u.type === UnitType.Riders || u.type === UnitType.ArmyRiders).length;
    const totalCount = spearCount + bowCount + riderCount;

    const baseline = Math.max(6, totalCount + 1);

    const targetSpear = Math.floor(baseline * (3 / 6));
    const targetBow = Math.floor(baseline * (2 / 6));
    const targetRider = Math.floor(baseline * (1 / 6));

    const spearDeficit = targetSpear - spearCount;
    const bowDeficit = targetBow - bowCount;
    const riderDeficit = targetRider - riderCount;
    const deficitNote = `S:${spearDeficit} B:${bowDeficit} R:${riderDeficit}`;

    const entries = [
        { kind: "rider" as const, deficit: riderDeficit, order: 0 },
        { kind: "bow" as const, deficit: bowDeficit, order: 1 },
        { kind: "spear" as const, deficit: spearDeficit, order: 2 },
    ].sort((a, b) => b.deficit - a.deficit || a.order - b.order)
        .map(({ kind, deficit }) => ({ kind, deficit }));

    return {
        baseline,
        deficitNote,
        entries,
    };
}
