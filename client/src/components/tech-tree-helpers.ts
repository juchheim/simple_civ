import { BUILDINGS, BuildingType, EraId, Player, TECHS, TechData, TechId, UNITS, UnitType } from "@simple-civ/engine";
import { formatName } from "../utils/strings";

type BuildingUnlockInfo = {
    name: string;
    stats: string;
};

export type UnlockInfo = {
    type: string;
    name: string;
    stats: string;
};

export type TechState = "current" | "researched" | "available" | "locked";

export type EraActivation = {
    hearthCount: number;
    bannerCount: number;
    engineCount: number;
    isHearthActive: boolean;
    isBannerActive: boolean;
    isEngineActive: boolean;
    isAetherActive: boolean;
};

const CIV_SPECIFIC_BUILDING_ACCESS: Partial<Record<BuildingType, string[]>> = {
    [BuildingType.Bulwark]: ["ScholarKingdoms", "StarborneSeekers"],
    [BuildingType.JadeGranary]: ["JadeCovenant"],
    [BuildingType.TitansCore]: ["AetherianVanguard"],
};

export const HEARTH_TECHS: TechId[] = [
    TechId.Fieldcraft,
    TechId.StoneworkHalls,
    TechId.ScriptLore,
    TechId.FormationTraining,
    TechId.TrailMaps,
];

export const BANNER_TECHS: TechId[] = [
    TechId.Wellworks,
    TechId.TimberMills,
    TechId.ScholarCourts,
    TechId.DrilledRanks,
    TechId.CityWards,
];

export const ENGINE_TECHS: TechId[] = [
    TechId.UrbanPlans,
    TechId.SteamForges,
    TechId.SignalRelay,
    TechId.ArmyDoctrine,
    TechId.StarCharts,
];

export const AETHER_TECHS: TechId[] = [
    TechId.ZeroPointEnergy,
    TechId.Aerodynamics,
    TechId.PlasmaShields,
    TechId.CompositeArmor,
    TechId.DimensionalGate,
];

export function canCivSeeBuildingUnlock(civName: string, buildingId: BuildingType): boolean {
    const allowedCivs = CIV_SPECIFIC_BUILDING_ACCESS[buildingId];
    if (!allowedCivs) return true;
    return allowedCivs.includes(civName);
}

export function canResearchTech(techId: TechId, researchedTechs: TechId[]): boolean {
    const tech = TECHS[techId];
    if (!tech) return false;
    if (researchedTechs.includes(techId)) return false;

    for (const req of tech.prereqTechs) {
        if (!researchedTechs.includes(req)) return false;
    }

    if (tech.era === EraId.Banner) {
        const hearthCount = researchedTechs.filter(id => TECHS[id].era === EraId.Hearth).length;
        if (hearthCount < 3) return false;
    }

    if (tech.era === EraId.Engine) {
        const bannerCount = researchedTechs.filter(id => TECHS[id].era === EraId.Banner).length;
        if (bannerCount < 2) return false;
    }

    if (tech.era === EraId.Aether) {
        const engineCount = researchedTechs.filter(id => TECHS[id].era === EraId.Engine).length;
        if (engineCount < 2) return false;
    }

    return true;
}

export function getTechStateForPlayer(techId: TechId, player: Pick<Player, "techs" | "currentTech">): TechState {
    const isCurrent = player.currentTech?.id === techId;
    const researched = player.techs.includes(techId);
    const available = canResearchTech(techId, player.techs);

    if (isCurrent) return "current";
    if (researched) return "researched";
    if (available) return "available";
    return "locked";
}

export function getEraActivation(techs: TechId[]): EraActivation {
    const hearthCount = techs.filter(id => TECHS[id].era === EraId.Hearth).length;
    const bannerCount = techs.filter(id => TECHS[id].era === EraId.Banner).length;
    const engineCount = techs.filter(id => TECHS[id].era === EraId.Engine).length;

    return {
        hearthCount,
        bannerCount,
        engineCount,
        isHearthActive: true,
        isBannerActive: hearthCount >= 3,
        isEngineActive: bannerCount >= 2,
        isAetherActive: engineCount >= 2,
    };
}

export function getCompactBuildingStats(buildingId: BuildingType): string {
    const building = BUILDINGS[buildingId];
    if (!building) return "";

    const parts: string[] = [];
    if (building.yieldFlat?.F) parts.push(`+${building.yieldFlat.F}F`);
    if (building.yieldFlat?.P) parts.push(`+${building.yieldFlat.P}P`);
    if (building.yieldFlat?.S) parts.push(`+${building.yieldFlat.S}S`);

    const baseGold = building.yieldFlat?.G ?? 0;
    const upkeep = building.maintenance ?? 0;
    if (baseGold > 0 && upkeep > 0) {
        const netGold = baseGold - upkeep;
        parts.push(`${netGold >= 0 ? "+" : ""}${netGold}G net`);
    } else if (baseGold > 0) {
        parts.push(`+${baseGold}G`);
    } else if (upkeep > 0) {
        parts.push(`-${upkeep}G`);
    }

    if (building.defenseBonus) parts.push(`+${building.defenseBonus}Def`);
    if (building.cityAttackBonus) parts.push(`+${building.cityAttackBonus}Atk`);
    if (building.growthMult) parts.push(`+${Math.round((1 - building.growthMult) * 100)}%Gro`);
    return parts.join(" ");
}

export function getAdditionalBuildingUnlocks(
    techId: TechId,
    civName: string,
    primaryUnlock?: string,
): BuildingUnlockInfo[] {
    return Object.entries(BUILDINGS)
        .filter(([buildingId, data]) => {
            if (data.techReq !== techId || buildingId === primaryUnlock) return false;
            return canCivSeeBuildingUnlock(civName, buildingId as BuildingType);
        })
        .map(([buildingId]) => {
            const id = buildingId as BuildingType;
            return {
                name: formatName(id),
                stats: getCompactBuildingStats(id),
            };
        });
}

export function getCivUniqueBuilding(techId: TechId, civName: string): BuildingUnlockInfo | null {
    if (civName === "JadeCovenant" && techId === TechId.Fieldcraft) {
        return { name: "Jade Granary", stats: getCompactBuildingStats(BuildingType.JadeGranary) };
    }
    if (civName === "AetherianVanguard" && techId === TechId.SteamForges) {
        return { name: "Titan's Core", stats: getCompactBuildingStats(BuildingType.TitansCore) };
    }
    if ((civName === "ScholarKingdoms" || civName === "StarborneSeekers") && techId === TechId.StoneworkHalls) {
        return { name: "Bulwark", stats: getCompactBuildingStats(BuildingType.Bulwark) };
    }
    return null;
}

export function getUnlockInfo(tech: TechData): UnlockInfo {
    if (tech.unlock.type === "Unit") {
        const unit = UNITS[tech.unlock.id as UnitType];
        if (!unit) return { type: "Unit", name: formatName(tech.unlock.id), stats: "" };
        const stats = `${unit.atk}/${unit.def}/${unit.move}${unit.rng > 1 ? `/${unit.rng}r` : ""}`;
        return { type: "Unit", name: formatName(tech.unlock.id), stats };
    }

    if (tech.unlock.type === "Building") {
        return {
            type: "Bldg",
            name: formatName(tech.unlock.id),
            stats: getCompactBuildingStats(tech.unlock.id as BuildingType),
        };
    }

    if (tech.unlock.type === "Passive") {
        return { type: "Bonus", name: tech.unlock.key, stats: "" };
    }

    return { type: "Project", name: formatName(tech.unlock.id), stats: "" };
}
