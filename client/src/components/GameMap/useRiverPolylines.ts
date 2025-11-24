import { useEffect, useMemo } from "react";
import { GameState, HexCoord } from "@simple-civ/engine";
import { buildRiverPolylines } from "../../utils/rivers";
import { RiverSegment } from "./OverlayLayer";
import { squaredDistance } from "./geometry";

type TileVisibilityState = { isVisible: boolean; isFogged: boolean; isShroud: boolean };

type RiverPolylineParams = {
    map: GameState["map"];
    tileVisibility: Map<string, TileVisibilityState>;
    hexToPixel: (hex: HexCoord) => { x: number; y: number };
    hexCornerOffsets: { x: number; y: number }[];
};

export const useRiverPolylines = ({ map, tileVisibility, hexToPixel, hexCornerOffsets }: RiverPolylineParams): RiverSegment[] => {
    useEffect(() => {
        if (map.riverPolylines && map.riverPolylines.length) {
            const sample = map.riverPolylines[0]?.slice(0, 3);
            console.log("[River Debug] using descriptor polylines", {
                count: map.riverPolylines.length,
                sample,
            });
        } else if (map.rivers && map.rivers.length) {
            console.log("[River Debug] falling back to legacy river edges", {
                count: map.rivers.length,
            });
        } else {
            console.log("[River Debug] no river data available");
        }
    }, [map.riverPolylines, map.rivers]);

    return useMemo(() => {
        const segments: RiverSegment[] = [];
        const descriptorPolylines = map.riverPolylines && map.riverPolylines.length ? map.riverPolylines : null;

        if (descriptorPolylines) {
            descriptorPolylines.forEach((polyline, polyIdx) => {
                polyline.forEach((segment, segIdx) => {
                    const tileKey = `${segment.tile.q},${segment.tile.r}`;
                    const isVisible = tileVisibility.get(tileKey)?.isVisible ?? false;
                    if (!isVisible) return;

                    if (polyIdx === 0 && segIdx < 3) {
                        console.log("[River Debug] render check", {
                            polyIdx,
                            segIdx,
                            tile: segment.tile,
                        });
                    }

                    segments.push({
                        id: `river-${polyIdx}-${segIdx}`,
                        start: segment.start,
                        end: segment.end,
                        isMouth: segment.isMouth,
                    });
                });

                if (polyIdx === 0 && polyline.length) {
                    console.log("[River Debug] descriptor polyline points", polyline.slice(0, 3).map(seg => ({ start: seg.start, end: seg.end })));
                }
            });
            return segments;
        }

        if (!map.rivers || map.rivers.length === 0) return segments;
        const polylines = buildRiverPolylines(map.rivers);
        const cornerCache = new Map<string, { coord: { x: number; y: number }; idx: number }[]>();

        const getCorners = (tile: HexCoord) => {
            const key = `${tile.q},${tile.r}`;
            if (!cornerCache.has(key)) {
                const center = hexToPixel(tile);
                cornerCache.set(
                    key,
                    hexCornerOffsets.map((offset, idx) => ({
                        coord: { x: center.x + offset.x, y: center.y + offset.y },
                        idx,
                    })),
                );
            }
            return cornerCache.get(key)!;
        };

        polylines.forEach((polyline, polyIdx) => {
            if (polyline.length < 2) return;
            const points: { x: number; y: number; cornerIdx?: number }[] = [];
            for (let i = 0; i < polyline.length - 1; i++) {
                const a = polyline[i];
                const b = polyline[i + 1];
                const aKey = `${a.q},${a.r}`;
                const bKey = `${b.q},${b.r}`;
                const aVisible = tileVisibility.get(aKey)?.isVisible ?? false;
                const bVisible = tileVisibility.get(bKey)?.isVisible ?? false;
                if (!aVisible && !bVisible) continue;

                const aCorners = getCorners(a);
                const bCorners = getCorners(b);
                const shared: { coord: { x: number; y: number }; idx: number }[] = [];

                for (const cornerA of aCorners) {
                    for (const cornerB of bCorners) {
                        if (squaredDistance(cornerA.coord, cornerB.coord) < 1e-6) {
                            shared.push({
                                coord: cornerA.coord,
                                idx: cornerA.idx,
                            });
                            break;
                        }
                    }
                    if (shared.length === 2) break;
                }

                if (shared.length !== 2) {
                    console.log("[River Debug] failed to find shared corners", { a, b, shared });
                    continue;
                }

                const lastPoint = points[points.length - 1];
                const lastIdx = lastPoint?.cornerIdx ?? null;
                const [sharedA, sharedB] = shared;

                const startShared =
                    lastIdx !== null && sharedA.idx === lastIdx
                        ? sharedA
                        : lastIdx !== null && sharedB.idx === lastIdx
                            ? sharedB
                            : lastPoint && squaredDistance(lastPoint, sharedA.coord) <= squaredDistance(lastPoint, sharedB.coord)
                                ? sharedA
                                : sharedB;
                const endShared = startShared === sharedA ? sharedB : sharedA;

                const start = { ...startShared.coord, cornerIdx: startShared.idx };
                const end = { ...endShared.coord, cornerIdx: endShared.idx };

                if (!lastPoint || squaredDistance(lastPoint, start) > 1e-4) {
                    points.push(start);
                }
                points.push(end);
            }

            if (polyIdx === 0) {
                console.log("[River Debug] fallback polyline points", points.slice(0, 6));
            }

            for (let i = 0; i < points.length - 1; i++) {
                segments.push({
                    id: `river-${polyIdx}-${i}`,
                    start: points[i],
                    end: points[i + 1],
                });
            }
        });

        return segments;
    }, [map.riverPolylines, map.rivers, tileVisibility, hexToPixel, hexCornerOffsets]);
};

