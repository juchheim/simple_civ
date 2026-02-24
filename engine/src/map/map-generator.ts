import {
    DiplomacyState,
    GameState,
    GameHistory,
    HexCoord,
    MapSize,
    Player,
    PlayerPhase,
    TerrainType,
    Tile,
    City,
    Unit,
    UnitState,
    UnitType,
    OverlayType,
    EraId,
    NativeCamp,
    AiSystem,
} from "../core/types.js";
import { MAP_DIMS, UNITS, AETHERIAN_EXTRA_STARTING_UNITS, FORGE_CLANS_EXTRA_STARTING_UNITS, NATIVE_CAMP_COUNTS, NATIVE_CAMP_MIN_DISTANCE_FROM_START, NATIVE_CAMP_MIN_DISTANCE_BETWEEN, STARTING_TREASURY } from "../core/constants.js";
import { hexEquals, hexToString, hexSpiral, getNeighbors, hexDistance } from "../core/hex.js";
import { getTileYields } from "../game/rules.js";
import { scoreCitySite } from "../game/ai-heuristics.js";
import { applyTerrainNoise } from "./generation/terrain.js";
import { resolveSeed, WorldRng } from "./generation/seeding.js";
import { pickStartingSpots } from "./generation/starts.js";
import { generateRivers, type RiverGenerationOptions } from "./generation/rivers.js";


export type WorldGenSettings = {
    mapSize: MapSize;
    players: { id: string; civName: string; color: string; ai?: boolean }[];
    seed?: number;
    riverOptions?: RiverGenerationOptions;
    aiSystem?: AiSystem;
    difficulty?: "Easy" | "Normal" | "Hard" | "Expert";
};

/**
 * Generates a new game world based on the provided settings.
 * Creates the map grid, generates terrain and rivers, and places starting units for all players.
 * @param settings - Configuration for map size, players, and seed.
 * @returns The initial GameState.
 */
export function generateWorld(settings: WorldGenSettings): GameState {
    const seed = resolveSeed(settings.seed);
    const rng = new WorldRng(seed);
    const { width, height, tiles, getTile, isLand } = createBaseMap({
        mapSize: settings.mapSize,
        seed,
        rng,
    });

    const { meetsStartGuarantees, startScore } = createStartEvaluators({
        tiles,
        getTile,
        isLand,
    });

    const { riverEdges, riverPolylines } = generateRivers({
        tiles,
        mapSize: settings.mapSize,
        rng,
        getTile,
        isLand,
        options: settings.riverOptions ?? { usePathfinderModule: true },
    });

    const players = createPlayers(settings.players);
    const { units, cities, startingSpotMap } = createStartingUnits({
        players,
        tiles,
        rng,
        startScore,
        meetsStartGuarantees,
        getTile,
    });

    const startingPositions = Array.from(startingSpotMap.values()).map(s => s.coord);
    const { camps: nativeCamps, nativeUnits } = generateNativeCamps({
        tiles,
        mapSize: settings.mapSize,
        startingPositions,
        rng,
        getTile,
        isLand,
    });
    units.push(...nativeUnits);

    const initialState = buildInitialState({
        players,
        width,
        height,
        tiles,
        riverEdges,
        riverPolylines,
        units,
        cities,
        seed,
        aiSystem: settings.aiSystem,
        nativeCamps,
        difficulty: settings.difficulty,
    });

    seedInitialHistory(initialState);
    seedInitialContacts(initialState);

    return initialState;
}

type BaseMapParams = {
    mapSize: MapSize;
    seed: number;
    rng: WorldRng;
};

function createBaseMap(params: BaseMapParams) {
    const { mapSize, seed, rng } = params;
    const dims = MAP_DIMS[mapSize];
    const width = dims.width;
    const height = dims.height;

    const tiles: Tile[] = [];
    const tileMap = new Map<string, Tile>();

    for (let r = 0; r < height; r++) {
        const r_offset = Math.floor(r / 2);
        for (let q = -r_offset; q < width - r_offset; q++) {
            const coord: HexCoord = { q, r };
            const tile: Tile = {
                coord,
                terrain: TerrainType.DeepSea,
                overlays: [],
            };
            tiles.push(tile);
            tileMap.set(hexToString(coord), tile);
        }
    }

    const getTile = (coord: HexCoord) => tileMap.get(hexToString(coord));
    const isLand = (t: Tile | undefined) =>
        !!t && t.terrain !== TerrainType.Mountain && t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast;

    applyTerrainNoise({
        tiles,
        width,
        height,
        mapSize,
        rng,
        getTile,
        isLand,
        seed,
    });

    return { width, height, tiles, getTile, isLand };
}

