import {
    Action,
    GameState,
    PlayerPhase,
    UnitState,
    UnitType,
    Unit,
    City,
    HexCoord,
    TechId,
    BuildingType,
    ProjectId,
    TerrainType,
    DiplomacyState,
} from "./engine-types";
import {
    hexEquals,
    hexDistance,
    hexSpiral,
    hexToString,
    hexLine,
} from "./hex";
import {
    getCityYields,
    getGrowthCost,
    canBuild,
    getTileYields,
} from "./rules";
import {
    UNITS,
    BUILDINGS,
    TERRAIN,
    ATTACK_RANDOM_BAND,
    DAMAGE_BASE,
    DAMAGE_MIN,
    DAMAGE_MAX,
    CITY_DEFENSE_BASE,
    CITY_WARD_DEFENSE_BONUS,
    CITY_ATTACK_BASE,
    CITY_WARD_ATTACK_BONUS,
    TECHS,
    PROJECTS,
    SETTLER_POP_LOSS_ON_BUILD,
    CITY_WORK_RADIUS_RINGS,
    HEAL_FRIENDLY_TILE,
    HEAL_FRIENDLY_CITY,
    CAPTURED_CITY_HP_RESET,
    BASE_CITY_HP,
    CITY_HEAL_PER_TURN,
} from "./constants";
import { isTileAdjacentToRiver } from "./rivers";

function summarizePlayers(state: GameState) {
    return state.players.map(p => {
        const units = state.units.filter(u => u.ownerId === p.id);
        const cities = state.cities.filter(c => c.ownerId === p.id);
        const settlerCount = units.filter(u =>
            u.type === UnitType.Settler
        ).length;
        return {
            id: p.id,
            eliminated: p.isEliminated,
            cities: cities.length,
            settlers: settlerCount,
            units: units.map(u => ({ id: u.id, type: u.type, coord: u.coord })),
        };
    });
}

function logStateSnapshot(label: string, state: GameState) {
    console.log(`[state] ${label}`, {
        turn: state.turn,
        currentPlayerId: state.currentPlayerId,
        players: summarizePlayers(state),
    });
}

// --- Action Handlers ---

export function applyAction(state: GameState, action: Action): GameState {
    // Clone state for immutability (shallow clone of top level, deep clone where needed)
    // For MVP, we'll mutate a deep clone or just be careful.
    // Let's do a simple deep clone to be safe and pure.
    const nextState = JSON.parse(JSON.stringify(state)) as GameState;

    // Validate Player
    if (action.playerId !== nextState.currentPlayerId) {
        throw new Error("Not your turn");
    }

    switch (action.type) {
        case "MoveUnit":
            return handleMoveUnit(nextState, action);
        case "Attack":
            return handleAttack(nextState, action);
        case "CityAttack":
            return handleCityAttack(nextState, action);
        case "FoundCity":
            return handleFoundCity(nextState, action);
        case "ChooseTech":
            return handleChooseTech(nextState, action);
        case "SetCityBuild":
            return handleSetCityBuild(nextState, action);
        case "RazeCity":
            return handleRazeCity(nextState, action);
        case "SetWorkedTiles":
            return handleSetWorkedTiles(nextState, action);
        case "SetDiplomacy":
            return handleSetDiplomacy(nextState, action);
        case "ProposePeace":
            return handleProposePeace(nextState, action);
        case "AcceptPeace":
            return handleAcceptPeace(nextState, action);
        case "ProposeVisionShare":
            return handleProposeVisionShare(nextState, action);
        case "AcceptVisionShare":
            return handleAcceptVisionShare(nextState, action);
        case "RevokeVisionShare":
            return handleRevokeVisionShare(nextState, action);
        case "EndTurn":
            logStateSnapshot(`applyAction:EndTurn:before (${action.playerId})`, nextState);
            const result = handleEndTurn(nextState, action);
            logStateSnapshot(`applyAction:EndTurn:after (${action.playerId})`, result);
            return result;
        default:
            return nextState;
    }
}

