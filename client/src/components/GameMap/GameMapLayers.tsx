import React from "react";
import { HexCoord, GameState } from "@simple-civ/engine";
import { terrainImages } from "../../assets";
import { HexTile } from "./HexTile";
import { CityImageLayer, CityLabelLayer, CityOverlayDescriptor } from "./CityLayer";
import { OverlayLayer, RiverSegment } from "./OverlayLayer";
import { UnitLayer, UnitDescriptor } from "./UnitLayer";
import { CityBoundsLayer, CityBoundsDescriptor } from "./CityBoundsLayer";
import { PathLayer } from "./PathLayer";
import { HEX_SIZE, RIVER_OPACITY } from "./constants";
import { TileRenderEntry } from "../../hooks/useRenderData";

type GameMapLayersProps = {
    pan: { x: number; y: number };
    zoom: number;
    isPanning: boolean;
    svgRef: React.RefObject<SVGSVGElement>;
    onMouseDown: React.MouseEventHandler<SVGSVGElement>;
    hexPoints: string;
    hexToPixel: (hex: HexCoord) => { x: number; y: number };
    tileRenderData: TileRenderEntry[];
    cityOverlayData: CityOverlayDescriptor[];
    cityBounds: CityBoundsDescriptor[];
    unitRenderDataOnCity: UnitDescriptor[];
    unitRenderDataOffCity: UnitDescriptor[];
    riverLineSegments: RiverSegment[];
    pathData: HexCoord[];
    selectedUnit: GameState["units"][number] | null;
    hoveredCoord: HexCoord | null;
    showTileYields: boolean;
    showShroud: boolean;
    layerGroupRef: React.RefObject<SVGGElement>;
};

function GameMapLayersBase({
    pan,
    zoom,
    isPanning,
    svgRef,
    onMouseDown,
    hexPoints,
    hexToPixel,
    tileRenderData,
    cityOverlayData,
    cityBounds,
    unitRenderDataOnCity,
    unitRenderDataOffCity,
    riverLineSegments,
    pathData,
    selectedUnit,
    hoveredCoord,
    showTileYields,
    showShroud,
    layerGroupRef,
}: GameMapLayersProps) {
    return (
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ background: "#111", cursor: isPanning ? "grabbing" : "default" }}
            onMouseDown={onMouseDown}
        >
            <defs>
                {Object.entries(terrainImages).map(([terrainType, imageUrl]) => (
                    <pattern
                        key={terrainType}
                        id={`terrain-pattern-${terrainType}`}
                        x="0"
                        y="0"
                        width="1"
                        height="1"
                        patternContentUnits="objectBoundingBox"
                    >
                        <image
                            href={imageUrl}
                            x="0"
                            y="0"
                            width="1"
                            height="1"
                            preserveAspectRatio="xMidYMid slice"
                        />
                    </pattern>
                ))}
            </defs>
            <g
                ref={layerGroupRef}
                transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}
            >
                {tileRenderData.map(entry => (
                    <HexTile
                        key={`base-${entry.key}`}
                        tile={entry.tile}
                        hexPoints={hexPoints}
                        hexSize={HEX_SIZE}
                        position={entry.position}
                        visibility={entry.visibility}
                        isSelected={entry.isSelected}
                        isReachable={entry.isReachable}
                        showShroud={showShroud}
                        yields={entry.yields}
                        showTileYields={showTileYields}
                    />
                ))}
                <OverlayLayer
                    riverSegments={riverLineSegments}
                    riverOpacity={RIVER_OPACITY}
                />
                <CityBoundsLayer tiles={cityBounds} />
                <CityImageLayer
                    overlays={cityOverlayData}
                    hexPoints={hexPoints}
                />
                <UnitLayer units={unitRenderDataOnCity} />
                <CityLabelLayer
                    overlays={cityOverlayData}
                    hexPoints={hexPoints}
                />
                <UnitLayer units={unitRenderDataOffCity} />
                {selectedUnit && hoveredCoord && (
                    <PathLayer
                        path={pathData}
                        hexToPixel={hexToPixel}
                        movesLeft={selectedUnit.movesLeft}
                    />
                )}
            </g>
        </svg>
    );
}

export const GameMapLayers = React.memo(GameMapLayersBase);