type StartEvaluatorParams = {
    tiles: Tile[];
    getTile: (coord: HexCoord) => Tile | undefined;
    isLand: (t: Tile | undefined) => boolean;
};

function createStartEvaluators(params: StartEvaluatorParams) {
    const { tiles, getTile, isLand } = params;

    const effectiveBaseYields = (tile: Tile) => {
        const yields = getTileYields(tile);
        const neighbors = getNeighbors(tile.coord);
        const adjRiver = neighbors.some(n => {
            const t = getTile(n);
            return t?.overlays.includes(OverlayType.RiverEdge);
        });
        return { food: yields.F + (adjRiver ? 1 : 0), prod: yields.P };
    };

    const meetsStartGuarantees = (tile: Tile) => {
        const radiusTwo = hexSpiral(tile.coord, 2);
        const hasFood = radiusTwo.some(coord => {
            const t = getTile(coord);
            if (!t || !isLand(t)) return false;
            const y = effectiveBaseYields(t);
            return y.food >= 2;
        });
        const hasProd = radiusTwo.some(coord => {
            const t = getTile(coord);
            if (!t || !isLand(t)) return false;
            const y = effectiveBaseYields(t);
            return y.prod >= 2;
        });
        const hasSettle = hexSpiral(tile.coord, 1).some(coord => {
            const t = getTile(coord);
            return t && isLand(t);
        });
        return hasFood && hasProd && hasSettle;
    };

    const startScore = (tile: Tile, player?: Player) => scoreCitySite(tile, { map: { tiles } }, player?.id, player ? {
        settleBias: {
            hills: player.civName === "ForgeClans" ? 2 : 0,
            rivers: player.civName === "RiverLeague" ? 2 : 0,
        }
    } as any : undefined);

    return { meetsStartGuarantees, startScore };
}

function createPlayers(rawPlayers: WorldGenSettings["players"]): Player[] {
    return rawPlayers.map(p => ({
        id: p.id,
        civName: p.civName,
        color: p.color,
        isAI: !!p.ai,
        aiGoal: "Balanced",
        techs: [],
        currentTech: null,
        completedProjects: [],
        isEliminated: false,
        currentEra: EraId.Primitive,
        treasury: STARTING_TREASURY,
        grossGold: 0,
        buildingUpkeep: 0,
        militaryUpkeep: 0,
        netGold: 0,
        usedSupply: 0,
        freeSupply: 0,
        austerityActive: false,
    }));
}

type StartingUnitParams = {
    players: Player[];
    tiles: Tile[];
    rng: WorldRng;
    startScore: (tile: Tile, player?: Player) => number;
    meetsStartGuarantees: (tile: Tile) => boolean;
    getTile: (coord: HexCoord) => Tile | undefined;
};

function createStartingUnits(params: StartingUnitParams) {
    const { players, tiles, rng, startScore, meetsStartGuarantees, getTile } = params;
    const units: Unit[] = [];
    const cities: City[] = [];

    const validStarts = tiles.filter(t =>
        t.terrain !== TerrainType.Mountain &&
        t.terrain !== TerrainType.DeepSea &&
        t.terrain !== TerrainType.Coast
    );
    rng.shuffle(validStarts);

    const startingSpotMap = pickStartingSpots({
        players,
        validStarts,
        startScore,
        meetsStartGuarantees,
    });

    for (const player of players) {
        const spot = startingSpotMap.get(player.id);
        if (!spot) continue;
        addStartingUnitsForPlayer({
            player,
            spot,
            units,
            rng,
            getTile,
        });
    }

    return { units, cities, startingSpotMap };
}

