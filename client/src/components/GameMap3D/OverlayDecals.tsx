import { OverlayType } from "@simple-civ/engine";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { terrainImages } from "../../assets";
import type { TileRenderEntry } from "../../hooks/useRenderData";
import { getTerrainElevation } from "./elevation";
import type { Projector } from "./projection";
import { useBoardTexture } from "./textures";

const OVERLAY_TEXTURES: Partial<Record<OverlayType, string>> = {
    [OverlayType.GoodieHut]: terrainImages.GoodieHut,
    [OverlayType.NativeCamp]: terrainImages.NativeCamp,
    [OverlayType.ClearedSettlement]: terrainImages.ClearedSettlement,
};

const RESOURCE_COLORS: Partial<Record<OverlayType, string>> = {
    [OverlayType.RichSoil]: "#84cc16",
    [OverlayType.OreVein]: "#f59e0b",
    [OverlayType.SacredSite]: "#fde68a",
};

function OverlaySprite({
    url,
    position,
    quaternion,
}: {
    url: string;
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
}) {
    const texture = useBoardTexture(url);
    return (
        <mesh position={position} quaternion={quaternion}>
            <circleGeometry args={[0.72, 6]} />
            <meshBasicMaterial map={texture} transparent alphaTest={0.08} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
    );
}

export function OverlayDecals({
    entries,
    projector,
    showTileYields,
}: {
    entries: TileRenderEntry[];
    projector: Projector;
    showTileYields: boolean;
}) {
    return (
        <>
            {entries.flatMap(entry => {
                if (!entry.visibility.isVisible && !entry.visibility.isFogged) return [];
                const normal = projector.normalAt(entry.tile.coord);
                const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
                const elevation = getTerrainElevation(entry.tile.terrain) + 0.025;
                const basePosition = projector.positionOf(entry.tile.coord, elevation);
                return entry.tile.overlays
                    .filter(overlay => overlay !== OverlayType.RiverEdge)
                    .map((overlay, index) => {
                        const texture = OVERLAY_TEXTURES[overlay];
                        if (texture) {
                            return (
                                <OverlaySprite
                                    key={`${entry.key}-${overlay}-${index}`}
                                    url={texture}
                                    position={basePosition}
                                    quaternion={quaternion}
                                />
                            );
                        }

                        return (
                            <mesh
                                key={`${entry.key}-${overlay}-${index}`}
                                position={basePosition.clone().add(normal.clone().multiplyScalar(0.025 + index * 0.035))}
                                quaternion={quaternion}
                            >
                                <circleGeometry args={[0.17, overlay === OverlayType.OreVein ? 4 : 12]} />
                                <meshBasicMaterial color={RESOURCE_COLORS[overlay] ?? "#ffffff"} side={THREE.DoubleSide} />
                            </mesh>
                        );
                    });
            })}
            {showTileYields && entries
                .filter(entry => entry.visibility.isVisible || entry.visibility.isFogged)
                .map(entry => (
                    <Html
                        key={`yield-${entry.key}`}
                        position={projector.positionOf(entry.tile.coord, getTerrainElevation(entry.tile.terrain) + 0.09)}
                        center
                        distanceFactor={8}
                        style={{ pointerEvents: "none" }}
                    >
                        <div style={{ padding: "1px 4px", borderRadius: 5, background: "rgba(2,6,23,0.72)", color: "#f8fafc", fontSize: 8, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {entry.yields.F}F {entry.yields.P}P {entry.yields.S}S {entry.yields.G}G
                        </div>
                    </Html>
                ))}
        </>
    );
}
