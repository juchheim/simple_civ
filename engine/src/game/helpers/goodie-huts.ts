import { GameState, HexCoord, OverlayType, Tile, Unit, UnitState, UnitType } from "../../core/types.js";
import { UNITS } from "../../core/constants.js";
import { hexDistance, hexEquals, hexSpiral } from "../../core/hex.js";
import { generateUnitId } from "./spawn.js";

export type GoodieHutReward =
    | { type: "food"; amount: number; cityId: string }
    | { type: "production"; amount: number; cityId: string }
    | { type: "research"; amount: number; percent: number }
    | { type: "scout"; unitId: string };

/**
 * Collects a goodie hut when a unit moves onto it.
 * Selects a reward based on game state context and applies it.
 * Removes the goodie hut overlay from the tile.
 * 
 * @returns The reward that was granted, or null if no hut was present
 */
export function collectGoodieHut(
    state: GameState,
    tile: Tile,
    playerId: string,
    unitCoord: HexCoord
): GoodieHutReward | null {
    const hutIndex = tile.overlays.indexOf(OverlayType.GoodieHut);
    if (hutIndex === -1) return null;

    // Remove the hut
    tile.overlays.splice(hutIndex, 1);

    // Pick reward type (25% each)
    const roll = Math.random();
    let rewardType: "food" | "production" | "research" | "scout";
    if (roll < 0.25) rewardType = "food";
    else if (roll < 0.5) rewardType = "production";
    else if (roll < 0.75) rewardType = "research";
    else rewardType = "scout";

    // Apply reward based on type
    let reward: GoodieHutReward;
    switch (rewardType) {
        case "food":
            reward = applyFoodReward(state, playerId, unitCoord);
            break;
        case "production":
            reward = applyProductionReward(state, playerId, unitCoord);
            break;
        case "research":
            reward = applyResearchReward(state, playerId);
            break;
        case "scout":
            reward = applyScoutReward(state, playerId, unitCoord, tile);
            break;
    }

    // Store reward info for client notification
    const city = reward.type === "food" || reward.type === "production"
        ? state.cities.find(c => c.id === reward.cityId)
        : undefined;

    state.lastGoodieHutReward = {
        type: reward.type,
        amount: reward.type === "scout" ? 1 : reward.amount,
        cityName: city?.name,
        percent: reward.type === "research" ? reward.percent : undefined,
        playerId,
    };

    return reward;
}

function findNearestFriendlyCity(state: GameState, playerId: string, coord: HexCoord) {
    const playerCities = state.cities.filter(c => c.ownerId === playerId);
    if (playerCities.length === 0) return null;

    let nearest = playerCities[0];
    let nearestDist = hexDistance(coord, nearest.coord);

    for (const city of playerCities) {
        const dist = hexDistance(coord, city.coord);
        if (dist < nearestDist) {
            nearest = city;
            nearestDist = dist;
        }
    }

    return nearest;
}

function applyFoodReward(state: GameState, playerId: string, coord: HexCoord): GoodieHutReward {
    const city = findNearestFriendlyCity(state, playerId, coord);
    // Context-aware: +10 if city has low pop (<3), else +5
    const amount = city && city.pop < 3 ? 10 : 5;

    if (city) {
        city.storedFood += amount;
    }

    return { type: "food", amount, cityId: city?.id ?? "" };
}

function applyProductionReward(state: GameState, playerId: string, coord: HexCoord): GoodieHutReward {
    const city = findNearestFriendlyCity(state, playerId, coord);
    // Context-aware: +10 if city has no current build, else +5
    const amount = city && !city.currentBuild ? 10 : 5;

    if (city) {
        city.storedProduction += amount;
    }

    return { type: "production", amount, cityId: city?.id ?? "" };
}

function applyResearchReward(state: GameState, playerId: string): GoodieHutReward {
    const player = state.players.find(p => p.id === playerId);

    if (!player?.currentTech) {
        // No tech being researched, give a flat amount
        return { type: "research", amount: 0, percent: 0 };
    }

    const tech = player.currentTech;
    const progressPercent = tech.progress / tech.cost;
    // Context-aware: +20% if less than 50% done, else +10%
    const bonusPercent = progressPercent < 0.5 ? 0.2 : 0.1;
    const amount = Math.ceil(tech.cost * bonusPercent);

    tech.progress += amount;

    return { type: "research", amount, percent: bonusPercent * 100 };
}

function applyScoutReward(
    state: GameState,
    playerId: string,
    coord: HexCoord,
    tile: Tile
): GoodieHutReward {
    const scoutStats = UNITS[UnitType.Scout];

    // Find a spawn location near the hut (prefer the hut tile itself if no unit there)
    let spawnCoord = coord;
    const unitOnTile = state.units.find(u => hexEquals(u.coord, coord));

    if (unitOnTile) {
        // Find an adjacent empty tile
        const nearby = hexSpiral(coord, 1);
        for (const c of nearby) {
            if (hexEquals(c, coord)) continue;
            const t = state.map.tiles.find(t => hexEquals(t.coord, c));
            if (!t) continue;
            if (t.terrain === "Mountain" || t.terrain === "DeepSea" || t.terrain === "Coast") continue;
            const occupied = state.units.some(u => hexEquals(u.coord, c));
            if (!occupied) {
                spawnCoord = c;
                break;
            }
        }
    }

    const unitId = generateUnitId(state, playerId, "goodie_scout");
    const newScout: Unit = {
        id: unitId,
        type: UnitType.Scout,
        ownerId: playerId,
        coord: spawnCoord,
        hp: scoutStats.hp,
        maxHp: scoutStats.hp,
        movesLeft: 0, // Can't move this turn
        state: UnitState.Normal,
        hasAttacked: false,
    };

    state.units.push(newScout);

    return { type: "scout", unitId };
}