type AddStartingUnitsParams = {
    player: Player;
    spot: Tile;
    units: Unit[];
    rng: WorldRng;
    getTile: (coord: HexCoord) => Tile | undefined;
};

function addStartingUnitsForPlayer(params: AddStartingUnitsParams) {
    const { player, spot, units, rng, getTile } = params;
    const usedCoords: HexCoord[] = [spot.coord];

    const findSpawnCoord = (excludeCoords: HexCoord[]) => {
        const neighbors = getNeighbors(spot.coord);
        const validNeighbors = neighbors.filter(n => {
            const t = getTile(n);
            if (!t || t.terrain === TerrainType.Mountain || t.terrain === TerrainType.DeepSea || t.terrain === TerrainType.Coast) return false;
            return !excludeCoords.some(e => hexEquals(e, n));
        });
        if (validNeighbors.length > 0) {
            return rng.choice(validNeighbors);
        }
        return spot.coord;
    };

    const addUnit = (unitType: UnitType, id: string, coord: HexCoord) => {
        const stats = UNITS[unitType];
        units.push({
            id,
            type: unitType,
            ownerId: player.id,
            coord,
            hp: stats.hp,
            maxHp: stats.hp,
            movesLeft: stats.move,
            state: UnitState.Normal,
            hasAttacked: false,
        });
    };

    addUnit(UnitType.Settler, `u_${player.id}_settler`, spot.coord);

    const scoutCoord = findSpawnCoord(usedCoords);
    usedCoords.push(scoutCoord);
    addUnit(UnitType.Scout, `u_${player.id}_scout`, scoutCoord);

    const spearCoord = findSpawnCoord(usedCoords);
    usedCoords.push(spearCoord);
    addUnit(UnitType.SpearGuard, `u_${player.id}_spear`, spearCoord);

    if (player.civName === "AetherianVanguard") {
        const extraUnits = AETHERIAN_EXTRA_STARTING_UNITS;
        for (const unitType of extraUnits) {
            const coord = findSpawnCoord(usedCoords);
            usedCoords.push(coord);
            addUnit(unitType, `u_${player.id}_extra_${units.length}`, coord);
        }
    }

    if (player.civName === "ForgeClans") {
        const extraUnits = FORGE_CLANS_EXTRA_STARTING_UNITS;
        for (const unitType of extraUnits) {
            const coord = findSpawnCoord(usedCoords);
            usedCoords.push(coord);
            addUnit(unitType, `u_${player.id}_extra_${units.length}`, coord);
        }
    }



    if (player.civName === "ScholarKingdoms") {
        const extraBowCoord = findSpawnCoord(usedCoords);
        usedCoords.push(extraBowCoord);
        addUnit(UnitType.BowGuard, `u_${player.id}_bow`, extraBowCoord);
    }
}

type InitialStateParams = {
    players: Player[];
    width: number;
    height: number;
    tiles: Tile[];
    riverEdges: any;
    riverPolylines: any;
    units: Unit[];
    cities: City[];
    seed: number;
    aiSystem?: AiSystem;
    nativeCamps: NativeCamp[];
    difficulty?: "Easy" | "Normal" | "Hard" | "Expert";
};

function buildInitialState(params: InitialStateParams): GameState {
    const {
        players,
        width,
        height,
        tiles,
        riverEdges,
        riverPolylines,
        units,
        cities,
        seed,
        aiSystem,
        nativeCamps,
        difficulty,
    } = params;

    const visibility = initVisibility(players, tiles, units, cities);
    const revealed = initVisibility(players, tiles, units, cities);

    return {
        id: crypto.randomUUID(),
        turn: 1,
        aiSystem: aiSystem ?? "UtilityV2",
        difficulty,
        aiMemoryV2: {},
        players,
        currentPlayerId: players[0].id,
        phase: PlayerPhase.StartOfTurn,
        map: {
            width,
            height,
            tiles,
            rivers: riverEdges,
            riverPolylines,
        },
        units,
        cities,
        seed,
        sharedVision: initSharedVision(players),
        contacts: initContacts(players),
        visibility,
        revealed,
        diplomacy: initDiplomacy(players),
        diplomacyOffers: [],
        nativeCamps,
    };
}

