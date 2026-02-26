import { HexCoord } from "@simple-civ/engine";
import { CityBoundsDescriptor } from "../components/GameMap/CityBoundsLayer";
import { getNeighbors } from "../utils/hex";
import { toCoordKey } from "./render-data-helpers";

type TileVisibilityFlags = {
    isVisible: boolean;
    isFogged: boolean;
};

type TileBoundsEntry = {
    key: string;
    tile: {
        coord: HexCoord;
        ownerId?: string;
        ownerCityId?: string | null;
    };
    position: { x: number; y: number };
    visibility: TileVisibilityFlags;
};

type BuildCityBoundsParams = {
    tileRenderData: TileBoundsEntry[];
    tileByKey: Map<string, TileBoundsEntry>;
    playerColorMap: Map<string, string>;
    hexCornerOffsets: Array<{ x: number; y: number }>;
    insetFactor?: number;
};

const EDGE_TO_CORNER_INDICES: [number, number][] = [
    [0, 1], // E
    [5, 0], // NE
    [4, 5], // NW
    [3, 4], // W
    [2, 3], // SW
    [1, 2], // SE
];

export function buildCityBoundsSegments({
    tileRenderData,
    tileByKey,
    playerColorMap,
    hexCornerOffsets,
    insetFactor = 0.1,
}: BuildCityBoundsParams): CityBoundsDescriptor[] {
    const segments: CityBoundsDescriptor[] = [];
    const dedup = new Set<string>();

    tileRenderData
        // Show city bounds in both visible AND fogged tiles
        .filter(entry => entry.tile.ownerCityId && (entry.visibility.isVisible || entry.visibility.isFogged))
        .forEach(entry => {
            const ownerCityId = entry.tile.ownerCityId!;
            const corners = hexCornerOffsets.map(offset => ({
                x: entry.position.x + offset.x,
                y: entry.position.y + offset.y,
            }));
            const neighbors = getNeighbors(entry.tile.coord);

            neighbors.forEach((neighborCoord, direction) => {
                const neighborKey = toCoordKey(neighborCoord);
                const neighborEntry = tileByKey.get(neighborKey);
                if (neighborEntry?.tile.ownerCityId === ownerCityId) return; // interior edge

                const [cornerA, cornerB] = EDGE_TO_CORNER_INDICES[direction];
                const center = entry.position;
                const startOriginal = corners[cornerA];
                const endOriginal = corners[cornerB];

                const start = {
                    x: startOriginal.x + (center.x - startOriginal.x) * insetFactor,
                    y: startOriginal.y + (center.y - startOriginal.y) * insetFactor
                };
                const end = {
                    x: endOriginal.x + (center.x - endOriginal.x) * insetFactor,
                    y: endOriginal.y + (center.y - endOriginal.y) * insetFactor
                };

                const edgeKey = `${entry.key}|${neighborKey}|${ownerCityId}`;
                if (dedup.has(edgeKey)) return;
                dedup.add(edgeKey);

                segments.push({
                    key: `${entry.key}-${direction}`,
                    start,
                    end,
                    strokeColor: playerColorMap.get(entry.tile.ownerId ?? "") ?? "#22d3ee",
                    isVisible: entry.visibility.isVisible,
                    isFogged: entry.visibility.isFogged,
                });
            });
        });

    return segments;
}
