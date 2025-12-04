import React, { useCallback, useMemo } from "react";
import { GameState, HexCoord } from "@simple-civ/engine";
import { getHexPoints, hexToPixel as projectHexToPixel } from "./GameMap/geometry";
import { useMapController, MapViewport } from "../hooks/useMapController";
import { useMapVisibility } from "../hooks/useMapVisibility";
import { useRenderData } from "../hooks/useRenderData";
import { HEX_SIZE } from "./GameMap/constants";
import { GameMapLayers } from "./GameMap/GameMapLayers";

const HEX_POINTS = getHexPoints(HEX_SIZE);

export type { MapViewport };

export type GameMapHandle = {
    centerOnCoord: (coord: HexCoord) => void;
    centerOnPoint: (point: { x: number; y: number }) => void;
};

interface GameMapProps {
    gameState: GameState;
    onTileClick: (coord: HexCoord) => void;
    selectedCoord: HexCoord | null;
    playerId: string;
    showShroud: boolean;
    selectedUnitId: string | null;
    reachableCoords: Set<string>;
    showTileYields: boolean;
    hoveredCoord: HexCoord | null;
    onHoverTile: (coord: HexCoord | null) => void;
    cityToCenter?: HexCoord | null;
    onViewChange?: (view: MapViewport) => void;
}

const GameMapComponent = React.forwardRef<GameMapHandle, GameMapProps>(({ gameState, onTileClick, selectedCoord, playerId, showShroud, selectedUnitId, reachableCoords, showTileYields, hoveredCoord, onHoverTile, cityToCenter, onViewChange }, ref) => {
    const { map, units, cities } = gameState;

    const {
        tileVisibility,
        renderableKeys,
        FALLBACK_VISIBILITY,
    } = useMapVisibility({ gameState, playerId, map });

    const hexToPixel = useCallback((hex: HexCoord) => projectHexToPixel(hex, HEX_SIZE), []);

    const {
        tileRenderData,
        cityOverlayData,
        cityBounds,
        unitRenderData,
        unitRenderDataOnCity,
        unitRenderDataOffCity,
        riverLineSegments,
        pathData,
        selectedUnit,
    } = useRenderData({
        gameState,
        playerId,
        map,
        units,
        cities,
        tileVisibility,
        renderableKeys,
        selectedCoord,
        selectedUnitId,
        hoveredCoord,
        reachableCoords,
        hexToPixel,
        FALLBACK_VISIBILITY,
    });

    const {
        pan,
        zoom,
        isPanning,
        containerRef,
        svgRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        centerOnCoord,
        centerOnPoint,
    } = useMapController({
        tiles: map.tiles,
        hexToPixel,
        onTileClick,
        onHoverTile,
        initialCenter: useMemo(() => {
            if (selectedUnit) return selectedUnit.coord;
            const unit = units.find(u => u.ownerId === playerId);
            if (unit) return unit.coord;
            const city = cities.find(c => c.ownerId === playerId);
            if (city) return city.coord;
            return null;
        }, [units, cities, playerId, selectedUnit]),
        onViewChange,
    });

    // Center camera on city when cityToCenter changes
    React.useEffect(() => {
        if (cityToCenter) {
            centerOnCoord(cityToCenter);
        }
    }, [cityToCenter, centerOnCoord]);

    React.useImperativeHandle(ref, () => ({
        centerOnCoord,
        centerOnPoint,
    }), [centerOnCoord, centerOnPoint]);

    const [viewportSize, setViewportSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });

    React.useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setViewportSize(prev => {
                if (prev.width === width && prev.height === height) return prev;
                return { width, height };
            });
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [containerRef]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        setViewportSize(prev => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (prev.width === width && prev.height === height) return prev;
            return { width, height };
        });
    }, [containerRef]);

    const viewport = React.useMemo<MapViewport | null>(() => {
        if (viewportSize.width === 0 || viewportSize.height === 0) return null;
        const minX = (-pan.x) / zoom;
        const minY = (-pan.y) / zoom;
        const maxX = (viewportSize.width - pan.x) / zoom;
        const maxY = (viewportSize.height - pan.y) / zoom;

        return {
            pan,
            zoom,
            size: viewportSize,
            worldBounds: { minX, maxX, minY, maxY },
            center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        };
    }, [pan, zoom, viewportSize]);

    const lastViewportRef = React.useRef<MapViewport | null>(null);
    React.useEffect(() => {
        if (!viewport || !onViewChange) return;
        const last = lastViewportRef.current;
        const unchanged =
            last &&
            last.zoom === viewport.zoom &&
            last.pan.x === viewport.pan.x &&
            last.pan.y === viewport.pan.y &&
            last.size.width === viewport.size.width &&
            last.size.height === viewport.size.height;

        if (unchanged) return;
        lastViewportRef.current = viewport;
        onViewChange(viewport);
    }, [viewport, onViewChange]);

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <GameMapLayers
                pan={pan}
                zoom={zoom}
                isPanning={isPanning}
                svgRef={svgRef}
                onMouseDown={handleMouseDown}
                hexPoints={HEX_POINTS}
                hexToPixel={hexToPixel}
                tileRenderData={tileRenderData}
                cityOverlayData={cityOverlayData}
                cityBounds={cityBounds}
                unitRenderData={unitRenderData}
                unitRenderDataOnCity={unitRenderDataOnCity}
                unitRenderDataOffCity={unitRenderDataOffCity}
                riverLineSegments={riverLineSegments}
                pathData={pathData}
                selectedUnit={selectedUnit}
                hoveredCoord={hoveredCoord}
                showTileYields={showTileYields}
                showShroud={showShroud}
            />
        </div>
    );
});

GameMapComponent.displayName = "GameMap";

export const GameMap = React.memo(GameMapComponent);
