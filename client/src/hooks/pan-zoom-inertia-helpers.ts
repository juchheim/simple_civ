export type PanPoint = { x: number; y: number };
export type InertiaVelocity = { vx: number; vy: number };
export type ViewportSize = { width: number; height: number };

export function computeDecayFactor(baseDecay: number, normalizedFrame: number): number {
    return Math.pow(baseDecay, normalizedFrame);
}

export function decayVelocity(
    velocity: InertiaVelocity,
    decayFactor: number,
): InertiaVelocity {
    return {
        vx: velocity.vx * decayFactor,
        vy: velocity.vy * decayFactor,
    };
}

export function getVelocitySpeed(velocity: InertiaVelocity): number {
    return Math.hypot(velocity.vx, velocity.vy);
}

export function applyVelocityPan(
    pan: PanPoint,
    velocity: InertiaVelocity,
    deltaMs: number,
): PanPoint {
    return {
        x: pan.x + velocity.vx * deltaMs,
        y: pan.y + velocity.vy * deltaMs,
    };
}

export function isInEdgeZone(
    point: PanPoint,
    size: ViewportSize,
    edgeThreshold: number,
): boolean {
    return (
        point.x < edgeThreshold ||
        point.x > size.width - edgeThreshold ||
        point.y < edgeThreshold ||
        point.y > size.height - edgeThreshold
    );
}

export function computeEdgePanVelocity(
    point: PanPoint,
    size: ViewportSize,
    edgeThreshold: number,
    edgeSpeed: number,
): InertiaVelocity {
    let vx = 0;
    let vy = 0;

    if (point.x < edgeThreshold) {
        vx = edgeSpeed * (1 - point.x / edgeThreshold);
    } else if (point.x > size.width - edgeThreshold) {
        vx = -edgeSpeed * (1 - (size.width - point.x) / edgeThreshold);
    }

    if (point.y < edgeThreshold) {
        vy = edgeSpeed * (1 - point.y / edgeThreshold);
    } else if (point.y > size.height - edgeThreshold) {
        vy = -edgeSpeed * (1 - (size.height - point.y) / edgeThreshold);
    }

    return { vx, vy };
}

export function computeZoomSmoothing(normalizedFrame: number, zoomSmoothing: number): number {
    return 1 - Math.pow(1 - zoomSmoothing, normalizedFrame);
}

export function applyZoomRatioAroundAnchor(anchor: PanPoint, pan: PanPoint, ratio: number): PanPoint {
    return {
        x: anchor.x - (anchor.x - pan.x) * ratio,
        y: anchor.y - (anchor.y - pan.y) * ratio,
    };
}
