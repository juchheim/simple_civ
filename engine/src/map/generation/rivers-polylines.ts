import { HexCoord, RiverPoint, RiverSegmentDescriptor, Tile, OverlayType } from "../../core/types.js";
import { EDGE_TO_CORNER_INDICES, directionBetween } from "../rivers.js";
import { hexToString } from "../../core/hex.js";

const HEX_SIZE = 75;
const HEX_CORNER_OFFSETS = Array.from({ length: 6 }, (_v, i) => {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    return {
        x: HEX_SIZE * Math.cos(angleRad),
        y: HEX_SIZE * Math.sin(angleRad),
    };
});

const RIVER_POINT_EPSILON = 1e-6;

export function buildRiverPolylines(
    path: HexCoord[],
    waterDistance: Map<string, number>,
    addRiverEdge: (a: HexCoord, b: HexCoord) => void,
): RiverSegmentDescriptor[][] {
    const riverPolylines: RiverSegmentDescriptor[][] = [];
    const polylineDescriptor: RiverSegmentDescriptor[] = [];
    let lastPoint: RiverPoint | null = null;

    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const dir = directionBetween(from, to);
        if (dir === null) continue;
        const toKey = hexToString(to);
        const toDist = waterDistance.get(toKey) ?? Number.MAX_SAFE_INTEGER;
        const isMouth = toDist === 0;

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
                    pushCornerSegment(polylineDescriptor, from, cornerPoints, currentIdx, nextIdx, false);
                    currentIdx = nextIdx;
                }
            }
        }

        pushCornerSegment(polylineDescriptor, from, cornerPoints, startIdx, endIdx, isMouth);
        lastPoint = cornerPoints[endIdx];
        addRiverEdge(from, to);
    }
    if (polylineDescriptor.length) {
        riverPolylines.push(polylineDescriptor);
    }
    return riverPolylines;
}

export function markRiverOverlays(path: HexCoord[], tiles: Tile[], isLand: (tile: Tile | undefined) => boolean, getTile: (coord: HexCoord) => Tile | undefined) {
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

function hexToPixel(hex: HexCoord) {
    const x = HEX_SIZE * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
    const y = HEX_SIZE * ((3 / 2) * hex.r);
    return { x, y };
}

function getCornerPoints(tile: HexCoord) {
    return HEX_CORNER_OFFSETS.map(offset => {
        const center = hexToPixel(tile);
        return { x: center.x + offset.x, y: center.y + offset.y };
    });
}

function squaredDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function findCornerIndex(tile: HexCoord, point: RiverPoint): number | null {
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
    cornerPoints: RiverPoint[],
    startIdx: number,
    endIdx: number,
    isMouth = false,
) {
    segments.push({
        tile,
        cornerA: startIdx,
        cornerB: endIdx,
        start: cornerPoints[startIdx],
        end: cornerPoints[endIdx],
        isMouth,
    });
}
