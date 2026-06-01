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

export function getCameraDistanceBounds(radius: number) {
    return {
        min: Math.max(radius * 1.65, 12),
        max: Math.max(radius * 2.65, 20),
    };
}

type ControllerParams = {
    projector: Projector;
    tiles: Tile[];
    initialCenter: HexCoord | null;
    controlsRef: React.RefObject<OrbitControlsImpl>;
    onViewChange?: (view: MapViewport) => void;
};

export function useMap3DController({
    projector,
    tiles,
    initialCenter,
    controlsRef,
    onViewChange,
}: ControllerParams) {
    const { camera, invalidate, size } = useThree();
    const centeredCoordRef = React.useRef<HexCoord>(initialCenter ?? tiles[0]?.coord ?? { q: 0, r: 0 });
    const hasInitializedRef = React.useRef(false);
    const tileKeys = React.useMemo(() => new Set(tiles.map(tile => `${tile.coord.q},${tile.coord.r}`)), [tiles]);

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

    const centerOnCoord = React.useCallback((coord: HexCoord) => {
        const controls = controlsRef.current;
        if (!controls) return;
        const normal = projector.normalAt(coord);
        const position = projector.positionOf(coord);
        const bounds = getCameraDistanceBounds(projector.surface.radius);
        const distance = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target), bounds.min, bounds.max);
        const target = projector.surface.kind === "cylinder"
            ? new THREE.Vector3(0, position.y, 0)
            : new THREE.Vector3(0, 0, 0);
        const cameraPosition = normal.multiplyScalar(distance);
        if (projector.surface.kind === "cylinder") {
            const lift = distance * 0.24;
            cameraPosition.multiplyScalar(Math.sqrt(distance * distance - lift * lift) / distance);
            cameraPosition.y = target.y + lift;
        }

        controls.target.copy(target);
        camera.position.copy(cameraPosition);
        camera.lookAt(target);
        controls.update();
        centeredCoordRef.current = coord;
        emitViewport(coord);
        invalidate();
    }, [camera, controlsRef, emitViewport, invalidate, projector]);

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
            const flatPoint = {
                x: projector.flatCenter.x + theta * projector.surface.radius,
                y: projector.flatCenter.y - controls.target.y,
            };
            const candidate = projector.pixelToHex(flatPoint);
            if (tileKeys.has(`${candidate.q},${candidate.r}`)) coord = candidate;
        }

        centeredCoordRef.current = coord;
        emitViewport(coord);
        invalidate();
    }, [camera.position, controlsRef, emitViewport, invalidate, projector, tileKeys]);

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