function handleMoveUnit(state: GameState, action: { type: "MoveUnit"; playerId: string; unitId: string; to: HexCoord }): GameState {
    const unit = state.units.find((u) => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");
    if (unit.hasAttacked) throw new Error("Cannot move after attacking");
    if (unit.movesLeft <= 0) throw new Error("No moves left");

    // Distance check (1 tile at a time for now, or pathfinding)
    // For MVP, only allow adjacent moves.
    const dist = hexDistance(unit.coord, action.to);
    if (dist !== 1) throw new Error("Can only move 1 tile at a time");

    // Terrain check
    const targetTile = state.map.tiles.find((t) => hexEquals(t.coord, action.to));
    if (!targetTile) throw new Error("Invalid target tile");

    const terrainData = TERRAIN[targetTile.terrain];

    // Domain check
    const unitStats = UNITS[unit.type];
    if (unitStats.domain === "Land" && (targetTile.terrain === TerrainType.Coast || targetTile.terrain === TerrainType.DeepSea)) {
        throw new Error("Land units cannot enter water");
    }
    if (unitStats.domain === "Naval" && (targetTile.terrain !== TerrainType.Coast && targetTile.terrain !== TerrainType.DeepSea)) {
        throw new Error("Naval units cannot enter land");
    }
    if (targetTile.terrain === TerrainType.Mountain) throw new Error("Impassable terrain");

    // Move Cost
    let cost = 1;
    if (unitStats.domain === "Land") {
        cost = terrainData.moveCostLand ?? 999;
    } else if (unitStats.domain === "Naval") {
        cost = terrainData.moveCostNaval ?? 999;
    }

    // Special Rule: Units with max movement 1 can always move 1 tile (if passable)
    if (unitStats.move === 1) {
        cost = 1;
    }

    // Allow moving if we have ANY moves left, consuming all remaining moves if cost > movesLeft
    if (unit.movesLeft > 0 && unit.movesLeft < cost) {
        cost = unit.movesLeft;
    }

    if (unit.movesLeft < cost) throw new Error("Not enough movement");

    // Occupancy check
    const unitsOnTile = state.units.filter(u => hexEquals(u.coord, action.to));
    const isMilitary = unitStats.domain !== "Civilian";

    if (isMilitary) {
        const hasMilitary = unitsOnTile.some(u => UNITS[u.type].domain !== "Civilian");
        if (hasMilitary) throw new Error("Tile occupied by military unit");
    } else {
        const hasCivilian = unitsOnTile.some(u => UNITS[u.type].domain === "Civilian");
        if (hasCivilian) throw new Error("Tile occupied by civilian unit");

        const hasEnemy = unitsOnTile.some(u => u.ownerId !== action.playerId);
        if (hasEnemy) throw new Error("Cannot enter enemy tile");
    }

    // Execute Move
    unit.coord = action.to;
    unit.movesLeft -= cost;
    unit.state = UnitState.Normal; // Unfortify

    // Capture Civilian Logic
    if (isMilitary) {
        const enemyCivilian = unitsOnTile.find(u => u.ownerId !== action.playerId && UNITS[u.type].domain === "Civilian");
        if (enemyCivilian) {
            ensureWar(state, action.playerId, enemyCivilian.ownerId);
            state.units = state.units.filter(u => u.id !== enemyCivilian.id);
            state.units.push({
                id: `u_${action.playerId}_captured_${Date.now()}`,
                type: enemyCivilian.type,
                ownerId: action.playerId,
                coord: action.to,
                hp: 1,
                maxHp: 1,
                movesLeft: 0,
                state: UnitState.Normal,
                hasAttacked: false,
            });
        }
    }

    // Capture city if eligible
    const cityOnTile = state.cities.find(c => hexEquals(c.coord, action.to));
    if (cityOnTile && cityOnTile.ownerId !== action.playerId) {
        if (cityOnTile.hp > 0) throw new Error("City not capturable");
        if (!unitStats.canCaptureCity) throw new Error("Unit cannot capture cities");
        ensureWar(state, action.playerId, cityOnTile.ownerId);
        captureCity(state, cityOnTile, action.playerId);
    }

    refreshPlayerVision(state, action.playerId);

    return state;
}

function handleAttack(state: GameState, action: { type: "Attack"; playerId: string; attackerId: string; targetId: string; targetType: "Unit" | "City" }): GameState {
    const attacker = state.units.find((u) => u.id === action.attackerId);
    if (!attacker) throw new Error("Attacker not found");
    if (attacker.ownerId !== action.playerId) throw new Error("Not your unit");
    if (attacker.hasAttacked) throw new Error("Already attacked");
    if (attacker.movesLeft <= 0) throw new Error("No moves left to attack");

    const attackerStats = getEffectiveUnitStats(attacker, state);

    const targetOwner = action.targetType === "Unit"
        ? state.units.find(u => u.id === action.targetId)?.ownerId
        : state.cities.find(c => c.id === action.targetId)?.ownerId;
    if (targetOwner && targetOwner !== action.playerId) {
        ensureWar(state, action.playerId, targetOwner);
    }

    if (action.targetType === "Unit") {
        const defender = state.units.find(u => u.id === action.targetId);
        if (!defender) throw new Error("Defender not found");

        // Range check
        const dist = hexDistance(attacker.coord, defender.coord);
        if (dist > attackerStats.rng) throw new Error("Target out of range");
        if (!hasClearLineOfSight(state, attacker.coord, defender.coord)) throw new Error("Line of sight blocked");

        // Settler capture: must be adjacent, captures instead of attacking
        if (defender.type === UnitType.Settler) {
            if (dist !== 1) throw new Error("Must be adjacent to capture settler");
            const defenderCoord = defender.coord;
            // Capture the settler
            defender.ownerId = action.playerId;
            defender.movesLeft = 0;
            defender.capturedOnTurn = state.turn; // Track when captured
            // Attacker moves to settler's hex
            attacker.coord = defenderCoord;
            attacker.hasAttacked = true;
            attacker.movesLeft = 0;
            attacker.state = UnitState.Normal;
            return state;
        }

        // Combat Math
        const randIdx = Math.floor(state.seed % 3); // 0, 1, 2
        state.seed = (state.seed * 9301 + 49297) % 233280; // Advance seed
        const randomMod = ATTACK_RANDOM_BAND[randIdx];

        const attackPower = attackerStats.atk + randomMod;

        let defensePower = getEffectiveUnitStats(defender, state).def;
        // Terrain Mod
        const tile = state.map.tiles.find(t => hexEquals(t.coord, defender.coord));
        if (tile) {
            defensePower += TERRAIN[tile.terrain].defenseMod;
        }
        // Fortify
        if (defender.state === UnitState.Fortified) defensePower += 1;

        // Damage
        const delta = attackPower - defensePower;
        const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
        const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

        defender.hp -= damage;
        attacker.hasAttacked = true;
        attacker.state = UnitState.Normal; // Unfortify attacker

        if (defender.hp <= 0) {
            const defenderCoord = defender.coord;
            // Destroy
            state.units = state.units.filter(u => u.id !== defender.id);

            // Melee units (range 1) advance into the hex after killing
            if (attackerStats.rng === 1 && dist === 1) {
                attacker.coord = defenderCoord;
                attacker.movesLeft = 0; // Consume all movement
            }
        }
    } else {
        // City Attack
        const city = state.cities.find(c => c.id === action.targetId);
        if (!city) throw new Error("City not found");

        const dist = hexDistance(attacker.coord, city.coord);
        if (dist > attackerStats.rng) throw new Error("Target out of range");
        if (!hasClearLineOfSight(state, attacker.coord, city.coord)) throw new Error("Line of sight blocked");

        // Combat Math
        const randIdx = Math.floor(state.seed % 3);
        state.seed = (state.seed * 9301 + 49297) % 233280;
        const randomMod = ATTACK_RANDOM_BAND[randIdx];

        const attackPower = attackerStats.atk + randomMod;

        // City Defense
        let defensePower = CITY_DEFENSE_BASE + Math.floor(city.pop / 2);
        if (city.buildings.includes(BuildingType.CityWard)) defensePower += CITY_WARD_DEFENSE_BONUS;

        const delta = attackPower - defensePower;
        const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
        const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

        city.hp -= damage;
        city.lastDamagedOnTurn = state.turn;
        attacker.hasAttacked = true;
    }

    return state;
}

function handleCityAttack(state: GameState, action: { type: "CityAttack"; playerId: string; cityId: string; targetUnitId: string }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");
    if (city.hasFiredThisTurn) throw new Error("City already attacked this turn");

    const garrison = state.units.find(u => u.ownerId === action.playerId && hexEquals(u.coord, city.coord));
    if (!garrison) throw new Error("No garrison present");

    const target = state.units.find(u => u.id === action.targetUnitId);
    if (!target) throw new Error("Target not found");
    if (target.ownerId === action.playerId) throw new Error("Cannot target own unit");

    const dist = hexDistance(city.coord, target.coord);
    if (dist > 2) throw new Error("Target out of range");
    if (!hasClearLineOfSight(state, city.coord, target.coord)) throw new Error("Line of sight blocked");

    const randIdx = Math.floor(state.seed % 3);
    state.seed = (state.seed * 9301 + 49297) % 233280;
    const randomMod = ATTACK_RANDOM_BAND[randIdx];

    const attackPower = CITY_ATTACK_BASE + (city.buildings.includes(BuildingType.CityWard) ? CITY_WARD_ATTACK_BONUS : 0) + randomMod;
    let defensePower = getEffectiveUnitStats(target, state).def;
    const tile = state.map.tiles.find(t => hexEquals(t.coord, target.coord));
    if (tile) defensePower += TERRAIN[tile.terrain].defenseMod;
    if (target.state === UnitState.Fortified) defensePower += 1;

    const delta = attackPower - defensePower;
    const rawDamage = DAMAGE_BASE + Math.floor(delta / 2);
    const damage = Math.max(DAMAGE_MIN, Math.min(DAMAGE_MAX, rawDamage));

    target.hp -= damage;
    if (target.hp <= 0) {
        state.units = state.units.filter(u => u.id !== target.id);
    }

    city.hasFiredThisTurn = true;
    return state;
}
function handleFoundCity(state: GameState, action: { type: "FoundCity"; playerId: string; unitId: string; name: string }): GameState {
    const unit = state.units.find(u => u.id === action.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.type !== UnitType.Settler) throw new Error("Not a settler");
    if (unit.ownerId !== action.playerId) throw new Error("Not your unit");
    // Removed movesLeft check - settlers can found cities after moving

    // Check valid tile
    const tile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
    if (!tile) throw new Error("Invalid tile");
    if (tile.terrain === TerrainType.Mountain || tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) {
        throw new Error("Invalid terrain for city");
    }

    // Territory check: disallow founding where any tile in radius is already owned
    const territory = hexSpiral(unit.coord, CITY_WORK_RADIUS_RINGS);
    for (const c of territory) {
        const t = state.map.tiles.find(tt => hexEquals(tt.coord, c));
        if (t?.ownerId) throw new Error("Tile already owned");
    }

    // Create City
    const cityId = `c_${action.playerId}_${Date.now()}`;
    const newCity: City = {
        id: cityId,
        name: action.name,
        ownerId: action.playerId,
        coord: unit.coord,
        pop: 1,
        storedFood: 0,
        storedProduction: 0,
        buildings: [],
        workedTiles: [unit.coord], // Starts working center
        currentBuild: null,
        buildProgress: 0,
        hp: 20,
        maxHp: 20,
        isCapital: state.cities.filter(c => c.ownerId === action.playerId).length === 0,
        hasFiredThisTurn: false,
        milestones: [],
    };

    // Claim territory
    claimCityTerritory(newCity, state, action.playerId);

    newCity.workedTiles = ensureWorkedTiles(newCity, state);

    state.cities.push(newCity);

    // Consume Settler
    state.units = state.units.filter(u => u.id !== unit.id);

    return state;
}

function handleChooseTech(state: GameState, action: { type: "ChooseTech"; playerId: string; techId: TechId }): GameState {
    const player = state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error("Player not found");

    if (player.currentTech) throw new Error("Already researching a tech");

    const tech = TECHS[action.techId];
    if (!tech) throw new Error("Invalid tech");

    if (action.techId === TechId.CityWards) {
        const hasEither = player.techs.includes(TechId.StoneworkHalls) || player.techs.includes(TechId.FormationTraining);
        if (!hasEither) throw new Error("Missing prerequisite tech");
    } else {
        for (const req of tech.prereqTechs) {
            if (!player.techs.includes(req)) throw new Error("Missing prerequisite tech");
        }
    }

    if (tech.era === "Banner") {
        const hearthCount = player.techs.filter(t => TECHS[t].era === "Hearth").length;
        if (hearthCount < 2) throw new Error("Need 2 Hearth techs");
    }
    if (tech.era === "Engine") {
        const bannerCount = player.techs.filter(t => TECHS[t].era === "Banner").length;
        if (bannerCount < 2) throw new Error("Need 2 Banner techs");
    }

    player.currentTech = {
        id: action.techId,
        progress: 0,
        cost: tech.cost,
    };

    return state;
}

function handleSetCityBuild(state: GameState, action: { type: "SetCityBuild"; playerId: string; cityId: string; buildType: "Unit" | "Building" | "Project"; buildId: string }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");

    if (city.currentBuild) throw new Error("City already building something");

    if (!canBuild(city, action.buildType, action.buildId, state)) {
        throw new Error("Cannot build this item");
    }

    let cost = 0;
    if (action.buildType === "Unit") cost = UNITS[action.buildId as UnitType].cost;
    if (action.buildType === "Building") cost = BUILDINGS[action.buildId as BuildingType].cost;
    if (action.buildType === "Project") cost = PROJECTS[action.buildId as ProjectId].cost;

    city.currentBuild = {
        type: action.buildType,
        id: action.buildId,
        cost: cost,
    };

    return state;
}

function handleRazeCity(state: GameState, action: { type: "RazeCity"; playerId: string; cityId: string }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");

    const hasGarrison = state.units.some(u => u.ownerId === action.playerId && hexEquals(u.coord, city.coord));
    if (!hasGarrison) throw new Error("No garrison present to raze the city");

    clearCityTerritory(city, state);

    state.cities = state.cities.filter(c => c.id !== city.id);
    return state;
}

function handleSetWorkedTiles(state: GameState, action: { type: "SetWorkedTiles"; playerId: string; cityId: string; tiles: HexCoord[] }): GameState {
    const city = state.cities.find(c => c.id === action.cityId);
    if (!city) throw new Error("City not found");
    if (city.ownerId !== action.playerId) throw new Error("Not your city");

    const allowed = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS);
    const coords = action.tiles;
    if (coords.length > city.pop) throw new Error("Too many tiles for population");
    const center = coords.find(c => hexEquals(c, city.coord));
    if (!center) throw new Error("Worked tiles must include city center");

    for (const coord of coords) {
        const owned = state.map.tiles.find(t => hexEquals(t.coord, coord) && t.ownerId === city.ownerId);
        if (!owned) throw new Error("Tile not owned by city owner");
        if (!allowed.some(c => hexEquals(c, coord))) throw new Error("Tile outside city radius");
        if (!TERRAIN[owned.terrain].workable) throw new Error("Tile not workable");
    }

    city.workedTiles = ensureWorkedTiles({ ...city, workedTiles: coords }, state);
    return state;
}

