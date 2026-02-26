export const TOUCH_TAP_THRESHOLD = 10;
export const TOUCH_TAP_DURATION = 300;
export const PINCH_ZOOM_SENSITIVITY = 1.0;

type Point = { x: number; y: number };
type ClientPoint = { clientX: number; clientY: number };

export function calculatePointDistance(from: Point, to: Point): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function calculateClientDistance(from: ClientPoint, to: ClientPoint): number {
    const dx = to.clientX - from.clientX;
    const dy = to.clientY - from.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

export function clampZoom(nextZoom: number, minZoom: number, maxZoom: number): number {
    return Math.max(minZoom, Math.min(maxZoom, nextZoom));
}

export function calculatePinchZoom(
    distance: number,
    initialDistance: number,
    initialZoom: number,
    sensitivity: number,
    minZoom: number,
    maxZoom: number,
): number {
    const scale = (distance / initialDistance) * sensitivity;
    return clampZoom(initialZoom * scale, minZoom, maxZoom);
}

export function computePinchAdjustedPan(
    center: Point,
    currentPan: Point,
    panDelta: Point,
    previousZoom: number,
    nextZoom: number,
): Point {
    const ratio = nextZoom / previousZoom;
    return {
        x: center.x - (center.x - currentPan.x - panDelta.x) * ratio,
        y: center.y - (center.y - currentPan.y - panDelta.y) * ratio,
    };
}

export function isTapGesture(
    distance: number,
    durationMs: number,
    tapThreshold = TOUCH_TAP_THRESHOLD,
    tapDurationThreshold = TOUCH_TAP_DURATION,
): boolean {
    return distance < tapThreshold && durationMs < tapDurationThreshold;
}