function seedInitialHistory(state: GameState) {
    const history: GameHistory = { events: [], playerStats: {}, playerFog: {} };
    for (const p of state.players) {
        const revealedKeys = state.revealed[p.id] ?? [];
        const startingCoords = revealedKeys.map(key => {
            const [q, r] = key.split(",").map(Number);
            return { q, r };
        });
        history.playerFog[p.id] = { [state.turn]: startingCoords };
    }
    state.history = history;
}

function seedInitialContacts(state: GameState) {
    for (const p of state.players) {
        const visible = new Set(state.visibility[p.id] ?? []);
        for (const u of state.units) {
            if (u.ownerId === p.id) continue;
            if (visible.has(hexToString(u.coord))) {
                state.contacts[p.id][u.ownerId] = true;
                state.contacts[u.ownerId][p.id] = true;
            }
        }
        for (const c of state.cities) {
            if (c.ownerId === p.id) continue;
            if (visible.has(hexToString(c.coord))) {
                state.contacts[p.id][c.ownerId] = true;
                state.contacts[c.ownerId][p.id] = true;
            }
        }
    }
}


function initDiplomacy(players: Player[]): Record<string, Record<string, DiplomacyState>> {
    const dip: Record<string, Record<string, DiplomacyState>> = {};
    for (const a of players) {
        dip[a.id] = {};
        for (const b of players) {
            if (a.id === b.id) continue;
            dip[a.id][b.id] = DiplomacyState.Peace;
        }
    }
    return dip;
}

function initSharedVision(players: Player[]): Record<string, Record<string, boolean>> {
    const shared: Record<string, Record<string, boolean>> = {};
    for (const a of players) {
        shared[a.id] = {};
        for (const b of players) {
            if (a.id === b.id) continue;
            shared[a.id][b.id] = false;
        }
    }
    return shared;
}

function initContacts(players: Player[]): Record<string, Record<string, boolean>> {
    const contacts: Record<string, Record<string, boolean>> = {};
    for (const a of players) {
        contacts[a.id] = {};
        for (const b of players) {
            if (a.id === b.id) continue;
            contacts[a.id][b.id] = false;
        }
    }
    return contacts;
}

function initVisibility(players: Player[], tiles: Tile[], units: Unit[], cities: City[]): Record<string, string[]> {
    const vis: Record<string, string[]> = {};
    const tileSet = new Set(tiles.map(t => hexToString(t.coord)));

    const visionRange = (unit: Unit) => {
        // basic vision by type
        if (unit.type === UnitType.Scout) return 3;
        const stats = { [UnitType.Settler]: 2, [UnitType.SpearGuard]: 2, [UnitType.BowGuard]: 2, [UnitType.Riders]: 2, [UnitType.Skiff]: 2 } as any;
        return stats[unit.type] ?? 2;
    };

    for (const p of players) {
        const visible = new Set<string>();
        const ownedUnits = units.filter(u => u.ownerId === p.id);
        const ownedCities = cities.filter(c => c.ownerId === p.id);

        for (const u of ownedUnits) {
            const range = visionRange(u);
            hexSpiral(u.coord, range).forEach(coord => visible.add(hexToString(coord)));
        }

        for (const c of ownedCities) {
            hexSpiral(c.coord, 2).forEach(coord => visible.add(hexToString(coord)));
        }

        vis[p.id] = Array.from(visible).filter(v => tileSet.has(v));
    }
    return vis;
}

// Native Camp Generation
type NativeCampGenParams = {
    tiles: Tile[];
    mapSize: MapSize;
    startingPositions: HexCoord[];
    rng: WorldRng;
    getTile: (coord: HexCoord) => Tile | undefined;
    isLand: (t: Tile | undefined) => boolean;
};

