export type PointerPoint = { x: number; y: number };
export type PointerSample = PointerPoint & { time: number };
export type PointerVelocity = { vx: number; vy: number };
export type DragMetrics = { deltaX: number; deltaY: number; distance: number };

export function createPointerSample(x: number, y: number, time: number): PointerSample {
    return { x, y, time };
}

export function computeDragMetrics(start: PointerPoint, current: PointerPoint): DragMetrics {
    const deltaX = current.x - start.x;
    const deltaY = current.y - start.y;
    return {
        deltaX,
        deltaY,
        distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
    };
}

export function computePointerVelocity(
    previous: PointerSample,
    next: PointerSample,
): PointerVelocity | null {
    const dt = next.time - previous.time;
    if (dt <= 0) {
        return null;
    }
    return {
        vx: (next.x - previous.x) / dt,
        vy: (next.y - previous.y) / dt,
    };
}

export function computePanFromDrag(
    panStart: PointerPoint,
    drag: Pick<DragMetrics, "deltaX" | "deltaY">,
): PointerPoint {
    return {
        x: panStart.x + drag.deltaX,
        y: panStart.y + drag.deltaY,
    };
}

export function computeWheelDesiredZoom(
    currentTarget: number,
    deltaY: number,
    sensitivity: number,
    minZoom: number,
    maxZoom: number,
): number {
    const zoomFactor = Math.exp(-deltaY * sensitivity);
    const desired = currentTarget * zoomFactor;
    return Math.max(minZoom, Math.min(maxZoom, desired));
}

export function hasMeaningfulZoomDelta(
    previous: number,
    next: number,
    epsilon = 0.0005,
): boolean {
    return Math.abs(next - previous) >= epsilon;
}
