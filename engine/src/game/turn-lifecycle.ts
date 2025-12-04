
import { Action, BuildingType, City, GameState, Player, PlayerPhase, ProjectId, TechId, UnitState, UnitType } from "../core/types.js";
import {
    BASE_CITY_HP,
    CITY_HEAL_PER_TURN,
    HEAL_FRIENDLY_CITY,
    HEAL_FRIENDLY_TILE,
    UNITS,
} from "../core/constants.js";
import { getCityYields, getGrowthCost } from "./rules.js";
import { ensureWorkedTiles, claimCityTerritory, maxClaimableRing, getClaimedRing } from "./helpers/cities.js";
import { hexEquals } from "../core/hex.js";
import { refreshPlayerVision } from "./vision.js";
import { processCityBuild } from "./helpers/builds.js";
import { ensureTechSelected } from "./helpers/turn.js";
import { resetCityFireFlags, resetUnitsForTurn, runPlayerAutoBehaviors } from "./helpers/turn-movement.js";

export function handleEndTurn(state: GameState, action: Extract<Action, { type: "EndTurn" }>): GameState {
    for (const unit of state.units.filter(u => u.ownerId === action.playerId)) {
        const stats = UNITS[unit.type];
        const stayed = !unit.hasAttacked && unit.movesLeft === stats.move;

        // Fix: If already fortified, stay fortified.
        if (unit.state !== UnitState.Fortified) {
            unit.state = stayed ? UnitState.Fortified : UnitState.Normal;
        }
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

    startPlayerTurn(state, player);

    processPlayerCities(state, player);

    processResearch(state, player);

    state.phase = PlayerPhase.Planning;
    return state;
}

function processResearch(state: GameState, player: Player) {
    const totalScience = getSciencePerTurn(state, player.id);
    if (player.currentTech) {
        player.currentTech.progress += totalScience;
        if (player.currentTech.progress >= player.currentTech.cost) {
            player.techs.push(player.currentTech.id);
            player.currentTech = null;
        }
    }
}

export function startPlayerTurn(state: GameState, player: Player): void {
    state.phase = PlayerPhase.StartOfTurn;

    ensureTechSelected(state, player);

    healUnitsAtStart(state, player.id);

    clearStatusEffects(state, player.id);

    applyAttrition(state, player.id);

    resetUnitsForTurn(state, player);
    resetCityFireFlags(state, player.id);

    refreshPlayerVision(state, player.id);

    runPlayerAutoBehaviors(state, player.id);
}

function clearStatusEffects(state: GameState, playerId: string) {
    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        unit.statusEffects = [];
    }
}

function processCityForTurn(state: GameState, city: City, player: Player) {
    const claimedRing = getClaimedRing(city, state);
    city.workedTiles = ensureWorkedTiles(city, state, {
        pinned: city.manualWorkedTiles,
        excluded: city.manualExcludedTiles,
    });
    const yields = getCityYields(city, state);

    const maxHp = city.maxHp || BASE_CITY_HP;
    const wasDamagedThisTurn = city.lastDamagedOnTurn != null && city.lastDamagedOnTurn === state.turn;
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
    let growthCost = getGrowthCost(city.pop, hasFarmstead, hasJadeGranary, player.civName);
    while (city.storedFood >= growthCost) {
        city.storedFood -= growthCost;
        city.pop += 1;
        city.workedTiles = ensureWorkedTiles(city, state, {
            pinned: city.manualWorkedTiles,
            excluded: city.manualExcludedTiles,
        });
        growthCost = getGrowthCost(city.pop, hasFarmstead, hasJadeGranary, player.civName);
    }

    const neededRing = Math.max(claimedRing, maxClaimableRing(city));
    if (neededRing > claimedRing) {
        claimCityTerritory(city, state, player.id, neededRing);
        city.workedTiles = ensureWorkedTiles(city, state, {
            pinned: city.manualWorkedTiles,
            excluded: city.manualExcludedTiles,
        });
    }

    if (city.currentBuild) {
        processCityBuild(state, city, player, yields.P);
    }
}

function processPlayerCities(state: GameState, player: Player) {
    for (const city of state.cities.filter(c => c.ownerId === player.id)) {
        processCityForTurn(state, city, player);
    }
}

export function runEndOfRound(state: GameState) {
    processEndOfRound(state);
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
        // Condition 1: Owns all capitals
        const capitals = state.cities.filter(c => c.isCapital);
        // If there are no capitals yet (rare/impossible if cities exist?), no one wins conquest.
        if (capitals.length === 0) continue;

        const ownsAllCapitals = capitals.every(c => c.ownerId === p.id);

        if (ownsAllCapitals) {
            // Check if any OTHER alive player blocks victory
            const blockers = alivePlayers.filter(other => {
                if (other.id === p.id) return false; // I don't block myself

                const hasCapital = capitals.some(c => c.ownerId === other.id);
                if (hasCapital) return true; // They have a capital, so I haven't conquered them yet

                // They have NO capital.
                // If they haven't founded yet, they block victory (running around).
                // If they HAVE founded, they don't block (they lost their capital).
                return !other.hasFoundedFirstCity;
            });

            if (blockers.length === 0) return p.id;
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

function processEndOfRound(state: GameState) {
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

function healUnitsAtStart(state: GameState, playerId: string) {
    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const stats = UNITS[unit.type];

        // Titan regeneration: always heals 2 HP
        if (unit.type === UnitType.Titan) {
            unit.hp = Math.min(unit.maxHp, unit.hp + 2);
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

            // Apply damage
            unit.hp -= damage;

            // Mark with status effect for UI
            if (!unit.statusEffects) unit.statusEffects = [];
            if (!unit.statusEffects.includes("NaturesWrath")) {
                unit.statusEffects.push("NaturesWrath");
            }

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
// pickBestAvailableTech is exported from helpers/turn.ts to avoid duplication
