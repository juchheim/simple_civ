import React from "react";
import * as THREE from "three";
import type { Projector } from "./projection";

type Coord = { q: number; r: number };

type ProjectedHexFace = {
    coord: Coord;
    elevation: number;
    scale?: number;
};

export function buildProjectedHexFaces(faces: ProjectedHexFace[], projector: Projector): THREE.BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];

    faces.forEach(({ coord, elevation, scale = 1 }) => {
        const center = projector.positionOf(coord, elevation);
        for (let index = 0; index < 6; index++) {
            const next = (index + 1) % 6;
            const angle = ((60 * index - 30) * Math.PI) / 180;
            const nextAngle = ((60 * next - 30) * Math.PI) / 180;
            positions.push(
                ...center.toArray(),
                ...projector.cornerOf(coord, index, elevation, scale).toArray(),
                ...projector.cornerOf(coord, next, elevation, scale).toArray(),
            );
            uvs.push(
                0.5, 0.5,
                0.5 + Math.cos(angle) * 0.5, 0.5 - Math.sin(angle) * 0.5,
                0.5 + Math.cos(nextAngle) * 0.5, 0.5 - Math.sin(nextAngle) * 0.5,
            );
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
}

function buildProjectedHexSides(
    coord: Coord,
    projector: Projector,
    bottomElevation: number,
    topElevation: number,
    scale: number,
): THREE.BufferGeometry {
    const positions: number[] = [];

    for (let index = 0; index < 6; index++) {
        const next = (index + 1) % 6;
        const bottomA = projector.cornerOf(coord, index, bottomElevation, scale);
        const bottomB = projector.cornerOf(coord, next, bottomElevation, scale);
        const topA = projector.cornerOf(coord, index, topElevation, scale);
        const topB = projector.cornerOf(coord, next, topElevation, scale);
        positions.push(
            ...bottomA.toArray(), ...bottomB.toArray(), ...topB.toArray(),
            ...bottomA.toArray(), ...topB.toArray(), ...topA.toArray(),
        );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
}

function buildProjectedHexRing(
    coord: Coord,
    projector: Projector,
    elevation: number,
    innerScale: number,
    outerScale: number,
): THREE.BufferGeometry {
    const positions: number[] = [];
    for (let index = 0; index < 6; index++) {
        const next = (index + 1) % 6;
        const innerA = projector.cornerOf(coord, index, elevation, innerScale);
        const innerB = projector.cornerOf(coord, next, elevation, innerScale);
        const outerA = projector.cornerOf(coord, index, elevation, outerScale);
        const outerB = projector.cornerOf(coord, next, elevation, outerScale);
        positions.push(
            ...innerA.toArray(), ...outerA.toArray(), ...outerB.toArray(),
            ...innerA.toArray(), ...outerB.toArray(), ...innerB.toArray(),
        );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
}

export function ProjectedHexDecal({
    coord,
    projector,
    elevation,
    scale = 1,
    children,
}: {
    coord: Coord;
    projector: Projector;
    elevation: number;
    scale?: number;
    children: React.ReactNode;
}) {
    const geometry = React.useMemo(
        () => buildProjectedHexFaces([{ coord, elevation, scale }], projector),
        [coord, elevation, projector, scale],
    );
    React.useEffect(() => () => geometry.dispose(), [geometry]);

    return <mesh geometry={geometry}>{children}</mesh>;
}

export function ProjectedHexToken({
    coord,
    projector,
    bottomElevation,
    topElevation,
    scale,
    sideColor,
    children,
}: {
    coord: Coord;
    projector: Projector;
    bottomElevation: number;
    topElevation: number;
    scale: number;
    sideColor: string;
    children: React.ReactNode;
}) {
    const topGeometry = React.useMemo(
        () => buildProjectedHexFaces([{ coord, elevation: topElevation, scale }], projector),
        [coord, projector, scale, topElevation],
    );
    const sideGeometry = React.useMemo(
        () => buildProjectedHexSides(coord, projector, bottomElevation, topElevation, scale),
        [bottomElevation, coord, projector, scale, topElevation],
    );
    React.useEffect(() => () => topGeometry.dispose(), [topGeometry]);
    React.useEffect(() => () => sideGeometry.dispose(), [sideGeometry]);

    return (
        <group>
            <mesh geometry={sideGeometry}>
                <meshStandardMaterial color={sideColor} roughness={0.82} />
            </mesh>
            <mesh geometry={topGeometry}>{children}</mesh>
        </group>
    );
}

export function HexRing({
    coord,
    projector,
    elevation,
    color,
    scale = 1,
    opacity = 1,
}: {
    coord: Coord;
    projector: Projector;
    elevation: number;
    color: string;
    scale?: number;
    opacity?: number;
}) {
    const geometry = React.useMemo(
        () => buildProjectedHexRing(coord, projector, elevation, 0.76 * scale, 0.9 * scale),
        [coord, elevation, projector, scale],
    );
    React.useEffect(() => () => geometry.dispose(), [geometry]);

    return (
        <mesh geometry={geometry}>
            <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
        </mesh>
    );
}

export function SurfaceLine({
    start,
    end,
    color,
    opacity = 1,
}: {
    start: THREE.Vector3;
    end: THREE.Vector3;
    color: string;
    opacity?: number;
}) {
    const geometry = React.useMemo(
        () => new THREE.BufferGeometry().setFromPoints([start, end]),
        [end, start],
    );

    React.useEffect(() => () => geometry.dispose(), [geometry]);

    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial color={color} transparent opacity={opacity} />
        </lineSegments>
    );
}

export function SurfaceLines({
    segments,
}: {
    segments: Array<{ start: THREE.Vector3; end: THREE.Vector3; color: string; opacity?: number }>;
}) {
    const geometry = React.useMemo(() => {
        const positions: number[] = [];
        const colors: number[] = [];
        segments.forEach(segment => {
            positions.push(...segment.start.toArray(), ...segment.end.toArray());
            const color = new THREE.Color(segment.color);
            colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        });
        const next = new THREE.BufferGeometry();
        next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        next.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        return next;
    }, [segments]);

    React.useEffect(() => () => geometry.dispose(), [geometry]);

    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial vertexColors transparent opacity={segments[0]?.opacity ?? 1} />
        </lineSegments>
    );
}
