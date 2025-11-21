import {
    DiplomacyState,
    GameState,
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
    TechId,
} from "../core/types.js";
import { MAP_DIMS, MAX_PLAYERS, TERRAIN } from "../core/constants.js";
import { hexEquals, hexToString, hexNeighbor, hexSpiral, getNeighbors } from "../core/hex.js";
import { getTileYields } from "../game/rules.js";
import { scoreCitySite } from "../game/ai-heuristics.js";

export type WorldGenSettings = {
    mapSize: "Small" | "Standard" | "Large";
    players: { id: string; civName: string; color: string; ai?: boolean }[];
    seed?: number;
};

// Simple pseudo-random number generator
class Random {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    int(min: number, max: number): number {
        return Math.floor(this.range(min, max));
    }

    choice<T>(array: T[]): T {
        return array[this.int(0, array.length)];
    }

    shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

export function generateWorld(settings: WorldGenSettings): GameState {
    const seed = settings.seed ?? Math.floor(Math.random() * 100000);
    const rng = new Random(seed);
    const dims = MAP_DIMS[settings.mapSize];
    const width = dims.w;
    const height = dims.h;

    const tiles: Tile[] = [];
    const tileMap = new Map<string, Tile>();
    const riverEdges: { a: HexCoord; b: HexCoord }[] = [];

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
                features: undefined,
            };
            tiles.push(tile);
            tileMap.set(hexToString(coord), tile);
        }
    }

    // 2. Terrain Generation with coast bias, land fill, and clusters
    tiles.forEach((t) => (t.terrain = TerrainType.DeepSea));

    // Edge distance helper (approx for odd-r grid)
    const edgeDist = (tile: Tile) => {
        const col = tile.coord.q + Math.floor(tile.coord.r / 2);
        const row = tile.coord.r;
        const toLeft = col;
        const toRight = width - 1 - col;
        const toTop = row;
        const toBottom = height - 1 - row;
        return Math.min(toLeft, toRight, toTop, toBottom);
    };

    // Base land mask with coast bias
    tiles.forEach(t => {
        const dist = edgeDist(t);
        if (dist <= 0) {
            t.terrain = TerrainType.DeepSea;
        } else if (dist === 1) {
            t.terrain = TerrainType.Coast;
        } else if (dist === 2) {
            t.terrain = rng.next() < 0.65 ? TerrainType.Coast : TerrainType.Plains;
        } else {
            t.terrain = TerrainType.Plains;
            if (rng.next() < 0.05) t.terrain = TerrainType.Coast; // inland lakes/shallows
        }
    });

    // Interior terrain variation
    tiles.forEach(t => {
        if (t.terrain === TerrainType.Plains) {
            const n = rng.next();
            if (n < 0.18) t.terrain = TerrainType.Forest;
            else if (n < 0.28) t.terrain = TerrainType.Hills;
            else if (n < 0.36) t.terrain = TerrainType.Marsh;
            else if (n < 0.42) t.terrain = TerrainType.Desert;
        }
    });

    const getTile = (coord: HexCoord) => tileMap.get(hexToString(coord));
    const isLand = (t: Tile | undefined) =>
        !!t && t.terrain !== TerrainType.Mountain && t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast;
    const effectiveBaseYields = (tile: Tile) => {
        const yields = getTileYields(tile);
        const neighbors = getNeighbors(tile.coord);
        const adjRiver = neighbors.some(n => {
            const t = getTile(n);
            return t?.overlays.includes(OverlayType.RiverEdge);
        });
        return { food: yields.F + (adjRiver ? 1 : 0), prod: yields.P };
    };

    // Mountain clusters
    const clusterBySize: Record<MapSize, number> = { Small: 2, Standard: 3, Large: 4 };
    const clusterCount = clusterBySize[settings.mapSize] ?? 2;
    for (let i = 0; i < clusterCount; i++) {
        const center = rng.choice(tiles.filter(t => isLand(t)));
        if (!center) continue;
        center.terrain = TerrainType.Mountain;
        const ring1 = getNeighbors(center.coord)
            .map(c => getTile(c))
            .filter(t => t && isLand(t)) as Tile[];
        ring1.forEach(t => {
            if (rng.next() < 0.6) {
                t.terrain = TerrainType.Mountain;
            } else if (rng.next() < 0.85) {
                t.terrain = TerrainType.Hills;
            }
        });
    }

    // Add Overlays (resource features)
    tiles.forEach(t => {
        if (t.terrain !== TerrainType.Mountain && t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast) {
            const n = rng.next();
            if (n < 0.05) t.overlays.push(OverlayType.RichSoil);
            else if (n < 0.10) t.overlays.push(OverlayType.OreVein);
            else if (n < 0.12) t.overlays.push(OverlayType.SacredSite);
        }
        // Keep features in sync for spec parity
        t.features = t.overlays;
    });
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

    // Add Rivers as edge overlays (approximated by flagging river edges on tiles a path passes through)
    const riverTargetsBySize: Record<MapSize, [number, number]> = {
        Small: [4, 7],
        Standard: [8, 13],
        Large: [10, 15],
    };
    const [riverMin, riverMax] = riverTargetsBySize[settings.mapSize];
    const riverCount = Math.max(1, rng.int(riverMin, riverMax)); // inclusive min, exclusive max

    const downDirs = [5, 4, 0, 3]; // bias south and gentle meanders

    const landTiles = tiles.filter(t => isLand(t));
    const addRiverEdge = (a: HexCoord, b: HexCoord) => {
        // store edges with canonical ordering to dedupe
        const keyA = hexToString(a);
        const keyB = hexToString(b);
        const key = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
        if (riverEdges.some(e => {
            const ek = hexToString(e.a) < hexToString(e.b)
                ? `${hexToString(e.a)}|${hexToString(e.b)}`
                : `${hexToString(e.b)}|${hexToString(e.a)}`;
            return ek === key;
        })) return;
        riverEdges.push(keyA < keyB ? { a, b } : { a: b, b: a });
    };
    for (let ri = 0; ri < riverCount; ri++) {
        // prefer edge starts (top rows or left/right edges)
        const edgeCandidates = landTiles.filter(
            t => t.coord.r <= 1 || t.coord.r >= height - 2 || t.coord.q <= -Math.floor(height / 2) + 1 || t.coord.q >= width - Math.floor(height / 2) - 2,
        );
        const start = edgeCandidates.length ? rng.choice(edgeCandidates) : rng.choice(landTiles);
        if (!start) continue;

        let current = start;
        const pathLength = rng.int(6, 14);
        for (let step = 0; step < pathLength; step++) {
            if (current.overlays.includes(OverlayType.RiverEdge)) {
                // already marked; continue path but avoid double work
            } else {
                current.overlays.push(OverlayType.RiverEdge);
                current.features = current.overlays;
            }

            // pick a next tile that trends downward but stays on land
            const nextOptions = downDirs
                .map(d => hexNeighbor(current.coord, d))
                .map(c => getTile(c))
                .filter(t => isLand(t)) as Tile[];

            if (!nextOptions.length) break;
            const next = rng.choice(nextOptions);
            addRiverEdge(current.coord, next.coord);
            current = next;
        }
    }

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

    const startScore = (tile: Tile) => scoreCitySite(tile, { map: { tiles } });

    const startingSpots: Tile[] = [];
    for (const p of players) {
        const MIN_START_DIST = 6; // rulebook: starters at least 6 tiles apart (hex distance)
        const spaced = validStarts.filter(t =>
            startingSpots.every(s => {
                const dist = (Math.abs(t.coord.q - s.coord.q) + Math.abs(t.coord.q + t.coord.r - s.coord.q - s.coord.r) + Math.abs(t.coord.r - s.coord.r)) / 2;
                return dist >= MIN_START_DIST;
            })
        );
        const guaranteed = spaced.filter(t => meetsStartGuarantees(t));
        const pool = (guaranteed.length ? guaranteed : spaced.length ? spaced : validStarts);
        let spot = pool[0];
        let bestScore = -Infinity;
        for (const t of pool) {
            const sc = startScore(t);
            if (sc > bestScore) {
                bestScore = sc;
                spot = t;
            }
        }

        if (spot) {
            startingSpots.push(spot);
            // Remove from valid to avoid overlap
            const idx = validStarts.indexOf(spot);
            if (idx > -1) validStarts.splice(idx, 1);

            // Create Units
            units.push({
                id: `u_${p.id}_settler`,
                type: UnitType.Settler,
                ownerId: p.id,
                coord: spot.coord,
                hp: 1,
                maxHp: 1,
                movesLeft: 1,
                state: UnitState.Normal,
                hasAttacked: false,
            });

            units.push({
                id: `u_${p.id}_scout`,
                type: UnitType.Scout,
                ownerId: p.id,
                coord: spot.coord, // Stacked initially? Rulebook says Settler can share with 1 military.
                hp: 10,
                maxHp: 10,
                movesLeft: 2,
                state: UnitState.Normal,
                hasAttacked: false,
            });
        }
    }

    const initialState = {
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
    };

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
        const stats = { [UnitType.Settler]: 2, [UnitType.SpearGuard]: 2, [UnitType.BowGuard]: 2, [UnitType.Riders]: 2, [UnitType.RiverBoat]: 2 } as any;
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