function handleSetDiplomacy(state: GameState, action: { type: "SetDiplomacy"; playerId: string; targetPlayerId: string; state: DiplomacyState }): GameState {
    const a = action.playerId;
    const b = action.targetPlayerId;
    if (!state.players.find(p => p.id === b)) throw new Error("Target player not found");
    assertContact(state, a, b);
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;
    state.diplomacy[a][b] = action.state;
    state.diplomacy[b][a] = action.state;
    if (action.state === DiplomacyState.Peace) {
        state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === a && o.to === b) && !(o.from === b && o.to === a));
    }
    if (action.state === DiplomacyState.War) {
        disableSharedVision(state, a, b);
    }
    return state;
}

function handleProposePeace(state: GameState, action: { type: "ProposePeace"; playerId: string; targetPlayerId: string }): GameState {
    const a = action.playerId;
    const b = action.targetPlayerId;
    if (!state.players.find(p => p.id === b)) throw new Error("Target player not found");
    assertContact(state, a, b);
    if (state.diplomacy[a]?.[b] === DiplomacyState.Peace) return state;
    const incoming = state.diplomacyOffers.find(o => o.from === b && o.to === a && o.type === "Peace");
    if (incoming) {
        state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === b && o.to === a && o.type === "Peace"));
        if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
        if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;
        state.diplomacy[a][b] = DiplomacyState.Peace;
        state.diplomacy[b][a] = DiplomacyState.Peace;
        return state;
    }
    const existing = state.diplomacyOffers.find(o => o.from === a && o.to === b && o.type === "Peace");
    if (!existing) state.diplomacyOffers.push({ from: a, to: b, type: "Peace" });
    return state;
}

