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
} from "../core/types.js";
import { MAP_DIMS, UNITS, AETHERIAN_EXTRA_STARTING_UNITS, FORGE_CLANS_EXTRA_STARTING_UNITS, NATIVE_CAMP_COUNTS, NATIVE_CAMP_MIN_DISTANCE_FROM_START, NATIVE_CAMP_MIN_DISTANCE_BETWEEN } from "../core/constants.js";
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
    const dims = MAP_DIMS[settings.mapSize];
    const width = dims.width;
    const height = dims.height;

    const tiles: Tile[] = [];
    const tileMap = new Map<string, Tile>();
    // 1. Generate Base Map (Rectangular Hex Grid)
    // Using "odd-r" offset coordinates for storage, but converting to axial for logic
    for (let r = 0; r < height; r++) {
        const r_offset = Math.floor(r / 2); // or -Math.floor(r/2) depending on system
        for (let q = -r_offset; q < width - r_offset; q++) {
            const coord: HexCoord = { q, r };
            const tile: Tile = {
                coord,
                terrain: TerrainType.DeepSea, // Default
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
        mapSize: settings.mapSize,
        rng,
        getTile,
        isLand,
        seed,
    });

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

    const { riverEdges, riverPolylines } = generateRivers({
        tiles,
        mapSize: settings.mapSize,
        rng,
        getTile,
        isLand,
        options: settings.riverOptions ?? { usePathfinderModule: true },
    });

    // 3. Players & Starting Units
    const players: Player[] = settings.players.map((p) => ({
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
    }));

    const units: Unit[] = [];
    const cities: City[] = []; // Empty at start

    // Place players far apart
    // Simple strategy: divide map into sectors or just pick random valid spots far from each other
    const validStarts = tiles.filter(t =>
        t.terrain !== TerrainType.Mountain &&
        t.terrain !== TerrainType.DeepSea &&
        t.terrain !== TerrainType.Coast
    );

    // Shuffle valid starts
    rng.shuffle(validStarts);

    const startScore = (tile: Tile, player?: Player) => scoreCitySite(tile, { map: { tiles } }, player?.id, player ? {
        settleBias: {
            hills: player.civName === "ForgeClans" ? 2 : 0,
            rivers: player.civName === "RiverLeague" ? 2 : 0,
        }
    } as any : undefined);

    const startingSpotMap = pickStartingSpots({
        players,
        validStarts,
        startScore,
        meetsStartGuarantees,
    });

    for (const p of players) {
        const spot = startingSpotMap.get(p.id);
        if (!spot) continue;

        // Helper to find a valid spawn position
        const findSpawnCoord = (excludeCoords: HexCoord[]) => {
            const neighbors = getNeighbors(spot.coord);
            const validNeighbors = neighbors.filter(n => {
                const t = getTile(n);
                if (!t || t.terrain === TerrainType.Mountain || t.terrain === TerrainType.DeepSea || t.terrain === TerrainType.Coast) return false;
                // Don't spawn on already used coordinates
                return !excludeCoords.some(e => hexEquals(e, n));
            });
            if (validNeighbors.length > 0) {
                return rng.choice(validNeighbors);
            }
            return spot.coord;
        };

        const usedCoords: HexCoord[] = [spot.coord];

        // Base Settler (all civs)
        const settlerStats = UNITS[UnitType.Settler];
        units.push({
            id: `u_${p.id}_settler`,
            type: UnitType.Settler,
            ownerId: p.id,
            coord: spot.coord,
            hp: settlerStats.hp,
            maxHp: settlerStats.hp,
            movesLeft: settlerStats.move,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // Base Scout (all civs)
        const scoutStats = UNITS[UnitType.Scout];
        const scoutCoord = findSpawnCoord(usedCoords);
        usedCoords.push(scoutCoord);
        units.push({
            id: `u_${p.id}_scout`,
            type: UnitType.Scout,
            ownerId: p.id,
            coord: scoutCoord,
            hp: scoutStats.hp,
            maxHp: scoutStats.hp,
            movesLeft: scoutStats.move,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // v2.0: Base SpearGuard (all civs) - prevents easy early capital rushes
        const spearStats = UNITS[UnitType.SpearGuard];
        const spearCoord = findSpawnCoord(usedCoords);
        usedCoords.push(spearCoord);
        units.push({
            id: `u_${p.id}_spear`,
            type: UnitType.SpearGuard,
            ownerId: p.id,
            coord: spearCoord,
            hp: spearStats.hp,
            maxHp: spearStats.hp,
            movesLeft: spearStats.move,
            state: UnitState.Normal,
            hasAttacked: false,
        });

        // v0.98 Update 2: AetherianVanguard starts with extra units (defined in constants)
        if (p.civName === "AetherianVanguard") {
            const extraUnits = AETHERIAN_EXTRA_STARTING_UNITS;
            for (const unitType of extraUnits) {
                const stats = UNITS[unitType];
                const coord = findSpawnCoord(usedCoords);
                usedCoords.push(coord);
                units.push({
                    id: `u_${p.id}_extra_${units.length}`,
                    type: unitType,
                    ownerId: p.id,
                    coord: coord,
                    hp: stats.hp,
                    maxHp: stats.hp,
                    movesLeft: stats.move,
                    state: UnitState.Normal,
                    hasAttacked: false,
                });
            }
        }

        // v2.7: Forge Clans starts with extra units (Riders) to fuel early aggression
        if (p.civName === "ForgeClans") {
            const extraUnits = FORGE_CLANS_EXTRA_STARTING_UNITS;
            for (const unitType of extraUnits) {
                const stats = UNITS[unitType];
                const coord = findSpawnCoord(usedCoords);
                usedCoords.push(coord);
                units.push({
                    id: `u_${p.id}_extra_${units.length}`,
                    type: unitType,
                    ownerId: p.id,
                    coord: coord,
                    hp: stats.hp,
                    maxHp: stats.hp,
                    movesLeft: stats.move,
                    state: UnitState.Normal,
                    hasAttacked: false,
                });
            }
        }

        // v1.9: StarborneSeekers starts with an extra Scout (exploration theme)
        if (p.civName === "StarborneSeekers") {
            const scoutStats = UNITS[UnitType.Scout];
            const extraScoutCoord = findSpawnCoord(usedCoords);
            usedCoords.push(extraScoutCoord);
            units.push({
                id: `u_${p.id}_scout2`,
                type: UnitType.Scout,
                ownerId: p.id,
                coord: extraScoutCoord,
                hp: scoutStats.hp,
                maxHp: scoutStats.hp,
                movesLeft: scoutStats.move,
                state: UnitState.Normal,
                hasAttacked: false,
            });
        }

        // NOTE: JadeCovenant extra settler REMOVED in v0.98 update
        // Their 80% win rate with growth bonuses + pop combat bonus was too strong
    }
    // Generate native camps before creating state
    const startingPositions = Array.from(startingSpotMap.values()).map(s => s.coord);
    const { camps: nativeCamps, nativeUnits } = generateNativeCamps({
        tiles,
        mapSize: settings.mapSize,
        startingPositions,
        rng,
        getTile,
        isLand,
    });

    // Add native units to the main units array
    units.push(...nativeUnits);

    const initialState: GameState = {
        id: crypto.randomUUID(),
        turn: 1,
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
        visibility: initVisibility(players, tiles, units, cities),
        revealed: initVisibility(players, tiles, units, cities),
        diplomacy: initDiplomacy(players),
        diplomacyOffers: [],
        nativeCamps,
    };

    // Seed history and initial fog baseline so replay starts with visible starts
    const history: GameHistory = { events: [], playerStats: {}, playerFog: {} };
    for (const p of players) {
        const revealedKeys = initialState.revealed[p.id] ?? [];
        const startingCoords = revealedKeys.map(key => {
            const [q, r] = key.split(",").map(Number);
            return { q, r };
        });
        history.playerFog[p.id] = { [initialState.turn]: startingCoords };
    }
    initialState.history = history;

    // Seed contacts if any civs can already see each other at start
    for (const p of players) {
        const visible = new Set(initialState.visibility[p.id] ?? []);
        for (const u of units) {
            if (u.ownerId === p.id) continue;
            if (visible.has(hexToString(u.coord))) {
                initialState.contacts[p.id][u.ownerId] = true;
                initialState.contacts[u.ownerId][p.id] = true;
            }
        }
        for (const c of cities) {
            if (c.ownerId === p.id) continue;
            if (visible.has(hexToString(c.coord))) {
                initialState.contacts[p.id][c.ownerId] = true;
                initialState.contacts[c.ownerId][p.id] = true;
            }
        }
    }

    return initialState;
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
