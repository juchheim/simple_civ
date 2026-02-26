import { HexCoord, Tile } from "@simple-civ/engine";
import { PanState } from "./usePanZoomInertia";

type Point = { x: number; y: number };

type ContainerSize = {
    width: number;
    height: number;
};

type ViewportFrame = {
    pan: PanState;
    zoom: number;
    size: ContainerSize;
};

export type WorldBounds = {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
};

type FitToTilesViewParams = {
    tiles: Tile[];
    hexToPixel: (hex: HexCoord) => Point;
    containerSize: ContainerSize;
    hexRadius: number;
    padding: number;
    maxZoom?: number;
};

export function screenToWorldPoint(screen: Point, pan: PanState, zoom: number): Point {
    return {
        x: (screen.x - pan.x) / zoom,
        y: (screen.y - pan.y) / zoom,
    };
}

export function findClosestHexAtWorldPoint(
    world: Point,
    tiles: Tile[],
    hexToPixel: (hex: HexCoord) => Point,
    hitRadius: number,
): HexCoord | null {
    let closestHex: HexCoord | null = null;
    let minDist = Infinity;

    tiles.forEach(tile => {
        const position = hexToPixel(tile.coord);
        const dx = world.x - position.x;
        const dy = world.y - position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist < hitRadius) {
            minDist = dist;
            closestHex = tile.coord;
        }
    });

    return closestHex;
}

export function panToCenterPoint(point: Point, containerSize: ContainerSize, zoom: number): PanState {
    return {
        x: containerSize.width / 2 - point.x * zoom,
        y: containerSize.height / 2 - point.y * zoom,
    };
}

export function computeWorldBoundsFromViewport(
    pan: PanState,
    zoom: number,
    viewportSize: ContainerSize,
): WorldBounds {
    return {
        minX: (-pan.x) / zoom,
        maxX: (viewportSize.width - pan.x) / zoom,
        minY: (-pan.y) / zoom,
        maxY: (viewportSize.height - pan.y) / zoom,
    };
}

export function computeWorldCenter(worldBounds: WorldBounds): Point {
    return {
        x: (worldBounds.minX + worldBounds.maxX) / 2,
        y: (worldBounds.minY + worldBounds.maxY) / 2,
    };
}

export function createViewport(
    pan: PanState,
    zoom: number,
    size: ContainerSize,
): ViewportFrame & { worldBounds: WorldBounds; center: Point } {
    const worldBounds = computeWorldBoundsFromViewport(pan, zoom, size);
    const center = computeWorldCenter(worldBounds);
    return {
        pan,
        zoom,
        size,
        worldBounds,
        center,
    };
}

export function isSameViewportFrame(
    previous: ViewportFrame | null | undefined,
    next: ViewportFrame,
): boolean {
    return Boolean(previous &&
        previous.zoom === next.zoom &&
        previous.pan.x === next.pan.x &&
        previous.pan.y === next.pan.y &&
        previous.size.width === next.size.width &&
        previous.size.height === next.size.height);
}

export function computeFitToTilesView({
    tiles,
    hexToPixel,
    containerSize,
    hexRadius,
    padding,
    maxZoom = 1.0,
}: FitToTilesViewParams): { pan: PanState; zoom: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    tiles.forEach(tile => {
        const { x, y } = hexToPixel(tile.coord);
        minX = Math.min(minX, x - hexRadius);
        minY = Math.min(minY, y - hexRadius);
        maxX = Math.max(maxX, x + hexRadius);
        maxY = Math.max(maxY, y + hexRadius);
    });

    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;
    const mapCenterX = (minX + maxX) / 2;
    const mapCenterY = (minY + maxY) / 2;

    const scaleX = (containerSize.width - padding * 2) / mapWidth;
    const scaleY = (containerSize.height - padding * 2) / mapHeight;
    const zoom = Math.min(scaleX, scaleY, maxZoom);
    const pan = panToCenterPoint(
        { x: mapCenterX, y: mapCenterY },
        containerSize,
        zoom,
    );

    return { pan, zoom };
}
