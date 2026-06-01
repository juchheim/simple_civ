import type { RiverSegment } from "../GameMap/OverlayLayer";
import { SurfaceLines } from "./primitives";
import type { Projector } from "./projection";

export function RiverRibbons({ segments, projector }: { segments: RiverSegment[]; projector: Projector }) {
    return (
        <SurfaceLines segments={segments.map(segment => ({
            start: projector.pointToWorld(segment.start, 0.31),
            end: projector.pointToWorld(segment.end, 0.31),
            color: segment.isMouth ? "#93c5fd" : "#38bdf8",
            opacity: 0.9,
        }))} />
    );
}
