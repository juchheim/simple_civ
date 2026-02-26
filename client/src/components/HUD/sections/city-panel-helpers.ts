import {
    BuildingType,
    BUILDINGS,
    City,
    ECONOMIC_BUILDING_SUPPLY_BONUS,
    GameState,
    getProjectCost,
    getUnitCost,
    isTileAdjacentToRiver,
    OverlayType,
    ProjectId,
    PROJECTS,
    UnitType,
    UNITS
} from "@simple-civ/engine";
import { hexDistance } from "../../../utils/hex";

export const formatBuildId = (id: string) => {
    return id
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim();
};

export const getCityUpkeep = (city: City): number => {
    return city.buildings.reduce((sum, building) => sum + (BUILDINGS[building]?.maintenance ?? 0), 0);
};

export const getCityRushBuyDiscountPct = (city: City): number => {
    return city.buildings.reduce((maxDiscount, building) => {
        return Math.max(maxDiscount, BUILDINGS[building]?.rushBuyDiscountPct ?? 0);
    }, 0);
};

export const getCityRushBuyGoldCost = (city: City, remainingProduction: number): number => {
    const remaining = Math.max(0, Math.floor(remainingProduction));
    if (remaining <= 0) return 0;
    const discountPct = getCityRushBuyDiscountPct(city);
    if (discountPct <= 0) return remaining;
    return Math.max(0, Math.ceil(remaining * (1 - discountPct / 100)));
};

export const isProgressProject = (projectId: string): boolean => {
    return projectId === ProjectId.Observatory || projectId === ProjectId.GrandAcademy || projectId === ProjectId.GrandExperiment;
};

export const isUniqueCompletionBuild = (type: "Unit" | "Building" | "Project", id: string): boolean => {
    if (type === "Building") {
        return id === BuildingType.JadeGranary || id === BuildingType.Bulwark || id === BuildingType.TitansCore;
    }
    if (type === "Project") {
        const data = PROJECTS[id as ProjectId];
        return !!data?.oncePerCiv;
    }
    return false;
};

export const buildUnitTooltip = (unitId: UnitType, turn: number): string => {
    const stats = UNITS[unitId];
    if (!stats) return "";
    const actualCost = getUnitCost(unitId, turn);
    const lines: string[] = [];
    if (actualCost !== stats.cost) {
        lines.push(`Cost: ${actualCost} Production (base: ${stats.cost})`);
    } else {
        lines.push(`Cost: ${stats.cost} Production`);
    }
    lines.push(`Attack: ${stats.atk} | Defense: ${stats.def} | HP: ${stats.hp}`);
    lines.push(`Move: ${stats.move} | Range: ${stats.rng} | Vision: ${stats.vision}`);
    if (stats.canCaptureCity) lines.push("Can capture cities");
    return lines.join("\n");
};

const getGoldConditionalBonus = (buildingId: BuildingType, city: City, gameState: GameState): { active: boolean; bonus: number } | null => {
    if (buildingId === BuildingType.TradingPost) {
        const active = isTileAdjacentToRiver(gameState.map, city.coord);
        return { active, bonus: active ? 1 : 0 };
    }
    if (buildingId === BuildingType.MarketHall) {
        const active = city.pop >= 5;
        return { active, bonus: active ? 1 : 0 };
    }
    if (buildingId === BuildingType.Bank) {
        const active = city.workedTiles.some(coord => {
            const tile = gameState.map.tiles.find(t => t.coord.q === coord.q && t.coord.r === coord.r);
            return !!tile?.overlays.includes(OverlayType.OreVein);
        });
        return { active, bonus: active ? 1 : 0 };
    }
    return null;
};