function handleAcceptPeace(state: GameState, action: { type: "AcceptPeace"; playerId: string; targetPlayerId: string }): GameState {
    const a = action.playerId;
    const b = action.targetPlayerId;
    assertContact(state, a, b);
    const hasOffer = state.diplomacyOffers.find(o => o.from === b && o.to === a && o.type === "Peace");
    if (!hasOffer) throw new Error("No peace offer to accept");
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === b && o.to === a && o.type === "Peace"));
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;
    state.diplomacy[a][b] = DiplomacyState.Peace;
    state.diplomacy[b][a] = DiplomacyState.Peace;
    return state;
}

function ensureContactMaps(state: GameState, a: string, b: string) {
    if (!state.contacts[a]) state.contacts[a] = {} as any;
    if (!state.contacts[b]) state.contacts[b] = {} as any;
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;
}

function setContact(state: GameState, a: string, b: string) {
    ensureContactMaps(state, a, b);
    state.contacts[a][b] = true;
    state.contacts[b][a] = true;
    if (!state.diplomacy[a][b]) state.diplomacy[a][b] = DiplomacyState.Peace;
    if (!state.diplomacy[b][a]) state.diplomacy[b][a] = DiplomacyState.Peace;
}

function assertContact(state: GameState, a: string, b: string) {
    if (!state.contacts?.[a]?.[b]) {
        throw new Error("You have not made contact with that player");
    }
}

