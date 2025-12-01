
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
import { refreshPlayerVision } from "./vision.js";
import { handleMoveUnit, processAutoExplore, processAutoMovement } from "./actions/units.js";

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
    applyAttrition(state, playerId);

    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const unitStats = UNITS[unit.type];
        const wasJustCaptured = unit.capturedOnTurn != null && unit.capturedOnTurn > state.turn - 2;
        if (!wasJustCaptured) {
            // v0.99 Buff: Jade Covenant Settlers have 3 movement (base 2)
            if (player.civName === "JadeCovenant" && unit.type === UnitType.Settler) {
                unit.movesLeft = 3;
            } else {
                unit.movesLeft = unitStats.move;
            }
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
        const wasDamagedThisTurn = city.lastDamagedOnTurn != null && city.lastDamagedOnTurn === state.turn;
        // Cities at 0 or negative HP should NOT heal - they are capturable!
        if (city.hp > 0 && city.hp < maxHp && !wasDamagedThisTurn) {
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
            // v0.98 Update 9: JadeCovenant "Expansionist" - Settlers do not consume population
            const isJadeCovenant = player?.civName === "JadeCovenant";
            if (!isJadeCovenant) {
                city.pop = Math.max(1, city.pop - SETTLER_POP_LOSS_ON_BUILD);
                city.workedTiles = ensureWorkedTiles(city, state);
            } else {
                // v0.99 BUFF: "Ancestral Protection" - Settlers have 10 HP (instead of 1)
                // v0.99 BUFF: "Nomadic Heritage" - Settlers have 3 Movement (instead of 2)
                const unit = state.units[state.units.length - 1]; // The newly added unit
                if (unit && unit.type === UnitType.Settler) {
                    unit.maxHp = 10;
                    unit.hp = 10;
                    unit.movesLeft = 3;
                }
            }
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
            // 1. (REMOVED v0.99) Complete current tech instantly
            // 2. (REMOVED v0.99) Grant one free tech
            // 3. +1 Science per city permanently (tracked via marker)
            // 4. Counts as Observatory milestone for Progress chain
            if (player) {
                // Mark as completed
                player.completedProjects.push(ProjectId.Observatory);
                city.milestones.push(ProjectId.Observatory);
            }
            // Note: +1 Science per city is applied via getSciencePerTurn checking for Observatory milestone
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

                // v0.99 BUFF: Spawn a free Settler at the city
                // Find valid spawn location (spiral out from city)
                let spawnCoord = city.coord;
                const maxRing = 2;
                const area = hexSpiral(city.coord, maxRing);
                for (const coord of area) {
                    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
                    if (!tile) continue;
                    if (tile.terrain === "Coast" || tile.terrain === "DeepSea" || tile.terrain === "Mountain") continue;
                    const occupied = state.units.some(u => hexEquals(u.coord, coord));
                    if (!occupied) {
                        spawnCoord = coord;
                        break;
                    }
                }

                state.units.push({
                    id: `u_${city.ownerId}_free_settler_${Date.now()}`,
                    type: UnitType.Settler,
                    ownerId: city.ownerId,
                    coord: spawnCoord,
                    hp: 10, // Jade Covenant Bonus
                    maxHp: 10,
                    movesLeft: 3, // Jade Covenant Bonus
                    state: UnitState.Normal,
                    hasAttacked: false,
                });
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

    // Optimization: Pre-calculate city ownership to avoid repeated lookups
    const playerCityCounts = new Map<string, number>();
    for (const p of alivePlayers) {
        playerCityCounts.set(p.id, state.cities.filter(c => c.ownerId === p.id).length);
    }

    for (const p of alivePlayers) {
        // Condition 1: Owns all capitals
        const capitals = state.cities.filter(c => c.isCapital);
        // If there are no capitals yet (rare/impossible if cities exist?), no one wins conquest.
        if (capitals.length === 0) continue;

        const ownsAllCapitals = capitals.every(c => c.ownerId === p.id);

        if (ownsAllCapitals) {
            // Fix for start-of-game defeat:
            // We only block victory if not all players have founded their first capital yet.
            // If the number of capitals on the map is less than the number of alive players,
            // it means someone is still wandering with their initial settler.
            if (capitals.length < alivePlayers.length) {
                continue;
            }

            return p.id;
        } else {
            // console.log(`[ConquestCheck] P${p.id} does NOT own all capitals.`);
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

function applyAttrition(state: GameState, playerId: string) {
    // v0.99 Buff: "Nature's Wrath" - Jade Covenant territory damages enemies
    // At the start of a player's turn, if they are at war with Jade Covenant
    // and their units are in Jade Covenant territory, they take 1 damage.

    const player = state.players.find(p => p.id === playerId);
    if (!player || player.isEliminated) return;

    // Find Jade Covenant player ID
    const jadeCovenant = state.players.find(p => p.civName === "JadeCovenant");
    if (!jadeCovenant || jadeCovenant.isEliminated) return;

    // Check if at war
    // Diplomacy is stored as state.diplomacy[id1][id2] = "War" | "Peace"
    // We need to check both directions or just one depending on implementation,
    // usually it's symmetric but let's be safe.
    const relation = state.diplomacy?.[playerId]?.[jadeCovenant.id];
    if (relation !== "War") return;

    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const tile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
        if (!tile) continue;

        // Check if tile is owned by Jade Covenant
        if (tile.ownerId === jadeCovenant.id) {
            // Apply attrition
            // 1 HP damage (User requested check: 2 HP was deemed too strong with city attacks)
            const damage = 1;
            unit.hp = Math.max(1, unit.hp - damage); // Don't kill outright, leave at 1 HP?
            // Actually, attrition usually kills. Let's allow kill.
            // But if we kill here, we need to handle unit death cleanup which might be complex inside this loop.
            // Let's leave at 1 HP for now to be safe, or check if we can remove.
            // The game loop usually handles 0 HP units in specific phases, but let's see.
            // If I set to 0, does it get cleaned up?
            // Usually cleanup happens after combat.
            // Let's set to 0 and assume a cleanup sweep happens or the unit is just dead.
            // Wait, `eliminationSweep` checks for no units/cities.
            // Unit death logic is usually in `handleAttack`.
            // Let's just deal damage. If it drops to 0, we should probably remove it.
            unit.hp -= damage;
            if (unit.hp <= 0) {
                console.log(`[Attrition] Unit ${unit.id} (${unit.type}) died to Nature's Wrath in Jade territory.`);
                // We can't splice `state.units` while iterating easily if we are iterating a filtered list.
                // But `state.units` is the source of truth.
                // We should mark for deletion or filter after.
            }
        }
    }

    // Cleanup dead units
    const initialCount = state.units.length;
    state.units = state.units.filter(u => u.hp > 0);
    if (state.units.length < initialCount) {
        // Force vision refresh if units died
        refreshPlayerVision(state, playerId);
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
    const spiritObservatoryBonus = (player?.completedProjects.includes(ProjectId.Observatory) && player?.civName === "StarborneSeekers") ? cities.length * 1 : 0; // v0.99 Nerf: +1 per city (was +2)
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


