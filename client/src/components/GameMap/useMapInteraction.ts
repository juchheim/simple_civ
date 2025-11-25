import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { HexCoord, Tile } from "@simple-civ/engine";
import {
    DRAG_THRESHOLD,
    HEX_SIZE,
    MAX_ZOOM,
    MIN_ZOOM,
    PAN_INERTIA_DECAY,
    PAN_INERTIA_MIN_VELOCITY,
    ZOOM_SMOOTHING,
    ZOOM_WHEEL_SENSITIVITY,
} from "./constants";

type MapInteractionParams = {
    tiles: Tile[];
    hexToPixel: (hex: HexCoord) => { x: number; y: number };
    onTileClick: (coord: HexCoord) => void;
    onHoverTile: (coord: HexCoord | null) => void;
};

type PanState = { x: number; y: number };
type PointerSample = { x: number; y: number; time: number };
type Velocity = { vx: number; vy: number };

export const useMapInteraction = ({ tiles, hexToPixel, onTileClick, onHoverTile }: MapInteractionParams) => {
    const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1.0);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<PanState>({ x: 0, y: 0 });
    const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
    const [clickTarget, setClickTarget] = useState<HexCoord | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasInitializedRef = useRef(false);

    const panRef = useRef<PanState>(pan);
    const zoomRef = useRef(zoom);
    const targetZoomRef = useRef(zoom);
    const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
    const inertiaVelocityRef = useRef<Velocity>({ vx: 0, vy: 0 });
    const lastPointerRef = useRef<PointerSample | null>(null);
    const isInertiaActiveRef = useRef(false);
    const rafRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number | null>(null);

    useEffect(() => {
        panRef.current = pan;
    }, [pan]);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    const screenToWorld = useCallback((screenX: number, screenY: number) => {
        return {
            x: (screenX - pan.x) / zoom,
            y: (screenY - pan.y) / zoom,
        };
    }, [pan, zoom]);

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

    const animate = useCallback((timestamp: number) => {
        if (lastFrameTimeRef.current === null) {
            lastFrameTimeRef.current = timestamp;
        }
        const deltaMs = Math.max(1, timestamp - lastFrameTimeRef.current);
        lastFrameTimeRef.current = timestamp;
        const normalizedFrame = deltaMs / (1000 / 60);
        let shouldContinue = false;

        if (isInertiaActiveRef.current) {
            const velocity = inertiaVelocityRef.current;
            const decay = Math.pow(PAN_INERTIA_DECAY, normalizedFrame);
            velocity.vx *= decay;
            velocity.vy *= decay;
            const speed = Math.hypot(velocity.vx, velocity.vy);

            if (speed <= PAN_INERTIA_MIN_VELOCITY) {
                isInertiaActiveRef.current = false;
            } else {
                const nextPan = {
                    x: panRef.current.x + velocity.vx * deltaMs,
                    y: panRef.current.y + velocity.vy * deltaMs,
                };
                panRef.current = nextPan;
                setPan(nextPan);
                shouldContinue = true;
            }
        }

        const zoomDifference = targetZoomRef.current - zoomRef.current;
        if (Math.abs(zoomDifference) > 0.001) {
            const smoothing = 1 - Math.pow(1 - ZOOM_SMOOTHING, normalizedFrame);
            const previousZoom = zoomRef.current;
            const nextZoom = previousZoom + zoomDifference * smoothing;

            const container = containerRef.current;
            const fallbackAnchor = container
                ? { x: container.clientWidth / 2, y: container.clientHeight / 2 }
                : { x: 0, y: 0 };
            const anchor = zoomAnchorRef.current ?? fallbackAnchor;

            const ratio = nextZoom / previousZoom;
            if (Math.abs(ratio - 1) > 0.0001) {
                const currentPan = panRef.current;
                const zoomAdjustedPan = {
                    x: anchor.x - (anchor.x - currentPan.x) * ratio,
                    y: anchor.y - (anchor.y - currentPan.y) * ratio,
                };
                panRef.current = zoomAdjustedPan;
                setPan(zoomAdjustedPan);
            }

            zoomRef.current = nextZoom;
            setZoom(nextZoom);
            shouldContinue = true;
        } else {
            zoomRef.current = targetZoomRef.current;
            zoomAnchorRef.current = null;
        }

        const stillZooming = Math.abs(targetZoomRef.current - zoomRef.current) > 0.001;
        if (shouldContinue || isInertiaActiveRef.current || stillZooming) {
            rafRef.current = requestAnimationFrame(animate);
        } else {
            rafRef.current = null;
            lastFrameTimeRef.current = null;
        }
    }, [setPan, setZoom]);

    const scheduleAnimation = useCallback(() => {
        if (rafRef.current !== null) return;
        lastFrameTimeRef.current = null;
        rafRef.current = requestAnimationFrame(animate);
    }, [animate]);

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
                lastFrameTimeRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (hasInitializedRef.current || tiles.length === 0 || !containerRef.current) return;

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

        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

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

        hasInitializedRef.current = true;
    }, [tiles, hexToPixel]);

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
    }, [scheduleAnimation]);

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
    }, [findHexAtScreen]);

    const handleMouseMove = useCallback((e: ReactMouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const hex = findHexAtScreen(screenX, screenY);
        onHoverTile(hex);

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
        setPan(nextPan);
        panRef.current = nextPan;
    }, [mouseDownPos, panStart, isPanning]);

    const handleMouseUp = useCallback(() => {
        if (isPanning) {
            const velocity = inertiaVelocityRef.current;
            const speed = Math.hypot(velocity.vx, velocity.vy);
            if (speed > PAN_INERTIA_MIN_VELOCITY) {
                isInertiaActiveRef.current = true;
                scheduleAnimation();
            } else {
                isInertiaActiveRef.current = false;
            }
        } else if (clickTarget) {
            onTileClick(clickTarget);
        }

        setIsPanning(false);
        setMouseDownPos(null);
        setClickTarget(null);
        lastPointerRef.current = null;
        inertiaVelocityRef.current = { vx: 0, vy: 0 };
    }, [isPanning, clickTarget, onTileClick, scheduleAnimation]);

    return {
        pan,
        zoom,
        isPanning,
        containerRef,
        svgRef,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    };
};