function handleContactDiscovery(state: GameState, viewerId: string, visibleKeys: Set<string>) {
    const keyHasEnemy = (key: string): string | null => {
        const unit = state.units.find(u => hexToString(u.coord) === key && u.ownerId !== viewerId);
        if (unit) return unit.ownerId;
        const city = state.cities.find(c => hexToString(c.coord) === key && c.ownerId !== viewerId);
        return city ? city.ownerId : null;
    };
    visibleKeys.forEach(key => {
        const owner = keyHasEnemy(key);
        if (owner) setContact(state, viewerId, owner);
    });
}

function refreshPlayerVision(state: GameState, playerId: string) {
    const nowVisible = computeVisibility(state, playerId);
    state.visibility[playerId] = nowVisible;
    const prev = new Set(state.revealed[playerId] ?? []);
    nowVisible.forEach(v => prev.add(v));
    state.revealed[playerId] = Array.from(prev);
    handleContactDiscovery(state, playerId, new Set(nowVisible));
}

function assertCanShareVision(state: GameState, a: string, b: string) {
    if (!state.players.find(p => p.id === b)) throw new Error("Target player not found");
    assertContact(state, a, b);
    const stance = state.diplomacy[a]?.[b];
    if (stance !== DiplomacyState.Peace) throw new Error("Vision sharing requires peace");
}

function handleProposeVisionShare(state: GameState, action: { type: "ProposeVisionShare"; playerId: string; targetPlayerId: string }): GameState {
    const a = action.playerId;
    const b = action.targetPlayerId;
    assertCanShareVision(state, a, b);
    if (state.sharedVision?.[a]?.[b]) return state;

    const incoming = state.diplomacyOffers.find(o => o.from === b && o.to === a && o.type === "Vision");
    if (incoming) {
        state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === b && o.to === a && o.type === "Vision"));
        enableSharedVision(state, a, b);
        return state;
    }

    const existing = state.diplomacyOffers.find(o => o.from === a && o.to === b && o.type === "Vision");
    if (!existing) state.diplomacyOffers.push({ from: a, to: b, type: "Vision" });
    return state;
}

function handleAcceptVisionShare(state: GameState, action: { type: "AcceptVisionShare"; playerId: string; targetPlayerId: string }): GameState {
    const a = action.playerId;
    const b = action.targetPlayerId;
    assertCanShareVision(state, a, b);
    const hasOffer = state.diplomacyOffers.find(o => o.from === b && o.to === a && o.type === "Vision");
    if (!hasOffer) throw new Error("No vision offer to accept");
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === b && o.to === a && o.type === "Vision"));
    enableSharedVision(state, a, b);
    return state;
}

function handleRevokeVisionShare(state: GameState, action: { type: "RevokeVisionShare"; playerId: string; targetPlayerId: string }): GameState {
    const a = action.playerId;
    const b = action.targetPlayerId;
    disableSharedVision(state, a, b);
    return state;
}

function handleEndTurn(state: GameState, action: { type: "EndTurn"; playerId: string }): GameState {
    logStateSnapshot(`handleEndTurn:start (${action.playerId})`, state);

    // Set fortify state for the ending player based on activity this turn
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
        logStateSnapshot("handleEndTurn:before end-of-round", state);
        runEndOfRound(state);
        logStateSnapshot("handleEndTurn:after end-of-round", state);
    }

    const unitsBeforeAdvance = state.units.length;
    const result = advancePlayerTurn(state, nextPlayer.id);
    logStateSnapshot(`handleEndTurn:after advance (${nextPlayer.id})`, result);

    // Safety check: if we started with units and now have 0, something went wrong
    // (unless a player was legitimately eliminated)
    if (unitsBeforeAdvance > 0 && result.units.length === 0) {
        console.error("[handleEndTurn] ERROR: Units went from", unitsBeforeAdvance, "to 0 unexpectedly.");
        logStateSnapshot("handleEndTurn:error input", state);
        logStateSnapshot("handleEndTurn:error output", result);
    }

    return result;
}

