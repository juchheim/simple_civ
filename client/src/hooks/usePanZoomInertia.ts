import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
    PAN_INERTIA_DECAY,
    PAN_INERTIA_MIN_VELOCITY,
    ZOOM_SMOOTHING
} from "../components/GameMap/constants";

export const EDGE_PAN_THRESHOLD = 100; // pixels
export const EDGE_PAN_SPEED = 0.8; // pixels per ms
export const EDGE_PAN_DELAY = 250; // ms before edge pan starts

export type PanState = { x: number; y: number };
export type Velocity = { vx: number; vy: number };

type UsePanZoomInertiaParams = {
    pan: PanState;
    zoom: number;
    setPan: (pan: PanState) => void;
    setZoom: (zoom: number) => void;
    containerRef: RefObject<HTMLDivElement>;
    isPanningRef: RefObject<boolean>;
};

/**
 * Manages pan/zoom inertia, smoothing, and the shared refs required by the map controller.
 * Keeps animation concerns isolated from event handling.
 */
export function usePanZoomInertia({
    pan,
    zoom,
    setPan,
    setZoom,
    containerRef,
    isPanningRef
}: UsePanZoomInertiaParams) {
    const panRef = useRef<PanState>(pan);
    const zoomRef = useRef(zoom);
    const targetZoomRef = useRef(zoom);
    const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
    const inertiaVelocityRef = useRef<Velocity>({ vx: 0, vy: 0 });
    const isInertiaActiveRef = useRef(false);
    const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
    const edgeEntryTimeRef = useRef<number | null>(null); // When mouse entered edge zone
    const rafRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number | null>(null);

    useEffect(() => {
        panRef.current = pan;
    }, [pan]);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

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

        // Edge panning with delay
        if (mousePositionRef.current && !isPanningRef.current && containerRef.current) {
            const { x, y } = mousePositionRef.current;
            const { clientWidth, clientHeight } = containerRef.current;

            // Check if mouse is in edge zone
            const isInEdgeZone =
                x < EDGE_PAN_THRESHOLD ||
                x > clientWidth - EDGE_PAN_THRESHOLD ||
                y < EDGE_PAN_THRESHOLD ||
                y > clientHeight - EDGE_PAN_THRESHOLD;

            if (isInEdgeZone) {
                // Track when we entered the edge zone
                if (edgeEntryTimeRef.current === null) {
                    edgeEntryTimeRef.current = timestamp;
                }

                const timeInEdge = timestamp - edgeEntryTimeRef.current;

                // Only pan after the delay has elapsed
                if (timeInEdge >= EDGE_PAN_DELAY) {
                    let vx = 0;
                    let vy = 0;

                    if (x < EDGE_PAN_THRESHOLD) {
                        vx = EDGE_PAN_SPEED * (1 - x / EDGE_PAN_THRESHOLD);
                    } else if (x > clientWidth - EDGE_PAN_THRESHOLD) {
                        vx = -EDGE_PAN_SPEED * (1 - (clientWidth - x) / EDGE_PAN_THRESHOLD);
                    }

                    if (y < EDGE_PAN_THRESHOLD) {
                        vy = EDGE_PAN_SPEED * (1 - y / EDGE_PAN_THRESHOLD);
                    } else if (y > clientHeight - EDGE_PAN_THRESHOLD) {
                        vy = -EDGE_PAN_SPEED * (1 - (clientHeight - y) / EDGE_PAN_THRESHOLD);
                    }

                    if (vx !== 0 || vy !== 0) {
                        const nextPan = {
                            x: panRef.current.x + vx * deltaMs,
                            y: panRef.current.y + vy * deltaMs,
                        };
                        panRef.current = nextPan;
                        setPan(nextPan);
                        shouldContinue = true;
                    }
                } else {
                    // Still waiting for delay, keep animation going
                    shouldContinue = true;
                }
            } else {
                // Mouse left edge zone, reset the timer
                edgeEntryTimeRef.current = null;
            }
        } else {
            // Mouse not tracked or panning, reset the timer
            edgeEntryTimeRef.current = null;
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
    }, [setPan, setZoom, containerRef, isPanningRef]);

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

    return {
        panRef,
        zoomRef,
        targetZoomRef,
        zoomAnchorRef,
        inertiaVelocityRef,
        isInertiaActiveRef,
        mousePositionRef,
        scheduleAnimation,
    };
}
