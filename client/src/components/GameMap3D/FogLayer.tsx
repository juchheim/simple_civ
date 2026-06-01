import React from "react";
import * as THREE from "three";
import { terrainImages } from "../../assets";
import type { TileRenderEntry } from "../../hooks/useRenderData";
import { getTerrainElevation } from "./elevation";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

type FogLayerProps = {
    entries: TileRenderEntry[];
    projector: Projector;
    showShroud: boolean;
};

function FogBatch({
    entries,
    projector,
    opacity,
}: {
    entries: TileRenderEntry[];
    projector: Projector;
    opacity: number;
}) {
    const meshRef = React.useRef<THREE.InstancedMesh>(null);
    const fogTexture = useBoardTexture(terrainImages.Fog);

    React.useLayoutEffect(() => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const matrix = new THREE.Matrix4();
        const scale = new THREE.Vector3(1, 1, 1);
        entries.forEach((entry, index) => {
            const normal = projector.normalAt(entry.tile.coord);
            matrix.compose(
                projector.positionOf(entry.tile.coord, getTerrainElevation(entry.tile.terrain) + 0.012),
                new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal),
                scale,
            );
            mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    }, [entries, projector]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, entries.length]} frustumCulled={false}>
            <circleGeometry args={[0.96, 6]} />
            <meshBasicMaterial map={fogTexture} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
        </instancedMesh>
    );
}

export function FogLayer({ entries, projector, showShroud }: FogLayerProps) {
    const fogged = entries.filter(entry => entry.visibility.isFogged);
    const shroud = showShroud ? entries.filter(entry => entry.visibility.isShroud) : [];

    return (
        <>
            {fogged.length > 0 && <FogBatch entries={fogged} projector={projector} opacity={0.3} />}
            {shroud.length > 0 && <FogBatch entries={shroud} projector={projector} opacity={0.94} />}
        </>
    );
}