function advancePlayerTurn(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    state.phase = PlayerPhase.StartOfTurn;

    // Heal resting units before refreshing actions
    healUnitsAtStart(state, playerId);

    // 1. Refresh Units (movement & attack flags)
    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const unitStats = UNITS[unit.type];
        // Skip movement refresh for units captured in the previous turn
        const wasJustCaptured = unit.capturedOnTurn != null && unit.capturedOnTurn > state.turn - 2;
        if (!wasJustCaptured) {
            unit.movesLeft = unitStats.move;
        }
        unit.hasAttacked = false;
    }

    // Reset city ranged availability
    for (const city of state.cities.filter(c => c.ownerId === playerId)) {
        city.hasFiredThisTurn = false;
    }

    const nowVisible = computeVisibility(state, playerId);
    state.visibility[playerId] = nowVisible;
    const prev = new Set(state.revealed[playerId] ?? []);
    nowVisible.forEach(v => prev.add(v));
    state.revealed[playerId] = Array.from(prev);
    handleContactDiscovery(state, playerId, new Set(nowVisible));

    // 2. City Yields & Growth & Production
    for (const city of state.cities.filter(c => c.ownerId === playerId)) {
        city.workedTiles = ensureWorkedTiles(city, state);
        const yields = getCityYields(city, state);

        // City Healing (only if not attacked in previous turn)
        const maxHp = city.maxHp || BASE_CITY_HP;
        const wasRecentlyAttacked = city.lastDamagedOnTurn != null && city.lastDamagedOnTurn > state.turn - 2;
        if (city.hp < maxHp && !wasRecentlyAttacked) {
            console.log(`[TurnLoop] Healing city ${city.name} (${city.ownerId}) from ${city.hp} to ${Math.min(maxHp, city.hp + CITY_HEAL_PER_TURN)}`);
            city.hp = Math.min(maxHp, city.hp + CITY_HEAL_PER_TURN);
            // Ensure maxHp is saved if it was missing
            if (!city.maxHp) city.maxHp = maxHp;
        }

        // Food / Growth
        city.storedFood += yields.F;
        let growthCost = getGrowthCost(city.pop, city.buildings.includes(BuildingType.Farmstead));
        while (city.storedFood >= growthCost) {
            city.storedFood -= growthCost;
            city.pop += 1;
            city.workedTiles = ensureWorkedTiles(city, state);
            growthCost = getGrowthCost(city.pop, city.buildings.includes(BuildingType.Farmstead));
        }

        // Production
        if (city.currentBuild) {
            city.buildProgress += yields.P;
            if (city.buildProgress >= city.currentBuild.cost) {
                completeBuild(state, city);
            }
        }
    }

    // 3. Science
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
        city.buildings.push(build.id as BuildingType);
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

function ensureWorkedTiles(city: City, state: GameState): HexCoord[] {
    const ownedCoords = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS)
        .filter(coord => {
            const t = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
            return t && t.ownerId === city.ownerId && TERRAIN[t.terrain].workable;
        });

    const allowed = new Set(ownedCoords.map(c => hexToString(c)));

    const currentValid = city.workedTiles
        .filter(c => allowed.has(hexToString(c)))
        .reduce<HexCoord[]>((acc, coord) => {
            const key = hexToString(coord);
            if (acc.some(c => hexToString(c) === key)) return acc;
            acc.push(coord);
            return acc;
        }, []);

    if (!currentValid.some(c => hexEquals(c, city.coord))) currentValid.unshift(city.coord);

    let worked = currentValid.slice(0, Math.max(1, city.pop));

    const needed = Math.max(1, city.pop) - worked.length;
    if (needed > 0) {
        const workedKeys = new Set(worked.map(c => hexToString(c)));
        const candidates = ownedCoords
            .filter(c => !workedKeys.has(hexToString(c)))
            .sort((a, b) => tileScore(b, state) - tileScore(a, state));
        for (let i = 0; i < needed && i < candidates.length; i++) {
            worked.push(candidates[i]);
        }
    }

    return worked;
}

function tileScore(coord: HexCoord, state: GameState): number {
    const tile = state.map.tiles.find(t => hexEquals(t.coord, coord));
    if (!tile) return -999;
    const base = getTileYields(tile);
    const adjRiver = isTileAdjacentToRiver(state.map, coord);
    const food = base.F + (adjRiver ? 1 : 0);
    return food + base.P + base.S;
}

function healUnitsAtStart(state: GameState, playerId: string) {
    for (const unit of state.units.filter(u => u.ownerId === playerId)) {
        const stats = UNITS[unit.type];
        const rested = unit.hasAttacked === false && unit.movesLeft === stats.move;
        if (!rested) continue;

        const tile = state.map.tiles.find(t => hexEquals(t.coord, unit.coord));
        if (!tile || tile.ownerId !== playerId) continue;

        const inCity = state.cities.some(c => c.ownerId === playerId && hexEquals(c.coord, unit.coord));
        const heal = inCity ? HEAL_FRIENDLY_CITY : HEAL_FRIENDLY_TILE;
        unit.hp = Math.min(unit.maxHp, unit.hp + heal);
    }
}