export const buildBuildingTooltip = (buildingId: BuildingType, city: City, gameState: GameState): string => {
    const data = BUILDINGS[buildingId];
    if (!data) return "";
    const lines = [`Cost: ${data.cost} Production`];
    const baseGold = data.yieldFlat?.G ?? 0;
    const upkeep = data.maintenance ?? 0;
    const yields = [];
    if (data.yieldFlat?.F) yields.push(`+${data.yieldFlat.F} Food`);
    if (data.yieldFlat?.P) yields.push(`+${data.yieldFlat.P} Production`);
    if (data.yieldFlat?.S) yields.push(`+${data.yieldFlat.S} Science`);
    if (yields.length > 0) lines.push(yields.join(", "));
    if (baseGold > 0) {
        const baseNetGold = baseGold - upkeep;
        lines.push(`Gold: ${baseNetGold >= 0 ? "+" : ""}${baseNetGold} net/turn`);
        if (upkeep > 0) {
            lines.push(`Breakdown: +${baseGold} income, -${upkeep} upkeep`);
        }
    } else if (upkeep > 0) {
        lines.push(`Upkeep: ${upkeep} Gold/turn`);
    }
    const supplyBonus = ECONOMIC_BUILDING_SUPPLY_BONUS[buildingId] ?? 0;
    if (supplyBonus > 0) lines.push(`+${supplyBonus} Free Military Supply`);
    if (data.rushBuyDiscountPct) lines.push(`Rush-Buy Discount: -${data.rushBuyDiscountPct}% in this city`);
    if (data.defenseBonus) lines.push(`+${data.defenseBonus} City Defense`);
    if (data.cityAttackBonus) lines.push(`+${data.cityAttackBonus} City Attack`);
    if (data.growthMult) lines.push(`${Math.round((1 - data.growthMult) * 100)}% faster growth`);
    if (data.conditional) lines.push(data.conditional);

    const conditional = getGoldConditionalBonus(buildingId, city, gameState);
    if (conditional) {
        lines.push(`Conditional now: ${conditional.active ? "Active" : "Inactive"} (${conditional.bonus > 0 ? "+" : ""}${conditional.bonus} Gold)`);
        const netGoldNow = baseGold + conditional.bonus - upkeep;
        lines.push(`Gold now: ${netGoldNow >= 0 ? "+" : ""}${netGoldNow} net/turn`);
    }

    return lines.join("\n");
};

export const buildProjectTooltip = (projectId: ProjectId, turn: number): string => {
    const data = PROJECTS[projectId];
    if (!data) return "";
    const actualCost = getProjectCost(projectId, turn);
    const lines: string[] = [];
    if (data.scalesWithTurn && actualCost !== data.cost) {
        lines.push(`Cost: ${actualCost} Production (base: ${data.cost})`);
    } else {
        lines.push(`Cost: ${data.cost} Production`);
    }
    const effect = data.onComplete;
    if (effect.type === "Milestone") {
        if (effect.payload.scienceBonusCity) lines.push(`+${effect.payload.scienceBonusCity} Science in this city`);
        if (effect.payload.scienceBonusPerCity) lines.push(`+${effect.payload.scienceBonusPerCity} Science per city`);
        if (effect.payload.unlock) lines.push(`Unlocks: ${formatBuildId(effect.payload.unlock)}`);
    } else if (effect.type === "Victory") {
        lines.push("Completes Progress Victory!");
    } else if (effect.type === "Transform") {
        lines.push(`Upgrades ${formatBuildId(effect.payload.baseUnit)} to ${formatBuildId(effect.payload.armyUnit)}`);
    } else if (effect.type === "GrantYield") {
        const grant = effect.payload;
        if (grant.F) lines.push(`Grants +${grant.F} Food`);
        if (grant.S) lines.push(`Grants +${grant.S} Science`);
    }
    return lines.join("\n");
};

export const getOwnedTilesForCity = (city: City, tiles: GameState["map"]["tiles"]) => {
    const byCityClaim = tiles.filter(tile => tile.ownerCityId === city.id);
    const fallbackRange = tiles.filter(tile => tile.ownerId === city.ownerId && hexDistance(tile.coord, city.coord) <= 2);
    const tilesForMap = byCityClaim.length > 0 ? byCityClaim : fallbackRange;
    const hasCenter = tilesForMap.some(t => t.coord.q === city.coord.q && t.coord.r === city.coord.r);
    if (hasCenter) return tilesForMap;

    const centerTile = tiles.find(t => t.coord.q === city.coord.q && t.coord.r === city.coord.r);
    return centerTile ? [centerTile, ...tilesForMap] : tilesForMap;
};
