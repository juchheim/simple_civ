import { useCallback, useRef, type RefObject, type MutableRefObject } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { HexCoord } from "@simple-civ/engine";
import {
    DRAG_THRESHOLD,
    MAX_ZOOM,
    MIN_ZOOM,
} from "../components/GameMap/constants";
import type { PanState, Velocity } from "./usePanZoomInertia";
import {
    calculateClientDistance,
    calculatePinchZoom,
    calculatePointDistance,
    computePinchAdjustedPan,
    isTapGesture,
    PINCH_ZOOM_SENSITIVITY
} from "./touch-controller-helpers";

type TouchControllerParams = {
    svgRef: RefObject<SVGSVGElement>;
    findHexAtScreen: (screenX: number, screenY: number) => HexCoord | null;
    onTileClick: (coord: HexCoord) => void;
    panRef: MutableRefObject<PanState>;
    zoomRef: MutableRefObject<number>;
    targetZoomRef: MutableRefObject<number>;
    inertiaVelocityRef: MutableRefObject<Velocity>;
    isInertiaActiveRef: MutableRefObject<boolean>;
    scheduleAnimation: () => void;
    setPan: (pan: PanState) => void;
    setZoom: (zoom: number) => void;
    setIsPanning: (isPanning: boolean) => void;
};

type TouchInfo = {
    startX: number;
    startY: number;
    startTime: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    identifier: number;
};

type PinchState = {
    initialDistance: number;
    initialZoom: number;
    centerX: number;
    centerY: number;
};

/**
 * Hook to handle touch events for map pan/zoom.
 * Supports single-finger drag (pan), two-finger pinch (zoom), and tap (click).
 */
