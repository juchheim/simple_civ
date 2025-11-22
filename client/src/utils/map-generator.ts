import {
    DiplomacyState,
    GameState,
    HexCoord,
    Player,
    PlayerPhase,
    TerrainType,
    Tile,
    City,
    Unit,
    UnitState,
    UnitType,
    OverlayType,
    RiverSegmentDescriptor,
} from "./engine-types";

// Inline constants to avoid build issues
import { hexToString, hexSpiral, getNeighbors, hexEquals } from "./hex";
import { MAP_DIMS, UNITS } from "./constants";
import { getTileYields } from "./rules";
import { scoreCitySite } from "./ai-heuristics";
import { directionBetween, EDGE_TO_CORNER_INDICES } from "./rivers";

const HEX_SIZE = 75;
const HEX_CORNER_OFFSETS = Array.from({ length: 6 }, (_v, i) => {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    return {
        x: HEX_SIZE * Math.cos(angleRad),
        y: HEX_SIZE * Math.sin(angleRad),
    };
});

function hexToPixel(hex: HexCoord) {
    const x = HEX_SIZE * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
    const y = HEX_SIZE * ((3 / 2) * hex.r);
    return { x, y };
}

function getCornerPoints(tile: HexCoord) {
    const center = hexToPixel(tile);
    return HEX_CORNER_OFFSETS.map(offset => ({
        x: center.x + offset.x,
        y: center.y + offset.y,
    }));
}

function squaredDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

const RIVER_POINT_EPSILON = 1e-6;

function findCornerIndex(tile: HexCoord, point: { x: number; y: number }): number | null {
    const corners = getCornerPoints(tile);
    for (let idx = 0; idx < corners.length; idx++) {
        if (squaredDistance(corners[idx], point) < RIVER_POINT_EPSILON) {
            return idx;
        }
    }
    return null;
}

function walkCornerIndices(fromIdx: number, toIdx: number): number[] {
    if (fromIdx === toIdx) return [];
    const clockwise: number[] = [];
    let idx = fromIdx;
    while (idx !== toIdx) {
        idx = (idx + 1) % 6;
        clockwise.push(idx);
    }
    const counter: number[] = [];
    idx = fromIdx;
    while (idx !== toIdx) {
        idx = (idx + 5) % 6;
        counter.push(idx);
    }
    return counter.length < clockwise.length ? counter : clockwise;
}

