import React from "react";
import { useThree } from "@react-three/fiber";
import { HexCoord, Tile } from "@simple-civ/engine";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { MapViewport } from "../GameMap";
import { HEX_SIZE, MAX_ZOOM, MIN_ZOOM } from "../GameMap/constants";
import { hexToPixel } from "../GameMap/geometry";
import { pixelToHex, Projector } from "./projection";

export type Map3DController = {
    centerOnCoord: (coord: HexCoord) => void;
    centerOnPoint: (point: { x: number; y: number }) => void;
};

const CAMERA_LIFT_RATIO = 0.12;

export function getCameraDistanceBounds(radius: number) {
    return {
        min: Math.max(radius * 1.95, 14),
        max: Math.max(radius * 3.1, 24),
    };
}

export const LOCKED_POLAR_ANGLE = Math.acos(CAMERA_LIFT_RATIO);

type ControllerParams = {
    projector: Projector;
    tiles: Tile[];
    navigableTiles: Tile[];
    initialCenter: HexCoord | null;
    controlsRef: React.RefObject<OrbitControlsImpl>;
    onViewChange?: (view: MapViewport) => void;
};

export function useMap3DController({
    projector,
    tiles,
    navigableTiles,
    initialCenter,
    controlsRef,
    onViewChange,
}: ControllerParams) {
    const { camera, gl, invalidate, size } = useThree();
    const centeredCoordRef = React.useRef<HexCoord>(initialCenter ?? tiles[0]?.coord ?? { q: 0, r: 0 });
    const hasInitializedRef = React.useRef(false);
    const tileKeys = React.useMemo(() => new Set(tiles.map(tile => `${tile.coord.q},${tile.coord.r}`)), [tiles]);
    const navigableKeys = React.useMemo(() => new Set(navigableTiles.map(tile => `${tile.coord.q},${tile.coord.r}`)), [navigableTiles]);
    const flatNavigationBounds = React.useMemo(() => {
        const centers = navigableTiles.length > 0 ? navigableTiles : tiles;
        const points = centers.map(tile => hexToPixel(tile.coord, projector.hexSize));
        const minX = Math.min(...points.map(point => point.x));
        const maxX = Math.max(...points.map(point => point.x));
        const minY = Math.min(...points.map(point => point.y));
        const maxY = Math.max(...points.map(point => point.y));
        const xInset = Math.max(0, (maxX - minX) * 0.08);
        const yInset = Math.max(0, (maxY - minY) * 0.08);

        return {
            minX: minX - projector.hexSize * 0.95 + xInset,
            maxX: maxX + projector.hexSize * 0.95 - xInset,
            minY: minY - projector.hexSize * 0.95 + yInset,
            maxY: maxY + projector.hexSize * 0.95 - yInset,
        };
    }, [navigableTiles, projector.hexSize, tiles]);

    const clampFlatPoint = React.useCallback((point: { x: number; y: number }) => ({
        x: THREE.MathUtils.clamp(point.x, flatNavigationBounds.minX, flatNavigationBounds.maxX),
        y: THREE.MathUtils.clamp(point.y, flatNavigationBounds.minY, flatNavigationBounds.maxY),
    }), [flatNavigationBounds]);

    const emitViewport = React.useCallback((coord: HexCoord) => {
        if (!onViewChange) return;
        const center = hexToPixel(coord, HEX_SIZE);
        const controls = controlsRef.current;
        const distance = controls ? camera.position.distanceTo(controls.target) : projector.surface.radius * 2;
        const normalizedDistance = Math.max(0, Math.min(1, (distance - projector.surface.radius) / Math.max(projector.surface.radius, 1)));
        const zoom = MAX_ZOOM - normalizedDistance * (MAX_ZOOM - MIN_ZOOM);
        const halfWidth = (size.width / Math.max(zoom, MIN_ZOOM)) / 2;
        const halfHeight = (size.height / Math.max(zoom, MIN_ZOOM)) / 2;

        onViewChange({
            pan: { x: size.width / 2 - center.x * zoom, y: size.height / 2 - center.y * zoom },
            zoom,
            size,
            worldBounds: {
                minX: center.x - halfWidth,
                maxX: center.x + halfWidth,
                minY: center.y - halfHeight,
                maxY: center.y + halfHeight,
            },
            center,
        });
    }, [camera.position, controlsRef, onViewChange, projector.surface.radius, size]);

    const applyFlatPoint = React.useCallback((point: { x: number; y: number }, distance: number) => {
        const controls = controlsRef.current;
        if (!controls) return;
        const clamped = clampFlatPoint(point);
        const targetY = projector.flatCenter.y - clamped.y;
        const theta = (clamped.x - projector.flatCenter.x) / projector.surface.radius;
        const lift = distance * CAMERA_LIFT_RATIO;
        const radialDistance = Math.sqrt(distance * distance - lift * lift);

        controls.target.set(0, targetY, 0);
        camera.position.set(
            Math.sin(theta) * radialDistance,
            targetY + lift,
            Math.cos(theta) * radialDistance,
        );
        camera.lookAt(controls.target);
        controls.update();
        const nextCoord = projector.pixelToHex(clamped);
        if (tileKeys.has(`${nextCoord.q},${nextCoord.r}`)) {
            centeredCoordRef.current = nextCoord;
            emitViewport(nextCoord);
        }
        invalidate();
    }, [camera.position, clampFlatPoint, controlsRef, emitViewport, invalidate, projector, tileKeys]);

    const centerOnCoord = React.useCallback((coord: HexCoord) => {
        const controls = controlsRef.current;
        if (!controls) return;
        const bounds = getCameraDistanceBounds(projector.surface.radius);
        const distance = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target), bounds.min, bounds.max);
        applyFlatPoint(hexToPixel(coord, projector.hexSize), distance);
    }, [applyFlatPoint, camera.position, controlsRef, projector.hexSize, projector.surface.radius]);

    const centerOnPoint = React.useCallback((point: { x: number; y: number }) => {
        const coord = pixelToHex(point, HEX_SIZE);
        if (tileKeys.has(`${coord.q},${coord.r}`)) {
            centerOnCoord(coord);
        }
    }, [centerOnCoord, tileKeys]);

    const handleControlsChange = React.useCallback(() => {
        const controls = controlsRef.current;
        if (!controls) return;
        let coord = centeredCoordRef.current;

        if (projector.surface.kind === "cylinder") {
            const theta = Math.atan2(camera.position.x, camera.position.z);
            const rawPoint = {
                x: projector.flatCenter.x + theta * projector.surface.radius,
                y: projector.flatCenter.y - controls.target.y,
            };
            const clampedPoint = clampFlatPoint(rawPoint);
            if (clampedPoint.x !== rawPoint.x || clampedPoint.y !== rawPoint.y) {
                applyFlatPoint(clampedPoint, camera.position.distanceTo(controls.target));
                return;
            }
            const candidate = projector.pixelToHex(clampedPoint);
            if (navigableKeys.has(`${candidate.q},${candidate.r}`) || tileKeys.has(`${candidate.q},${candidate.r}`)) {
                coord = candidate;
            }
        }

        centeredCoordRef.current = coord;
        emitViewport(coord);
        invalidate();
    }, [applyFlatPoint, camera.position, clampFlatPoint, controlsRef, emitViewport, invalidate, navigableKeys, projector, tileKeys]);

    React.useEffect(() => {
        const element = gl.domElement;
        let activePointerId: number | null = null;
        let previousY = 0;

        const handlePointerDown = (event: PointerEvent) => {
            if (event.button !== 0) return;
            activePointerId = event.pointerId;
            previousY = event.clientY;
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (event.pointerId !== activePointerId || (event.buttons & 1) === 0) return;
            const controls = controlsRef.current;
            if (!controls) return;
            const deltaY = event.clientY - previousY;
            previousY = event.clientY;
            if (deltaY === 0) return;

            const distance = camera.position.distanceTo(controls.target);
            const panDistance = (deltaY / Math.max(size.height, 1)) * distance * 0.58;
            const theta = Math.atan2(camera.position.x, camera.position.z);
            const currentPoint = {
                x: projector.flatCenter.x + theta * projector.surface.radius,
                y: projector.flatCenter.y - controls.target.y,
            };
            applyFlatPoint({ x: currentPoint.x, y: currentPoint.y - panDistance }, distance);
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (event.pointerId === activePointerId) activePointerId = null;
        };

        element.addEventListener("pointerdown", handlePointerDown);
        element.addEventListener("pointermove", handlePointerMove);
        element.addEventListener("pointerup", handlePointerUp);
        element.addEventListener("pointercancel", handlePointerUp);

        return () => {
            element.removeEventListener("pointerdown", handlePointerDown);
            element.removeEventListener("pointermove", handlePointerMove);
            element.removeEventListener("pointerup", handlePointerUp);
            element.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [applyFlatPoint, camera.position, controlsRef, gl.domElement, invalidate, projector, size.height]);

    React.useEffect(() => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;
        if (initialCenter) {
            centerOnCoord(initialCenter);
        } else {
            emitViewport(centeredCoordRef.current);
        }
    }, [centerOnCoord, emitViewport, initialCenter]);

    return {
        controller: { centerOnCoord, centerOnPoint },
        handleControlsChange,
    };
}
