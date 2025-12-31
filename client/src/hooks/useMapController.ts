import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type PointerSample = { x: number; y: number; time: number };

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
    const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    // Keep panning flag in sync for inertia checks
    useEffect(() => {
        isPanningRef.current = isPanning;
    }, [isPanning]);

    // --- Helpers ---
    // Use REFS for coordinate math to ensure freshness during animation without re-renders
    const screenToWorld = useCallback((screenX: number, screenY: number) => {
        return {
            x: (screenX - panRef.current.x) / zoomRef.current,
            y: (screenY - panRef.current.y) / zoomRef.current,
        };
    }, [panRef, zoomRef]); // Refs are stable, but listing them as deps is fine/safe

    const findHexAtScreen = useCallback((screenX: number, screenY: number): HexCoord | null => {
        const world = screenToWorld(screenX, screenY);
        let closestHex: HexCoord | null = null;
        let minDist = Infinity;

        tiles.forEach(tile => {
            const { x, y } = hexToPixel(tile.coord);
            const dist = Math.sqrt((world.x - x) ** 2 + (world.y - y) ** 2);
            if (dist < minDist && dist < HEX_SIZE) {
                minDist = dist;
                closestHex = tile.coord;
            }
        });

        return closestHex;
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
            const { x, y } = hexToPixel(initialCenter);
            const initialZoom = 1.0; // Default gameplay zoom

            const centerX = containerWidth / 2 - x * initialZoom;
            const centerY = containerHeight / 2 - y * initialZoom;

            const initialPan = { x: centerX, y: centerY };
            setPan(initialPan);
            panRef.current = initialPan;
            setPanStart(initialPan);

            setZoom(initialZoom);
            zoomRef.current = initialZoom;
            targetZoomRef.current = initialZoom;
        } else {
            // Fallback: Fit all tiles
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;

            tiles.forEach(tile => {
                const { x, y } = hexToPixel(tile.coord);
                const hexRadius = HEX_SIZE;
                minX = Math.min(minX, x - hexRadius);
                minY = Math.min(minY, y - hexRadius);
                maxX = Math.max(maxX, x + hexRadius);
                maxY = Math.max(maxY, y + hexRadius);
            });

            const mapWidth = maxX - minX;
            const mapHeight = maxY - minY;
            const mapCenterX = (minX + maxX) / 2;
            const mapCenterY = (minY + maxY) / 2;

            const padding = 50;
            const scaleX = (containerWidth - padding * 2) / mapWidth;
            const scaleY = (containerHeight - padding * 2) / mapHeight;
            const initialZoom = Math.min(scaleX, scaleY, 1.0);

            const centerX = containerWidth / 2 - mapCenterX * initialZoom;
            const centerY = containerHeight / 2 - mapCenterY * initialZoom;

            const initialPan = { x: centerX, y: centerY };
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
            const zoomFactor = Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY);
            const desiredZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentTarget * zoomFactor));

            if (Math.abs(desiredZoom - currentTarget) < 0.0005) {
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
        lastPointerRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
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
            const isNearEdge =
                screenX < EDGE_PAN_THRESHOLD ||
                screenX > clientWidth - EDGE_PAN_THRESHOLD ||
                screenY < EDGE_PAN_THRESHOLD ||
                screenY > clientHeight - EDGE_PAN_THRESHOLD;

            if (isNearEdge) {
                scheduleAnimation();
            }
        }

        if (!mouseDownPos) return;

        const deltaX = e.clientX - mouseDownPos.x;
        const deltaY = e.clientY - mouseDownPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance <= DRAG_THRESHOLD) {
            return;
        }

        const now = performance.now();
        if (!isPanning) {
            setIsPanning(true);
            setClickTarget(null);
            lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };
        } else if (lastPointerRef.current) {
            const last = lastPointerRef.current;
            const dt = now - last.time;
            if (dt > 0) {
                inertiaVelocityRef.current = {
                    vx: (e.clientX - last.x) / dt,
                    vy: (e.clientY - last.y) / dt,
                };
            }
            lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };
        }

        const nextPan = {
            x: panStart.x + deltaX,
            y: panStart.y + deltaY,
        };
        // DIRECT DOM UPDATE: Bypass React State!
        panRef.current = nextPan;
        if (layerGroupRef.current) {
            layerGroupRef.current.setAttribute("transform", `translate(${nextPan.x},${nextPan.y}) scale(${zoomRef.current})`);
        }
    }, [findHexAtScreen, inertiaVelocityRef, isPanning, mouseDownPos, mousePositionRef, onHoverTile, panRef, panStart, scheduleAnimation]);

    const handleMouseUp = useCallback(() => {
        if (isPanning) {
            const velocity = inertiaVelocityRef.current;
            const speed = Math.hypot(velocity.vx, velocity.vy);
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
    }, [clickTarget, inertiaVelocityRef, isInertiaActiveRef, isPanning, onTileClick, scheduleAnimation]);

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
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;

        const currentZoom = zoomRef.current;
        const newPan = {
            x: centerX - point.x * currentZoom,
            y: centerY - point.y * currentZoom,
        };

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

    // --- Resize Logic (from GameMap) ---
    useLayoutEffect(() => {
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
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        setViewportSize(prev => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (prev.width === width && prev.height === height) return prev;
            return { width, height };
        });
    }, []);

    // --- Viewport Calculation ---
    // NOTE: Viewport will still re-calculate when React state updates (which we throttled)
    // This is fine as it's used for culling logic, which doesn't need to be 60fps accurate during rapid motion
    const viewport = useMemo<MapViewport | null>(() => {
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

    // --- Notify View Change ---
    const lastViewportRef = useRef<MapViewport | null>(null);
    useEffect(() => {
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
