import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { HexCoord, Tile } from "@simple-civ/engine";
import { DRAG_THRESHOLD, HEX_SIZE, MAX_ZOOM, MIN_ZOOM, ZOOM_SENSITIVITY } from "./constants";

type MapInteractionParams = {
    tiles: Tile[];
    hexToPixel: (hex: HexCoord) => { x: number; y: number };
    onTileClick: (coord: HexCoord) => void;
};

type PanState = { x: number; y: number };

export const useMapInteraction = ({ tiles, hexToPixel, onTileClick }: MapInteractionParams) => {
    const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1.0);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<PanState>({ x: 0, y: 0 });
    const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
    const [clickTarget, setClickTarget] = useState<HexCoord | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasInitializedRef = useRef(false);

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

    useEffect(() => {
        if (hasInitializedRef.current || tiles.length === 0 || !containerRef.current) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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

        setPan({ x: centerX, y: centerY });
        setZoom(initialZoom);
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
            const delta = e.deltaY > 0 ? -ZOOM_SENSITIVITY : ZOOM_SENSITIVITY;

            setZoom(prevZoom => {
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom + delta));
                const zoomRatio = newZoom / prevZoom;
                setPan(prevPan => ({
                    x: mouseX - (mouseX - prevPan.x) * zoomRatio,
                    y: mouseY - (mouseY - prevPan.y) * zoomRatio
                }));
                return newZoom;
            });
        };

        svg.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            svg.removeEventListener("wheel", handleWheel);
        };
    }, []);

    const handleMouseDown = useCallback((e: ReactMouseEvent<SVGSVGElement>) => {
        if (e.button !== 0) return;
        if (!svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const hex = findHexAtScreen(screenX, screenY);

        setMouseDownPos({ x: e.clientX, y: e.clientY });
        setClickTarget(hex);
        setPanStart(pan);
    }, [pan, findHexAtScreen]);

    const handleMouseMove = useCallback((e: ReactMouseEvent) => {
        if (!mouseDownPos) return;

        const deltaX = e.clientX - mouseDownPos.x;
        const deltaY = e.clientY - mouseDownPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > DRAG_THRESHOLD) {
            if (!isPanning) {
                setIsPanning(true);
                setClickTarget(null);
            }

            setPan({
                x: panStart.x + deltaX,
                y: panStart.y + deltaY
            });
        }
    }, [mouseDownPos, panStart, isPanning]);

    const handleMouseUp = useCallback(() => {
        if (isPanning) {
            setIsPanning(false);
            setMouseDownPos(null);
            setClickTarget(null);
            return;
        }

        if (clickTarget) {
            onTileClick(clickTarget);
        }

        setIsPanning(false);
        setMouseDownPos(null);
        setClickTarget(null);
    }, [isPanning, clickTarget, onTileClick]);

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

