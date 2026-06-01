import React from "react";
import * as THREE from "three";
import type { Projector } from "./projection";

type Coord = { q: number; r: number };

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
    const transform = React.useMemo(() => {
        const normal = projector.normalAt(coord);
        return {
            position: projector.positionOf(coord, elevation).toArray() as [number, number, number],
            quaternion: new THREE.Quaternion()
                .setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
                .toArray() as [number, number, number, number],
        };
    }, [coord, elevation, projector]);

    return (
        <mesh position={transform.position} quaternion={transform.quaternion} scale={scale}>
            <ringGeometry args={[0.76, 0.9, 6]} />
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
