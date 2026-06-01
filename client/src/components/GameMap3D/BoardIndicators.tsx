import { HexCoord } from "@simple-civ/engine";
import type { TileRenderEntry } from "../../hooks/useRenderData";
import { HexRing, SurfaceLine } from "./primitives";
import type { Projector } from "./projection";

export function BoardIndicators({
    tiles,
    path,
    projector,
}: {
    tiles: TileRenderEntry[];
    path: HexCoord[];
    projector: Projector;
}) {
    return (
        <>
            {tiles.filter(tile => tile.isSelected || tile.isReachable).map(tile => (
                <HexRing
                    key={`indicator-${tile.key}`}
                    coord={tile.tile.coord}
                    projector={projector}
                    elevation={0.82}
                    color={tile.isSelected ? "#ffffff" : "#4ade80"}
                    opacity={tile.isSelected ? 1 : 0.78}
                />
            ))}
            {path.slice(1).map((coord, index) => (
                <SurfaceLine
                    key={`path-${index}`}
                    start={projector.positionOf(path[index], 0.86)}
                    end={projector.positionOf(coord, 0.86)}
                    color="#facc15"
                    opacity={0.92}
                />
            ))}
        </>
    );
}
