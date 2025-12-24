import { BuildingType, City, GameState, Player, ProjectId, UnitState, UnitType, HistoryEventType } from "../../core/types.js";
import { CITY_WORK_RADIUS_RINGS, PROJECTS, SETTLER_POP_LOSS_ON_BUILD, UNITS } from "../../core/constants.js";
import { hexDistance, hexEquals, hexSpiral } from "../../core/hex.js";
import { ensureWorkedTiles } from "./cities.js";
import { getAetherianHpBonus, getUnitMaxMoves } from "./combat.js";
import { getGrowthCost } from "../rules.js";
import { generateUnitId, findSpawnCoord } from "./spawn.js";
import { logEvent } from "../history.js";

export function completeBuild(state: GameState, city: City) {
    if (!city.currentBuild) return;

    const build = city.currentBuild;
    const overflow = city.buildProgress - build.cost;
    const player = state.players.find(p => p.id === city.ownerId);

    if (build.type === "Unit") {
        const uType = build.id as UnitType;

        // Find the nearest available tile adjacent to the city for spawning
        const spawnCoord = findSpawnCoord(state, city, uType);

        const hpBonus = player ? getAetherianHpBonus(player, uType) : 0;
        const unitHp = UNITS[uType].hp + hpBonus;

        const unitId = generateUnitId(state, city.ownerId, undefined, Date.now());

        state.units.push({
            id: unitId,
            type: uType,
            ownerId: city.ownerId,
            coord: spawnCoord,
            hp: unitHp,
            maxHp: unitHp,
            movesLeft: getUnitMaxMoves({ type: uType, ownerId: city.ownerId } as any, state),
            state: UnitState.Normal,
            hasAttacked: false,
            isHomeDefender: build.markAsHomeDefender === true ? true : undefined,
            originCityId: city.id,
        });

        if (uType === UnitType.Settler) {
            const isJadeCovenant = player?.civName === "JadeCovenant";
            if (!isJadeCovenant) {
                city.pop = Math.max(1, city.pop - SETTLER_POP_LOSS_ON_BUILD);
                city.workedTiles = ensureWorkedTiles(city, state, {
                    pinned: city.manualWorkedTiles,
                    excluded: city.manualExcludedTiles,
                });
            } else {
                const unit = state.units[state.units.length - 1];
                if (unit && unit.type === UnitType.Settler) {
                    unit.maxHp = 10;
                    unit.hp = 10;
                    // unit.movesLeft = 3;  // Removed Jade movement bonus
                }
            }
        }
    } else if (build.type === "Building") {
        if (build.id !== BuildingType.TitansCore) {
            city.buildings.push(build.id as BuildingType);
        }

        if (build.id === BuildingType.ShieldGenerator) {
            city.maxShield = 50;
            city.shield = 50;
        }

        if (build.id === BuildingType.TitansCore) {
            logEvent(state, HistoryEventType.WonderBuilt, city.ownerId, { buildId: build.id, cityId: city.id, cityName: city.name });

            // Mark as completed to prevent rebuilding (one-time production)
            if (player) {
                player.completedProjects.push(ProjectId.TitansCoreComplete);
            }

            const titanHpBonus = player ? getAetherianHpBonus(player, UnitType.Titan) : 0;
            const titanHp = UNITS[UnitType.Titan].hp + titanHpBonus;
            const titanSpawnCoord = findSpawnCoord(state, city, UnitType.Titan);

            state.units.push({
                id: generateUnitId(state, city.ownerId, "titan", Date.now()),
                type: UnitType.Titan,
                ownerId: city.ownerId,
                coord: titanSpawnCoord,
                hp: titanHp,
                maxHp: titanHp,
                movesLeft: UNITS[UnitType.Titan].move,
                state: UnitState.Normal,
                hasAttacked: false,
                originCityId: city.id,
            });
        } else if (build.id === BuildingType.SpiritObservatory) {
            logEvent(state, HistoryEventType.WonderBuilt, city.ownerId, { buildId: build.id, cityId: city.id, cityName: city.name });

            if (player) {
                player.completedProjects.push(ProjectId.Observatory);
                city.milestones.push(ProjectId.Observatory);
            }
        } else if (build.id === BuildingType.JadeGranary) {
            logEvent(state, HistoryEventType.WonderBuilt, city.ownerId, { buildId: build.id, cityId: city.id, cityName: city.name });

            if (player) {
                player.completedProjects.push(ProjectId.JadeGranaryComplete);
                city.milestones.push(ProjectId.JadeGranaryComplete);

                // v2.9 NERF: Only grant +1 Pop to THIS city (was global)
                city.pop += 1;
                city.workedTiles = ensureWorkedTiles(city, state, {
                    pinned: city.manualWorkedTiles,
                    excluded: city.manualExcludedTiles,
                });

                // v2.9 NERF: Free Settler removed.
            }
        }
    } else if (build.type === "Project") {
        const pId = build.id as ProjectId;
        if (player) {
            player.completedProjects.push(pId);
        }

        if (pId === ProjectId.Observatory) {
            city.milestones.push(pId);
        }
        if (pId === ProjectId.GrandAcademy && player && !player.completedProjects.includes(ProjectId.GrandAcademy)) {
            city.milestones.push(pId);
        }
        if (PROJECTS[pId].onComplete.type === "GrantYield") {
            const payload = PROJECTS[pId].onComplete.payload;
            if (payload.F) {
                city.storedFood += payload.F;
                const hasFarmstead = city.buildings.includes(BuildingType.Farmstead);
                const hasJadeGranary = player?.completedProjects.includes(ProjectId.JadeGranaryComplete) ?? false;
                let growthCost = getGrowthCost(city.pop, hasFarmstead, hasJadeGranary, player?.civName);
                while (city.storedFood >= growthCost) {
                    city.storedFood -= growthCost;
                    city.pop += 1;
                    city.workedTiles = ensureWorkedTiles(city, state, {
                        pinned: city.manualWorkedTiles,
                        excluded: city.manualExcludedTiles,
                    });
                    growthCost = getGrowthCost(city.pop, hasFarmstead, hasJadeGranary, player?.civName);
                }
            }
            if (payload.S && player && player.currentTech) {
                player.currentTech.progress += payload.S;
                if (player.currentTech.progress >= player.currentTech.cost) {
                    player.techs.push(player.currentTech.id);
                    player.currentTech = null;
                }
            }
        }
    }

    // Store completed build for UI notification
    city.lastCompletedBuild = { type: build.type, id: build.id };
    city.currentBuild = null;
    city.buildProgress = overflow;
}

export function applyCityProduction(state: GameState, city: City, player: Player, baseProduction: number) {
    let effectiveProd = baseProduction;
    if (city.currentBuild?.type === "Project" && player.civName === "ForgeClans") {
        effectiveProd = Math.ceil(baseProduction * 1.25);
    }

    // Add storedProduction (from goodie huts, etc.) to build progress
    effectiveProd += city.storedProduction;
    city.storedProduction = 0; // Consume it

    // Difficulty bonus for AI players
    if (player.isAI && state.difficulty) {
        const difficultyMultipliers: Record<string, number> = {
            Easy: 0.8,
            Normal: 1.0,
            Hard: 1.25,
            Expert: 1.5
        };
        effectiveProd = Math.floor(effectiveProd * (difficultyMultipliers[state.difficulty] ?? 1.0));
    }

    city.buildProgress += effectiveProd;
    if (city.currentBuild && city.buildProgress >= city.currentBuild.cost) {
        completeBuild(state, city);
    }
}

export function processCityBuild(state: GameState, city: City, player: Player, production: number) {
    applyCityProduction(state, city, player, production);
}