export function useTouchController({
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
}: TouchControllerParams) {
    // Track active touches for gesture detection
    const activeTouchesRef = useRef<Map<number, TouchInfo>>(new Map());
    const pinchStateRef = useRef<PinchState | null>(null);
    const panStartRef = useRef<PanState | null>(null);
    const clickTargetRef = useRef<HexCoord | null>(null);
    const isDraggingRef = useRef(false);

    /** Get touch position relative to the SVG element */
    const getTouchPosition = useCallback((touch: React.Touch): { x: number; y: number } => {
        const svg = svgRef.current;
        if (!svg) return { x: touch.clientX, y: touch.clientY };

        const rect = svg.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    }, [svgRef]);

    /** Calculate distance between two touch points */
    const getDistance = useCallback((touch1: React.Touch, touch2: React.Touch): number => {
        return calculateClientDistance(touch1, touch2);
    }, []);

    /** Calculate center point between two touches */
    const getCenter = useCallback((touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
        const svg = svgRef.current;
        const rect = svg?.getBoundingClientRect() ?? { left: 0, top: 0 };
        return {
            x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
            y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
        };
    }, [svgRef]);

    const handleTouchStart = useCallback((e: ReactTouchEvent) => {
        // Prevent default to stop browser gestures
        e.preventDefault();

        const touches = e.changedTouches;
        const now = performance.now();

        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const pos = getTouchPosition(touch);

            activeTouchesRef.current.set(touch.identifier, {
                startX: pos.x,
                startY: pos.y,
                startTime: now,
                lastX: pos.x,
                lastY: pos.y,
                lastTime: now,
                identifier: touch.identifier,
            });
        }

        const allTouches = e.touches;

        if (allTouches.length === 1) {
            // Single touch - prepare for pan or tap
            const touch = allTouches[0];
            const pos = getTouchPosition(touch);
            const hex = findHexAtScreen(pos.x, pos.y);

            clickTargetRef.current = hex;
            panStartRef.current = { ...panRef.current };
            isDraggingRef.current = false;

            // Stop any existing inertia
            isInertiaActiveRef.current = false;
            inertiaVelocityRef.current = { vx: 0, vy: 0 };

        } else if (allTouches.length === 2) {
            // Two touches - start pinch zoom
            const touch1 = allTouches[0];
            const touch2 = allTouches[1];
            const distance = getDistance(touch1, touch2);
            const center = getCenter(touch1, touch2);

            pinchStateRef.current = {
                initialDistance: distance,
                initialZoom: zoomRef.current,
                centerX: center.x,
                centerY: center.y,
            };

            // Cancel any tap intent
            clickTargetRef.current = null;
            isDraggingRef.current = true;
            setIsPanning(true);
        }
    }, [findHexAtScreen, getCenter, getDistance, getTouchPosition, inertiaVelocityRef, isInertiaActiveRef, panRef, setIsPanning, zoomRef]);

    const handleTouchMove = useCallback((e: ReactTouchEvent) => {
        e.preventDefault();

        const allTouches = e.touches;
        const now = performance.now();

        // Update tracking for all touches
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const pos = getTouchPosition(touch);
            const tracked = activeTouchesRef.current.get(touch.identifier);

            if (tracked) {
                tracked.lastX = pos.x;
                tracked.lastY = pos.y;
                tracked.lastTime = now;
            }
        }

        if (allTouches.length === 1 && panStartRef.current) {
            // Single finger - pan
            const touch = allTouches[0];
            const pos = getTouchPosition(touch);
            const tracked = activeTouchesRef.current.get(touch.identifier);

            if (tracked) {
                const deltaX = pos.x - tracked.startX;
                const deltaY = pos.y - tracked.startY;
                const distance = calculatePointDistance(
                    { x: tracked.startX, y: tracked.startY },
                    { x: pos.x, y: pos.y },
                );

                if (distance > DRAG_THRESHOLD) {
                    isDraggingRef.current = true;
                    clickTargetRef.current = null;
                    setIsPanning(true);

                    // Calculate velocity for inertia
                    const dt = now - tracked.lastTime;
                    if (dt > 0) {
                        const prevTracked = activeTouchesRef.current.get(touch.identifier);
                        if (prevTracked) {
                            inertiaVelocityRef.current = {
                                vx: (pos.x - prevTracked.lastX) / dt,
                                vy: (pos.y - prevTracked.lastY) / dt,
                            };
                        }
                    }

                    // Apply pan
                    const nextPan = {
                        x: panStartRef.current.x + deltaX,
                        y: panStartRef.current.y + deltaY,
                    };
                    panRef.current = nextPan;
                    setPan(nextPan);
                }
            }

        } else if (allTouches.length === 2 && pinchStateRef.current) {
            // Two fingers - pinch zoom
            const touch1 = allTouches[0];
            const touch2 = allTouches[1];
            const distance = getDistance(touch1, touch2);
            const center = getCenter(touch1, touch2);

            const pinch = pinchStateRef.current;
            const newZoom = calculatePinchZoom(
                distance,
                pinch.initialDistance,
                pinch.initialZoom,
                PINCH_ZOOM_SENSITIVITY,
                MIN_ZOOM,
                MAX_ZOOM,
            );

            // Calculate zoom-adjusted pan to keep pinch center fixed
            // When zooming, we need to adjust pan so the point under the pinch center stays fixed
            const previousZoom = zoomRef.current;

            // First, handle the pan delta from two-finger drag
            const panDeltaX = center.x - pinch.centerX;
            const panDeltaY = center.y - pinch.centerY;

            // Then apply zoom adjustment around the current center
            const currentPan = panRef.current;
            const zoomAdjustedPan = computePinchAdjustedPan(
                center,
                currentPan,
                { x: panDeltaX, y: panDeltaY },
                previousZoom,
                newZoom,
            );

            // Apply pan immediately
            panRef.current = zoomAdjustedPan;
            setPan(zoomAdjustedPan);

            // Apply zoom immediately (bypass animation for direct touch control)
            zoomRef.current = newZoom;
            targetZoomRef.current = newZoom;
            setZoom(newZoom);

            // Update pinch center for next frame
            pinchStateRef.current.centerX = center.x;
            pinchStateRef.current.centerY = center.y;

            // Schedule animation to update React state
            scheduleAnimation();
        }
    }, [activeTouchesRef, getCenter, getDistance, getTouchPosition, inertiaVelocityRef, isDraggingRef, panRef, panStartRef, pinchStateRef, scheduleAnimation, setIsPanning, setPan, setZoom, targetZoomRef, zoomRef]);

    const handleTouchEnd = useCallback((e: ReactTouchEvent) => {
        e.preventDefault();

        const now = performance.now();

        // Remove ended touches from tracking
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const tracked = activeTouchesRef.current.get(touch.identifier);

            // Check for tap gesture
            if (tracked && !isDraggingRef.current && clickTargetRef.current) {
                const distance = calculatePointDistance(
                    { x: tracked.startX, y: tracked.startY },
                    { x: tracked.lastX, y: tracked.lastY },
                );
                const duration = now - tracked.startTime;

                if (isTapGesture(distance, duration)) {
                    // It's a tap! Trigger tile click
                    onTileClick(clickTargetRef.current);
                }
            }

            activeTouchesRef.current.delete(touch.identifier);
        }

        // Check remaining touches
        if (e.touches.length === 0) {
            // All touches ended
            if (isDraggingRef.current) {
                // Apply inertia if we were panning
                const velocity = inertiaVelocityRef.current;
                const speed = Math.hypot(velocity.vx, velocity.vy);
                if (speed > 0.02) { // PAN_INERTIA_MIN_VELOCITY
                    isInertiaActiveRef.current = true;
                    scheduleAnimation();
                }
            }

            // Reset state
            pinchStateRef.current = null;
            panStartRef.current = null;
            clickTargetRef.current = null;
            isDraggingRef.current = false;
            setIsPanning(false);
            inertiaVelocityRef.current = { vx: 0, vy: 0 };

        } else if (e.touches.length === 1) {
            // Transitioned from pinch to single-finger pan
            const remainingTouch = e.touches[0];
            const pos = getTouchPosition(remainingTouch);

            // Reset pan start to current position
            panStartRef.current = { ...panRef.current };
            const tracked = activeTouchesRef.current.get(remainingTouch.identifier);
            if (tracked) {
                tracked.startX = pos.x;
                tracked.startY = pos.y;
                tracked.startTime = now;
            }

            pinchStateRef.current = null;
        }
    }, [getTouchPosition, onTileClick, panRef, inertiaVelocityRef, isInertiaActiveRef, scheduleAnimation, setIsPanning]);

    return {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
    };
}