function captureCity(state: GameState, city: City, newOwnerId: string) {
    claimCityTerritory(city, state, newOwnerId);
    city.ownerId = newOwnerId;
    city.hp = CAPTURED_CITY_HP_RESET;
    city.pop = Math.max(1, city.pop - 1);
    city.currentBuild = null;
    city.buildProgress = 0;
    city.workedTiles = ensureWorkedTiles(city, state);
    city.hasFiredThisTurn = false;
}

function claimCityTerritory(city: City, state: GameState, ownerId: string) {
    const territory = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS);
    for (const coord of territory) {
        const t = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (t) {
            t.ownerId = ownerId;
            t.ownerCityId = city.id;
            t.hasCityCenter = hexEquals(coord, city.coord);
        }
    }
}

function clearCityTerritory(city: City, state: GameState) {
    const territory = hexSpiral(city.coord, CITY_WORK_RADIUS_RINGS);
    for (const coord of territory) {
        const t = state.map.tiles.find(tt => hexEquals(tt.coord, coord));
        if (t) {
            t.ownerId = undefined;
            t.ownerCityId = undefined;
            if (t.hasCityCenter) t.hasCityCenter = false;
        }
    }
}

function enableSharedVision(state: GameState, a: string, b: string) {
    if (!state.sharedVision[a]) state.sharedVision[a] = {} as any;
    if (!state.sharedVision[b]) state.sharedVision[b] = {} as any;
    state.sharedVision[a][b] = true;
    state.sharedVision[b][a] = true;
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.type === "Vision" && ((o.from === a && o.to === b) || (o.from === b && o.to === a))));
}

function disableSharedVision(state: GameState, a: string, b: string) {
    if (!state.sharedVision[a]) state.sharedVision[a] = {} as any;
    if (!state.sharedVision[b]) state.sharedVision[b] = {} as any;
    state.sharedVision[a][b] = false;
    state.sharedVision[b][a] = false;
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.type === "Vision" && ((o.from === a && o.to === b) || (o.from === b && o.to === a))));
}

function ensureWar(state: GameState, a: string, b: string) {
    if (!state.diplomacy[a]) state.diplomacy[a] = {} as any;
    if (!state.diplomacy[b]) state.diplomacy[b] = {} as any;
    state.diplomacy[a][b] = DiplomacyState.War;
    state.diplomacy[b][a] = DiplomacyState.War;
    setContact(state, a, b);
    disableSharedVision(state, a, b);
    state.diplomacyOffers = state.diplomacyOffers.filter(o => !(o.from === a && o.to === b) && !(o.from === b && o.to === a));
}

const MELEE_TYPES = new Set<UnitType>([
    UnitType.SpearGuard,
    UnitType.ArmySpearGuard,
    UnitType.Riders,
    UnitType.ArmyRiders,
]);
const RANGED_TYPES = new Set<UnitType>([
    UnitType.BowGuard,
    UnitType.ArmyBowGuard,
]);

function getEffectiveUnitStats(unit: Unit, state: GameState) {
    const base = UNITS[unit.type];
    const player = state.players.find(p => p.id === unit.ownerId);
    if (!player) return base;
    const boosted = { ...base };

    if (player.techs.includes(TechId.FormationTraining) && MELEE_TYPES.has(unit.type)) {
        boosted.def += 1;
    }
    if (player.techs.includes(TechId.DrilledRanks) && (MELEE_TYPES.has(unit.type) || RANGED_TYPES.has(unit.type))) {
        boosted.atk += 1;
    }

    return boosted;
}

function getSciencePerTurn(state: GameState, playerId: string): number {
    const cities = state.cities.filter(c => c.ownerId === playerId);
    const player = state.players.find(p => p.id === playerId);
    const baseScience = cities.reduce((sum, c) => sum + getCityYields(c, state).S, 0);
    const signalRelayBonus = player?.techs.includes(TechId.SignalRelay) ? cities.length : 0;
    const grandAcademyBonus = player?.completedProjects.includes(ProjectId.GrandAcademy) ? cities.length : 0;
    return baseScience + signalRelayBonus + grandAcademyBonus;
}

function buildTileLookup(state: GameState): Map<string, import("./engine-types").Tile> {
    return new Map(state.map.tiles.map(t => [hexToString(t.coord), t]));
}

function hasClearLineOfSight(state: GameState, from: HexCoord, target: HexCoord, lookup?: Map<string, import("./engine-types").Tile>): boolean {
    const tileByKey = lookup ?? buildTileLookup(state);
    const line = hexLine(from, target);
    for (let i = 1; i < line.length - 1; i++) {
        const key = hexToString(line[i]);
        const tile = tileByKey.get(key);
        if (!tile) return false;
        if (TERRAIN[tile.terrain].blocksLoS) return false;
    }
    return true;
}

