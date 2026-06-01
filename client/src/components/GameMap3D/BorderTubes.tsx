import type { CityBoundsDescriptor } from "../GameMap/CityBoundsLayer";
import { SurfaceLines } from "./primitives";
import type { Projector } from "./projection";

export function BorderTubes({ borders, projector }: { borders: CityBoundsDescriptor[]; projector: Projector }) {
    return (
        <SurfaceLines segments={borders.map(border => ({
            start: projector.pointToWorld(border.start, 0.34),
            end: projector.pointToWorld(border.end, 0.34),
            color: border.strokeColor,
            opacity: border.isVisible ? 1 : 0.6,
        }))} />
    );
}