function pushCornerSegment(
    segments: RiverSegmentDescriptor[],
    tile: HexCoord,
    cornerPoints: { x: number; y: number }[],
    startIdx: number,
    endIdx: number,
) {
    segments.push({
        tile,
        cornerA: startIdx,
        cornerB: endIdx,
        start: cornerPoints[startIdx],
        end: cornerPoints[endIdx],
    });
}


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
    const riverPolylines: RiverSegmentDescriptor[][] = [];

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
            if (rng.next() < 0.05) t.terrain = TerrainType.Coast;
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
    const clusterBySize: Record<WorldGenSettings["mapSize"], number> = { Small: 2, Standard: 3, Large: 4 };
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

    // Add Overlays
    tiles.forEach(t => {
        if (t.terrain !== TerrainType.Mountain && t.terrain !== TerrainType.DeepSea && t.terrain !== TerrainType.Coast) {
            const n = rng.next();
            if (n < 0.05) t.overlays.push(OverlayType.RichSoil);
            else if (n < 0.10) t.overlays.push(OverlayType.OreVein);
            else if (n < 0.12) t.overlays.push(OverlayType.SacredSite);
        }
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

    // Add Rivers - simplified greedy downhill generator v2.0
    const TERRAIN_ELEVATION: Record<TerrainType, number> = {
        [TerrainType.Mountain]: 5,
        [TerrainType.Hills]: 4,
        [TerrainType.Forest]: 3,
        [TerrainType.Plains]: 2,
        [TerrainType.Desert]: 2,
        [TerrainType.Marsh]: 1,
        [TerrainType.Coast]: 0,
        [TerrainType.DeepSea]: -1,
    };

    const riverTargetsBySize: Record<WorldGenSettings["mapSize"], [number, number]> = {
        Small: [2, 4],
        Standard: [4, 7],
        Large: [6, 10],
    };
    const [riverMin, riverMax] = riverTargetsBySize[settings.mapSize];
    const riverCount = Math.max(1, rng.int(riverMin, riverMax));

    const landTiles = tiles.filter(t => isLand(t));
    const elevationByKey = new Map<string, number>();
    tiles.forEach(t => {
        elevationByKey.set(hexToString(t.coord), TERRAIN_ELEVATION[t.terrain] ?? 0);
    });
    const coastDistance = buildCoastDistance(tiles, getTile);

    const riverDegree = new Map<string, number>();
    const existingRiverTiles = new Set<string>();
    const incrementDegree = (key: string) => {
        riverDegree.set(key, (riverDegree.get(key) ?? 0) + 1);
        existingRiverTiles.add(key);
    };

    const addRiverEdge = (a: HexCoord, b: HexCoord) => {
        const keyA = hexToString(a);
        const keyB = hexToString(b);
        // Check for duplicates (both directions)
        const isDuplicate = riverEdges.some(e => {
            const ea = hexToString(e.a);
            const eb = hexToString(e.b);
            return (ea === keyA && eb === keyB) || (ea === keyB && eb === keyA);
        });
        if (isDuplicate) return;
        
        // Store edge in flow order (a -> b)
        riverEdges.push({ a, b });
        incrementDegree(keyA);
        incrementDegree(keyB);
    };

    const elevationThreshold = 3;
    const minStartSpacing = 6; // Increased spacing to allow longer rivers
    const minRiverLength = 6; // Increased minimum length
    
    // Select high-elevation tiles as river starts
    const potentialStarts = landTiles
        .filter(t => (elevationByKey.get(hexToString(t.coord)) ?? 0) >= elevationThreshold)
        .sort((a, b) => {
            const ea = elevationByKey.get(hexToString(a.coord)) ?? 0;
            const eb = elevationByKey.get(hexToString(b.coord)) ?? 0;
            return eb - ea; // Highest first
        });

    const hexDist = (a: HexCoord, b: HexCoord) =>
        (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

    const riverStarts: Tile[] = [];
    for (const candidate of potentialStarts) {
        if (riverStarts.length >= riverCount) break;
        const spaced = riverStarts.every(r => hexDist(r.coord, candidate.coord) >= minStartSpacing);
        if (!spaced) continue;
        riverStarts.push(candidate);
    }

    // Fallback if not enough high-elevation starts
    if (riverStarts.length < riverCount) {
        const chosenKeys = new Set(riverStarts.map(t => hexToString(t.coord)));
        const fallback = landTiles.filter(t => !chosenKeys.has(hexToString(t.coord)));
        rng.shuffle(fallback);
        for (const tile of fallback) {
            if (riverStarts.length >= riverCount) break;
            const spaced = riverStarts.every(r => hexDist(r.coord, tile.coord) >= minStartSpacing);
            if (!spaced) continue;
            riverStarts.push(tile);
        }
    }

    for (const start of riverStarts) {
        const path = findRiverPath(
            start,
            getTile,
            isLand,
            existingRiverTiles,
            riverDegree,
            elevationByKey,
            coastDistance,
            minRiverLength,
            rng,
        );

        if (!path || path.length < minRiverLength + 1) {
            continue;
        }

        const polylineDescriptor: RiverSegmentDescriptor[] = [];
        let lastPoint: { x: number; y: number } | null = null;
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            const dir = directionBetween(from, to);
            if (dir === null) continue;

            const cornerPoints = getCornerPoints(from);
            const [cornerA, cornerB] = EDGE_TO_CORNER_INDICES[dir];
            const edgeCornerIdxs = [cornerA, cornerB];

            let entryIdx: number | null = null;
            if (lastPoint) {
                entryIdx = findCornerIndex(from, lastPoint);
            }

            let startIdx = edgeCornerIdxs[0];
            let endIdx = edgeCornerIdxs[1];

            if (entryIdx !== null) {
                const pathToFirst = walkCornerIndices(entryIdx, edgeCornerIdxs[0]);
                const pathToSecond = walkCornerIndices(entryIdx, edgeCornerIdxs[1]);
                let bridgePath: number[];
                if (pathToFirst.length <= pathToSecond.length) {
                    startIdx = edgeCornerIdxs[0];
                    endIdx = edgeCornerIdxs[1];
                    bridgePath = pathToFirst;
                } else {
                    startIdx = edgeCornerIdxs[1];
                    endIdx = edgeCornerIdxs[0];
                    bridgePath = pathToSecond;
                }

                if (bridgePath.length) {
                    let currentIdx = entryIdx;
                    for (const nextIdx of bridgePath) {
                        pushCornerSegment(polylineDescriptor, from, cornerPoints, currentIdx, nextIdx);
                        currentIdx = nextIdx;
                    }
                }
            }

            pushCornerSegment(polylineDescriptor, from, cornerPoints, startIdx, endIdx);
            lastPoint = cornerPoints[endIdx];
            addRiverEdge(from, to);
        }
        if (polylineDescriptor.length) {
            riverPolylines.push(polylineDescriptor);
        }

        for (let i = 0; i < path.length; i++) {
            const coord = path[i];
            const tile = getTile(coord);
            if (!tile) continue;
            if (!isLand(tile)) continue;
            if (!tile.overlays.includes(OverlayType.RiverEdge)) {
                tile.overlays.push(OverlayType.RiverEdge);
                tile.features = tile.overlays;
            }
        }
    }

    // 3. Players & Starting Units
    const players: Player[] = settings.players.map((p) => ({
        id: p.id,
        civName: p.civName,
        color: p.color,
        isAI: !!p.ai,
        aiGoal: "Balanced",
        techs: [], // No starting techs - player must research
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
        const MIN_START_DIST = 6;
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
    diplomacy: initDiplomacy(players),
    sharedVision: initSharedVision(players),
    contacts: initContacts(players),
    visibility: initVisibility(players, tiles, units, cities),
    revealed: initVisibility(players, tiles, units, cities),
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

    // Initialize the first player's turn (refresh units, etc.)
    for (const unit of initialState.units.filter(u => u.ownerId === players[0].id)) {
        const unitStats = UNITS[unit.type];
        unit.movesLeft = unitStats.move;
        unit.hasAttacked = false;
    }
    initialState.phase = PlayerPhase.Planning;

    return initialState;
}

function buildCoastDistance(tiles: Tile[], getTile: (coord: HexCoord) => Tile | undefined): Map<string, number> {
    const distance = new Map<string, number>();
    const queue: HexCoord[] = [];

    for (const tile of tiles) {
        if (tile.terrain === TerrainType.Coast || tile.terrain === TerrainType.DeepSea) {
            const key = hexToString(tile.coord);
            if (!distance.has(key)) {
                distance.set(key, 0);
                queue.push(tile.coord);
            }
        }
    }

    while (queue.length) {
        const coord = queue.shift()!;
        const currentDist = distance.get(hexToString(coord)) ?? 0;
        for (const neighbor of getNeighbors(coord)) {
            const neighborTile = getTile(neighbor);
            if (!neighborTile) continue;
            const key = hexToString(neighborTile.coord);
            if (distance.has(key)) continue;
            distance.set(key, currentDist + 1);
            queue.push(neighborTile.coord);
        }
    }

    return distance;
}

function findRiverPath(
    start: Tile,
    getTile: (coord: HexCoord) => Tile | undefined,
    isLand: (tile: Tile | undefined) => boolean,
    existingRiverTiles: Set<string>,
    riverDegree: Map<string, number>,
    elevationByKey: Map<string, number>,
    coastDistance: Map<string, number>,
    minRiverLength: number,
    rng: Random,
): HexCoord[] | null {
    type Node = {
        coord: HexCoord;
        key: string;
        prev: string | null;
        length: number;
        dir: number | null;
        priority: number;
    };

    const startKey = hexToString(start.coord);
    const startNode: Node = {
        coord: start.coord,
        key: startKey,
        prev: null,
        length: 0,
        dir: null,
        priority: 0,
    };

    const frontier: Node[] = [startNode];
    const nodeByKey = new Map<string, Node>();
    nodeByKey.set(startKey, startNode);
    const visited = new Set<string>([startKey]);

    const getElevation = (coord: HexCoord) => elevationByKey.get(hexToString(coord)) ?? 0;
    const getCoastDist = (coord: HexCoord) => coastDistance.get(hexToString(coord)) ?? Number.POSITIVE_INFINITY;

    while (frontier.length) {
        frontier.sort((a, b) => a.priority - b.priority);
        const current = frontier.shift()!;

        if (
            current.length >= minRiverLength &&
            !hexEquals(current.coord, start.coord) &&
            getTile(current.coord)?.terrain === TerrainType.Coast
        ) {
            return reconstructPath(current.key, nodeByKey);
        }

        const currentTile = getTile(current.coord);
        if (!currentTile) continue;

        const neighbors = getNeighbors(current.coord)
            .map(coord => getTile(coord))
            .filter((t): t is Tile => !!t);

        for (const neighbor of neighbors) {
            const neighborKey = hexToString(neighbor.coord);
            const neighborIsCoast = neighbor.terrain === TerrainType.Coast;
            const neighborIsLand = isLand(neighbor);

            if (!neighborIsLand && !neighborIsCoast) continue;
            if (visited.has(neighborKey)) continue;

            if (existingRiverTiles.has(neighborKey) && !neighborIsCoast) {
                continue;
            }

            if (neighborIsCoast) {
                const degree = riverDegree.get(neighborKey) ?? 0;
                if (degree >= 1) continue;
                if (current.length + 1 < minRiverLength) continue;
            }

            const currentDir = current.dir;
            const dirToNeighbor = directionBetween(current.coord, neighbor.coord);
            if (currentDir !== null && dirToNeighbor !== null) {
                const diff = Math.abs(dirToNeighbor - currentDir);
                const wrapped = Math.min(diff, 6 - diff);
                if (wrapped > 1) {
                    continue;
                }
            }

            const elevationPenalty = Math.max(0, getElevation(neighbor.coord) - getElevation(current.coord));
            const coastPenalty = getCoastDist(neighbor.coord);
            const turnPenalty = currentDir !== null && dirToNeighbor !== null && dirToNeighbor !== currentDir ? 1 : 0;
            const randomNoise = rng.next() * 0.1;
            const priority =
                (current.length + 1) * 2 +
                elevationPenalty * 5 +
                coastPenalty * 3 +
                turnPenalty * 2 +
                randomNoise;

            const nextNode: Node = {
                coord: neighbor.coord,
                key: neighborKey,
                prev: current.key,
                length: current.length + 1,
                dir: dirToNeighbor,
                priority,
            };

            frontier.push(nextNode);
            nodeByKey.set(neighborKey, nextNode);
            visited.add(neighborKey);
        }
    }

    return null;
}

function reconstructPath(endKey: string, nodeByKey: Map<string, { coord: HexCoord; prev: string | null }>): HexCoord[] {
    const path: HexCoord[] = [];
    let currentKey: string | null = endKey;
    while (currentKey) {
        const node = nodeByKey.get(currentKey);
        if (!node) break;
        path.unshift(node.coord);
        currentKey = node.prev;
    }
    return path;
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
        if (unit.type === UnitType.Scout) return 3;
        const stats: any = { [UnitType.Settler]: 2, [UnitType.SpearGuard]: 2, [UnitType.BowGuard]: 2, [UnitType.Riders]: 2, [UnitType.RiverBoat]: 2 };
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
