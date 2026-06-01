import React from "react";
import { ThreeEvent } from "@react-three/fiber";
import { HexCoord, TerrainType } from "@simple-civ/engine";
import * as THREE from "three";
import { terrainImages } from "../../assets";
import type { TileRenderEntry } from "../../hooks/useRenderData";
import { getTerrainColor } from "../GameMap/geometry";
import { getTerrainElevation } from "./elevation";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

type TerrainInstancesProps = {
    entries: TileRenderEntry[];
    projector: Projector;
    showShroud: boolean;
    onHover: (coord: HexCoord | null) => void;
    onClick: (coord: HexCoord) => void;
};

function buildTopGeometry(entries: TileRenderEntry[], projector: Projector): THREE.BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];

    entries.forEach(entry => {
        const elevation = getTerrainElevation(entry.tile.terrain) + 0.012;
        const center = projector.positionOf(entry.tile.coord, elevation);
        for (let index = 0; index < 6; index++) {
            const next = (index + 1) % 6;
            const angle = ((60 * index - 30) * Math.PI) / 180;
            const nextAngle = ((60 * next - 30) * Math.PI) / 180;
            positions.push(
                ...center.toArray(),
                ...projector.cornerOf(entry.tile.coord, index, elevation).toArray(),
                ...projector.cornerOf(entry.tile.coord, next, elevation).toArray(),
            );
            uvs.push(
                0.5, 0.5,
                0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5,
                0.5 + Math.cos(nextAngle) * 0.5, 0.5 + Math.sin(nextAngle) * 0.5,
            );
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
}

function buildSideGeometry(entries: TileRenderEntry[], projector: Projector): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];

    entries.forEach(entry => {
        const elevation = getTerrainElevation(entry.tile.terrain);
        const color = new THREE.Color(entry.visibility.isShroud ? "#111827" : getTerrainColor(entry.tile.terrain)).multiplyScalar(0.48);
        for (let index = 0; index < 6; index++) {
            const next = (index + 1) % 6;
            const bottomA = projector.cornerOf(entry.tile.coord, index, 0);
            const bottomB = projector.cornerOf(entry.tile.coord, next, 0);
            const topA = projector.cornerOf(entry.tile.coord, index, elevation);
            const topB = projector.cornerOf(entry.tile.coord, next, elevation);
            positions.push(
                ...bottomA.toArray(), ...bottomB.toArray(), ...topB.toArray(),
                ...bottomA.toArray(), ...topB.toArray(), ...topA.toArray(),
            );
            for (let vertex = 0; vertex < 6; vertex++) {
                colors.push(color.r, color.g, color.b);
            }
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
}

function TerrainBatch({
    entries,
    projector,
    terrain,
    onHover,
    onClick,
}: Omit<TerrainInstancesProps, "showShroud"> & { terrain: TerrainType }) {
    const texture = useBoardTexture(terrainImages[terrain]);
    const geometry = React.useMemo(() => buildTopGeometry(entries, projector), [entries, projector]);
    React.useEffect(() => () => geometry.dispose(), [geometry]);

    const getCoord = React.useCallback((event: ThreeEvent<MouseEvent | PointerEvent>) => {
        if (event.faceIndex == null) return null;
        return entries[Math.floor(event.faceIndex / 6)]?.tile.coord ?? null;
    }, [entries]);

    return (
        <mesh
            geometry={geometry}
            frustumCulled={false}
            onPointerMove={event => {
                event.stopPropagation();
                onHover(getCoord(event));
            }}
            onPointerOut={() => onHover(null)}
            onClick={event => {
                event.stopPropagation();
                const coord = getCoord(event);
                if (coord && event.delta <= 4) onClick(coord);
            }}
        >
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
    );
}

function TerrainSides({ entries, projector }: { entries: TileRenderEntry[]; projector: Projector }) {
    const geometry = React.useMemo(() => buildSideGeometry(entries, projector), [entries, projector]);
    React.useEffect(() => () => geometry.dispose(), [geometry]);

    return (
        <mesh geometry={geometry} frustumCulled={false} raycast={() => null}>
            <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
        </mesh>
    );
}

export function TerrainInstances(props: TerrainInstancesProps) {
    const visibleEntries = React.useMemo(
        () => props.entries.filter(entry => props.showShroud || !entry.visibility.isShroud),
        [props.entries, props.showShroud],
    );
    const groups = React.useMemo(() => {
        const result = new Map<TerrainType, TileRenderEntry[]>();
        visibleEntries.forEach(entry => {
            const entries = result.get(entry.tile.terrain) ?? [];
            entries.push(entry);
            result.set(entry.tile.terrain, entries);
        });
        return result;
    }, [visibleEntries]);

    return (
        <>
            <TerrainSides entries={visibleEntries} projector={props.projector} />
            {[...groups.entries()].map(([terrain, entries]) => (
                <TerrainBatch
                    key={terrain}
                    entries={entries}
                    projector={props.projector}
                    terrain={terrain}
                    onHover={props.onHover}
                    onClick={props.onClick}
                />
            ))}
        </>
    );
}
