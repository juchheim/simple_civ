import React from "react";
import * as THREE from "three";
import { terrainImages } from "../../assets";
import type { TileRenderEntry } from "../../hooks/useRenderData";
import { getTerrainElevation } from "./elevation";
import { buildProjectedHexFaces } from "./primitives";
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
    const fogTexture = useBoardTexture(terrainImages.Fog);
    const geometry = React.useMemo(
        () => buildProjectedHexFaces(entries.map(entry => ({
            coord: entry.tile.coord,
            elevation: getTerrainElevation(entry.tile.terrain) + 0.018,
            scale: 0.98,
        })), projector),
        [entries, projector],
    );
    React.useEffect(() => () => geometry.dispose(), [geometry]);

    return (
        <mesh geometry={geometry} frustumCulled={false}>
            <meshBasicMaterial map={fogTexture} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
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
