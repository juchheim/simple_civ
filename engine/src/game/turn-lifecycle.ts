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
import { hexDistance, hexEquals } from "../core/hex.js";
import { Unit } from "../core/types.js";
import { refreshPlayerVision } from "./vision.js";

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

    for (const city of state.cities.filter(c => c.ownerId === playerId)) {
        const claimedRing = getClaimedRing(city, state);
        city.workedTiles = ensureWorkedTiles(city, state);
        const yields = getCityYields(city, state);

        const maxHp = city.maxHp || BASE_CITY_HP;
        const wasRecentlyAttacked = city.lastDamagedOnTurn != null && city.lastDamagedOnTurn > state.turn - 2;
        if (city.hp < maxHp && !wasRecentlyAttacked) {
            console.log(`[TurnLoop] Healing city ${city.name} (${city.ownerId}) from ${city.hp} to ${Math.min(maxHp, city.hp + CITY_HEAL_PER_TURN)}`);
            city.hp = Math.min(maxHp, city.hp + CITY_HEAL_PER_TURN);
            if (!city.maxHp) city.maxHp = maxHp;
        }

        city.storedFood += yields.F;
        const hasFarmstead = city.buildings.includes(BuildingType.Farmstead);
        const hasJadeGranary = player.completedProjects.includes(ProjectId.JadeGranaryComplete);
        let growthCost = getGrowthCost(city.pop, hasFarmstead, hasJadeGranary);
        while (city.storedFood >= growthCost) {
            city.storedFood -= growthCost;
            city.pop += 1;
            city.workedTiles = ensureWorkedTiles(city, state);
            growthCost = getGrowthCost(city.pop, hasFarmstead, hasJadeGranary);
        }

        const neededRing = Math.max(claimedRing, maxClaimableRing(city));
        if (neededRing > claimedRing) {
            claimCityTerritory(city, state, playerId, neededRing);
            city.workedTiles = ensureWorkedTiles(city, state);
        }

        if (city.currentBuild) {
            city.buildProgress += yields.P;
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

    if (build.type === "Unit") {
        const uType = build.id as UnitType;
        state.units.push({
            id: `u_${city.ownerId}_${Date.now()}`,
            type: uType,
            ownerId: city.ownerId,
            coord: city.coord,
            hp: UNITS[uType].hp,
            maxHp: UNITS[uType].hp,
            movesLeft: UNITS[uType].move,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        if (uType === UnitType.Settler) {
            city.pop = Math.max(1, city.pop - SETTLER_POP_LOSS_ON_BUILD);
            city.workedTiles = ensureWorkedTiles(city, state);
        }
    } else if (build.type === "Building") {
        if (build.id === BuildingType.TitansCore) {
            // Special case: TitansCore spawns a Titan and is consumed (not added to buildings)
            state.units.push({
                id: `u_${city.ownerId}_titan_${Date.now()}`,
                type: UnitType.Titan,
                ownerId: city.ownerId,
                coord: city.coord,
                hp: UNITS[UnitType.Titan].hp,
                maxHp: UNITS[UnitType.Titan].hp,
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
            const player = state.players.find(p => p.id === city.ownerId);
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
            const player = state.players.find(p => p.id === city.ownerId);
            if (player) {
                // Track completion
                player.completedProjects.push(ProjectId.JadeGranaryComplete);
                
                // Every city gains +1 Pop
                for (const c of state.cities.filter(c => c.ownerId === city.ownerId)) {
                    c.pop += 1;
                    c.workedTiles = ensureWorkedTiles(c, state);
                }
            }
            // Note: +1 Food and 15% growth reduction applied via getCityYields/getGrowthCost checking marker
        } else {
            city.buildings.push(build.id as BuildingType);
        }
    } else if (build.type === "Project") {
        const pId = build.id as ProjectId;
        const player = state.players.find(p => p.id === city.ownerId);
        if (player) player.completedProjects.push(pId);
        if (PROJECTS[pId].onComplete.type === "Victory") {
            state.winnerId = player?.id;
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
