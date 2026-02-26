import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { HexCoord, Tile } from "@simple-civ/engine";
import {
    DRAG_THRESHOLD,
    HEX_SIZE,
    MAX_ZOOM,
    MIN_ZOOM,
    ZOOM_WHEEL_SENSITIVITY,
} from "../components/GameMap/constants";
import { EDGE_PAN_THRESHOLD, PanState, usePanZoomInertia } from "./usePanZoomInertia";
import { useTouchController } from "./useTouchController";
import { PAN_INERTIA_MIN_VELOCITY } from "../components/GameMap/constants";
import {
    createViewport,
    computeFitToTilesView,
    findClosestHexAtWorldPoint,
    panToCenterPoint,
    screenToWorldPoint
} from "./map-controller-math";
import { getVelocitySpeed, isInEdgeZone } from "./pan-zoom-inertia-helpers";
import {
    computeDragMetrics,
    computePanFromDrag,
    computePointerVelocity,
    computeWheelDesiredZoom,
    createPointerSample,
    hasMeaningfulZoomDelta,
    type PointerSample
} from "./map-pointer-helpers";
import {
    useMapViewportSize,
    useViewportChangeNotifier
} from "./useMapViewportTracking";

export type MapViewport = {
    pan: { x: number; y: number };
    zoom: number;
    size: { width: number; height: number };
    worldBounds: { minX: number; maxX: number; minY: number; maxY: number };
    center: { x: number; y: number };
};

type MapControllerParams = {
    tiles: Tile[];
    hexToPixel: (hex: HexCoord) => { x: number; y: number };
    onTileClick: (coord: HexCoord) => void;
    onHoverTile: (coord: HexCoord | null) => void;
    initialCenter?: HexCoord | null;
    onViewChange?: (view: MapViewport) => void;
};

/**
 * Hook to manage map interaction (pan, zoom, click, hover).
 * Handles mouse events, inertia animation, and coordinate conversion.
 * @param params - Configuration parameters.
 * @param params.tiles - The map tiles.
 * @param params.hexToPixel - Function to convert hex coordinates to pixel positions.
 * @param params.onTileClick - Callback for tile clicks.
 * @param params.onHoverTile - Callback for tile hover.
 * @param params.initialCenter - Optional initial center coordinate.
 * @param params.onViewChange - Optional callback for viewport changes.
 * @returns Map controller state and handlers.
 */
