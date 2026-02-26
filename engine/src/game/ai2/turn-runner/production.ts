import { AiVictoryGoal, BuildingType, City, GameState, TerrainType } from "../../../core/types.js";
import { hexDistance } from "../../../core/hex.js";
import { tryAction } from "../../ai/shared/actions.js";
import { chooseCityBuildV2 } from "../production.js";
import { computeEconomySnapshot, type EconomySnapshot } from "../economy/budget.js";
import { runAiRushBuySpending } from "../economy/spending.js";
import { estimateGoldBuildingNetGain, pickEconomyBuilding } from "../production/economy.js";
import { getAiProfileV2 } from "../rules.js";
import { isTileAdjacentToRiver } from "../../../map/rivers.js";

function shouldForceEconomyRecovery(snapshot: EconomySnapshot): boolean {
    const supplyGap = snapshot.usedSupply - snapshot.freeSupply;
    const deepDeficit = snapshot.netGold <= -3;
    const strainedWithDeficitPressure = snapshot.economyState === "Strained"
        && (snapshot.netGold < -1 || snapshot.treasury < (snapshot.reserveFloor * 0.9));
    return snapshot.economyState === "Crisis"
        || strainedWithDeficitPressure
        || deepDeficit
        || supplyGap >= 3;
}

function isCoastalCity(state: GameState, city: City): boolean {
    const tiles = state.map?.tiles ?? [];
    return tiles.some(tile => {
        if (hexDistance(tile.coord, city.coord) !== 1) return false;
        return tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea;
    });
}

function getForcedEconomyCities(state: GameState, playerId: string, snapshot: EconomySnapshot): Set<string> {
    if (!shouldForceEconomyRecovery(snapshot)) {
        return new Set();
    }

    const profile = getAiProfileV2(state, playerId);
    const myCities = state.cities.filter(city => city.ownerId === playerId && !city.currentBuild);
    if (myCities.length === 0) {
        return new Set();
    }

    const scored: Array<{ city: City; score: number }> = [];
    for (const city of myCities) {
        const economyBuild = pickEconomyBuilding(
            state,
            playerId,
            city,
            profile.civName,
            snapshot,
            profile.economy.goldBuildBias
        );
        if (!economyBuild || economyBuild.type !== "Building") continue;

        const netGain = estimateGoldBuildingNetGain(state, city, economyBuild.id as BuildingType, snapshot);
        if (netGain <= 0) continue;
        const riverOrCoast = isTileAdjacentToRiver(state.map, city.coord) || isCoastalCity(state, city);
        const civBias = profile.civName === "RiverLeague"
            ? (riverOrCoast ? 1.35 : 0.9)
            : 1;
        scored.push({ city, score: netGain * civBias });
    }

    if (scored.length === 0) {
        return new Set();
    }

    scored.sort((a, b) => b.score - a.score || a.city.id.localeCompare(b.city.id));

    const supplyGap = snapshot.usedSupply - snapshot.freeSupply;
    const severeSupplyPressure = supplyGap >= 3;
    const activeSupplyPressure = supplyGap >= 1;

    const limit = snapshot.economyState === "Crisis" || severeSupplyPressure
        ? Math.max(1, Math.ceil((scored.length * 3) / 4))
        : activeSupplyPressure
            ? Math.max(1, Math.ceil((scored.length * 2) / 3))
            : Math.max(1, Math.ceil(scored.length / 2));
    return new Set(scored.slice(0, limit).map(entry => entry.city.id));
}

export function runCityBuilds(state: GameState, playerId: string, goal: AiVictoryGoal): GameState {
    let next = state;
    const economySnapshot = computeEconomySnapshot(next, playerId);
    const forcedEconomyCities = getForcedEconomyCities(next, playerId, economySnapshot);
    const profile = getAiProfileV2(next, playerId);
    const myCities = next.cities.filter(c => c.ownerId === playerId);

    for (const city of myCities) {
        if (city.currentBuild) continue;

        let opt = null;
        if (forcedEconomyCities.has(city.id)) {
            opt = pickEconomyBuilding(
                next,
                playerId,
                city,
                profile.civName,
                economySnapshot,
                profile.economy.goldBuildBias
            );
        }

        if (!opt) {
            opt = chooseCityBuildV2(next, playerId, city, goal, economySnapshot);
        }
        if (!opt) continue;

        next = tryAction(next, {
            type: "SetCityBuild",
            playerId,
            cityId: city.id,
            buildType: opt.type,
            buildId: opt.id,
            markAsHomeDefender: opt.markAsHomeDefender
        });
    }

    return runAiRushBuySpending(next, playerId);
}