function computeVisibility(state: GameState, playerId: string): string[] {
    const visible = new Set<string>();
    const tileByKey = buildTileLookup(state);
    const addVisionFrom = (ownerId: string) => {
        const units = state.units.filter(u => u.ownerId === ownerId);
        const cities = state.cities.filter(c => c.ownerId === ownerId);

        for (const u of units) {
            const range = UNITS[u.type].vision ?? 2;
            for (const tile of state.map.tiles) {
                if (hexDistance(u.coord, tile.coord) <= range && hasClearLineOfSight(state, u.coord, tile.coord, tileByKey)) {
                    visible.add(hexToString(tile.coord));
                }
            }
        }

        for (const c of cities) {
            for (const tile of state.map.tiles) {
                if (hexDistance(c.coord, tile.coord) <= 2 && hasClearLineOfSight(state, c.coord, tile.coord, tileByKey)) {
                    visible.add(hexToString(tile.coord));
                }
            }
        }
    };

    addVisionFrom(playerId);
    const shared = state.sharedVision?.[playerId];
    if (shared) {
        for (const [other, active] of Object.entries(shared)) {
            if (!active) continue;
            if (state.diplomacy[playerId]?.[other] !== DiplomacyState.Peace) {
                disableSharedVision(state, playerId, other);
                continue;
            }
            addVisionFrom(other);
        }
    }

    const tileSet = new Set(state.map.tiles.map(t => hexToString(t.coord)));
    return Array.from(visible).filter(v => tileSet.has(v));
}

function runEndOfRound(state: GameState) {
    console.log("[runEndOfRound] Starting, units:", state.units.length, "cities:", state.cities.length);

    if (state.winnerId) {
        console.log("[runEndOfRound] Winner already set:", state.winnerId);
        return;
    }

    const progressWinner = checkProgressVictory(state);
    if (progressWinner) {
        console.log("[runEndOfRound] Progress winner:", progressWinner);
        state.winnerId = progressWinner;
        return;
    }

    const conquestWinner = checkConquestVictory(state);
    if (conquestWinner) {
        console.log("[runEndOfRound] Conquest winner:", conquestWinner);
        state.winnerId = conquestWinner;
    }

    console.log("[runEndOfRound] Before eliminationSweep, units:", state.units.length);
    eliminationSweep(state);
    console.log("[runEndOfRound] After eliminationSweep, units:", state.units.length);
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
        const ownsAllCapitals = state.cities
            .filter(c => c.isCapital)
            .every(c => c.ownerId === p.id);
        if (ownsAllCapitals && state.cities.some(c => c.ownerId === p.id)) {
            return p.id;
        }
    }
    return null;
}

function eliminationSweep(state: GameState) {
    console.log("[eliminationSweep] Starting, turn:", state.turn, "units:", state.units.length, "cities:", state.cities.length);
    console.log("[eliminationSweep] All units:", state.units.map(u => ({ id: u.id, ownerId: u.ownerId, type: u.type })));
    console.log("[eliminationSweep] Players:", state.players.map(p => ({ id: p.id, isEliminated: p.isEliminated })));
    console.log("[eliminationSweep] Cities:", state.cities.map(c => ({ id: c.id, ownerId: c.ownerId, name: c.name })));

    for (const player of state.players) {
        // Skip if already eliminated
        if (player.isEliminated) {
            console.log(`[eliminationSweep] Player ${player.id} already eliminated, skipping`);
            continue;
        }

        const hasCity = state.cities.some(c => c.ownerId === player.id);
        const playerUnits = state.units.filter(u => u.ownerId === player.id);
        // Check for Settler
        const settlerUnits = playerUnits.filter(u =>
            u.type === UnitType.Settler
        );
        const hasSettler = settlerUnits.length > 0;

        console.log(`[eliminationSweep] Player ${player.id}: hasCity=${hasCity}, hasSettler=${hasSettler}`);
        console.log(`[eliminationSweep] Player ${player.id} units:`, playerUnits.map(u => ({ id: u.id, type: u.type })));
        console.log(`[eliminationSweep] Player ${player.id} Settlers:`, settlerUnits.map(u => ({ id: u.id, type: u.type })));

        // Only eliminate if player has no cities AND no Settlers
        // If they have a Settler, they can still found a city, so don't eliminate them
        if (!hasCity && !hasSettler) {
            const unitsBefore = state.units.length;
            const playerUnits = state.units.filter(u => u.ownerId === player.id);
            console.log(`[eliminationSweep] Player ${player.id} has no cities and no Settlers, eliminating. Units to remove:`, playerUnits.length);

            // Double-check: make absolutely sure there's no Settler before removing
            const doubleCheckSettler = playerUnits.some(u =>
                u.type === UnitType.Settler
            );
            if (doubleCheckSettler) {
                console.error(`[eliminationSweep] ERROR: About to eliminate player ${player.id} but they have a Settler! Aborting elimination.`);
            } else {
                player.isEliminated = true;
                state.units = state.units.filter(u => u.ownerId !== player.id);
                const unitsAfter = state.units.length;
                console.log(`[eliminationSweep] Eliminated player ${player.id}, removed ${unitsBefore - unitsAfter} units`);
            }
        } else if (!hasCity && hasSettler) {
            console.log(`[eliminationSweep] Player ${player.id} has no cities but has Settler - keeping them in game (NOT eliminating)`);
            // Safety check: ensure we don't accidentally remove their units
            const playerUnitCount = state.units.filter(u => u.ownerId === player.id).length;
            if (playerUnitCount === 0) {
                console.error(`[eliminationSweep] ERROR: Player ${player.id} has Settler but 0 units! This should not happen.`);
            }
        } else if (hasCity) {
            console.log(`[eliminationSweep] Player ${player.id} has city - keeping them in game`);
        }
    }

    console.log("[eliminationSweep] Finished, units:", state.units.length, "cities:", state.cities.length);
}