function generateNativeCamps(params: NativeCampGenParams): { camps: NativeCamp[], nativeUnits: Unit[] } {
    const { tiles, mapSize, startingPositions, rng, getTile, isLand } = params;

    const [minCamps, maxCamps] = NATIVE_CAMP_COUNTS[mapSize] ?? [2, 4];
    const targetCamps = rng.int(minCamps, maxCamps + 1);

    if (targetCamps === 0) {
        return { camps: [], nativeUnits: [] };
    }

    // Find valid camp tiles
    const validCampTiles = tiles.filter(t => {
        // Must be land (not mountain, coast, deep sea)
        if (!isLand(t)) return false;

        // Cannot have existing overlays
        if (t.overlays.length > 0) return false;

        // Must be far enough from all starting positions
        const tooCloseToStart = startingPositions.some(
            start => hexDistance(t.coord, start) < NATIVE_CAMP_MIN_DISTANCE_FROM_START
        );
        if (tooCloseToStart) return false;

        return true;
    });

    if (validCampTiles.length === 0) {
        return { camps: [], nativeUnits: [] };
    }

    // Weight tiles by terrain preference (Forest > Hills > Marsh > others)
    const weightedTiles = validCampTiles.map(t => ({
        tile: t,
        weight: t.terrain === TerrainType.Forest ? 3 :
            t.terrain === TerrainType.Hills ? 2 :
                t.terrain === TerrainType.Marsh ? 1.5 : 1
    }));

    // Select camp tiles respecting minimum distance between camps
    const selectedCampTiles: Tile[] = [];
    const shuffledWeighted = [...weightedTiles];
    rng.shuffle(shuffledWeighted);

    // Sort by weight (higher weight first) for better terrain selection
    shuffledWeighted.sort((a, b) => b.weight - a.weight);

    for (const { tile } of shuffledWeighted) {
        if (selectedCampTiles.length >= targetCamps) break;

        // Check distance from already selected camps
        const tooCloseToOtherCamp = selectedCampTiles.some(
            existing => hexDistance(tile.coord, existing.coord) < NATIVE_CAMP_MIN_DISTANCE_BETWEEN
        );
        if (tooCloseToOtherCamp) continue;

        selectedCampTiles.push(tile);
    }

    // Create camps and units
    const camps: NativeCamp[] = [];
    const nativeUnits: Unit[] = [];

    for (let i = 0; i < selectedCampTiles.length; i++) {
        const campTile = selectedCampTiles[i];
        const campId = `camp_${i}_${hexToString(campTile.coord)}`;

        // Add NativeCamp overlay to the tile
        campTile.overlays.push(OverlayType.NativeCamp);

        // Create Champion unit (on camp tile)
        const championStats = UNITS[UnitType.NativeChampion];
        const championId = `native_champion_${campId}`;
        nativeUnits.push({
            id: championId,
            type: UnitType.NativeChampion,
            ownerId: "natives", // Special owner ID for native units
            coord: campTile.coord,
            hp: championStats.hp,
            maxHp: championStats.hp,
            movesLeft: championStats.move,
            state: UnitState.Normal,
            hasAttacked: false,
            campId,
        });

        // Create 2 Archer units (on camp tile and nearby)
        const archerStats = UNITS[UnitType.NativeArcher];
        const archerPositions = [campTile.coord];

        // Try to find a nearby valid tile for second archer
        const neighbors = getNeighbors(campTile.coord);
        for (const n of neighbors) {
            const neighborTile = getTile(n);
            if (isLand(neighborTile) && archerPositions.length < 2) {
                archerPositions.push(n);
                break;
            }
        }
        // If no neighbor found, both archers start on camp tile
        if (archerPositions.length < 2) {
            archerPositions.push(campTile.coord);
        }

        for (let j = 0; j < 2; j++) {
            const archerId = `native_archer_${campId}_${j}`;
            nativeUnits.push({
                id: archerId,
                type: UnitType.NativeArcher,
                ownerId: "natives",
                coord: archerPositions[Math.min(j, archerPositions.length - 1)],
                hp: archerStats.hp,
                maxHp: archerStats.hp,
                movesLeft: archerStats.move,
                state: UnitState.Normal,
                hasAttacked: false,
                campId,
            });
        }

        // Create the camp tracking object
        camps.push({
            id: campId,
            coord: campTile.coord,
            state: "Patrol",
            aggroTurnsRemaining: 0,
        });
    }

    return { camps, nativeUnits };
}
