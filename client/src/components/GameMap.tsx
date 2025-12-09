import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { GameState, HexCoord, EraId } from "@simple-civ/engine";
import { EraModal } from "./EraModal";
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

/**
 * Props for the GameMap component.
 */
interface GameMapProps {
    /** The current game state. */
    gameState: GameState;
    /** Callback when a tile is clicked. */
    onTileClick: (coord: HexCoord) => void;
    /** The currently selected coordinate. */
    selectedCoord: HexCoord | null;
    /** The ID of the local player. */
    playerId: string;
    /** Whether to show the fog of war shroud. */
    showShroud: boolean;
    /** The ID of the currently selected unit. */
    selectedUnitId: string | null;
    /** Set of coordinates reachable by the selected unit. */
    reachableCoords: Set<string>;
    /** Whether to show tile yield overlays. */
    showTileYields: boolean;
    /** Coordinate to center the camera on. */
    cityToCenter?: HexCoord | null;
    /** Callback when the viewport changes (pan/zoom). */
    onViewChange?: (view: MapViewport) => void;
}

/**
 * The main game map component.
 * Renders tiles, units, cities, and handles map interaction (pan/zoom).
 */
const GameMapComponent = React.forwardRef<GameMapHandle, GameMapProps>(({ gameState, onTileClick, selectedCoord, playerId, showShroud, selectedUnitId, reachableCoords, showTileYields, cityToCenter, onViewChange }, ref) => {
    const { map, units, cities } = gameState;
    const [hoveredCoord, setHoveredCoord] = useState<HexCoord | null>(null);

    // Era Modal Logic
    const [showEraModal, setShowEraModal] = useState(false);
    const [modalEra, setModalEra] = useState<EraId>(EraId.Primitive);
    // Start as null so we can detect first render and initialize without showing modal
    const lastSeenEra = useRef<EraId | null>(null);

    useEffect(() => {
        const player = gameState.players.find(p => p.id === playerId);
        if (player) {
            // On first render (or page refresh), initialize to current era without showing modal
            if (lastSeenEra.current === null) {
                lastSeenEra.current = player.currentEra;
            } else if (player.currentEra !== lastSeenEra.current) {
                // Era changed during gameplay - show the modal
                setModalEra(player.currentEra);
                setShowEraModal(true);
                lastSeenEra.current = player.currentEra;
            }
        }
    }, [gameState.players, playerId]);


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

    const handleTileClickWrapper = useCallback((coord: HexCoord) => {
        const key = `${coord.q},${coord.r}`;
        const visibility = tileVisibility.get(key) ?? FALLBACK_VISIBILITY;

        console.log('[DEBUG WRAPPER] Tile clicked:', key, 'Visibility:', visibility, 'SelectedUnit:', selectedUnitId);

        // If it's shroud (unexplored) and no unit is selected, ignore click
        // But allow clicks when a unit is selected so they can explore
        if (visibility.isShroud && !selectedUnitId) {
            console.log('[DEBUG WRAPPER] Blocking click - tile is shroud and no unit selected');
            return;
        }

        console.log('[DEBUG WRAPPER] Passing click to onTileClick');
        onTileClick(coord);
    }, [onTileClick, tileVisibility, FALLBACK_VISIBILITY, selectedUnitId]);

    const {
        pan,
        zoom,
        isPanning,
        containerRef,
        svgRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleMouseLeave,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        centerOnCoord,
        centerOnPoint,
    } = useMapController({
        tiles: map.tiles,
        hexToPixel,
        onTileClick: handleTileClickWrapper,
        onHoverTile: setHoveredCoord,
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
            style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", touchAction: "none" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
                unitRenderDataOnCity={unitRenderDataOnCity}
                unitRenderDataOffCity={unitRenderDataOffCity}
                riverLineSegments={riverLineSegments}
                pathData={pathData}
                selectedUnit={selectedUnit}
                hoveredCoord={hoveredCoord}
                showTileYields={showTileYields}
                showShroud={showShroud}
            />
            <EraModal
                era={modalEra}
                isOpen={showEraModal}
                onClose={() => setShowEraModal(false)}
            />
        </div>
    );
});

GameMapComponent.displayName = "GameMap";

export const GameMap = React.memo(GameMapComponent);