export const useMapController = ({
    tiles,
    hexToPixel,
    onTileClick,
    onHoverTile,
    initialCenter,
    onViewChange,
}: MapControllerParams) => {
    // --- Interaction State (from useMapInteraction) ---
    const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1.0);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<PanState>({ x: 0, y: 0 });
    const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
    const [clickTarget, setClickTarget] = useState<HexCoord | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasInitializedRef = useRef(false);
    const isPanningRef = useRef(false);
    const lastPointerRef = useRef<PointerSample | null>(null);
    const layerGroupRef = useRef<SVGGElement>(null);
    const {
        panRef,
        zoomRef,
        targetZoomRef,
        zoomAnchorRef,
        inertiaVelocityRef,
        isInertiaActiveRef,
        mousePositionRef,
        scheduleAnimation,
    } = usePanZoomInertia({ pan, zoom, setPan, setZoom, containerRef, isPanningRef, layerGroupRef });

    // --- Viewport State (from GameMap) ---
    const viewportSize = useMapViewportSize(containerRef);

    // Keep panning flag in sync for inertia checks
    useEffect(() => {
        isPanningRef.current = isPanning;
    }, [isPanning]);

    // --- Helpers ---
    // Use REFS for coordinate math to ensure freshness during animation without re-renders
    const screenToWorld = useCallback((screenX: number, screenY: number) => {
        return screenToWorldPoint(
            { x: screenX, y: screenY },
            panRef.current,
            zoomRef.current,
        );
    }, [panRef, zoomRef]); // Refs are stable, but listing them as deps is fine/safe

    const findHexAtScreen = useCallback((screenX: number, screenY: number): HexCoord | null => {
        const world = screenToWorld(screenX, screenY);
        return findClosestHexAtWorldPoint(world, tiles, hexToPixel, HEX_SIZE);
    }, [tiles, hexToPixel, screenToWorld]);

    // --- Touch Controller ---
    const {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    } = useTouchController({
        svgRef,
        findHexAtScreen,
        onTileClick,
        panRef,
        zoomRef,
        targetZoomRef,
        inertiaVelocityRef,
        isInertiaActiveRef,
        scheduleAnimation,
        setPan,
        setZoom,
        setIsPanning,
    });

    // --- Initialization ---
    useEffect(() => {
        if (hasInitializedRef.current || tiles.length === 0 || !containerRef.current) return;

        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        if (initialCenter) {
            // Center on specific coordinate
            const centerPoint = hexToPixel(initialCenter);
            const initialZoom = 1.0; // Default gameplay zoom

            const initialPan = panToCenterPoint(
                centerPoint,
                { width: containerWidth, height: containerHeight },
                initialZoom,
            );
            setPan(initialPan);
            panRef.current = initialPan;
            setPanStart(initialPan);

            setZoom(initialZoom);
            zoomRef.current = initialZoom;
            targetZoomRef.current = initialZoom;
        } else {
            // Fallback: Fit all tiles
            const { pan: initialPan, zoom: initialZoom } = computeFitToTilesView({
                tiles,
                hexToPixel,
                containerSize: { width: containerWidth, height: containerHeight },
                hexRadius: HEX_SIZE,
                padding: 50,
                maxZoom: 1.0,
            });
            setPan(initialPan);
            panRef.current = initialPan;
            setPanStart(initialPan);

            setZoom(initialZoom);
            zoomRef.current = initialZoom;
            targetZoomRef.current = initialZoom;
        }

        hasInitializedRef.current = true;
    }, [hexToPixel, initialCenter, panRef, targetZoomRef, tiles, zoomRef]);

    // --- Wheel Handler ---
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            zoomAnchorRef.current = { x: mouseX, y: mouseY };

            const currentTarget = targetZoomRef.current ?? zoomRef.current;
            const desiredZoom = computeWheelDesiredZoom(
                currentTarget,
                e.deltaY,
                ZOOM_WHEEL_SENSITIVITY,
                MIN_ZOOM,
                MAX_ZOOM,
            );

            if (!hasMeaningfulZoomDelta(currentTarget, desiredZoom)) {
                return;
            }

            targetZoomRef.current = desiredZoom;
            scheduleAnimation();
        };

        svg.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            svg.removeEventListener("wheel", handleWheel);
        };
    }, [scheduleAnimation, targetZoomRef, zoomAnchorRef, zoomRef]);

    // --- Mouse Handlers ---
    const handleMouseDown = useCallback((e: ReactMouseEvent<SVGSVGElement>) => {
        if (e.button !== 0) return;
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const hex = findHexAtScreen(screenX, screenY);

        setMouseDownPos({ x: e.clientX, y: e.clientY });
        setClickTarget(hex);
        setPanStart(panRef.current);
        isInertiaActiveRef.current = false;
        inertiaVelocityRef.current = { vx: 0, vy: 0 };
        lastPointerRef.current = createPointerSample(e.clientX, e.clientY, performance.now());
    }, [findHexAtScreen, inertiaVelocityRef, isInertiaActiveRef, panRef]);

    const handleMouseMove = useCallback((e: ReactMouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const hex = findHexAtScreen(screenX, screenY);
        onHoverTile(hex);

        // Update mouse position for edge panning
        mousePositionRef.current = { x: screenX, y: screenY };

        // Check if we need to start edge panning
        if (!isPanning && !mouseDownPos) {
            const { clientWidth, clientHeight } = svgRef.current;
            const isNearEdge = isInEdgeZone(
                { x: screenX, y: screenY },
                { width: clientWidth, height: clientHeight },
                EDGE_PAN_THRESHOLD,
            );

            if (isNearEdge) {
                scheduleAnimation();
            }
        }

        if (!mouseDownPos) return;

        const drag = computeDragMetrics(mouseDownPos, { x: e.clientX, y: e.clientY });

        if (drag.distance <= DRAG_THRESHOLD) {
            return;
        }

        const now = performance.now();
        if (!isPanning) {
            setIsPanning(true);
            setClickTarget(null);
            lastPointerRef.current = createPointerSample(e.clientX, e.clientY, now);
        } else if (lastPointerRef.current) {
            const velocity = computePointerVelocity(
                lastPointerRef.current,
                createPointerSample(e.clientX, e.clientY, now),
            );
            if (velocity) {
                inertiaVelocityRef.current = velocity;
            }
            lastPointerRef.current = createPointerSample(e.clientX, e.clientY, now);
        }

        const nextPan = computePanFromDrag(panStart, drag);
        // DIRECT DOM UPDATE: Bypass React State!
        panRef.current = nextPan;
        if (layerGroupRef.current) {
            layerGroupRef.current.setAttribute("transform", `translate(${nextPan.x},${nextPan.y}) scale(${zoomRef.current})`);
        }
    }, [findHexAtScreen, inertiaVelocityRef, isPanning, mouseDownPos, mousePositionRef, onHoverTile, panRef, panStart, scheduleAnimation, zoomRef]);

    const handleMouseUp = useCallback(() => {
        if (isPanning) {
            const velocity = inertiaVelocityRef.current;
            const speed = getVelocitySpeed(velocity);
            if (speed > PAN_INERTIA_MIN_VELOCITY) {
                isInertiaActiveRef.current = true;
                scheduleAnimation();
            } else {
                isInertiaActiveRef.current = false;
                // Sync state at end of dragging
                setPan(panRef.current);
            }
        } else if (clickTarget) {
            onTileClick(clickTarget);
        }

        setIsPanning(false);
        setMouseDownPos(null);
        setClickTarget(null);
        lastPointerRef.current = null;
        inertiaVelocityRef.current = { vx: 0, vy: 0 };
    }, [clickTarget, inertiaVelocityRef, isInertiaActiveRef, isPanning, onTileClick, panRef, scheduleAnimation]);

    const handleMouseLeave = useCallback(() => {
        mousePositionRef.current = null;
        handleMouseUp();
    }, [handleMouseUp, mousePositionRef]);

    // --- API ---
    const centerOnPoint = useCallback((point: { x: number; y: number }) => {
        const container = containerRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const currentZoom = zoomRef.current;
        const newPan = panToCenterPoint(
            point,
            { width: containerWidth, height: containerHeight },
            currentZoom,
        );

        setPan(newPan);
        panRef.current = newPan;
        // Direct update for programmatic centering
        if (layerGroupRef.current) {
            layerGroupRef.current.setAttribute("transform", `translate(${newPan.x},${newPan.y}) scale(${currentZoom})`);
        }
    }, [panRef, zoomRef]);

    const centerOnCoord = useCallback((coord: HexCoord) => {
        const hexPos = hexToPixel(coord);
        centerOnPoint(hexPos);
    }, [centerOnPoint, hexToPixel]);

    // --- Viewport Calculation ---
    // NOTE: Viewport will still re-calculate when React state updates (which we throttled)
    // This is fine as it's used for culling logic, which doesn't need to be 60fps accurate during rapid motion
    const viewport = useMemo<MapViewport | null>(() => {
        if (viewportSize.width === 0 || viewportSize.height === 0) return null;
        return createViewport(pan, zoom, viewportSize);
    }, [pan, zoom, viewportSize]);

    // --- Notify View Change ---
    useViewportChangeNotifier(viewport, onViewChange);

    return {
        pan,
        zoom,
        isPanning,
        containerRef,
        svgRef,
        layerGroupRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleMouseLeave,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        centerOnCoord,
        centerOnPoint,
        viewport,
    };
};
