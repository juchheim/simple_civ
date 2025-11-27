
import { Action, BuildingType, City, GameState, Player, PlayerPhase, ProjectId, TechId, UnitState, UnitType } from "../core/types.js";
import {
    BASE_CITY_HP,
    CITY_HEAL_PER_TURN,
    HEAL_FRIENDLY_CITY,
    HEAL_FRIENDLY_TILE,
    PROJECTS,
    SETTLER_POP_LOSS_ON_BUILD,
    UNITS,
    CITY_WORK_RADIUS_RINGS,
    TECHS,
} from "../core/constants.js";
import { getCityYields, getGrowthCost } from "./rules.js";
import { ensureWorkedTiles, claimCityTerritory, maxClaimableRing, getClaimedRing } from "./helpers/cities.js";
import { getAetherianHpBonus } from "./helpers/combat.js";
import { hexDistance, hexEquals, hexToString, hexSpiral } from "../core/hex.js";
import { Unit } from "../core/types.js";
import { refreshPlayerVision } from "./vision.js";
import { findPath } from "./helpers/pathfinding.js";
import { handleMoveUnit } from "./actions/units.js";

export function handleEndTurn(state: GameState, action: Extract<Action, { type: "EndTurn" }>): GameState {
    for (const unit of state.units.filter(u => u.ownerId === action.playerId)) {
        const stats = UNITS[unit.type];
        const stayed = !unit.hasAttacked && unit.movesLeft === stats.move;
        unit.state = stayed ? UnitState.Fortified : UnitState.Normal;
    }

    const pIdx = state.players.findIndex(p => p.id === action.playerId);
    const nextPIdx = (pIdx + 1) % state.players.length;
    const nextPlayer = state.players[nextPIdx];

    state.currentPlayerId = nextPlayer.id;

    if (nextPIdx === 0) {
        state.turn += 1;
        runEndOfRound(state);
    }

    return advancePlayerTurn(state, nextPlayer.id);
}

export function advancePlayerTurn(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    state.phase = PlayerPhase.StartOfTurn;

    // If no tech is selected, auto-pick the cheapest available to avoid research stalls.
    if (!player.currentTech) {
        const autoTech = pickBestAvailableTech(player);
        if (autoTech) {
            player.currentTech = { id: autoTech, progress: 0, cost: TECHS[autoTech].cost };
        }
    }

    healUnitsAtStart(state, playerId);

    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const unitStats = UNITS[unit.type];
        const wasJustCaptured = unit.capturedOnTurn != null && unit.capturedOnTurn > state.turn - 2;
        if (!wasJustCaptured) {
            unit.movesLeft = unitStats.move;
        }
        unit.hasAttacked = false;
    }

    for (const city of state.cities.filter(c => c.ownerId === playerId)) {
        city.hasFiredThisTurn = false;
    }

    refreshPlayerVision(state, playerId);

    processAutoExplore(state, playerId);

    processAutoMovement(state, playerId);

    for (const city of state.cities.filter(c => c.ownerId === playerId)) {
        const claimedRing = getClaimedRing(city, state);
        city.workedTiles = ensureWorkedTiles(city, state);
        const yields = getCityYields(city, state);

        const maxHp = city.maxHp || BASE_CITY_HP;
        const wasRecentlyAttacked = city.lastDamagedOnTurn != null && city.lastDamagedOnTurn > state.turn - 2;
        // Cities at 0 or negative HP should NOT heal - they are capturable!
        if (city.hp > 0 && city.hp < maxHp && !wasRecentlyAttacked) {
            console.log(`[TurnLoop] Healing city ${city.name} (${city.ownerId}) from ${city.hp} to ${Math.min(maxHp, city.hp + CITY_HEAL_PER_TURN)} `);
            city.hp = Math.min(maxHp, city.hp + CITY_HEAL_PER_TURN);
            if (!city.maxHp) city.maxHp = maxHp;
        } else if (city.hp <= 0) {
            console.log(`[TurnLoop] City ${city.name} (${city.ownerId}) at ${city.hp} HP - NOT healing(capturable!)`);
        }

        city.storedFood += yields.F;
        const hasFarmstead = city.buildings.includes(BuildingType.Farmstead);
        const hasJadeGranary = player.completedProjects.includes(ProjectId.JadeGranaryComplete);
        // v0.97: Pass civName for JadeCovenant's Verdant Growth passive
        let growthCost = getGrowthCost(city.pop, hasFarmstead, hasJadeGranary, player.civName);
        while (city.storedFood >= growthCost) {
            city.storedFood -= growthCost;
            city.pop += 1;
            city.workedTiles = ensureWorkedTiles(city, state);
            growthCost = getGrowthCost(city.pop, hasFarmstead, hasJadeGranary, player.civName);
        }

        const neededRing = Math.max(claimedRing, maxClaimableRing(city));
        if (neededRing > claimedRing) {
            claimCityTerritory(city, state, playerId, neededRing);
            city.workedTiles = ensureWorkedTiles(city, state);
        }

        if (city.currentBuild) {
            // v0.98 Update 4: ForgeClans "Master Craftsmen" - 20% faster project completion
            let effectiveProd = yields.P;
            if (city.currentBuild.type === "Project" && player.civName === "ForgeClans") {
                // Apply bonus production (20% more effective) for projects
                effectiveProd = Math.ceil(yields.P * 1.25);
            }
            city.buildProgress += effectiveProd;
            if (city.buildProgress >= city.currentBuild.cost) {
                completeBuild(state, city);
            }
        }
    }

    const totalScience = getSciencePerTurn(state, playerId);
    if (player.currentTech) {
        player.currentTech.progress += totalScience;
        if (player.currentTech.progress >= player.currentTech.cost) {
            player.techs.push(player.currentTech.id);
            player.currentTech = null;
        }
    }

    state.phase = PlayerPhase.Planning;
    return state;
}

