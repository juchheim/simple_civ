import { HexCoord } from "@simple-civ/engine";
import * as THREE from "three";
import { getHexCornerOffsets, hexToPixel } from "../GameMap/geometry";

const DEFAULT_CYLINDER_WRAP = (330 * Math.PI) / 180;
const MAX_POLE_COMPRESSION = 0.6;

export type WorldSurface =
    | { kind: "cylinder"; radius: number; wrapAngle: number; height: number }
    | { kind: "sphere"; radius: number; lonSpan: number; latSpan: number };

export type SurfaceDecision = {
    surface: WorldSurface;
    worstCompression: number;
    reason: string;
};

export type Projector = {
    surface: WorldSurface;
    hexSize: number;
    flatCenter: { x: number; y: number };
    positionOf: (coord: HexCoord, elevation?: number) => THREE.Vector3;
    normalAt: (coord: HexCoord) => THREE.Vector3;
    orientationOf: (coord: HexCoord) => THREE.Quaternion;
    cornerOf: (coord: HexCoord, cornerIndex: number, elevation?: number, scale?: number) => THREE.Vector3;
    pointToWorld: (point: { x: number; y: number }, elevation?: number) => THREE.Vector3;
    pixelToHex: (point: { x: number; y: number }) => HexCoord;
};

export function chooseWorldSurface(
    width: number,
    height: number,
    options: { gridWraps?: boolean; forceSphere?: boolean; wrapAngle?: number } = {},
): SurfaceDecision {
    const xSpan = width * Math.sqrt(3);
    const ySpan = height * 1.5;
    const sphereRequested = options.forceSphere || options.gridWraps;

    if (sphereRequested) {
        const radius = Math.max(xSpan / (2 * Math.PI), ySpan / Math.PI);
        const latSpan = ySpan / radius;
        const latMax = Math.min(latSpan / 2, Math.PI / 2);
        const compression = Math.cos(latMax);

        if (options.forceSphere || (latSpan <= Math.PI && compression >= MAX_POLE_COMPRESSION)) {
            return {
                surface: {
                    kind: "sphere",
                    radius,
                    lonSpan: xSpan / radius,
                    latSpan,
                },
                worstCompression: compression,
                reason: options.forceSphere
                    ? "sphere forced for experimental preview"
                    : `sphere viable: pole compression ${compression.toFixed(2)} >= ${MAX_POLE_COMPRESSION}`,
            };
        }
    }

    const wrapAngle = options.wrapAngle ?? DEFAULT_CYLINDER_WRAP;
    return {
        surface: {
            kind: "cylinder",
            radius: xSpan / wrapAngle,
            wrapAngle,
            height: ySpan,
        },
        worstCompression: 1,
        reason: options.gridWraps
            ? "cylinder: sphere distortion exceeds threshold"
            : "cylinder: grid is bounded (non-wrapping); sphere disabled",
    };
}

function roundAxial(q: number, r: number): HexCoord {
    const x = q;
    const z = r;
    const y = -x - z;
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);
    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) {
        rx = -ry - rz;
    } else if (yDiff > zDiff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }

    return { q: rx, r: rz };
}

export function pixelToHex(point: { x: number; y: number }, hexSize: number): HexCoord {
    const q = ((Math.sqrt(3) / 3) * point.x - (1 / 3) * point.y) / hexSize;
    const r = ((2 / 3) * point.y) / hexSize;
    return roundAxial(q, r);
}

export function createProjector(
    map: { width: number; height: number },
    hexSize = 1,
    options: { gridWraps?: boolean; forceSphere?: boolean; wrapAngle?: number } = {},
): Projector {
    const decision = chooseWorldSurface(map.width, map.height, options);
    const surface = scaleSurface(decision.surface, hexSize);
    const flatCenter = {
        x: ((map.width - 1) * Math.sqrt(3) * hexSize) / 2,
        y: ((map.height - 1) * 1.5 * hexSize) / 2,
    };
    const corners = getHexCornerOffsets(hexSize);

    const pointToWorld = (point: { x: number; y: number }, elevation = 0): THREE.Vector3 => {
        if (surface.kind === "cylinder") {
            const theta = ((point.x - flatCenter.x) / (surface.radius * surface.wrapAngle)) * surface.wrapAngle;
            const radius = surface.radius + elevation;
            return new THREE.Vector3(
                Math.sin(theta) * radius,
                flatCenter.y - point.y,
                Math.cos(theta) * radius,
            );
        }

        const longitude = ((point.x - flatCenter.x) / (surface.radius * surface.lonSpan)) * surface.lonSpan;
        const latitude = ((flatCenter.y - point.y) / (surface.radius * surface.latSpan)) * surface.latSpan;
        const radius = surface.radius + elevation;
        return new THREE.Vector3(
            Math.sin(longitude) * Math.cos(latitude) * radius,
            Math.sin(latitude) * radius,
            Math.cos(longitude) * Math.cos(latitude) * radius,
        );
    };

    const positionOf = (coord: HexCoord, elevation = 0) => pointToWorld(hexToPixel(coord, hexSize), elevation);
    const normalAt = (coord: HexCoord) => {
        const world = positionOf(coord);
        if (surface.kind === "cylinder") {
            return new THREE.Vector3(world.x, 0, world.z).normalize();
        }
        return world.normalize();
    };
    const orientationOf = (coord: HexCoord) => {
        return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalAt(coord));
    };

    return {
        surface,
        hexSize,
        flatCenter,
        positionOf,
        normalAt,
        orientationOf,
        cornerOf: (coord, cornerIndex, elevation = 0, scale = 1) => {
            const center = hexToPixel(coord, hexSize);
            const corner = corners[((cornerIndex % 6) + 6) % 6];
            return pointToWorld({ x: center.x + corner.x * scale, y: center.y + corner.y * scale }, elevation);
        },
        pointToWorld,
        pixelToHex: point => pixelToHex(point, hexSize),
    };
}

function scaleSurface(surface: WorldSurface, scale: number): WorldSurface {
    if (surface.kind === "cylinder") {
        return {
            ...surface,
            radius: surface.radius * scale,
            height: surface.height * scale,
        };
    }

    return {
        ...surface,
        radius: surface.radius * scale,
    };
}