function completeBuild(state: GameState, city: City) {
    if (!city.currentBuild) return;

    const build = city.currentBuild;
    const overflow = city.buildProgress - build.cost;
    const player = state.players.find(p => p.id === city.ownerId);

    if (build.type === "Unit") {
        const uType = build.id as UnitType;

        // Find valid spawn location (spiral out from city)
        // Units cannot stack, so we must find a free tile
        let spawnCoord = city.coord;
        const maxRing = 2; // Search up to 2 rings out
        const area = hexSpiral(city.coord, maxRing);

        for (const coord of area) {
            const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
            if (!tile) continue;

            // Check terrain validity
            const stats = UNITS[uType];
            if (stats.domain === "Land" && (tile.terrain === "Coast" || tile.terrain === "DeepSea" || tile.terrain === "Mountain")) continue;
            if (stats.domain === "Naval" && (tile.terrain !== "Coast" && tile.terrain !== "DeepSea")) continue;

            // Check occupancy
            const occupied = state.units.some(u => hexEquals(u.coord, coord));
            if (!occupied) {
                spawnCoord = coord;
                break;
            }
        }

        // Apply AetherianVanguard "Battle Hardened" HP bonus
        const hpBonus = player ? getAetherianHpBonus(player, uType) : 0;
        const unitHp = UNITS[uType].hp + hpBonus;
        
        state.units.push({
            id: `u_${city.ownerId}_${Date.now()} `,
            type: uType,
            ownerId: city.ownerId,
            coord: spawnCoord,
            hp: unitHp,
            maxHp: unitHp,
            movesLeft: UNITS[uType].move,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        if (uType === UnitType.Settler) {
            city.pop = Math.max(1, city.pop - SETTLER_POP_LOSS_ON_BUILD);
            city.workedTiles = ensureWorkedTiles(city, state);
        }
    } else if (build.type === "Building") {
        city.buildings.push(build.id as BuildingType);

        if (build.id === BuildingType.TitansCore) {
            // Special case: TitansCore spawns a Titan and is consumed (not added to buildings)
            // Apply AetherianVanguard "Battle Hardened" HP bonus (Titans are their unique unit!)
            const titanHpBonus = player ? getAetherianHpBonus(player, UnitType.Titan) : 0;
            const titanHp = UNITS[UnitType.Titan].hp + titanHpBonus;
            
            state.units.push({
                id: `u_${city.ownerId}_titan_${Date.now()} `,
                type: UnitType.Titan,
                ownerId: city.ownerId,
                coord: city.coord,
                hp: titanHp,
                maxHp: titanHp,
                movesLeft: UNITS[UnitType.Titan].move,
                state: UnitState.Normal,
                hasAttacked: false,
            });
        } else if (build.id === BuildingType.SpiritObservatory) {
            // Spirit Observatory: The Revelation
            // 1. Complete current tech instantly
            // 2. Grant one free tech (auto-select best available)
            // 3. +2 Science per city permanently (tracked via marker)
            // 4. Counts as Observatory milestone for Progress chain
            if (player) {
                // Complete current tech if any
                if (player.currentTech) {
                    player.techs.push(player.currentTech.id);
                    player.currentTech = null;
                }

                // Grant one free tech (auto-select best available for Progress path)
                const freeTech = pickBestAvailableTech(player);
                if (freeTech) {
                    player.techs.push(freeTech);
                }

                // Track completion - grants Observatory milestone
                player.completedProjects.push(ProjectId.Observatory);
                city.milestones.push(ProjectId.Observatory);
            }
            // Note: +2 Science per city is applied via getSciencePerTurn checking for Observatory milestone
        } else if (build.id === BuildingType.JadeGranary) {
            // Jade Granary: The Great Harvest
            // 1. Every city gains +1 Pop
            // 2. 15% cheaper growth permanently (tracked via marker)
            // 3. +1 Food per city permanently (tracked via marker)
            if (player) {
                // Track completion
                player.completedProjects.push(ProjectId.JadeGranaryComplete);
                city.milestones.push(ProjectId.JadeGranaryComplete);

                // Every city gains +1 Pop
                for (const c of state.cities.filter(c => c.ownerId === city.ownerId)) {
                    c.pop += 1;
                    c.workedTiles = ensureWorkedTiles(c, state);
                }
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
        if (pId.startsWith("FormArmy")) {
            const payload = PROJECTS[pId].onComplete.payload;
            const baseType = payload.baseUnit as UnitType;
            const armyType = payload.armyUnit as UnitType;
            const candidate = state.units.find(u =>
                u.ownerId === city.ownerId &&
                u.type === baseType &&
                u.hp === u.maxHp &&
                hexDistance(u.coord, city.coord) <= CITY_WORK_RADIUS_RINGS
            );
            if (candidate) {
                candidate.type = armyType;
                candidate.maxHp = UNITS[armyType].hp;
                candidate.hp = candidate.maxHp;
                candidate.movesLeft = UNITS[armyType].move;
            }
        }
    }

    city.currentBuild = null;
    city.buildProgress = overflow;
}

export function runEndOfRound(state: GameState) {
    if (state.winnerId) return;
    const progressWinner = checkProgressVictory(state);
    if (progressWinner) {
        state.winnerId = progressWinner;
        return;
    }
    const conquestWinner = checkConquestVictory(state);
    if (conquestWinner) {
        state.winnerId = conquestWinner;
    }
    eliminationSweep(state);
}

function checkProgressVictory(state: GameState): string | null {
    for (const player of state.players) {
        const hasProject = player.completedProjects.includes(ProjectId.GrandExperiment);
        const ownsCity = state.cities.some(c => c.ownerId === player.id);
        if (hasProject && ownsCity) return player.id;
    }
    return null;
}

function checkConquestVictory(state: GameState): string | null {
    const alivePlayers = state.players.filter(p => !p.isEliminated);
    for (const p of alivePlayers) {
        const ownsAllCapitals = state.cities.filter(c => c.isCapital).every(c => c.ownerId === p.id);
        if (ownsAllCapitals && state.cities.some(c => c.ownerId === p.id)) {
            return p.id;
        }
    }
    return null;
}

function eliminationSweep(state: GameState) {
    for (const player of state.players) {
        if (player.isEliminated) continue;
        const hasCity = state.cities.some(c => c.ownerId === player.id);
        const hasSettler = state.units.some(u => u.ownerId === player.id && u.type === UnitType.Settler);
        if (!hasCity && !hasSettler) {
            player.isEliminated = true;
            state.units = state.units.filter(u => u.ownerId !== player.id);
        }
    }
}

function healUnitsAtStart(state: GameState, playerId: string) {
    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const stats = UNITS[unit.type];

        // Titan regeneration: always heals 5 HP
        if (unit.type === UnitType.Titan) {
            unit.hp = Math.min(unit.maxHp, unit.hp + 5);
            continue;
        }

        const rested = unit.hasAttacked === false && unit.movesLeft === stats.move;
        if (!rested) continue;

        const tile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
        if (!tile || tile.ownerId !== playerId) continue;

        const inCity = state.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, unit.coord));
        const heal = inCity ? HEAL_FRIENDLY_CITY : HEAL_FRIENDLY_TILE;
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
    }
}

function getSciencePerTurn(state: GameState, playerId: string): number {
    const cities = state.cities.filter(c => c.ownerId === playerId);
    const player = state.players.find(p => p.id === playerId);
    const baseScience = cities.reduce((sum, c) => sum + getCityYields(c, state).S, 0);
    const signalRelayBonus = player?.techs.includes(TechId.SignalRelay) ? cities.length : 0;
    const grandAcademyBonus = player?.completedProjects.includes(ProjectId.GrandAcademy) ? cities.length : 0;
    // Spirit Observatory grants +2 Science per city (tracked via Observatory milestone in completedProjects)
    // Note: This bonus is part of the base Spirit Observatory effect, separate from the normal Observatory project bonus
    const spiritObservatoryBonus = (player?.completedProjects.includes(ProjectId.Observatory) && player?.civName === "StarborneSeekers") ? cities.length * 2 : 0;
    return baseScience + signalRelayBonus + grandAcademyBonus + spiritObservatoryBonus;
}

/**
 * Pick the best available tech for the Starborne Seekers' free tech bonus.
 * Prioritizes techs useful for Progress victory path.
 */
function pickBestAvailableTech(player: Player): TechId | null {
    const allTechs = Object.keys(TECHS) as TechId[];

    // Filter to techs the player doesn't have and meets prerequisites for
    const available = allTechs.filter(techId => {
        if (player.techs.includes(techId)) return false;
        const tech = TECHS[techId];

        // Check era gate (need 2 techs from previous era)
        const hearthCount = player.techs.filter(t => TECHS[t].era === "Hearth").length;
        const bannerCount = player.techs.filter(t => TECHS[t].era === "Banner").length;
        if (tech.era === "Banner" && hearthCount < 2) return false;
        if (tech.era === "Engine" && bannerCount < 2) return false;

        // Check specific prerequisites
        return tech.prereqTechs.every(prereq => player.techs.includes(prereq));
    });

    if (available.length === 0) return null;

    // Priority order for Progress-focused civs:
    // 1. Star Charts (unlocks Progress chain)
    // 2. Scholar Courts (unlocks Academy, prereq for Signal Relay)
    // 3. Signal Relay (+1 Science per city)
    // 4. Script Lore (prereq for Star Charts)
    // 5. Any Engine tech
    // 6. Any Banner tech
    // 7. Any Hearth tech
    const priorityOrder: TechId[] = [
        TechId.StarCharts,
        TechId.ScholarCourts,
        TechId.SignalRelay,
        TechId.ScriptLore,
    ];

    for (const techId of priorityOrder) {
        if (available.includes(techId)) return techId;
    }

    // Fall back to any available Engine tech, then Banner, then Hearth
    const engine = available.find(t => TECHS[t].era === "Engine");
    if (engine) return engine;
    const banner = available.find(t => TECHS[t].era === "Banner");
    if (banner) return banner;
    return available[0];
}

function processAutoMovement(state: GameState, playerId: string) {
    const unitsWithTargets = state.units.filter(u => u.ownerId === playerId && u.autoMoveTarget);

    for (const unit of unitsWithTargets) {
        // Safety break
        let moves = 0;
        const MAX_MOVES = 10;

        while (unit.movesLeft > 0 && unit.autoMoveTarget && moves < MAX_MOVES) {
            moves++;

            // 1. Calculate Path with current vision
            const path = findPath(unit.coord, unit.autoMoveTarget, unit, state);

            // 2. Check if path exists
            if (path.length === 0) {
                // Target unreachable or already there
                if (hexEquals(unit.coord, unit.autoMoveTarget)) {
                    unit.autoMoveTarget = undefined;
                } else {
                    // Path blocked? Keep target and try again next turn
                    // Don't clear unit.autoMoveTarget
                }
                break;
            }

            // 3. Try to move to next step
            const nextStep = path[0];
            try {
                handleMoveUnit(state, {
                    type: "MoveUnit",
                    playerId: unit.ownerId,
                    unitId: unit.id,
                    to: nextStep,
                    isAuto: true
                });
                // handleMoveUnit calls refreshPlayerVision internally, so vision is up to date for next iteration
            } catch (e) {
                // Move failed (blocked by unit, etc)
                // Stop for this turn, but keep target to try again next turn
                break;
            }
        }
    }
}

function processAutoExplore(state: GameState, playerId: string) {
    const explorers = state.units.filter(u => u.ownerId === playerId && u.isAutoExploring);
    if (explorers.length === 0) return;

    const revealedSet = new Set(state.revealed[playerId] || []);

    // Find all unexplored tiles
    const unexploredTiles = state.map.tiles.filter(t => !revealedSet.has(hexToString(t.coord)));

    if (unexploredTiles.length === 0) {
        // Map fully explored, stop all auto-explorers
        explorers.forEach(u => {
            u.isAutoExploring = false;
            u.autoMoveTarget = undefined;
        });
        return;
    }

    for (const unit of explorers) {
        // Check if current target is still valid (unexplored)
        if (unit.autoMoveTarget) {
            const targetKey = hexToString(unit.autoMoveTarget);
            if (!revealedSet.has(targetKey)) {
                // Target is still unexplored, keep going
                continue;
            }
            // Target became explored, find new one
            unit.autoMoveTarget = undefined;
        }

        // Find closest unexplored tile
        let bestTile = null;
        let minDist = Infinity;

        for (const tile of unexploredTiles) {
            const dist = hexDistance(unit.coord, tile.coord);
            if (dist < minDist) {
                minDist = dist;
                bestTile = tile;
            }
        }

        if (bestTile) {
            unit.autoMoveTarget = bestTile.coord;
        } else {
            // Should be covered by the initial check, but just in case
            unit.isAutoExploring = false;
        }
    }
}
